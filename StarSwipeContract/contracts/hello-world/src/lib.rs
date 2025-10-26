#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, token, Address, Env, String,
};

// ==================== DATA STRUCTURES ====================

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Card {
    pub card_address: Address,
    pub owner: Address,
    pub balance: i128,
    pub daily_limit: i128,
    pub spent_today: i128,
    pub last_spend_date: u64,
    pub is_active: bool,
}

// ==================== STORAGE KEYS ====================

#[contracttype]
pub enum DataKey {
    Card(String), // card_id -> Card
    TokenAddress, // USDC token contract address
}

// ==================== ERRORS ====================

#[contracterror]
#[derive(Clone, Debug, Copy, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    CardAlreadyExists = 1,
    CardNotFound = 2,
    InvalidCardAddress = 3,
    InvalidDailyLimit = 4,
    NotCardOwner = 5,
    NotCardAddress = 6,
    InvalidAmount = 7,
    CardInactive = 8,
    InsufficientBalance = 9,
    DailyLimitExceeded = 10,
    TokenNotSet = 11,
}

// ==================== EVENTS ====================

#[contracttype]
pub struct CardRegisteredEvent {
    pub card_id: String,
    pub card_address: Address,
    pub owner: Address,
    pub daily_limit: i128,
}

#[contracttype]
pub struct CardToppedUpEvent {
    pub card_id: String,
    pub amount: i128,
    pub new_balance: i128,
}

#[contracttype]
pub struct TransactionProcessedEvent {
    pub card_id: String,
    pub amount: i128,
    pub merchant: Address,
    pub merchant_id: String,
    pub remaining_balance: i128,
}

#[contracttype]
pub struct CardWithdrawnEvent {
    pub card_id: String,
    pub amount: i128,
    pub remaining_balance: i128,
}

#[contracttype]
pub struct CardStatusChangedEvent {
    pub card_id: String,
    pub is_active: bool,
}

// ==================== CONTRACT ====================

#[contract]
pub struct CardManager;

#[contractimpl]
impl CardManager {
    /// Initialize contract with token address
    pub fn initialize(env: Env, token: Address) {
        env.storage()
            .instance()
            .set(&DataKey::TokenAddress, &token);
    }

    /// Register a new payment card
    /// 
    /// # Arguments
    /// * `owner` - Owner of the card
    /// * `card_id` - NFC tag UID (e.g., "NFC001")
    /// * `card_address` - Cryptographic address derived from SSS
    /// * `daily_limit` - Maximum spending per day (7 decimals for USDC)
    pub fn register_card(
        env: Env,
        owner: Address,
        card_id: String,
        card_address: Address,
        daily_limit: i128,
    ) -> Result<(), Error> {
        // Require authentication from the owner
        owner.require_auth();

        // Check if card already exists
        if env
            .storage()
            .persistent()
            .has(&DataKey::Card(card_id.clone()))
        {
            return Err(Error::CardAlreadyExists);
        }

        // Validate inputs
        if daily_limit <= 0 {
            return Err(Error::InvalidDailyLimit);
        }

        // Create new card
        let card = Card {
            card_address: card_address.clone(),
            owner: owner.clone(),
            balance: 0,
            daily_limit,
            spent_today: 0,
            last_spend_date: 0,
            is_active: false,
        };

        // Store card
        env.storage()
            .persistent()
            .set(&DataKey::Card(card_id.clone()), &card);

        // Emit event
        env.events().publish(
            ("card_registered",),
            CardRegisteredEvent {
                card_id,
                card_address,
                owner,
                daily_limit,
            },
        );

        Ok(())
    }

    /// Top up card with USDC
    /// 
    /// # Arguments
    /// * `owner` - Card owner address
    /// * `card_id` - The card's NFC UID
    /// * `amount` - USDC amount (7 decimals, e.g., 100_0000000 = 100 USDC)
    pub fn top_up(env: Env, owner: Address, card_id: String, amount: i128) -> Result<(), Error> {
        // Require authentication from the owner
        owner.require_auth();

        // Get card
        let mut card: Card = env
            .storage()
            .persistent()
            .get(&DataKey::Card(card_id.clone()))
            .ok_or(Error::CardNotFound)?;

        // Verify caller is owner
        if owner != card.owner {
            return Err(Error::NotCardOwner);
        }

        // Validate amount (minimum 1 USDC = 10_000_000 stroops)
        if amount < 10_000_000 {
            return Err(Error::InvalidAmount);
        }

        // Get token contract
        let token_address: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenAddress)
            .ok_or(Error::TokenNotSet)?;

        let token_client = token::Client::new(&env, &token_address);

        // Transfer USDC from owner to contract
        token_client.transfer(&owner, &env.current_contract_address(), &amount);

        // Update card balance
        card.balance += amount;

        // Activate card if first top-up
        if !card.is_active {
            card.is_active = true;
        }

        // Save updated card
        env.storage()
            .persistent()
            .set(&DataKey::Card(card_id.clone()), &card);

        // Emit event
        env.events().publish(
            ("card_topped_up",),
            CardToppedUpEvent {
                card_id,
                amount,
                new_balance: card.balance,
            },
        );

