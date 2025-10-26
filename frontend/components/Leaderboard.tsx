'use client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface Driver {
    publicKey: string;
    driver: string;
    totalEnergy: number;
    totalPoints: number;
    sessionCount: number;
    pricePerPoint: number;
    active: boolean;

}

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
                const sortedDrivers = data.sort((a: Driver, b: Driver) => 
                    b.totalPoints - a.totalPoints
                );

                setDrivers(sortedDrivers);
            } catch (error) {
                toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
            }
        };

        fetchDrivers();
        const interval = setInterval(fetchDrivers, 1500000);

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
                            <span className="text-white truncate w-32">{driver.driver}</span>
                        </div>
                        <span className="text-lime-400 font-bold">
                            {driver.totalPoints.toString()} DECH
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Leaderboard;
