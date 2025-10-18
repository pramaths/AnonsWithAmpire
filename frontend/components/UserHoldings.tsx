'use client';
import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { toast } from 'sonner';

const UserHoldings = () => {
    const [balance, setBalance] = useState(0);
    const { publicKey } = useWallet();
    const { connection } = useConnection();

    useEffect(() => {
        const fetchBalance = async () => {
            if (!publicKey) return;

            try {
                const configResponse = await fetch('http://localhost:3001/api/config');
                if (!configResponse.ok) throw new Error('Failed to fetch token mint');
                const { mint: mintAddress } = await configResponse.json();
                const mintPublicKey = new PublicKey(mintAddress);
                
                const tokenAccount = getAssociatedTokenAddressSync(mintPublicKey, publicKey);
                
                const tokenBalance = await connection.getTokenAccountBalance(tokenAccount);

                setBalance(tokenBalance.value.uiAmount || 0);

            } catch (error) {
                // It's common for the token account to not exist yet, so we don't need to show an error.
                // We'll just show a balance of 0.
                setBalance(0);
            }
        };

        fetchBalance();
        const interval = setInterval(fetchBalance, 10000); // Refresh every 10 seconds

        return () => clearInterval(interval);
    }, [publicKey, connection]);

    return (
        <div className="bg-slate-800/50 p-4 rounded-lg">
            <h2 className="text-white text-lg font-semibold mb-2">Your Holdings</h2>
            <div className="text-lime-400 text-2xl font-bold">{balance.toFixed(2)} DECH</div>
        </div>
    );
};

export default UserHoldings;
