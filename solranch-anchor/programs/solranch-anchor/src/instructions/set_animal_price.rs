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
            ranch.key().as_ref(),
            &animal.id.to_le_bytes()
        ],
        bump = animal.bump
    )]
    animal: Account<'info, Animal>,
    owner: Signer<'info>,
    #[account()]
    ranch: Account<'info, RanchProfile>,
    system_program: Program<'info, System>
}