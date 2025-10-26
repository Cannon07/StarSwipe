#!/bin/bash

# Test contract using Stellar CLI
# This bypasses SDK complexity and tests the contract directly

CONTRACT_ID="CDQI6IYM5TIEKLHAPOHJEJIGLQX2TMPGB3FJJCH7B4PFMAU6SRAVTJKZ"
MASTER_KEY="GA6SDF2ZW2PZCOD2J6XZLZB263ZTHZMS6ZIHUQ2L33CFX362B65OVXCZ"

echo "🧪 Testing Contract via Stellar CLI"
echo "=================================="

# Generate a random card address for testing
CARD_ADDRESS=$(stellar keys generate card-test --network testnet 2>&1 | grep "Public key:" | awk '{print $3}')
CARD_ID="CLI_TEST_$(date +%s)"

echo ""
echo "Test Data:"
echo "  Owner: $MASTER_KEY"
echo "  Card ID: $CARD_ID"
echo "  Card Address: $CARD_ADDRESS"
echo "  Daily Limit: 100 XLM (1000000000 stroops)"
echo ""

echo "Calling register_card..."
echo ""

stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source-account bitspend \
  --network testnet \
  -- \
  register_card \
  --owner "$MASTER_KEY" \
  --card_id "$CARD_ID" \
  --card_address "$CARD_ADDRESS" \
  --daily_limit 1000000000

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo ""
  echo "✅ SUCCESS! Card registered via CLI!"
  echo ""
  echo "Now try querying it:"
  echo "stellar contract invoke \\"
  echo "  --id $CONTRACT_ID \\"
  echo "  --network testnet \\"
  echo "  -- \\"
  echo "  get_card_info \\"
  echo "  --card_id \"$CARD_ID\""
else
  echo ""
  echo "❌ FAILED with exit code $EXIT_CODE"
  echo ""
  echo "This tells us if the contract itself works."
  echo "If this fails, the contract has an issue."
  echo "If this succeeds, the issue is in our SDK code."
fi
