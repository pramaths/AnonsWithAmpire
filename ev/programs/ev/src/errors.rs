use anchor_lang::prelude::*;

#[error_code]
pub enum EvError {
    #[msg("Driver not found")]
    DriverNotFound,
    #[msg("Charger not found")]
    ChargerNotFound,
}