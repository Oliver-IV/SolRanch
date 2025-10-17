use anchor_lang::prelude::*;

use crate::state::Animal ;
use crate::state::RanchProfile ;
use crate::state::VerifierProfile ;


#[derive(Accounts)]
pub struct PurchaseAnimal<'info> {
    #[account(
        mut,
        has_one = owner,
        constraint = animal.allowed_buyer.unwrap() == buyer.key(),
        seeds = [
            b"ranch_animal",
            animal.ranch.key().as_ref(),
            &animal.id.to_le_bytes()
        ],
        bump = animal.bump
    )]
    animal: Account<'info, Animal>,
    owner: AccountInfo<'info>,
    buyer: Signer<'info,>,
    system_program: Program<'info, System>
}