use anchor_lang::prelude::*;
use crate::state::VerifierProfile; 
use crate::SUPER_AUTHORITY;
use crate::errors::SolranchError; 

#[derive(Accounts)]
pub struct ToggleVerifierStatus<'info> {
    #[account(
        mut,
        seeds = [b"verifier", verifier_profile.authority.as_ref()],
        bump = verifier_profile.bump
    )]
    pub verifier_profile: Account<'info, VerifierProfile>,

    #[account(
        mut,
        constraint = super_authority.key() == SUPER_AUTHORITY @ SolranchError::UnauthorizedError
    )]
    pub super_authority: Signer<'info>,
}