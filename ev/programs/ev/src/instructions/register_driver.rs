use anchor_lang::prelude::*;
use crate::state::{DriverAccount, PlatformState};

#[derive(Accounts)]
#[instruction(driver_pubkey: Pubkey, price_per_point: u64)]
pub struct RegisterDriver<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + DriverAccount::INIT_SPACE,
        seeds=[b"driver", driver_pubkey.as_ref()],
        bump
    )]
    pub driver_account: Account<'info, DriverAccount>,

    #[account(has_one = admin)]
    pub platform_state: Account<'info, PlatformState>,

    #[account(mut)]
    pub admin: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RegisterDriver>, driver_pubkey: Pubkey, price_per_point: u64) -> Result<()> {
    let driver_account = &mut ctx.accounts.driver_account;
    driver_account.driver = driver_pubkey;
    driver_account.total_energy = 0;
    driver_account.total_points = 0;
    driver_account.session_count = 0;
    driver_account.points_balance = 0;
    driver_account.price_per_point = price_per_point;
    driver_account.active = true;
    Ok(())
}