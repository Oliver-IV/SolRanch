use anchor_lang::prelude::*;
use crate::state::RanchProfile;
use crate::SUPER_AUTHORITY;
use crate::SolranchError;

#[derive(Accounts)]
pub struct VerifyRanch<'info> {
    #[account(
        mut
    )]
    pub ranch_profile: Account<'info, RanchProfile>,
    #[account(
        mut,
        constraint = super_authority.key() == SUPER_AUTHORITY 
            @ SolranchError::UnauthorizedError
    )]
    pub super_authority: Signer<'info>,
}