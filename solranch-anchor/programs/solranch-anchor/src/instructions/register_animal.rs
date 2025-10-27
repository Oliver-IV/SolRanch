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
        space = 8 + 450, 
        seeds = [
            b"ranch_animal",
            ranch_profile.key().as_ref(),
            &ranch_profile.animal_count.to_le_bytes()
        ],
        bump
    )]
    pub animal: Account<'info, Animal>,

    #[account(
        constraint = verifier_profile.is_active @ SolranchError::InactiveVerifierError,
        seeds = [
            b"verifier",
            verifier_profile.authority.as_ref() 
        ],
        bump = verifier_profile.bump
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
    
    pub system_program: Program<'info, System>,
}