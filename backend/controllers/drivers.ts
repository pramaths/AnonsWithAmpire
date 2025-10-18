import type { Request, Response } from 'express';
import { Program } from '@coral-xyz/anchor';
import type { Ev } from '../ev.js';

interface FormattedDriverAccount {
    publicKey: string;
    driver: string;
    totalEnergy: string;
    totalPoints: number;
    sessionCount: number;
    pricePerPoint: string;
    active: boolean;
}

export const getAllDrivers = async (req: Request, res: Response, program: Program<Ev>) => {
    try {
        const driverAccounts = await program.account.driverAccount.all();

        if (!driverAccounts) {
            return res.status(404).json({ error: 'No driver accounts found.' });
        }

        const formattedAccounts: FormattedDriverAccount[] = driverAccounts.map(account => ({
            publicKey: account.publicKey.toBase58(),
            driver: account.account.driver.toBase58(),
            totalEnergy: account.account.totalEnergy.toString(),
            totalPoints: account.account.totalPoints.toNumber() / 1_000_000, // Convert to DECH
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
};
