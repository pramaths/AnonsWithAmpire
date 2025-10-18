'use client';

import Link from 'next/link';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const Header = () => {
    return (
        <header className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-blue-500/20 backdrop-blur-lg">
            <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                <Link href="/" className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-lime-400 bg-clip-text text-transparent hover:scale-105 transition-transform">
                    ⚡ DeCharge
                </Link>
                <nav className="flex items-center gap-6">
                    <Link 
                        href="/sessions" 
                        className="text-slate-300 hover:text-blue-400 font-medium transition-colors relative group"
                    >
                        Sessions
                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-400 to-lime-400 group-hover:w-full transition-all duration-300"></span>
                    </Link>
                    <WalletMultiButton className="!bg-gradient-to-r !from-blue-600 !to-blue-500 hover:!from-blue-500 hover:!to-blue-400 !rounded-lg !transition-all !duration-300" />
                </nav>
            </div>
        </header>
    );
};

export default Header;
