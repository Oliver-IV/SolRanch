use anchor_lang::prelude::*;
use crate::state::{Animal, RanchProfile};
use crate::errors::SolranchError;

#[derive(Accounts)]
pub struct CancelAnimalRegistration<'info> {
    #[account(
        mut,
        constraint = !animal.is_verified @ SolranchError::CannotCancelVerifiedAnimalError,
        constraint = (signer.key() == animal.owner) || (signer.key() == animal.assigned_verifier) @ SolranchError::UnauthorizedCancellationSignerError,
        close = receiver,
        seeds = [
            b"ranch_animal",
            animal.origin_ranch.as_ref(), 
            &animal.id.to_le_bytes()
        ],
        bump = animal.bump
    )]
    pub animal: Account<'info, Animal>,
    
    #[account(
        mut,
        has_one = authority @ SolranchError::UnauthorizedError,
        seeds = [b"ranch", animal.owner.as_ref()], 
        bump = ranch_profile.bump
    )]
    pub ranch_profile: Account<'info, RanchProfile>,
    
    #[account(mut)] 
    pub signer: Signer<'info>,
    
    /// CHECK: The authority associated with the RanchProfile.
    pub authority: AccountInfo<'info>,

    /// CHECK: This account receives the lamports from the closed 'animal' account.
    #[account(mut)]
    pub receiver: AccountInfo<'info>, 

    pub system_program: Program<'info, System>,
}