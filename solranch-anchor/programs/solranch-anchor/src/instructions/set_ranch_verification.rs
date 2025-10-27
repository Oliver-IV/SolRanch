use anchor_lang::prelude::*;
use crate::state::RanchProfile; 
use crate::SUPER_AUTHORITY;
use crate::errors::SolranchError; 

#[derive(Accounts)]
pub struct SetRanchVerification<'info> {
    #[account(
        mut,
        seeds = [b"ranch", ranch_profile.authority.as_ref()],
        bump = ranch_profile.bump
    )]
    pub ranch_profile: Account<'info, RanchProfile>,

    #[account(
        mut,
        constraint = super_authority.key() == SUPER_AUTHORITY @ SolranchError::UnauthorizedError
    )]
    pub super_authority: Signer<'info>,
}