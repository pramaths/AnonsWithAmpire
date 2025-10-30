import type { Request, Response } from 'express';
import anchor, { Program } from '@coral-xyz/anchor';
const { BN } = anchor;
import { Connection, PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
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
    pointsEarned: number;
}

const activeSessions: { [sessionId: string]: Session } = {};
const driverToSessionId: { [driverPublicKey: string]: string } = {};
const recentSessions: Array<{
    sessionId: string;
    driverPublicKey: string;
    energyUsed: number;
    chargerCode: string;
    timestamp: number;
}> = [];

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

export const startSession = async (req: Request, res: Response, program: Program<Ev>, adminKeypair: Keypair, _connection: Connection) => {
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
            pointsEarned: 0,
        };

        session.intervalId = setInterval(() => {
            // Simulate +0.05 kWh per second
            session.energyUsed += 0.05;
            session.pointsEarned += 50;
        }, 1000);

        activeSessions[sessionId] = session;
        driverToSessionId[driverPublicKey] = sessionId;

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
    return;
};

export const getSessionStatus = (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const session = activeSessions[sessionId as string];

    if (!session) {
        return res.status(404).json({ error: 'Session not found.' });
    }

    const elapsedTime = Date.now() - session.startTime;
    const co2Saved = session.energyUsed * 0.5; // Assuming 0.5 kg CO2 saved per kWh
    const pointsEarned = session.pointsEarned; // Use accumulated points (+5 per second)

    res.status(200).json({
        sessionId: session.sessionId,
        startTime: session.startTime,
        energyUsed: session.energyUsed,
        chargerCode: session.chargerCode,
        elapsedTime,
        co2Saved,
        pointsEarned,
    });
    return;
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
        delete driverToSessionId[session.driverPublicKey];

        // Keep a simple recent sessions buffer (last 50)
        recentSessions.unshift({
            sessionId,
            driverPublicKey: session.driverPublicKey,
            energyUsed: session.energyUsed,
            chargerCode: session.chargerCode,
            timestamp: Date.now(),
        });
        if (recentSessions.length > 50) recentSessions.pop();

        const driverPubkey = new PublicKey(session.driverPublicKey);
        const effectiveEnergyUsed = session.energyUsed; // in kWh
        // On-chain expects milli-kWh; 1 kWh = 1000 milli-kWh. Use rounding to avoid float truncation.
        const energyUsedOnChain = Math.round(effectiveEnergyUsed * 1000);

        // Logging pipeline for clarity
        const dechPerKwh = 1000; // 10x scale
        const expectedTokens = energyUsedOnChain / 1000 * dechPerKwh; // DECH (whole tokens)
        const smallestUnits = Math.round(expectedTokens * 1_000_000); // token smallest units
        console.log('[StopSession] driver=', session.driverPublicKey,
            'kWh=', effectiveEnergyUsed.toFixed(6),
            'milli_kWh(sent)=', energyUsedOnChain,
            'expectedTokens(DECH)=', expectedTokens.toFixed(6),
            'expectedSmallestUnits=', smallestUnits);

        console.log(energyUsedOnChain, "energyUsedOnChain");
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
        try {
            const bal = await connection.getTokenAccountBalance(driverTokenAccount);
            console.log('[StopSession] driverTokenAccount=', driverTokenAccount.toBase58(), 'pre_balance(amount)=', bal.value.amount, 'decimals=', bal.value.decimals);
        } catch (e) {
            console.log('[StopSession] could not fetch pre_balance for driverTokenAccount');
        }

        // Debug: log mint and decimals to cross-check UI math
        try {
            const parsedMint = await connection.getParsedAccountInfo(platformState.mint);
            const decimals = (parsedMint.value as any)?.data?.parsed?.info?.decimals;
            console.log('[StopSession] mint=', platformState.mint.toBase58(), 'decimals=', decimals);
        } catch (e) {
            console.log('[StopSession] failed to fetch mint decimals');
        }

        const sessionKeypair = Keypair.generate();

        const tx = await program.methods
            .recordSession(charger_code, new BN(energyUsedOnChain))
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
    return;
};

