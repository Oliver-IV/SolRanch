use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_lang::solana_program::pubkey;

pub mod errors;
pub mod instructions;
pub mod state;
pub mod types;
pub mod validations;
use crate::instructions::*;
use errors::*;
use types::*;
use validations::*;

const SUPER_AUTHORITY: Pubkey = pubkey!("9fKYWJwN4HNdhn44mZj1eExQLmB6k7M2GEoFZaipLHV4") ;

declare_id!("9eFLjxiANcZ7ifkQRHZjcFeWhZcTWm67oUg1u1GSDeGx");

#[program]
pub mod solranch_anchor {

    use super::*;

    pub fn register_ranch(
        ctx: Context<RegisterRanch>,
        name: String,
        country: Country,
    ) -> Result<()> {
        validate_register_ranch(&name)?;
        let ranch = &mut ctx.accounts.ranch_profile;
        ranch.authority = ctx.accounts.authority.key();
        ranch.name = name;
        ranch.country = country;
        ranch.is_verified = false;
        ranch.animal_count = 0;
        ranch.bump = ctx.bumps.ranch_profile;
        Ok(())
    }

    pub fn register_animal(
        ctx: Context<RegisterAnimal>,
        id_chip: String,
        specie: String,
        breed: String,
        birth_date: i64,
    ) -> Result<()> {
        validate_register_animal(&id_chip, &specie, &breed)?;
        let ranch_profile = &mut ctx.accounts.ranch_profile;
        let animal = &mut ctx.accounts.animal;
        animal.owner = ctx.accounts.authority.key();
        animal.origin_ranch = ranch_profile.key();
        animal.id = ranch_profile.animal_count;
        animal.id_chip = id_chip;
        animal.specie = specie;
        animal.breed = breed;
        animal.birth_date = birth_date;
        animal.allowed_buyer = None;
        animal.sale_price = None;
        animal.last_sale_price = 0;
        animal.bump = ctx.bumps.animal;
        ranch_profile.animal_count += 1;
        Ok(())
    }

    pub fn register_verifier(
        ctx: Context<RegisterVerifier>,
        verifier_authority: Pubkey,
        name: String
    ) -> Result<()> {
        let verifier = &mut ctx.accounts.verifier_profile;
        verifier.authority = verifier_authority;
        verifier.name = name;
        verifier.is_active = true;
        verifier.bump = ctx.bumps.verifier_profile;
        Ok(())
    }

    pub fn verify_ranch(ctx: Context<VerifyRanch>) -> Result<()> {
        let ranch = &mut ctx.accounts.ranch_profile;
        require!(ranch.is_verified == false, SolranchError::RanchAlreadyVerifiedError) ;
        ranch.is_verified = true;
        Ok(())
    }

    pub fn set_animal_price(ctx: Context<SetAnimalPrice>, price: u64) -> Result<()> {
        let animal = &mut ctx.accounts.animal;
        animal.sale_price = Some(price);
        Ok(())
    }

    pub fn set_allowed_animal_buyer(
        ctx: Context<SetAllowedAnimalBuyer>,
        allowed_buyer: Pubkey,
    ) -> Result<()> {
        let animal = &mut ctx.accounts.animal;
        animal.allowed_buyer = Some(allowed_buyer);
        Ok(())
    }

    pub fn purchase_animal(ctx: Context<PurchaseAnimal>) -> Result<()> {
        let old_owner = &mut ctx.accounts.owner;
        let new_owner = &mut ctx.accounts.buyer;
        let animal = &mut ctx.accounts.animal;
        let sale_price = match animal.sale_price {
            Some(price) => price,
            None => return err!(SolranchError::AnimalNotForSaleError)
        };
        validate_purchase_animal(&sale_price)?;
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: new_owner.to_account_info(),
                    to: old_owner.to_account_info(),
                },
            ),
            sale_price,
        )?;
        animal.owner = new_owner.key();
        animal.last_sale_price = sale_price;
        animal.allowed_buyer = None;
        animal.sale_price = None;
        Ok(())
    }
}
