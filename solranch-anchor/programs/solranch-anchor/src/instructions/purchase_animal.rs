use anchor_lang::prelude::*;

use crate::state::Animal ;


#[derive(Accounts)]
pub struct PurchaseAnimal<'info> {
    #[account(
        mut,
        has_one = owner,
        constraint = animal.allowed_buyer.unwrap() == buyer.key(),
        seeds = [
            b"ranch_animal",
            animal.origin_ranch.key().as_ref(),
            &animal.id.to_le_bytes()
        ],
        bump = animal.bump
    )]
    pub animal: Account<'info, Animal>,
    /// CHECK: This is the previous owner account, the one that recieves the money.
    /// This is secure because we checke the condition `has_one = owner` in the 'animal' account.
    #[account(mut)]
    pub owner: AccountInfo<'info>,
    #[account(mut)]
    pub buyer: Signer<'info,>,
    pub system_program: Program<'info, System>
}