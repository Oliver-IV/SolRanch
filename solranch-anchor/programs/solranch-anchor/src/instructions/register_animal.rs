use anchor_lang::prelude::*;

use crate::state::Animal ;
use crate::state::RanchProfile ;
use crate::state::VerifierProfile ;
use crate::SolranchError ;

#[derive(Accounts)]
pub struct RegisterAnimal<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 104 + 34 + 34 + 8 + 1 + 8 + 9 + 33,
        seeds = [
            b"ranch_animal",
            ranch_profile.key().as_ref(),
            &ranch_profile.animal_count.to_le_bytes()
        ],
        bump
    )]
    pub animal: Account<'info, Animal>,
    #[account(
        constraint = verifier_profile.is_active @ SolranchError::InvalidVerifierError,
        seeds = [
            b"verifier",
            verifier.key().as_ref()
        ],
        bump
    )]
    pub verifier_profile: Account<'info, VerifierProfile>,
    #[account(
        mut,
        has_one = authority,
        constraint = ranch_profile.is_verified @ SolranchError::RanchNotVerifiedError
    )]
    pub ranch_profile: Account<'info, RanchProfile>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut)]
    pub verifier: Signer<'info>,
    pub system_program: Program<'info, System>
}