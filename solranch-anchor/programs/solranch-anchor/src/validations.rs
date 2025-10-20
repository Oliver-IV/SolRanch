// 📍 Archivo: src/validation.rs

use anchor_lang::prelude::*;
use crate::SolranchError;

pub fn validate_register_ranch(
    name: &String
) -> Result<()> {
    require!(name.len() > 0, SolranchError::InvalidRanchDataError);
    require!(name.len() <= 50, SolranchError::InvalidRanchDataError);
    
    Ok(())
}

pub fn validate_register_animal(
    id_chip: &String,
    specie: &String,
    breed: &String
) -> Result<()> {
    require!(id_chip.len() > 0, SolranchError::InvalidAnimalDataError);
    require!(id_chip.len() <= 100, SolranchError::InvalidAnimalDataError);

    require!(specie.len() > 0, SolranchError::InvalidAnimalDataError);
    require!(specie.len() <= 30, SolranchError::InvalidAnimalDataError);

    require!(breed.len() > 0, SolranchError::InvalidAnimalDataError);
    require!(breed.len() <= 30, SolranchError::InvalidAnimalDataError);
    
    Ok(()) 
}

pub fn validate_purchase_animal(
    price: &u64
) -> Result<()> {
    require!(price > &0_u64, SolranchError::InvalidAnimalDataError) ;
    Ok(()) 
}