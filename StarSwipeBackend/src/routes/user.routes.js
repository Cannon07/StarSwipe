const express = require("express");
const router = express.Router();
const db = require("../config/database");
const logger = require("../utils/logger");
const StellarSdk = require("stellar-sdk"); // ✅ works for CommonJS

router.get("/:walletAddress", async (req, res) => {
  const user = await db.query("SELECT * FROM users WHERE wallet_address = $1", [
    req.params.walletAddress,
  ]);
  if (user.rows.length === 0)
    return res.status(404).json({ error: "User not found" });
  res.json({ user: user.rows[0] });
});

router.post("/register", async (req, res) => {
  try {
    const { walletAddress, email } = req.body;

    // Validate input
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: "Wallet address is required",
      });
    }

    // Validate Stellar public key
    if (!StellarSdk.StrKey.isValidEd25519PublicKey(walletAddress)) {
      return res.status(400).json({
        success: false,
        error: "Invalid Stellar wallet address format",
      });
    }

    // Check if user exists
    const existingUser = await db.query(
      "SELECT id FROM users WHERE wallet_address = $1",
      [walletAddress],
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: "User already exists",
      });
    }

    // Create new user
    const result = await db.query(
      "INSERT INTO users (wallet_address, email) VALUES ($1, $2) RETURNING id, wallet_address, email, created_at",
      [walletAddress, email],
    );

    logger.info(`✅ User registered: ${walletAddress}`);

    res.status(201).json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    logger.error("❌ User registration error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to register user",
    });
  }
});

module.exports = router;
