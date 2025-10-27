import type { Request, Response } from 'express';
import { Program } from '@coral-xyz/anchor';
import type { Ev } from '../ev.js';
import { PublicKey } from '@solana/web3.js';

export const getSustainabilityInsights = async (req: Request, res: Response, program: Program<Ev>) => {
    try {
        const driverAccounts = await program.account.driverAccount.all();
        const totalEnergy = driverAccounts.reduce((acc, account) => acc + account.account.totalEnergy.toNumber(), 0);
        
        // Assuming 1 unit of energy = 1 kWh and 0.5 kg CO2 saved per kWh
        const co2Saved = totalEnergy * 0.5;

        // Fetch platform state for total sessions
        const [platformStatePda] = await PublicKey.findProgramAddress(
            [Buffer.from("platform")],
            program.programId
        );
        const platformStateAccount = await program.account.platformState.fetch(platformStatePda);
        const totalSessions = platformStateAccount.totalSessions.toNumber();

        res.status(200).json({
            totalEnergy: totalEnergy/10000000, // in Wh
            co2Saved: co2Saved/10000000, // in kg
            totalSessions: totalSessions,
        });
    } catch (error) {
        console.error('Error in /api/sustainability-insights:', error);
        if (error instanceof Error) {
            res.status(500).json({ error: 'Failed to fetch sustainability insights.', details: error.message });
        } else {
            res.status(500).json({ error: 'An unknown error occurred.' });
        }
    }
};
