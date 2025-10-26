import type { Request, Response } from 'express';
import { Program } from '@coral-xyz/anchor';
import { Connection, Keypair } from '@solana/web3.js';
import type { Ev } from '../ev.js';
export declare const startSession: (req: Request, res: Response, program: Program<Ev>, adminKeypair: Keypair, connection: Connection) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getSessionStatus: (req: Request, res: Response) => Response<any, Record<string, any>> | undefined;
export declare const stopSession: (req: Request, res: Response, program: Program<Ev>, connection: Connection) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getSessionHistory: (req: Request, res: Response, program: Program<Ev>) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getLiveSessions: (req: Request, res: Response) => void;
//# sourceMappingURL=sessions.d.ts.map