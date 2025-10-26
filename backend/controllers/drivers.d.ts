import type { Request, Response } from 'express';
import { Program } from '@coral-xyz/anchor';
import type { Ev } from '../ev.js';
import { Connection } from '@solana/web3.js';
export declare const getAllDrivers: (req: Request, res: Response, program: Program<Ev>) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createDriverApprovalTransaction: (req: Request, res: Response, program: Program<Ev>, connection: Connection) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=drivers.d.ts.map