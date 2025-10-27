'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Zap, History, Leaf } from "lucide-react";
import Header from '@/components/Header';
import { SustainabilityPanel } from '@/components/SustainabilityPanel';
import UserHoldings from '@/components/UserHoldings';
import { DriverMarketplace } from '@/components/DriverMarketplace';
import Leaderboard from '@/components/Leaderboard';

interface ActiveSession {
    sessionId: string;
    startTime: number;
    energyUsed: number;
    chargerCode: string;
    elapsedTime: number;
    pointsEarned: number;
}

interface PastSession {
    publicKey: string;
    driver: string;
    energyUsed: number;
    points: number;
    timestamp: number;
    chargerId: string;
}

const SessionsPage = () => {
    const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
    const [pastSessions, setPastSessions] = useState<PastSession[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isBuyerView, setIsBuyerView] = useState(true); // State for the main view toggle
    const { publicKey } = useWallet();

    // Effect to poll for active session status
    useEffect(() => {
        const sessionId = localStorage.getItem('activeSessionId');
        if (!sessionId) {
            setActiveSession(null);
            return;
        }

        const pollSession = async () => {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sessions/${sessionId}/status`);
                if (response.ok) {
                    const data: ActiveSession = await response.json();
                    setActiveSession(data);
                } else {
                    // Session might have ended, so clear it
                    localStorage.removeItem('activeSessionId');
                    setActiveSession(null);
                }
            } catch (error) {
                console.error("Failed to fetch session status:", error);
                setActiveSession(null);
                localStorage.removeItem('activeSessionId');
            }
        };

        pollSession(); // Initial poll
        const interval = setInterval(pollSession, 5000); // Poll every 5 seconds

        return () => clearInterval(interval);
    }, []);

    const handleTabChange = (value: string) => {
        if (value === 'history' && publicKey && pastSessions.length === 0) {
            fetchPastSessions(publicKey.toBase58());
        }
    };

    const fetchPastSessions = async (driverPublicKey: string) => {
        setIsLoadingHistory(true);
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sessions/history/${driverPublicKey}`);
            const data: PastSession[] = await response.json();
            setPastSessions(data);
        } catch (error) {
            console.error("Failed to fetch past sessions:", error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const formatElapsedTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <>
            <Header />
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
                <div className="container mx-auto p-6 grid md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-6">
                        <div className="flex justify-between items-center">
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-lime-400 bg-clip-text text-transparent">
                                {isBuyerView ? '💰 Marketplace' : '⚡ Your Sessions'}
                            </h1>
                            <div className="flex items-center space-x-3 bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50">
                                <Label htmlFor="view-toggle" className="text-slate-300 font-medium">
                                    {isBuyerView ? 'Buyer View' : 'Driver View'}
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
                            <Tabs defaultValue="live" className="w-full" onValueChange={handleTabChange}>
                                <TabsList className="grid w-full grid-cols-2 bg-slate-800/80 border border-slate-700">
                                    <TabsTrigger value="live" className="data-[state=active]:bg-lime-500/20 data-[state=active]:text-lime-400">
                                        <Zap className="w-4 h-4 mr-2" /> Live Session
                                    </TabsTrigger>
                                    <TabsTrigger value="history" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
                                        <History className="w-4 h-4 mr-2" /> Session History
                                    </TabsTrigger>
                                </TabsList>
                                
                                <TabsContent value="live" className="mt-6">
                                    {activeSession ? (
                                        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700/50 shadow-lg shadow-lime-500/10">
                                            {/* Live session details */}
                                            <CardHeader>
                                                <CardTitle className="text-2xl flex items-center justify-between">
                                                    <span>Charging at <span className="text-lime-400 font-mono">{activeSession.chargerCode}</span></span>
                                                    <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded-full animate-pulse">
                                                        LIVE
                                                    </span>
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-6">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                                                    <div className="bg-slate-800/50 p-4 rounded-lg">
                                                        <p className="text-slate-400 text-sm flex items-center justify-center"><Zap className="w-4 h-4 mr-1"/>Energy</p>
                                                        <p className="text-3xl font-bold text-white">{activeSession.energyUsed.toFixed(4)} <span className="text-xl">kWh</span></p>
                                                    </div>
                                                    <div className="bg-slate-800/50 p-4 rounded-lg">
                                                        <p className="text-slate-400 text-sm flex items-center justify-center"><Clock className="w-4 h-4 mr-1"/>Time Elapsed</p>
                                                        <p className="text-3xl font-bold text-white font-mono">{formatElapsedTime(activeSession.elapsedTime)}</p>
                                                    </div>
                                                    <div className="bg-slate-800/50 p-4 rounded-lg">
                                                        <p className="text-slate-400 text-sm flex items-center justify-center"><Leaf className="w-4 h-4 mr-1"/>CO2 Saved</p>
                                                        <p className="text-3xl font-bold text-white">{(activeSession.energyUsed).toFixed(2)} <span className="text-xl">kg</span></p>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-center text-xl mb-2">Points Earned</p>
                                                    <p className="text-5xl font-bold text-center bg-gradient-to-r from-blue-400 to-lime-400 bg-clip-text text-transparent">
                                                        +{(activeSession.pointsEarned).toFixed(2)} DECH
                                                    </p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ) : (
                                        <Card className="bg-slate-900 border-slate-700 text-center py-12">
                                            <CardContent>
                                                <Zap className="w-16 h-16 mx-auto text-slate-600 mb-4" />
                                                <h2 className="text-2xl font-bold text-slate-300">No Active Charging Session</h2>
                                                <p className="text-slate-500 mt-2">Go to the map to start a new session.</p>
                                                <Link href="/" passHref>
                                                    <Button className="mt-4 bg-lime-500 hover:bg-lime-600 text-slate-900 font-bold">
                                                        Go to Map
                                                    </Button>
                                                </Link>
                                            </CardContent>
                                        </Card>
                                    )}
                                </TabsContent>

                                <TabsContent value="history" className="mt-6">
                                     <Card className="bg-slate-900 border-slate-700">
                                        <CardHeader>
                                            <CardTitle className="text-blue-400">Recent Sessions</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {isLoadingHistory ? (
                                                 <div className="text-center p-8">Loading session history...</div>
                                            ) : pastSessions.length > 0 ? (
                                                <div className="space-y-3">
                                                    {pastSessions.map(session => (
                                                        <div key={session.publicKey} className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                                                            <div>
                                                                <p className="font-mono text-sm">{session.chargerId}</p>
                                                                <p className="text-xs text-slate-400">{new Date(session.timestamp * 1000).toLocaleString()}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                 <p className="font-bold text-lime-400">+{session.points.toFixed(4)} DECH</p>
                                                                 <p className="text-xs text-slate-400">{session.energyUsed.toFixed(3)} kWh</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center p-8">
                                                    <History className="w-12 h-12 mx-auto text-slate-600 mb-4" />
                                                    <p className="text-slate-400">No session history found for this wallet.</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            </Tabs>
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
