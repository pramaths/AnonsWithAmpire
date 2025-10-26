"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Wallet2 } from "lucide-react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { toast } from "sonner";

interface Driver {
    publicKey: string;
    driver: string;
    totalEnergy: string;
    totalPoints: number;
    sessionCount: number;
    pricePerPoint: string;
    active: boolean;
    balance?: number; // Add balance to the interface
}

export function DriverMarketplace() {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();

    useEffect(() => {
        const fetchMintAndDrivers = async () => {
            try {
                // Fetch the mint address from the new config endpoint
                const configRes = await fetch('${process.env.NEXT_PUBLIC_BACKEND_URL}/api/config');
                const { mint } = await configRes.json();
                const mintPublicKey = new PublicKey(mint);

                // Fetch the drivers
                const driversRes = await fetch('${process.env.NEXT_PUBLIC_BACKEND_URL}/api/drivers');
                const driversData: Driver[] = await driversRes.json();

                // For each driver, fetch their token balance
                const driversWithBalances = await Promise.all(
                    driversData.map(async (driver) => {
                        try {
                            const driverPublicKey = new PublicKey(driver.driver);
                            const ata = getAssociatedTokenAddressSync(mintPublicKey, driverPublicKey);
                            const balance = await connection.getTokenAccountBalance(ata);
                            return {
                                ...driver,
                                balance: balance.value.uiAmount ?? 0,
                            };
                        } catch (e) {
                            // If ATA doesn't exist, balance is 0
                            return { ...driver, balance: 0 };
                        }
                    })
                );

                setDrivers(driversWithBalances);

            } catch (error) {
                console.error("Failed to fetch drivers or config:", error);
            }
        };

        fetchMintAndDrivers();
        const interval = setInterval(fetchMintAndDrivers, 15000);
        return () => clearInterval(interval);
    }, [connection]);

    const handleApprove = async (driver: Driver) => {
        if (!publicKey) {
            toast.error("Please connect your wallet first.");
            return;
        }

        const toastId = toast.loading("Preparing approval transaction...");

        try {
            // 1. Fetch the transaction from the backend
            const response = await fetch('${process.env.NEXT_PUBLIC_BACKEND_URL}/api/drivers/approve-transaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ driverPublicKey: driver.driver }),
            });
            const { transaction } = await response.json();

            // 2. Deserialize and sign the transaction with the wallet
            const tx = Transaction.from(Buffer.from(transaction, 'base64'));
            const signature = await sendTransaction(tx, connection);
            await connection.confirmTransaction(signature, 'confirmed');

            toast.success("Driver approved successfully!", {
                id: toastId,
                description: `Transaction: ${signature.substring(0, 10)}...`
            });

            // Refresh the driver list optimistically
            setDrivers(prev => prev.map(d => d.publicKey === driver.publicKey ? { ...d, active: true } : d));

        } catch (error) {
            console.error("Approval failed:", error);
            toast.error("Approval failed. See console for details.", { id: toastId });
        }
    };

    return (
        <Card className="bg-slate-900 border-slate-700 text-white">
            <CardHeader>
                <CardTitle className="text-lime-400">Driver Marketplace</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {drivers.map((driver) => (
                        <div key={driver.publicKey} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                            <div className="flex-1">
                                <p className="text-sm font-mono truncate" title={driver.driver}>
                                    {driver.driver}
                                </p>
                                <div className="flex items-center space-x-4 text-xs text-slate-400 mt-1">
                                    <span>{driver.sessionCount} sessions</span>
                                    <span>{parseFloat(driver.totalEnergy).toFixed(2)} kWh</span>
                                    <span className="flex items-center font-bold text-lime-400">
                                        <Wallet2 className="w-3 h-3 mr-1" />
                                        {driver.balance?.toFixed(2) ?? '0.00'} DECH
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button
                                    onClick={() => handleApprove(driver)}
                                    disabled={!publicKey || publicKey.toBase58() !== driver.driver || driver.active}
                                    variant="ghost"
                                    className="text-lime-400 hover:bg-lime-900/50 hover:text-lime-300"
                                >
                                    {driver.active ? "Approved" : "Approve"}
                                </Button>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <Info className="h-4 w-4 text-slate-400" />
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-slate-800 border-slate-700 text-white">
                                            <p>Approve the platform to sell your DECH tokens on your behalf.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
