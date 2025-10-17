use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum Country {
    // Default
    Other,

    // America
    UnitedStates,
    Brazil,
    Argentina,
    Mexico,
    Canada,
    Colombia,
    Uruguay,
    Paraguay,

    // Europe
    France,
    Germany,
    UnitedKingdom,
    Ireland,
    Spain,
    Italy,
    Poland,
    Netherlands,
    Russia,

    // Asia y Pacific
    China,
    India,
    Australia,
    Pakistan,
    Japan,
    SouthKorea
}