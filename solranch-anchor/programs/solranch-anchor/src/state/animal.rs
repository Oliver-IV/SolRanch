use anchor_lang::prelude::*;

// Represents an Animal that owns the Ranch/Rancher
#[account]
#[derive(InitSpace)]
pub struct Animal {
    pub id: u64,
    pub owner: Pubkey,
    pub origin_ranch: Pubkey,
    #[max_len(100)]
    pub id_chip: String,
    #[max_len(30)]
    pub specie: String,
    #[max_len(30)]
    pub breed: String,
    pub birth_date: i64,
    pub last_sale_price: u64,
    pub sale_price: Option<u64>,
    pub allowed_buyer: Option<Pubkey>,
    pub bump: u8
}