        Ok(())
    }

    /// Process a payment transaction
    /// 
    /// # Arguments
    /// * `card_address` - The card's cryptographic address (for authentication)
    /// * `card_id` - NFC card identifier
    /// * `amount` - Amount to charge (7 decimals)
    /// * `merchant` - Merchant's wallet address
    /// * `merchant_id` - Merchant identifier for receipt
    pub fn process_transaction(
        env: Env,
        card_address: Address,
        card_id: String,
        amount: i128,
        merchant: Address,
        merchant_id: String,
    ) -> Result<(), Error> {
        // Require authentication from the card address
        card_address.require_auth();

        // Get card
        let mut card: Card = env
            .storage()
            .persistent()
            .get(&DataKey::Card(card_id.clone()))
            .ok_or(Error::CardNotFound)?;

        // Verify caller is the card address
        if card_address != card.card_address {
            return Err(Error::NotCardAddress);
        }

        // Check if card is active
        if !card.is_active {
            return Err(Error::CardInactive);
        }

        // Validate amount
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        if card.balance < amount {
            return Err(Error::InsufficientBalance);
        }

        // Get current ledger timestamp
        let current_time = env.ledger().timestamp();

        // Daily limit logic - reset if 24 hours passed (86400 seconds)
        if current_time >= card.last_spend_date + 86400 {
            card.spent_today = 0;
        }

        // Check daily limit
        if card.spent_today + amount > card.daily_limit {
            return Err(Error::DailyLimitExceeded);
        }

        // Update card state
        card.balance -= amount;
        card.spent_today += amount;
        card.last_spend_date = current_time;

        // Get token contract
        let token_address: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenAddress)
            .ok_or(Error::TokenNotSet)?;

        let token_client = token::Client::new(&env, &token_address);

        // Transfer USDC to merchant
        token_client.transfer(&env.current_contract_address(), &merchant, &amount);

        // Save updated card
        env.storage()
            .persistent()
            .set(&DataKey::Card(card_id.clone()), &card);

        // Emit event
        env.events().publish(
            ("transaction_processed",),
            TransactionProcessedEvent {
                card_id,
                amount,
                merchant,
                merchant_id,
                remaining_balance: card.balance,
            },
        );

        Ok(())
    }

    /// Withdraw USDC from card back to owner's wallet
    /// 
    /// # Arguments
    /// * `owner` - Card owner address
    /// * `card_id` - The card's NFC UID
    /// * `amount` - Amount to withdraw (0 = withdraw all)
    pub fn withdraw(env: Env, owner: Address, card_id: String, amount: i128) -> Result<(), Error> {
        // Require authentication from the owner
        owner.require_auth();

        // Get card
        let mut card: Card = env
            .storage()
            .persistent()
            .get(&DataKey::Card(card_id.clone()))
            .ok_or(Error::CardNotFound)?;

        // Verify caller is owner
        if owner != card.owner {
            return Err(Error::NotCardOwner);
        }

        // Determine withdrawal amount
        let withdraw_amount = if amount == 0 {
            card.balance
        } else {
            amount
        };

        // Validate
        if withdraw_amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        if card.balance < withdraw_amount {
            return Err(Error::InsufficientBalance);
        }

        // Update balance
        card.balance -= withdraw_amount;

        // Deactivate if balance reaches 0
        if card.balance == 0 {
            card.is_active = false;
        }

        // Get token contract
        let token_address: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenAddress)
            .ok_or(Error::TokenNotSet)?;

        let token_client = token::Client::new(&env, &token_address);

        // Transfer USDC to owner
        token_client.transfer(&env.current_contract_address(), &card.owner, &withdraw_amount);

        // Save updated card
        env.storage()
            .persistent()
            .set(&DataKey::Card(card_id.clone()), &card);

        // Emit event
        env.events().publish(
            ("card_withdrawn",),
            CardWithdrawnEvent {
                card_id,
                amount: withdraw_amount,
                remaining_balance: card.balance,
            },
        );

        Ok(())
    }

    /// Freeze or unfreeze a card
    /// 
    /// # Arguments
    /// * `owner` - Card owner address
    /// * `card_id` - The card's NFC UID
    /// * `is_active` - true to activate, false to freeze
    pub fn set_card_status(
        env: Env,
        owner: Address,
        card_id: String,
        is_active: bool,
    ) -> Result<(), Error> {
        // Require authentication from the owner
        owner.require_auth();

        // Get card
        let mut card: Card = env
            .storage()
            .persistent()
            .get(&DataKey::Card(card_id.clone()))
            .ok_or(Error::CardNotFound)?;

        // Verify caller is owner
        if owner != card.owner {
            return Err(Error::NotCardOwner);
        }

        // Update status
        card.is_active = is_active;

        // Save updated card
        env.storage()
            .persistent()
            .set(&DataKey::Card(card_id.clone()), &card);

        // Emit event
        env.events().publish(
            ("card_status_changed",),
            CardStatusChangedEvent { card_id, is_active },
        );

        Ok(())
    }

    /// Get card information
    /// 
    /// # Arguments
    /// * `card_id` - The card's NFC UID
    pub fn get_card_info(env: Env, card_id: String) -> Result<Card, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Card(card_id))
            .ok_or(Error::CardNotFound)
    }

    /// Get token address
    pub fn get_token_address(env: Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::TokenAddress)
            .ok_or(Error::TokenNotSet)
    }
}

// ==================== TESTS ====================

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    #[test]
    fn test_register_card() {
        let env = Env::default();
        let contract_id = env.register_contract(None, CardManager);
        let client = CardManagerClient::new(&env, &contract_id);

        let owner = Address::generate(&env);
        let card_address = Address::generate(&env);
        let token_address = Address::generate(&env);

        // Initialize with token
        client.initialize(&token_address);

        // Register card
        let result = client.register_card(
            &owner,
            &String::from_str(&env, "NFC001"),
            &card_address,
            &1_000_0000000, // 1000 USDC daily limit
        );

        assert!(result.is_ok());

        // Verify card info
        let card = client.get_card_info(&String::from_str(&env, "NFC001")).unwrap();
        assert_eq!(card.balance, 0);
        assert_eq!(card.daily_limit, 1_000_0000000);
        assert_eq!(card.is_active, false);
    }
}
