-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(56) UNIQUE NOT NULL, -- Stellar addresses are 56 chars
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP
);

CREATE INDEX idx_users_wallet_address ON users(wallet_address);

-- Cards table
CREATE TABLE IF NOT EXISTS cards (
    id SERIAL PRIMARY KEY,
    card_id VARCHAR(64) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    card_public_key VARCHAR(56) UNIQUE NOT NULL, -- Stellar public key
    
    -- SSS shares (encrypted)
    -- Share 1: Backend encrypted storage
    share1_encrypted TEXT NOT NULL,
    share1_iv VARCHAR(32) NOT NULL,
    share1_auth_tag VARCHAR(32) NOT NULL,
    share1_hash VARCHAR(64) NOT NULL,
    
    -- Share 2: User's device (not stored in DB)
    
    -- Share 3: PIN-derived encryption
    share3_salt VARCHAR(32) NOT NULL,
    share3_encrypted TEXT NOT NULL,
    
    -- Card settings
    daily_limit VARCHAR(20) NOT NULL DEFAULT '1000', -- In XLM
    daily_spent VARCHAR(20) DEFAULT '0',
    last_reset_date DATE DEFAULT CURRENT_DATE,
    
    -- Stellar account creation
    blockchain_tx_hash VARCHAR(64), -- Stellar transaction hash
    account_created BOOLEAN DEFAULT false,
    sequence_number VARCHAR(20), -- Stellar account sequence
    
    -- Card status
    is_active BOOLEAN DEFAULT true,
    is_locked BOOLEAN DEFAULT false,
    locked_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP
);

CREATE INDEX idx_cards_user_id ON cards(user_id);
CREATE INDEX idx_cards_card_id ON cards(card_id);
CREATE INDEX idx_cards_public_key ON cards(card_public_key);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    tx_hash VARCHAR(64) UNIQUE, -- Stellar transaction hash
    card_id VARCHAR(64) REFERENCES cards(card_id) ON DELETE CASCADE,
    
    -- Transaction details
    amount VARCHAR(20) NOT NULL, -- In XLM or stroops
    asset_code VARCHAR(12) DEFAULT 'XLM',
    asset_issuer VARCHAR(56),
    
    destination_address VARCHAR(56) NOT NULL,
    merchant_name VARCHAR(255),
    merchant_id VARCHAR(255),
    
    -- Transaction metadata
    memo TEXT,
    memo_type VARCHAR(20), -- text, id, hash, return
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- pending, submitted, confirmed, failed, rejected
    
    error_message TEXT,
    ledger_number INTEGER, -- Stellar ledger number
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    submitted_at TIMESTAMP,
    confirmed_at TIMESTAMP
);

CREATE INDEX idx_transactions_card_id ON transactions(card_id);
CREATE INDEX idx_transactions_tx_hash ON transactions(tx_hash);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);

-- PIN attempts (rate limiting & security)
CREATE TABLE IF NOT EXISTS pin_attempts (
    id SERIAL PRIMARY KEY,
    card_id VARCHAR(64) REFERENCES cards(card_id) ON DELETE CASCADE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    attempted_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pin_attempts_card_time ON pin_attempts(card_id, attempted_at DESC);
CREATE INDEX idx_pin_attempts_ip_time ON pin_attempts(ip_address, attempted_at DESC);

-- Session tokens (for authentication)
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_activity_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);

-- Audit log (for security & compliance)
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    card_id VARCHAR(64) REFERENCES cards(card_id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_card_id ON audit_logs(card_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

This is the current structure of the database
