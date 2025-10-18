use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{DriverAccount, PlatformState};

#[derive(Accounts)]
pub struct BuyPoints<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    #[account(
        mut, 
        seeds=[b"driver", driver.key().as_ref()], 
        bump,
        has_one = driver,
        constraint = driver_account.active @ ErrorCode::DriverNotActive
    )]
    pub driver_account: Account<'info, DriverAccount>,
    
    #[account(seeds=[b"platform"], bump)]
    pub platform_state: Account<'info, PlatformState>,
    
    #[account(seeds=[b"platform_authority"], bump)]
    /// CHECK: This is not dangerous because we do not write to this account.
    pub platform_authority: AccountInfo<'info>,
    
    #[account(mut)]
    /// CHECK: The driver account is validated by the has_one constraint on driver_account.
    pub driver: AccountInfo<'info>,
    
    #[account(
        mut, 
        constraint = driver_token_account.owner == driver.key(),
        constraint = driver_token_account.delegate.unwrap() == platform_authority.key() @ ErrorCode::NoDelegation
    )]
    pub driver_token_account: Account<'info, TokenAccount>,
    
    #[account(mut, constraint = buyer_token_account.owner == buyer.key())]
    pub buyer_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<BuyPoints>, amount: u64, sol_payment: u64) -> Result<()> {
    let driver_account = &ctx.accounts.driver_account;
    
    // Verify driver has approved platform access
    require!(driver_account.active, ErrorCode::DriverNotActive);
    
    // Transfer SOL from buyer to driver for the points
    let ix = anchor_lang::solana_program::system_instruction::transfer(
        &ctx.accounts.buyer.key(),
        &ctx.accounts.driver.key(),
        sol_payment,
    );
    anchor_lang::solana_program::program::invoke(
        &ix,
        &[
            ctx.accounts.buyer.to_account_info(),
            ctx.accounts.driver.to_account_info(),
        ],
    )?;
    
    // Derive platform authority bump seed for signing
    let (platform_authority_key, platform_authority_bump) = 
        Pubkey::find_program_address(&[b"platform_authority"], ctx.program_id);
    
    require_keys_eq!(
        platform_authority_key,
        ctx.accounts.platform_authority.key(),
        ErrorCode::InvalidPlatformAuthority
    );
    
    let authority_seeds = &[
        b"platform_authority".as_ref(),
        &[platform_authority_bump],
    ];
    let signer_seeds = &[&authority_seeds[..]];
    
    // Transfer points (tokens) from driver to buyer using delegated authority
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.driver_token_account.to_account_info(),
            to: ctx.accounts.buyer_token_account.to_account_info(),
            authority: ctx.accounts.platform_authority.to_account_info(),
        },
        signer_seeds,
    );
    token::transfer(cpi_ctx, amount)?;
    
    msg!("Transferred {} points from driver {} to buyer {} for {} SOL", 
        amount, 
        ctx.accounts.driver.key(), 
        ctx.accounts.buyer.key(),
        sol_payment
    );
    
    Ok(())
}

#[error_code]
pub enum ErrorCode {
    #[msg("Driver has not approved platform access for selling points")]
    DriverNotActive,
    #[msg("Driver has not delegated authority to platform")]
    NoDelegation,
    #[msg("Invalid platform authority")]
    InvalidPlatformAuthority,
}
