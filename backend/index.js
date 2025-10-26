import express, {} from 'express';
import winston from 'winston';
import cors from 'cors';
import dotenv from 'dotenv';
import * as anchor from '@coral-xyz/anchor';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import idl from './ev.json' with { type: "json" };
import { startSession, getSessionStatus, stopSession, getSessionHistory, getLiveSessions } from './controllers/sessions.js';
import { getAllDrivers, createDriverApprovalTransaction } from './controllers/drivers.js';
import { promises as fs } from 'fs';
dotenv.config();
const app = express();
let chargePointsData = {};
let platformState = null;
const loadChargePoints = async () => {
    try {
        const data = await fs.readFile('./charge_points.json', 'utf8');
        chargePointsData = JSON.parse(data);
        logger.info('Successfully loaded charge points data.');
    }
    catch (error) {
        logger.error('Failed to load charge points data:', error);
    }
};
const loadPlatformState = async () => {
    try {
        const [platformStatePda] = PublicKey.findProgramAddressSync([Buffer.from("platform")], program.programId);
        platformState = await program.account.platformState.fetch(platformStatePda);
        logger.info('Successfully loaded platform state.');
    }
    catch (error) {
        logger.error('Failed to load platform state:', error);
    }
};
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    transports: [
        new winston.transports.Console()
    ],
});
app.use(cors());
app.use(express.json());
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL;
const PROGRAM_ID = process.env.PROGRAM_ID;
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
if (!SOLANA_RPC_URL || !PROGRAM_ID || !ADMIN_PRIVATE_KEY) {
    throw new Error("Missing required environment variables!");
}
const adminKeypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(ADMIN_PRIVATE_KEY)));
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
const wallet = new anchor.Wallet(adminKeypair);
const provider = new anchor.AnchorProvider(connection, wallet, anchor.AnchorProvider.defaultOptions());
const program = new anchor.Program(idl, provider);
app.get('/', (req, res) => {
    logger.info('Root endpoint hit');
    res.send('Welcome to the EV Charge Points API!');
});
app.get('/api/config', (req, res) => {
    if (platformState) {
        res.json({
            mint: platformState.mint.toBase58()
        });
    }
    else {
        res.status(503).json({ error: "Platform state not initialized yet." });
    }
});
app.get('/api/charge_points', (req, res) => {
    logger.info('Request for charge points data');
    res.json(chargePointsData);
});
app.post('/api/sessions/start', (req, res) => startSession(req, res, program, adminKeypair, connection));
app.get('/api/sessions/:sessionId/status', getSessionStatus);
app.post('/api/sessions/stop', (req, res) => stopSession(req, res, program, connection));
app.get('/api/sessions/history/:driverPublicKey', (req, res) => getSessionHistory(req, res, program));
app.get('/api/sessions/live', getLiveSessions);
// Driver data endpoint
app.get('/api/drivers', (req, res) => getAllDrivers(req, res, program));
app.post('/api/drivers/approve-transaction', (req, res) => createDriverApprovalTransaction(req, res, program, connection));
const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
    await loadChargePoints();
    await loadPlatformState();
    logger.info(`Server is running on http://localhost:${PORT}`);
});
export default app;
//# sourceMappingURL=index.js.map