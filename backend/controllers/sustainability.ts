import type { Request, Response } from 'express';
import { Program } from '@coral-xyz/anchor';
import type { Ev } from '../ev.js';

export const getSustainabilityInsights = async (req: Request, res: Response, program: Program<Ev>) => {
    try {
        const driverAccounts = await program.account.driverAccount.all();
        const totalEnergy = driverAccounts.reduce((acc, account) => acc + account.account.totalEnergy.toNumber(), 0);
        
        // Assuming 1 unit of energy = 1 kWh and 0.5 kg CO2 saved per kWh
        const co2Saved = totalEnergy * 0.5;

        // Fetch platform state for total sessions
        const [platformState] = await program.provider.connection.getProgramAccounts(program.programId, {
            filters: [{ dataSize: 8 + 32 + 32 + 8 + 8 }]
        });
        const platformStateAccount = await program.account.platformState.fetch(platformState.pubkey);
        const totalSessions = platformStateAccount.totalSessions.toNumber();

        res.status(200).json({
            totalEnergy: totalEnergy, // in Wh
            co2Saved: co2Saved, // in kg
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
