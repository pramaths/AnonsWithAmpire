'use client';

import { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction, VersionedTransaction } from '@solana/web3.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import MintAnimation from '@/components/MintAnimation';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import Header from '@/components/Header';
import SustainabilityPanel from '@/components/SustainabilityPanel';
import UserHoldings from '@/components/UserHoldings';
import DriverMarketplace from '@/components/DriverMarketplace';
import Leaderboard from '@/components/Leaderboard';
import { Button } from '@/components/ui/button';

interface Session {
    id: string;
    energy: number;
    time: number;
    points: number;
    progress: number;
}

const mockSessions: Session[] = [
    { id: 'Charger-001', energy: 1.2, time: 15, points: 24, progress: 30 },
    { id: 'Charger-002', energy: 0.8, time: 10, points: 16, progress: 50 },
    { id: 'Charger-003', energy: 2.5, time: 25, points: 50, progress: 75 },
];

const SessionsPage = () => {
    const [sessions, setSessions] = useState<Session[]>(mockSessions);
    const [isBuyerView, setIsBuyerView] = useState(true);
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();

    const handleStopSession = async (session: Session) => {
        if (!publicKey) {
            alert('Please connect your wallet to stop a session.');
            return;
        }

        try {
            // Step 1: Call the backend to get the transaction
            const response = await fetch('http://localhost:3001/api/sessions/stop', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    driverPublicKey: publicKey.toBase58(),
                    charger_code: session.id,
                    energy_used: Math.floor(session.energy * 1000), // Assuming energy is in kWh
                }),
            });

            const { transaction: base64Transaction } = await response.json();

            if (!response.ok) {
                throw new Error('Failed to fetch transaction from backend.');
            }

            // Step 2: Deserialize, sign, and send the transaction
            const transactionBuffer = Buffer.from(base64Transaction, 'base64');
            const tx = Transaction.from(transactionBuffer);

            const signature = await sendTransaction(tx, connection);
            console.log(`Transaction successful with signature: ${signature}`);
            
            // Step 3: Remove the session from the UI
            setSessions(prevSessions => prevSessions.filter(s => s.id !== session.id));
            
            alert('Session stopped and recorded successfully!');

        } catch (error) {
            console.error('Error stopping session:', error);
            alert('Failed to stop session. See console for details.');
        }
    };

    useEffect(() => {
        const interval = setInterval(() => {
            setSessions(prevSessions =>
                prevSessions.map(session => ({
                    ...session,
                    energy: parseFloat((session.energy + 0.1).toFixed(1)),
                    time: session.time + 1,
                    points: session.points + 1,
                    progress: Math.min(session.progress + 2, 100),
                }))
            );
        }, 2000);

        return () => clearInterval(interval);
    }, []);
    
    const totalKwh = sessions.reduce((acc, s) => acc + s.energy, 0).toFixed(1);
    const totalPoints = sessions.reduce((acc, s) => acc + s.points, 0);
    const inrEquivalent = (totalPoints * 0.5).toFixed(2);

    return (
        <>
            <Header />
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
                <div className="container mx-auto p-6 grid md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-6">
                        <div className="flex justify-between items-center">
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-lime-400 bg-clip-text text-transparent">
                                {isBuyerView ? '💰 Marketplace' : '⚡ Live Charging Sessions'}
                            </h1>
                            <div className="flex items-center space-x-3 bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50">
                                <Label htmlFor="view-toggle" className="text-slate-300 font-medium">
                                    {isBuyerView ? '💰 Buyer View' : '🔌 Driver View'}
                                </Label>
                                <Switch id="view-toggle" checked={isBuyerView} onCheckedChange={setIsBuyerView} />
                            </div>
                        </div>

                        {isBuyerView ? (
                            <div className="space-y-6">
                                <UserHoldings />
                                <DriverMarketplace />
                                <Leaderboard />
                            </div>
                        ) : (
                            <>
                                <Card className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border-blue-500/30 shadow-xl">
                                    <CardHeader>
                                        <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
                                            <span className="text-2xl">📊</span>
                                            Session Summary
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center justify-between text-lg">
                                            <div className="flex items-center gap-3">
                                                <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg font-bold">{totalKwh} kWh</span>
                                                <span className="text-slate-500">→</span>
                                                <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg font-bold">{totalPoints} DECH</span>
                                                <span className="text-slate-500">→</span>
                                                <span className="px-3 py-1 bg-lime-500/20 text-lime-400 rounded-lg font-bold">₹{inrEquivalent}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-3 rounded-lg border border-blue-500/20 overflow-hidden shadow-lg">
                                    <div className="whitespace-nowrap text-sm font-medium text-slate-300">
                                        {sessions.map(s => `💧 ${s.id} — ${s.energy} kWh used | +${s.points} pts | `).join('')}
                                        {sessions.map(s => `💧 ${s.id} — ${s.energy} kWh used | +${s.points} pts | `).join('')}
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    {sessions.map((session, index) => (
                                        <Card key={session.id} className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700/50 hover:border-blue-500/50 transition-all duration-300 shadow-lg hover:shadow-blue-500/20">
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-lg flex items-center justify-between">
                                                    <span className="text-slate-200">Session: {session.id}</span>
                                                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full animate-pulse">
                                                        LIVE
                                                    </span>
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                <div className="grid grid-cols-2 gap-3 text-sm">
                                                    <div className="bg-slate-800/50 p-2 rounded-lg">
                                                        <p className="text-slate-400 text-xs">Energy</p>
                                                        <p className="text-white font-bold">{session.energy} kWh</p>
                                                    </div>
                                                    <div className="bg-slate-800/50 p-2 rounded-lg">
                                                        <p className="text-slate-400 text-xs">Time</p>
                                                        <p className="text-white font-bold">{session.time} mins</p>
                                                    </div>
                                                </div>
                                                <div className="bg-gradient-to-r from-blue-500/10 to-lime-500/10 p-3 rounded-lg border border-blue-500/20">
                                                    <p className="text-sm text-slate-400">Points Earned</p>
                                                    <p className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-lime-400 bg-clip-text text-transparent">
                                                        +{session.points} DECH
                                                    </p>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-xs text-slate-400">
                                                        <span>Progress</span>
                                                        <span>{session.progress}%</span>
                                                    </div>
                                                    <Progress value={session.progress} className="h-2" />
                                                </div>
                                                <Button onClick={() => handleStopSession(session)} size="sm" variant="destructive">
                                                    Stop Session
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>

                                <div className="flex justify-center">
                                    <MintAnimation />
                                </div>
                            </>
                        )}
                    </div>
                    
                    <aside className="space-y-6">
                        <SustainabilityPanel />
                    </aside>
                </div>
            </div>
        </>
    );
};

export default SessionsPage;
