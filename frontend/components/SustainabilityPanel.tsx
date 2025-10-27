"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Leaf, Footprints } from "lucide-react";

interface SustainabilityData {
    totalEnergy: number;
    co2Saved: number;
    totalSessions: number;
}

export function SustainabilityPanel() {
    const [data, setData] = useState<SustainabilityData | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sustainability-insights`);
                const insights = await res.json();
                setData(insights);
            } catch (error) {
                console.error("Failed to fetch sustainability insights:", error);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 15000); // Refresh every 15 seconds
        return () => clearInterval(interval);
    }, []);

    const stats = [
        {
            icon: <Zap className="h-6 w-6 text-lime-400" />,
            label: "Total Energy Delivered",
            value: data ? `${(data.totalEnergy / 1000).toFixed(2)} kWh` : "Loading...",
            description: "Energy supplied to vehicles across the network.",
        },
        {
            icon: <Leaf className="h-6 w-6 text-lime-400" />,
            label: "CO2 Emissions Saved",
            value: data ? `${(data.co2Saved / 1000).toFixed(2)} tonnes` : "Loading...",
            description: "Estimated reduction in carbon footprint.",
        },
        {
            icon: <Footprints className="h-6 w-6 text-lime-400" />,
            label: "Total Charging Sessions",
            value: data ? data.totalSessions.toLocaleString() : "Loading...",
            description: "Completed charging sessions by all users.",
        },
    ];

    return (
        <Card className="bg-slate-900 border-slate-700 text-white">
            <CardHeader>
                <CardTitle className="text-lime-400">Sustainability Insights</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {stats.map((stat, index) => (
                        <div key={index} className="flex items-start space-x-4">
                            <div className="bg-slate-800 p-3 rounded-full">
                                {stat.icon}
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">{stat.label}</p>
                                <p className="text-2xl font-bold text-white">{stat.value}</p>
                                <p className="text-xs text-slate-500">{stat.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