export const getSessionHistory = async (req: Request, res: Response, program: Program<Ev>) => {
    try {
        const { driverPublicKey } = req.params;
        if (!driverPublicKey) {
            return res.status(400).json({ error: 'driverPublicKey is required.' });
        }

        const driverPubkey = new PublicKey(driverPublicKey);

        // This uses getProgramAccounts under the hood with a memcmp filter
        const allSessionAccounts = await program.account.chargingSession.all([
            {
                memcmp: {
                    offset: 8, // Account discriminator
                    bytes: driverPubkey.toBase58(),
                },
            },
        ]);

        if (!allSessionAccounts || allSessionAccounts.length === 0) {
            return res.status(200).json([]);
        }
        console.log(allSessionAccounts, "allSessionAccounts");


        const formattedSessions = allSessionAccounts.map(session => ({
            publicKey: session.publicKey.toBase58(),
            driver: session.account.driver.toBase58(),
            energyUsed: session.account.energyUsed.toNumber() ,
            // pointsEarned on-chain is in smallest units; convert to whole tokens (DECH) using mint decimals
            points: session.account.pointsEarned.toNumber()/1000000,
            timestamp: session.account.timestamp.toNumber(),
            chargerId: session.account.chargerCode,
        }));

        const sortedSessions = formattedSessions.sort((a, b) => b.timestamp - a.timestamp);

        res.status(200).json(sortedSessions.slice(0, 10));

    } catch (error) {
        console.error('Error in /api/sessions/history:', error);
        if (error instanceof Error) {
            res.status(500).json({ error: 'Failed to fetch session history.', details: error.message });
        } else {
            res.status(500).json({ error: 'An unknown error occurred.' });
        }
    }
    return;
};

export const getLiveSessions = (_req: Request, res: Response) => {
    try {
        const allLiveSessions = Object.values(activeSessions).map(session => {
            const elapsedTime = Date.now() - session.startTime;
            const co2Saved = session.energyUsed * 0.5;
            const pointsEarned = session.pointsEarned; // Use accumulated points (+5 per second)
            return {
                sessionId: session.sessionId,
                driverPublicKey: session.driverPublicKey,
                startTime: session.startTime,
                energyUsed: session.energyUsed,
                chargerCode: session.chargerCode,
                pointsEarned,
                elapsedTime,
                co2Saved,
            };
        });
        res.status(200).json(allLiveSessions);
    } catch (error) {
        console.error('Error in /api/sessions/live:', error);
        if (error instanceof Error) {
            res.status(500).json({ error: 'Failed to fetch live sessions.', details: error.message });
        } else {
            res.status(500).json({ error: 'An unknown error occurred.' });
        }
    }
    return;
};

export const getDriverLiveSession = (req: Request, res: Response) => {
    try {
        const { driverPublicKey } = req.params as { driverPublicKey: string };
        if (!driverPublicKey) {
            return res.status(400).json({ error: 'driverPublicKey is required.' });
        }
        const sessionId = driverToSessionId[driverPublicKey];
        if (!sessionId) {
            return res.status(404).json({ error: 'No live session for driver.' });
        }
        const session = activeSessions[sessionId];
        if (!session) {
            return res.status(404).json({ error: 'Session not found.' });
        }
        const elapsedTime = Date.now() - session.startTime;
        const co2Saved = session.energyUsed * 0.5;
        const pointsEarned = session.pointsEarned; // Use accumulated points (+5 per second)
        return res.status(200).json({
            sessionId: session.sessionId,
            driverPublicKey: session.driverPublicKey,
            startTime: session.startTime,
            energyUsed: session.energyUsed,
            chargerCode: session.chargerCode,
            pointsEarned,
            elapsedTime,
            co2Saved,
        });
    } catch (error) {
        console.error('Error in /api/sessions/live/:driverPublicKey:', error);
        if (error instanceof Error) {
            return res.status(500).json({ error: 'Failed to fetch live session.', details: error.message });
        }
        return res.status(500).json({ error: 'An unknown error occurred.' });
    }
};

export const getRecentSessions = (_req: Request, res: Response) => {
    try {
        return res.status(200).json(recentSessions);
    } catch (error) {
        console.error('Error in /api/sessions/recent:', error);
        if (error instanceof Error) {
            return res.status(500).json({ error: 'Failed to fetch recent sessions.', details: error.message });
        }
        return res.status(500).json({ error: 'An unknown error occurred.' });
    }
};
