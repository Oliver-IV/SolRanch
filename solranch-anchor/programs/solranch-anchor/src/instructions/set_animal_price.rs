use anchor_lang::prelude::*;

use crate::state::Animal ;
use crate::state::RanchProfile ;

#[derive(Accounts)]
pub struct SetAnimalPrice<'info> {
    #[account(
        mut,
        has_one = owner,
        seeds = [
            b"ranch_animal",
            origin_ranch.key().as_ref(),
            &animal.id.to_le_bytes()
        ],
        bump = animal.bump
    )]
    pub animal: Account<'info, Animal>,
    pub owner: Signer<'info>,
    #[account()]
    pub origin_ranch: Account<'info, RanchProfile>,
    pub system_program: Program<'info, System>
}