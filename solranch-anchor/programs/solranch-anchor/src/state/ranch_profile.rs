use anchor_lang::prelude::*;
use crate::Country ;

// Represents a Ranch/Rancher
#[account]
#[derive(InitSpace)]
pub struct RanchProfile {
    pub authority: Pubkey,
    #[max_len(50)]
    pub name: String,
    pub country: Country,
    pub is_verified: bool,
    pub animal_count: u64,
    pub bump: u8
}