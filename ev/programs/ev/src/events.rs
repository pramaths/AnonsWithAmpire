use anchor_lang::prelude::*;

#[event]
pub struct SessionRecorded {
    pub driver: Pubkey,
    pub charger_code: String,
    pub energy_used: u64,
    pub points: u64,
}