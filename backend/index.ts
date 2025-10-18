import express from 'express';
import type { Request, Response } from 'express';
import winston from 'winston';
import cors from 'cors';
import dotenv from 'dotenv';
import * as anchor from '@coral-xyz/anchor';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import type { Ev } from './ev.js';
import idl from './ev.json' with { type: "json" };
import { startSession, getSessionStatus, stopSession } from './controllers/sessions.js';
import { promises as fs } from 'fs';

dotenv.config();
const app = express();

let chargePointsData: any = {};

const loadChargePoints = async () => {
    try {
        const data = await fs.readFile('./charge_points.json', 'utf8');
        chargePointsData = JSON.parse(data);
        logger.info('Successfully loaded charge points data.');
    } catch (error) {
        logger.error('Failed to load charge points data:', error);
    }
};

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ],
});

app.use(cors());
app.use(express.json());

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL!;
const PROGRAM_ID = process.env.PROGRAM_ID!;
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY!;

if (!SOLANA_RPC_URL || !PROGRAM_ID || !ADMIN_PRIVATE_KEY) {
    throw new Error("Missing required environment variables!");
}

const adminSecretKey = Uint8Array.from(JSON.parse(ADMIN_PRIVATE_KEY));
const adminKeypair = Keypair.fromSecretKey(adminSecretKey);
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
const wallet = new anchor.Wallet(adminKeypair);
const provider = new anchor.AnchorProvider(connection, wallet, anchor.AnchorProvider.defaultOptions());
const program = new anchor.Program<Ev>(idl as Ev, provider);

app.get('/', (req: Request, res: Response) => {
    logger.info('Root endpoint hit');
    res.send('Welcome to the EV Charge Points API!');
});

app.get('/api/charge_points', (req: Request, res: Response) => {
  logger.info('Request for charge points data');
  res.json(chargePointsData);
});

app.post('/api/sessions/start', (req, res) => startSession(req, res, program, adminKeypair, connection));
app.get('/api/sessions/:sessionId/status', getSessionStatus);
app.post('/api/sessions/stop', (req, res) => stopSession(req, res, program, connection));

app.get('/api/drivers', async (req: Request, res: Response) => {
    logger.info('GET /api/drivers hit');
    try {
        const drivers = await program.account.driverAccount.all();
        res.status(200).json(drivers);
    } catch (error) {
        logger.error('Error in /api/drivers:', error);
        if (error instanceof Error) {
            res.status(500).json({ error: 'Failed to fetch drivers.', details: error.message });
        } else {
            res.status(500).json({ error: 'An unknown error occurred.' });
        }
    }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
    await loadChargePoints();
    setInterval(loadChargePoints, 3600000); // Refresh every hour
    logger.info(`Server is running on http://localhost:${PORT}`);
});
