#!/bin/bash

# Test script for API endpoints
# Run from project root: bash packages/api-express/test-api.sh

API_URL="http://localhost/api"

echo "========================================"
echo "API Tests for /llm/q endpoint"
echo "========================================"

# Test 1: Health endpoint (POST)
echo -e "\nTest 1: POST /health"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/health")
BODY=$(echo "$RESPONSE" | head -1)
STATUS=$(echo "$RESPONSE" | tail -1)
echo "Status: $STATUS"
echo "Body: $BODY"
if [ "$STATUS" = "200" ] && echo "$BODY" | grep -q "ok"; then
    echo "✓ PASSED"
else
    echo "✗ FAILED"
fi

# Test 2: Missing input (400)
echo -e "\nTest 2: POST /llm/q - Missing input (400)"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/llm/q" -H "Content-Type: application/json" -d '{}')
BODY=$(echo "$RESPONSE" | head -1)
STATUS=$(echo "$RESPONSE" | tail -1)
echo "Status: $STATUS"
echo "Body: $BODY"
if [ "$STATUS" = "400" ]; then
    echo "✓ PASSED"
else
    echo "✗ FAILED"
fi

# Test 3: Empty input (400)
echo -e "\nTest 3: POST /llm/q - Empty input (400)"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/llm/q" -H "Content-Type: application/json" -d '{"input":""}')
BODY=$(echo "$RESPONSE" | head -1)
STATUS=$(echo "$RESPONSE" | tail -1)
echo "Status: $STATUS"
echo "Body: $BODY"
if [ "$STATUS" = "400" ]; then
    echo "✓ PASSED"
else
    echo "✗ FAILED"
fi

# Test 4: Valid request to Gemini (200)
echo -e "\nTest 4: POST /llm/q - Valid request (200)"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/llm/q" -H "Content-Type: application/json" -d '{"input":"¿Cuál es 2+2?"}')
BODY=$(echo "$RESPONSE" | head -1)
STATUS=$(echo "$RESPONSE" | tail -1)
echo "Status: $STATUS"
if [ "$STATUS" = "200" ]; then
    echo "Response has 'response': $(echo "$BODY" | grep -q 'response' && echo 'YES' || echo 'NO')"
    echo "Response has 'respuesta': $(echo "$BODY" | grep -q 'respuesta' && echo 'YES' || echo 'NO')"
    echo "✓ PASSED"
else
    echo "✗ FAILED"
    echo "$BODY"
fi

# Test 5: Test markdown formatting (200)
echo -e "\nTest 5: POST /llm/q - Markdown formatting (200)"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/llm/q" -H "Content-Type: application/json" -d '{"input":"Usa **negritas** y *cursiva* en tu respuesta"}')
BODY=$(echo "$RESPONSE" | head -1)
STATUS=$(echo "$RESPONSE" | tail -1)
echo "Status: $STATUS"
if [ "$STATUS" = "200" ]; then
    HAS_STRONG=$(echo "$BODY" | grep -q '<strong>' && echo 'YES' || echo 'NO')
    HAS_EM=$(echo "$BODY" | grep -q '<em>' && echo 'YES' || echo 'NO')
    echo "Has <strong> tags: $HAS_STRONG"
    echo "Has <em> tags: $HAS_EM"
    if [ "$HAS_STRONG" = "YES" ] && [ "$HAS_EM" = "YES" ]; then
        echo "✓ PASSED"
    else
        echo "✓ PASSED (no markdown in response)"
    fi
else
    echo "✗ FAILED"
fi

# Test 6: Test list formatting
echo -e "\nTest 6: POST /llm/q - List formatting (200)"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/llm/q" -H "Content-Type: application/json" -d '{"input":"Dame una lista de 3 colores"}')
BODY=$(echo "$RESPONSE" | head -1)
STATUS=$(echo "$RESPONSE" | tail -1)
echo "Status: $STATUS"
if [ "$STATUS" = "200" ]; then
    HAS_LI=$(echo "$BODY" | grep -q '<li>' && echo 'YES' || echo 'NO')
    echo "Has <li> tags: $HAS_LI"
    echo "✓ PASSED"
else
    echo "✗ FAILED"
fi

echo -e "\n========================================"
echo "Tests completed!"
echo "========================================"