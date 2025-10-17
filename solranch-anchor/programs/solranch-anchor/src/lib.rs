use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;
pub mod types;
use crate::instructions::* ;
use crate::state::* ;
use types::*;
use errors::*;
use constants::*;

declare_id!("9eFLjxiANcZ7ifkQRHZjcFeWhZcTWm67oUg1u1GSDeGx");

#[program]
pub mod solranch_anchor {

    use super::*;

    pub fn register_ranch(ctx: Context<RegisterRanch>, name:String, country: Country) -> Result<()> {
        let ranch = &mut ctx.accounts.ranch_profile;
        ranch.authority = ctx.accounts.authority.key();
        ranch.name = name;
        ranch.country = country;
        ranch.is_verified = false;
        ranch.animal_count = 0;
        Ok(())
    }

    pub fn register_animal(ctx: Context<RegisterAnimal>, id_chip: String, specie: String, breed: String, birth_date: i64) -> Result<()> {
        Ok(())
    }

    pub fn set_animal_price(ctx: Context<SetAnimalPrice>) -> Result<()> {
        Ok(())
    }

    pub fn set_allowed_animal_buyer(ctx: Context<SetAllowedAnimalBuyer>) -> Result<()> {
        Ok(())
    }

    pub fn purchase_animal(ctx: Context<PurchaseAnimal>) -> Result<()> {
        Ok(())
    }

    
}
