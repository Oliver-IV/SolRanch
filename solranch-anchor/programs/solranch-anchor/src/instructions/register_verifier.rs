use anchor_lang::prelude::*;
use crate::state::VerifierProfile;
use crate::SUPER_AUTHORITY;
use crate::SolranchError;

#[derive(Accounts)]
#[instruction(verifier_authority: Pubkey)]
pub struct RegisterVerifier<'info> {
    #[account(
        init,
        payer = super_authority,
        space = 8 + 32 + 4 + 50 + 1 + 1,
        seeds = [
            b"verifier",
            verifier_authority.as_ref()
        ],
        bump
    )]
    pub verifier_profile: Account<'info, VerifierProfile>,
    #[account(
        mut,
        constraint = super_authority.key() == SUPER_AUTHORITY @ SolranchError::UnauthorizedError
    )]
    pub super_authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}