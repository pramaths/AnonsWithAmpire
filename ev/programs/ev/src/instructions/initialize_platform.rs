use anchor_lang::prelude::*;
use crate::state::PlatformState;
use anchor_spl::token::{Mint, Token};

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(init, payer = admin, space = 8 + PlatformState::INIT_SPACE, seeds=[b"platform"], bump)]
    pub platform_state: Account<'info, PlatformState>,

    #[account(seeds=[b"mint_authority"], bump)]
    /// CHECK: This is the mint authority for the platform token, which is a PDA.
    pub mint_authority: AccountInfo<'info>,

    #[account(init, payer = admin, mint::decimals = 6, mint::authority = mint_authority)]
    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}


pub fn handler(ctx: Context<InitializePlatform>, fee_bps: u64) -> Result<()> {
    let platform_state = &mut ctx.accounts.platform_state;
    platform_state.mint = ctx.accounts.mint.key();
    platform_state.admin = ctx.accounts.admin.key();
    platform_state.total_sessions = 0;
    platform_state.fee_bps = fee_bps;

    Ok(())
}