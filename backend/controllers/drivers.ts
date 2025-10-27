import type { Request, Response } from 'express';
import { Program } from '@coral-xyz/anchor';
import type { Ev } from '../ev.js';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import pkg from '@coral-xyz/anchor';
const {  BN } = pkg;

export const buyPoints = async (req: Request, res: Response, program: Program<Ev>, connection: Connection) => {
    try {
        const { buyerPublicKey, driverPublicKey, amount } = req.body;
        if (!buyerPublicKey || !driverPublicKey || !amount) {
            return res.status(400).json({ error: 'buyerPublicKey, driverPublicKey, and amount are required.' });
        }

        const buyerPubkey = new PublicKey(buyerPublicKey);
        const driverPubkey = new PublicKey(driverPublicKey);
        const amountBN = new BN(amount);

        const driverAccountInfo = await program.account.driverAccount.fetch(
            PublicKey.findProgramAddressSync(
                [Buffer.from("driver"), driverPubkey.toBuffer()],
                program.programId
            )[0]
        );
        const pricePerPoint = driverAccountInfo.pricePerPoint;
        const solPayment = pricePerPoint.mul(amountBN);

        const [platformState] = PublicKey.findProgramAddressSync(
            [Buffer.from("platform")],
            program.programId
        );
        const platformStateAccount = await program.account.platformState.fetch(platformState);
        const mint = platformStateAccount.mint;

        const buyerTokenAccount = getAssociatedTokenAddressSync(mint, buyerPubkey);
        const driverTokenAccount = getAssociatedTokenAddressSync(mint, driverPubkey);

        const tx = new Transaction();

        // Create buyer's token account if it doesn't exist
        const buyerAtaInfo = await connection.getAccountInfo(buyerTokenAccount);
        if (!buyerAtaInfo) {
            tx.add(
                createAssociatedTokenAccountInstruction(
                    buyerPubkey, // payer
                    buyerTokenAccount, // ata
                    buyerPubkey, // owner
                    mint // mint
                )
            );
        }

        const [driverAccount] = PublicKey.findProgramAddressSync(
            [Buffer.from("driver"), driverPubkey.toBuffer()],
            program.programId
        );

        const [platformAuthority] = PublicKey.findProgramAddressSync(
            [Buffer.from("platform_authority")],
            program.programId
        );

        tx.add(
            await program.methods
                .buyPoints(amountBN, solPayment)
                .accountsStrict({
                    buyer: buyerPubkey,
                    driver: driverPubkey,
                    buyerTokenAccount,
                    driverTokenAccount,
                    driverAccount,
                    platformState,
                    platformAuthority,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                })
                .instruction()
        );

        tx.feePayer = buyerPubkey;
        const { blockhash } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;

        const serializedTx = tx.serialize({ requireAllSignatures: false });

        res.status(200).json({
            transaction: serializedTx.toString('base64'),
        });

    } catch (error) {
        console.error('Error in /api/drivers/buy-points:', error);
        if (error instanceof Error) {
            res.status(500).json({ error: 'Failed to create buy points transaction.', details: error.message });
        } else {
            res.status(500).json({ error: 'An unknown error occurred.' });
        }
    }
};

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
            totalEnergy: (account.account.totalEnergy.toNumber() / 1000000).toString(),
            totalPoints: account.account.totalPoints.toNumber() / 1000000,
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
