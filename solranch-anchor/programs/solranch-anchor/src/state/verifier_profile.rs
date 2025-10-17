use anchor_lang::prelude::*;

// Represents a verifier authority that can verify ranches, and register animals in a ranch
#[account]
#[derive(InitSpace)]
pub struct VerifierProfile {
    pub authority: Pubkey,
    #[max_len(50)]
    pub name: String,
    pub is_active: bool,
    pub bump: u8
}