use anchor_lang::prelude::*;

#[error_code]
pub enum SolranchError {
    #[msg("Invalid verifier profile provided.")]
    InvalidVerifierError, 
    #[msg("Verifier is not active.")]
    InactiveVerifierError, 
    #[msg("Ranch must be verified to register animals.")]
    RanchNotVerifiedError, 
    #[msg("Signer is not the owner of the account.")]
    InvalidOwnerError, 
    #[msg("Invalid name or country for ranch.")]
    InvalidRanchDataError,
    #[msg("Invalid ID chip, specie, or breed for animal.")]
    InvalidAnimalDataError, 
    #[msg("Animal is not currently listed for sale.")]
    AnimalNotForSaleError, 
    #[msg("Unauthorized access.")]
    UnauthorizedError, 
    #[msg("Ranch is already verified.")]
    RanchAlreadyVerifiedError, 
    #[msg("Animal is already verified.")]
    AnimalAlreadyVerifiedError,
    #[msg("Signer is not the assigned verifier for this animal.")]
    UnauthorizedVerifierError,
    #[msg("Operation resulted in an arithmetic overflow.")]
    OverflowError, 
    #[msg("Ranch verification status is already set to the desired value.")]
    NoStatusChangeError, 
    #[msg("Only the ranch authority or assigned verifier can cancel.")]
    UnauthorizedCancellationSignerError,
    #[msg("Cannot cancel an animal that is already verified.")]
    CannotCancelVerifiedAnimalError,
}