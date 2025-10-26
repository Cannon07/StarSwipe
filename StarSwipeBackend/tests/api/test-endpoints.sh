#!/bin/bash

BASE_URL="http://localhost:3000"
echo "🧪 Testing BitSpend API Endpoints"
echo "=================================="
echo ""

# Test 1: Health Check
echo "Test 1: Health Check"
echo "GET $BASE_URL/health"
curl -s $BASE_URL/health | jq '.'
echo ""
echo ""

# Test 2: Register User
echo "Test 2: Register User"
echo "POST $BASE_URL/api/v1/users/register"
USER_RESPONSE=$(curl -s -X POST $BASE_URL/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "GTEST123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890",
    "email": "test@bitspend.com"
  }')
echo $USER_RESPONSE | jq '.'
USER_ID=$(echo $USER_RESPONSE | jq -r '.user.id')
echo "User ID: $USER_ID"
echo ""
echo ""

# Test 3: Get User
echo "Test 3: Get User"
echo "GET $BASE_URL/api/v1/users/GTEST123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"
curl -s $BASE_URL/api/v1/users/GTEST123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890 | jq '.'
echo ""
echo ""

# Test 4: Register Card
echo "Test 4: Register Card"
CARD_ID="NFC_API_TEST_$(date +%s)"
echo "POST $BASE_URL/api/v1/cards/register"
CARD_RESPONSE=$(curl -s -X POST $BASE_URL/api/v1/cards/register \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "cardId": "'"$CARD_ID"'",
    "pin": "1234",
    "dailyLimit": 500
  }')
echo $CARD_RESPONSE | jq '.'
SHARE2=$(echo $CARD_RESPONSE | jq -r '.share2')
echo "Card ID: $CARD_ID"
echo "Share 2: ${SHARE2:0:30}..."
echo ""
echo ""

# Test 5: Get Card Info
echo "Test 5: Get Card Info"
echo "GET $BASE_URL/api/v1/cards/$CARD_ID"
curl -s $BASE_URL/api/v1/cards/$CARD_ID | jq '.'
echo ""
echo ""

# Test 6: Process Transaction
echo "Test 6: Process Transaction (Payment)"
echo "POST $BASE_URL/api/v1/transactions/process"
TX_RESPONSE=$(curl -s -X POST $BASE_URL/api/v1/transactions/process \
  -H "Content-Type: application/json" \
  -d '{
    "cardId": "'"$CARD_ID"'",
    "share2": "'"$SHARE2"'",
    "pin": "1234",
    "amount": "25.50",
    "merchantAddress": "GCXPWF2SBQ5YLPSU6IDK2XQWIXXWFELU6YWANLCBKQ73H4CKGSEXED5U",
    "merchantName": "Coffee Shop",
    "merchantId": "MERCHANT_001"
  }')
echo $TX_RESPONSE | jq '.'
echo ""
echo ""

# Test 7: Get Transaction History
echo "Test 7: Get Transaction History"
echo "GET $BASE_URL/api/v1/transactions/card/$CARD_ID"
curl -s $BASE_URL/api/v1/transactions/card/$CARD_ID | jq '.'
echo ""
echo ""

# Test 8: Freeze Card
echo "Test 8: Freeze Card"
echo "POST $BASE_URL/api/v1/cards/$CARD_ID/status"
curl -s -X POST $BASE_URL/api/v1/cards/$CARD_ID/status \
  -H "Content-Type: application/json" \
  -d '{
    "isActive": false,
    "reason": "Lost card"
  }' | jq '.'
echo ""
echo ""

# Test 9: Try Transaction on Frozen Card (should fail)
echo "Test 9: Try Transaction on Frozen Card (should fail)"
curl -s -X POST $BASE_URL/api/v1/transactions/process \
  -H "Content-Type: application/json" \
  -d '{
    "cardId": "'"$CARD_ID"'",
    "share2": "'"$SHARE2"'",
    "pin": "1234",
    "amount": "10",
    "merchantAddress": "GCXPWF2SBQ5YLPSU6IDK2XQWIXXWFELU6YWANLCBKQ73H4CKGSEXED5U",
    "merchantName": "Test Merchant"
  }' | jq '.'
echo ""
echo ""

echo "✅ All API tests completed!"
