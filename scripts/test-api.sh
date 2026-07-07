#!/bin/bash

BASE_URL="http://localhost/api"
TOKEN=""

echo "=== TEST API ==="

# 1. Registro
echo -e "\n1. Registro de usuario..."
REGISTER=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}')
echo "Register: $REGISTER"

# 2. Login
echo -e "\n2. Login..."
LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}')
echo "Login: $LOGIN"

TOKEN=$(echo $LOGIN | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "Token: ${TOKEN:0:50}..."

if [ -z "$TOKEN" ]; then
  echo "Error: No se pudo obtener token"
  exit 1
fi

# 3. Obtener config
echo -e "\n3. Obtener configuración..."
CONFIG=$(curl -s "$BASE_URL/users/config" \
  -H "Authorization: Bearer $TOKEN")
echo "Config: $CONFIG"

# 4. Obtener modelos (vacío al inicio)
echo -e "\n4. Modelos configurados..."
MODELS=$(curl -s "$BASE_URL/models" \
  -H "Authorization: Bearer $TOKEN")
echo "Models: $MODELS"

# 5. Contar conversaciones
echo -e "\n5. Contar conversaciones..."
COUNT=$(curl -s "$BASE_URL/conversations/count" \
  -H "Authorization: Bearer $TOKEN")
echo "Count: $COUNT"

# 6. Crear conversación
echo -e "\n6. Crear conversación..."
CONV=$(curl -s -X POST "$BASE_URL/conversations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Test","modelId":"gemini-2.5-flash","provider":"google"}')
echo "Conversation: $CONV"

CONV_ID=$(echo $CONV | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Conv ID: $CONV_ID"

# 7. Obtener conversaciones
echo -e "\n7. Obtener lista de conversaciones..."
CONVS=$(curl -s "$BASE_URL/conversations?limit=10" \
  -H "Authorization: Bearer $TOKEN")
echo "Conversations: $CONVS"

# 8. Obtener mensajes de conversación
echo -e "\n8. Obtener mensajes..."
MSGS=$(curl -s "$BASE_URL/conversations/$CONV_ID/messages" \
  -H "Authorization: Bearer $TOKEN")
echo "Messages: $MSGS"

echo -e "\n=== TEST COMPLETADO ==="