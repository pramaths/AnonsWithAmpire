'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { toast } from 'sonner';

const MintAnimation = () => {
    const [isMinting, setIsMinting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleMint = () => {
        setIsMinting(true);
        setTimeout(() => {
            setIsMinting(false);
            setShowSuccess(true);
            toast.success('🎉 Successfully minted 120 DECH tokens!', {
                description: 'Your tokens have been added to your wallet',
            });
        }, 2000);
        setTimeout(() => setShowSuccess(false), 4000);
    };

    return (
        <div className="relative min-h-[200px] flex items-center justify-center">
            <Button 
                onClick={handleMint}
                disabled={isMinting || showSuccess}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-6 px-8 rounded-xl text-lg shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 disabled:opacity-50"
            >
                {isMinting ? (
                    <span className="flex items-center gap-2">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                            ⚡
                        </motion.div>
                        Minting...
                    </span>
                ) : showSuccess ? (
                    '✅ Minted Successfully!'
                ) : (
                    '💎 End Session & Mint'
                )}
            </Button>

            <AnimatePresence>
                {isMinting && (
                    <>
                        {/* Token particles flying outward */}
                        {Array.from({ length: 20 }).map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                                animate={{ 
                                    opacity: 0, 
                                    scale: [0, 1.5, 0.5],
                                    x: (Math.random() - 0.5) * 500,
                                    y: (Math.random() - 0.5) * 500,
                                }}
                                exit={{ opacity: 0 }}
                                transition={{
                                    duration: 1.5,
                                    delay: i * 0.05,
                                    ease: "easeOut"
                                }}
                                className="absolute text-4xl pointer-events-none"
                            >
                                💎
                            </motion.div>
                        ))}

                        {/* Glow effect */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: [0, 0.5, 0], scale: [0, 2, 3] }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="absolute w-64 h-64 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full blur-3xl pointer-events-none"
                        />
                    </>
                )}

                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0 }}
                        transition={{ type: "spring", bounce: 0.5 }}
                        className="absolute -top-20 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-full shadow-2xl font-bold text-lg"
                    >
                        🎉 +120 DECH Tokens!
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MintAnimation;
