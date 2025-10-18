import type { Request, Response } from 'express';
import anchor, { Program } from '@coral-xyz/anchor';
const { BN } = anchor;
import { Connection, PublicKey, Keypair, Transaction, SystemProgram } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import type { Ev } from '../ev.js';
import { randomBytes } from 'crypto';

interface Session {
    sessionId: string;
    driverPublicKey: string;
    startTime: number;
    intervalId?: NodeJS.Timeout;
    energyUsed: number;
    chargerCode: string;
}

const activeSessions: { [sessionId: string]: Session } = {};

// Cleanup interval to remove stale sessions (e.g., older than 12 hours)
setInterval(() => {
    const now = Date.now();
    const twelveHours = 12 * 60 * 60 * 1000;
    for (const sessionId in activeSessions) {
        const session = activeSessions[sessionId];
        if (session && now - session.startTime > twelveHours) {
            if (session.intervalId) {
                clearInterval(session.intervalId);
            }
            delete activeSessions[sessionId];
            console.log(`Cleaned up stale session ${sessionId}`);
        }
    }
}, 3600000); // Run every hour

export const startSession = async (req: Request, res: Response, program: Program<Ev>, adminKeypair: Keypair, connection: Connection) => {
    try {
        const { driverPublicKey, chargerCode } = req.body;
        if (!driverPublicKey || !chargerCode) {
            return res.status(400).json({ error: 'driverPublicKey and chargerCode are required.' });
        }

        if (Object.values(activeSessions).some(s => s.driverPublicKey === driverPublicKey)) {
            return res.status(409).json({ error: 'Driver already has an active session.' });
        }

        const driverPubkey = new PublicKey(driverPublicKey);

        const [driverPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("driver"), driverPubkey.toBuffer()],
            program.programId
        );

        const existingAccount = await program.account.driverAccount.fetchNullable(driverPda);

        if (!existingAccount) {
            console.log(`Registering new driver: ${driverPublicKey}`);
            const pricePerPoint = new BN(100);

            const [platformState] = PublicKey.findProgramAddressSync(
                [Buffer.from("platform")],
                program.programId
            );

            const txSignature = await program.methods
                .registerDriver(driverPubkey, pricePerPoint)
                .accountsStrict({
                    driverAccount: driverPda,
                    platformState: platformState,
                    admin: adminKeypair.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();
            console.log(`Transaction successful with signature: ${txSignature}`);
        }

        const freshDriverAccount = existingAccount || await program.account.driverAccount.fetch(driverPda);

        const sessionId = randomBytes(16).toString('hex');
        const session: Session = {
            sessionId,
            driverPublicKey,
            startTime: Date.now(),
            energyUsed: 0,
            chargerCode,
        };

        session.intervalId = setInterval(() => {
            session.energyUsed += 0.05;
        }, 1000);

        activeSessions[sessionId] = session;

        console.log(`Started new session ${sessionId} for driver ${driverPublicKey}`);

        res.status(201).json({
            message: "Session started successfully",
            sessionId: sessionId,
            pricePerPoint: freshDriverAccount.pricePerPoint.toString(),
        });

    } catch (error) {
        console.error('Error in /api/sessions/start:', error);
        if (error instanceof Error) {
            res.status(500).json({ error: 'Failed to start session.', details: error.message });
        } else {
            res.status(500).json({ error: 'An unknown error occurred.' });
        }
    }
};

export const getSessionStatus = (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const session = activeSessions[sessionId as string];

    if (!session) {
        return res.status(404).json({ error: 'Session not found.' });
    }

    const elapsedTime = Date.now() - session.startTime;
    // On-chain logic is now 1 kWh = 1 DECH. energyUsed is in kWh.
    const pointsEarned = session.energyUsed * 1000000;

    res.status(200).json({
        sessionId: session.sessionId,
        startTime: session.startTime,
        energyUsed: session.energyUsed,
        chargerCode: session.chargerCode,
        elapsedTime,
        pointsEarned,
    });
};

export const stopSession = async (req: Request, res: Response, program: Program<Ev>, connection: Connection) => {
    try {
        const { sessionId, charger_code } = req.body;
        if (!sessionId || !charger_code) {
            return res.status(400).json({ error: 'sessionId and charger_code are required.' });
        }

        const session = activeSessions[sessionId];
        if (!session) {
            return res.status(404).json({ error: 'Active session not found.' });
        }

        clearInterval(session.intervalId!);
        delete activeSessions[sessionId];

        const driverPubkey = new PublicKey(session.driverPublicKey);
        const energy_used_milli_kwh = Math.floor(session.energyUsed * 1000000);


        const [platformStatePda] = PublicKey.findProgramAddressSync(
            [Buffer.from("platform")],
            program.programId
        );
        const platformState = await program.account.platformState.fetch(platformStatePda);

        const [driverPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("driver"), driverPubkey.toBuffer()],
            program.programId
        );

        const [mintAuthorityPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("mint_authority")],
            program.programId
        );

        const driverTokenAccount = getAssociatedTokenAddressSync(platformState.mint, driverPubkey);

        const sessionKeypair = Keypair.generate();

        const tx = await program.methods
            .recordSession(charger_code, new BN(energy_used_milli_kwh))
            .accountsStrict({
                platformState: platformStatePda,
                driverAccount: driverPda,
                session: sessionKeypair.publicKey,
                driver: driverPubkey,
                mintAuthority: mintAuthorityPda,
                mint: platformState.mint,
                driverTokenAccount: driverTokenAccount,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .transaction();

        tx.feePayer = driverPubkey;
        const { blockhash } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;

        tx.partialSign(sessionKeypair);

        const serializedTx = tx.serialize({ requireAllSignatures: false });

        res.status(200).json({
            transaction: serializedTx.toString('base64'),
        });

    } catch (error) {
        console.error('Error in /api/sessions/stop:', error);
        if (error instanceof Error) {
            res.status(500).json({ error: 'Failed to create transaction.', details: error.message });
        } else {
            res.status(500).json({ error: 'An unknown error occurred.' });
        }
    }
};
