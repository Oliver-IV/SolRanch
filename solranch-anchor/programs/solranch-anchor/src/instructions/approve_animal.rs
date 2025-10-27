use anchor_lang::prelude::*;
use crate::state::Animal; // Importar estado Animal
use crate::errors::SolranchError;

#[derive(Accounts)]
pub struct ApproveAnimal<'info> {
    #[account(
        mut,
        has_one = assigned_verifier @ SolranchError::UnauthorizedVerifierError,
         seeds = [
             b"ranch_animal",
             animal.origin_ranch.as_ref(),
             &animal.id.to_le_bytes()
         ],
         bump = animal.bump
    )]
    pub animal: Account<'info, Animal>,

    #[account(mut)] 
    pub assigned_verifier: Signer<'info>,
    pub system_program: Program<'info, System>,
}