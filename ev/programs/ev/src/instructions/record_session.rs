use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo};
use anchor_spl::associated_token::AssociatedToken;
use crate::{state::*, events::*};

#[derive(Accounts)]
#[instruction(charger_code: String)]
pub struct RecordSession<'info> {
    #[account(mut, seeds=[b"platform"], bump, has_one = mint)]
    pub platform_state: Account<'info, PlatformState>,
    
    #[account(mut, seeds=[b"driver", driver.key().as_ref()], bump)]
    pub driver_account: Account<'info, DriverAccount>,
    
    #[account(init, payer = driver, space = 8 + ChargingSession::INIT_SPACE)]
    pub session: Account<'info, ChargingSession>,
    
    #[account(mut)]
    pub driver: Signer<'info>,
    
    /// CHECK: Mint authority PDA
    #[account(seeds=[b"mint_authority"], bump)]
    pub mint_authority: AccountInfo<'info>,
    
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    
    #[account(init_if_needed, payer = driver, associated_token::mint = mint, associated_token::authority = driver)]
    pub driver_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<RecordSession>,
    charger_code: String,
    energy_used_milli_kwh: u64,
) -> Result<()> {
   
    let points = energy_used_milli_kwh.checked_mul(1000000).unwrap();

    // Derive mint authority bump for signing
    let (mint_authority_key, mint_authority_bump) = 
        Pubkey::find_program_address(&[b"mint_authority"], ctx.program_id);
    
    require_keys_eq!(
        mint_authority_key,
        ctx.accounts.mint_authority.key(),
    );
    
    let mint_authority_seeds = &[
        b"mint_authority".as_ref(),
        &[mint_authority_bump],
    ];
    let signer_seeds = &[&mint_authority_seeds[..]];
    
    // Mint tokens to driver using platform's mint authority
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.driver_token_account.to_account_info(),
            authority: ctx.accounts.mint_authority.to_account_info(),
        },
        signer_seeds,
    );
    token::mint_to(cpi_ctx, points)?;

    let energy_used_kwh = energy_used_milli_kwh.checked_div(1000).unwrap_or(0);

    ctx.accounts.session.driver = ctx.accounts.driver.key();
    ctx.accounts.session.charger_code = charger_code.clone();
    ctx.accounts.session.energy_used = energy_used_kwh;
    ctx.accounts.session.points_earned = points; // store minted points on the session (smallest units)
    ctx.accounts.session.timestamp = Clock::get()?.unix_timestamp;

    let driver_acc = &mut ctx.accounts.driver_account;
    driver_acc.total_points = driver_acc.total_points.checked_add(points).unwrap();
    driver_acc.total_energy = driver_acc.total_energy.checked_add(energy_used_kwh).unwrap();
    driver_acc.session_count = driver_acc.session_count.checked_add(1).unwrap();

    let platform_acc = &mut ctx.accounts.platform_state;
    platform_acc.total_sessions = platform_acc.total_sessions.checked_add(1).unwrap();

    // Emit an event
    emit!(SessionRecorded {
        driver: ctx.accounts.driver.key(),
        charger_code,
        energy_used: energy_used_kwh,
        points,
    });

    Ok(())
}
