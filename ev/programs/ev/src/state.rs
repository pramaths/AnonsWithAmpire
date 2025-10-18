use anchor_lang::prelude::*;

#[account]
pub struct PlatformState{
    pub admin : Pubkey,
    pub mint : Pubkey,
    pub total_sessions: u64,
    pub fee_bps: u64,
}

#[account]
pub struct DriverAccount{
    pub driver: Pubkey,
    pub total_energy: u64,
    pub total_points: u64,
    pub session_count: u64,
    pub points_balance: u64,
    pub price_per_point: u64,
    pub active: bool,
}

#[account]
pub struct ChargingSession{
    pub driver: Pubkey,
    pub charger_code: String,
    pub energy_used: u64,
    pub points_earned: u64,
    pub timestamp: i64,
}

impl PlatformState {
    pub const INIT_SPACE: usize = 32 + 32 + 8 + 8; 
}

impl DriverAccount {
    pub const INIT_SPACE: usize = 32 + 8 + 8 + 8 + 8 + 8 + 1;
}

impl ChargingSession {
    pub const INIT_SPACE: usize = 32 + 4 + 16 + 8 + 8 + 8;
}