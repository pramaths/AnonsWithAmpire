'use client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

type Driver = {
    publicKey: string;
    account: {
        driver: string;
        totalEnergy: string;
        totalPoints: string;
        sessionCount: string;
        pointsBalance: string;
        pricePerPoint: string;
        active: boolean;
    }
};

const Leaderboard = () => {
    const [drivers, setDrivers] = useState<Driver[]>([]);

    useEffect(() => {
        const fetchDrivers = async () => {
            try {
                const response = await fetch('http://localhost:3001/api/drivers');
                if (!response.ok) {
                    throw new Error('Failed to fetch leaderboard data');
                }
                const data = await response.json();
                
                // Sort drivers by totalPoints in descending order
                const sortedDrivers = data.sort((a: Driver, b: Driver) => 
                    parseInt(b.account.totalPoints) - parseInt(a.account.totalPoints)
                );

                setDrivers(sortedDrivers);
            } catch (error) {
                toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
            }
        };

        fetchDrivers();
        const interval = setInterval(fetchDrivers, 1500000); // Refresh every 1500 seconds

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="bg-slate-800/50 p-4 rounded-lg">
            <h2 className="text-white text-lg font-semibold mb-3">Leaderboard</h2>
            <div className="space-y-3">
                {drivers.slice(0, 5).map((driver, index) => (
                    <div key={driver.publicKey} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-400 w-5">{index + 1}.</span>
                            <span className="text-white truncate w-32">{driver.account.driver}</span>
                        </div>
                        <span className="text-lime-400 font-bold">
                            {(parseInt(driver.account.totalPoints) / 1_000_000).toFixed(2)} DECH
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Leaderboard;
