import type { Request, Response } from 'express';
import { Program } from '@coral-xyz/anchor';
import type { Ev } from '../ev.js';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Connection, PublicKey } from '@solana/web3.js';
import pkg from '@coral-xyz/anchor';
const {  BN } = pkg;

interface FormattedDriverAccount {
    publicKey: string;
    driver: string;
    totalEnergy: string;
    totalPoints: number;
    sessionCount: number;
    pricePerPoint: string;
    active: boolean;
}

export const getAllDrivers = async (_req: Request, res: Response, program: Program<Ev>) => {
    try {
        const driverAccounts = await program.account.driverAccount.all();

        if (!driverAccounts) {
            return res.status(404).json({ error: 'No driver accounts found.' });
        }

        const formattedAccounts: FormattedDriverAccount[] = driverAccounts.map(account => ({
            publicKey: account.publicKey.toBase58(),
            driver: account.account.driver.toBase58(),
            totalEnergy: account.account.totalEnergy.toString(),
            totalPoints: account.account.totalPoints.toNumber() / 1_000_000,
            sessionCount: account.account.sessionCount.toNumber(),
            pricePerPoint: account.account.pricePerPoint.toString(),
            active: account.account.active,
        }));

        res.status(200).json(formattedAccounts);
    } catch (error) {
        console.error('Error in /api/drivers:', error);
        if (error instanceof Error) {
            res.status(500).json({ error: 'Failed to fetch drivers.', details: error.message });
        } else {
            res.status(500).json({ error: 'An unknown error occurred.' });
        }
    }
    return;
};

export const createDriverApprovalTransaction = async (req: Request, res: Response, program: Program<Ev>, connection: Connection) => {
    try {
        const { driverPublicKey } = req.body;
        if (!driverPublicKey) {
            return res.status(400).json({ error: 'driverPublicKey is required.' });
        }

        const driverPubkey = new PublicKey(driverPublicKey);

        const [platformState] = PublicKey.findProgramAddressSync(
            [Buffer.from("platform")],
            program.programId
        );
        const [platformAuthority] = PublicKey.findProgramAddressSync(
            [Buffer.from("platform_authority")],
            program.programId
        );
        const [driverPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("driver"), driverPubkey.toBuffer()],
            program.programId
        );

        const platformStateAccount = await program.account.platformState.fetch(platformState);
        const mint = platformStateAccount.mint;
        const driverTokenAccount = getAssociatedTokenAddressSync(mint, driverPubkey);
        
        // Approve 1000 DECH by default for now
        const delegateAmount = new BN(1000 * 1_000_000);

        const tx = await program.methods
            .approvePlatformAccess(true, delegateAmount)
            .accountsStrict({
                driverAccount: driverPda,
                platformState: platformState,
                driver: driverPubkey,
                platformAuthority: platformAuthority,
                driverTokenAccount: driverTokenAccount,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .transaction();

        tx.feePayer = driverPubkey;
        const { blockhash } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;

        const serializedTx = tx.serialize({ requireAllSignatures: false });

        res.status(200).json({
            transaction: serializedTx.toString('base64'),
        });

    } catch (error) {
        console.error('Error in /api/drivers/approve-transaction:', error);
        if (error instanceof Error) {
            res.status(500).json({ error: 'Failed to create approval transaction.', details: error.message });
        } else {
            res.status(500).json({ error: 'An unknown error occurred.' });
        }
    }
    return;
};
