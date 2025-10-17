use anchor_lang::prelude::*;

use crate::state::RanchProfile ;

#[derive(Accounts)]
pub struct RegisterRanch<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 54 + 1 + 1 + 8 + 1,
        seeds = [
            b"ranch",
            authority.key().as_ref()
        ],
        bump
    )]
    pub ranch_profile: Account<'info, RanchProfile>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>
}