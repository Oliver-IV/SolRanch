use anchor_lang::prelude::*;

#[error_code]
pub enum SolranchError {
    InvalidVerifierError,
    InactiveVerifierError,
    RanchNotVerifiedError,
    InvalidOwnerError,
    InvalidRanchDataError,
    InvalidAnimalDataError,
    AnimalNotForSaleError,
    UnauthorizedError,
    RanchAlreadyVerifiedError
}