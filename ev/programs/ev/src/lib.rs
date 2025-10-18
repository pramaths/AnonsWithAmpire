use anchor_lang::prelude::*;

pub mod state;
pub mod instructions;
pub mod events;
pub mod errors;

use instructions::*;

declare_id!("F9arbAcT5maXyWD51QyCviogmSXTJLKgvaaP44YscwUt");

#[program]
pub mod ev {
    use super::*;

    pub fn initialize_platform(ctx: Context<InitializePlatform>, fee_bps: u64) -> Result<()> {
        instructions::initialize_platform::handler(ctx, fee_bps)
    }

    pub fn register_driver(ctx: Context<RegisterDriver>, driver_pubkey: Pubkey, price_per_point: u64) -> Result<()> {
        instructions::register_driver::handler(ctx, driver_pubkey, price_per_point)
    }

    pub fn approve_platform_access(ctx: Context<ApprovePlatformAccess>, active: bool, delegate_amount: u64) -> Result<()> {
        instructions::approve_platform_access::handler(ctx, active, delegate_amount)
    }

    pub fn record_session(ctx: Context<RecordSession>, charger_code: String, energy_used: u64) -> Result<()> {
        instructions::record_session::handler(ctx, charger_code, energy_used)
    }

    pub fn buy_points(ctx: Context<BuyPoints>, amount: u64, sol_payment: u64) -> Result<()> {
        instructions::buy_points::handler(ctx, amount, sol_payment)
    }
}
