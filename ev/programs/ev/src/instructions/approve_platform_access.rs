use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Approve, Revoke};
use crate::state::{DriverAccount, PlatformState};

#[derive(Accounts)]
pub struct ApprovePlatformAccess<'info> {
    #[account(mut, seeds=[b"driver", driver.key().as_ref()], bump, has_one = driver)]
    pub driver_account: Account<'info, DriverAccount>,
    
    #[account(seeds=[b"platform"], bump)]
    pub platform_state: Account<'info, PlatformState>,
    
    #[account(seeds=[b"platform_authority"], bump)]
    /// CHECK: This is not dangerous because we do not write to this account.
    pub platform_authority: AccountInfo<'info>,
    
    #[account(mut, constraint = driver_token_account.owner == driver.key())]
    pub driver_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub driver: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ApprovePlatformAccess>, active: bool, delegate_amount: u64) -> Result<()> {
    let driver_account = &mut ctx.accounts.driver_account;
    
    if active {
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Approve {
                to: ctx.accounts.driver_token_account.to_account_info(),
                delegate: ctx.accounts.platform_authority.to_account_info(),
                authority: ctx.accounts.driver.to_account_info(),
            },
        );
        token::approve(cpi_ctx, delegate_amount)?;
        
        driver_account.active = true;
        
        msg!("Driver {} approved platform access with delegation of {} tokens", 
            ctx.accounts.driver.key(), 
            delegate_amount
        );
    } else {
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Revoke {
                source: ctx.accounts.driver_token_account.to_account_info(),
                authority: ctx.accounts.driver.to_account_info(),
            },
        );
        token::revoke(cpi_ctx)?;
        
        driver_account.active = false;
        
        msg!("Driver {} revoked platform access", ctx.accounts.driver.key());
    }
    
    Ok(())
}

