'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const SustainabilityPanel = () => {
    const stats = [
        { label: 'Total Energy Delivered', value: 1250, unit: 'kWh', icon: '⚡', color: 'from-yellow-400 to-orange-500' },
        { label: 'CO₂ Saved', value: 500, unit: 'kg', icon: '🌍', color: 'from-green-400 to-emerald-500' },
        { label: 'Total Points Minted', value: 25000, unit: 'DECH', icon: '💎', color: 'from-blue-400 to-cyan-500' },
    ];

    return (
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-blue-500/30 shadow-xl">
            <CardHeader>
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-lime-400 to-green-400 bg-clip-text text-transparent">
                    🌱 Sustainability Insights
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {stats.map((stat, index) => (
                        <motion.div 
                            key={stat.label}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="relative overflow-hidden rounded-lg bg-slate-800/50 p-4 border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm text-slate-400 font-medium">{stat.label}</p>
                                <span className="text-2xl">{stat.icon}</span>
                            </div>
                            <p className={`text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                                <motion.span 
                                    initial={{ opacity: 0, scale: 0.5 }} 
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.1 + 0.2, type: "spring" }}
                                >
                                    {stat.value.toLocaleString()}
                                </motion.span> 
                                <span className="text-lg text-slate-500 ml-1">{stat.unit}</span>
                            </p>
                            <div className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r ${stat.color} w-full opacity-50`}></div>
                        </motion.div>
                    ))}
                </div>
                <div className="mt-6 pt-6 border-t border-slate-700/50">
                    <motion.div 
                        className="bg-gradient-to-r from-green-500/10 to-lime-500/10 p-4 rounded-lg border border-green-500/20"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        <p className="flex items-center text-sm">
                            <span className="text-3xl mr-3">🌱</span>
                            <span className="text-slate-300">
                                Your last session offset <span className="font-bold text-green-400">0.8 kg</span> of CO₂
                            </span>
                        </p>
                    </motion.div>
                </div>
            </CardContent>
        </Card>
    );
};

export default SustainabilityPanel;
