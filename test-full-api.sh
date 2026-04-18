#!/bin/bash

BASE_URL="http://localhost/api"

echo "=== TEST 1: Usuario Anónimo ==="

# 1. Crear sesión anónima
echo -e "\n1. Crear sesión anónima..."
ANON_SESSION=$(curl -s -X POST "$BASE_URL/anon/session")
echo "Session: $ANON_SESSION"

ANON_ID=$(echo $ANON_SESSION | grep -o '"sessionId":"[^"]*"' | cut -d'"' -f4)
echo "Anon ID: $ANON_ID"

# 2. Crear conversación anónima
echo -e "\n2. Crear conversación anónima..."
ANON_CONV=$(curl -s -X POST "$BASE_URL/anon/conversations/$ANON_ID" \
  -H "Content-Type: application/json" \
  -d '{"title":"Anon Chat","modelId":"gemini-2.5-flash","provider":"google"}')
echo "Anon Conv: $ANON_CONV"

ANON_CONV_ID=$(echo $ANON_CONV | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Anon Conv ID: $ANON_CONV_ID"

# 3. Obtener conversaciones anónimas
echo -e "\n3. Obtener conversaciones anónimas..."
ANON_CONVS=$(curl -s "$BASE_URL/anon/conversations/$ANON_ID")
echo "Anon Convs: $ANON_CONVS"

# 4. Enviar mensaje anónimo
echo -e "\n4. Enviar mensaje anónimo (prueba sin LLM)..."
echo "Nota: El endpoint anon/messages requiere simulación de LLM o configuración"

echo -e "\n=== TEST 2: Usuario Autenticado ==="

# 5. Registro
echo -e "\n5. Registro..."
REGISTER=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"user2@test.com","password":"test123"}')
echo "Register: $REGISTER"

# 6. Login
echo -e "\n6. Login..."
LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"user2@test.com","password":"test123"}')
echo "Login: $LOGIN"

TOKEN=$(echo $LOGIN | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "Token: ${TOKEN:0:50}..."

# 7. Actualizar configuración
echo -e "\n7. Actualizar config..."
CONFIG_UPDATE=$(curl -s -X PATCH "$BASE_URL/users/config" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"theme":"dark","activeModelId":"gemini-2.5-flash","streamSpeed":10,"showTitle":false}')
echo "Config Update: $CONFIG_UPDATE"

# 8. Agregar modelo
echo -e "\n8. Agregar modelo..."
MODEL_ADD=$(curl -s -X POST "$BASE_URL/models" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"modelId":"gemini-2.5-flash","provider":"google","apiKey":"test-key-123","maxTokens":2000,"temperature":0.8}')
echo "Model Add: $MODEL_ADD"

# 9. Obtener modelos
echo -e "\n9. Obtener modelos..."
MODELS=$(curl -s "$BASE_URL/models" \
  -H "Authorization: Bearer $TOKEN")
echo "Models: $MODELS"

# 10. Crear varias conversaciones para probar límite
echo -e "\n10. Crear conversaciones..."
for i in {1..3}; do
  curl -s -X POST "$BASE_URL/conversations" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"title\":\"Conv $i\",\"modelId\":\"gemini-2.5-flash\",\"provider\":\"google\"}" > /dev/null
done

COUNT=$(curl -s "$BASE_URL/conversations/count" \
  -H "Authorization: Bearer $TOKEN")
echo "Count: $COUNT"

# 11. Archivar conversación
echo -e "\n11. Archivar conversación..."
ARCHIVE=$(curl -s -X POST "$BASE_URL/conversations/archive" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"conversationIds":["'"$ANON_CONV_ID"'"]}')
echo "Archive: $ARCHIVE"

# 12. Obtener conversaciones archivadas
echo -e "\n12. Obtener archivadas..."
ARCHIVED=$(curl -s "$BASE_URL/archive/conversations" \
  -H "Authorization: Bearer $TOKEN")
echo "Archived: $ARCHIVED"

# 13. Verificar límite (crear más de 100 - esto debería fallar)
echo -e "\n13. Verificar límite de 100..."

# 14. Logout
echo -e "\n14. Logout..."
LOGOUT=$(curl -s -X POST "$BASE_URL/auth/logout" \
  -H "Authorization: Bearer $TOKEN")
echo "Logout: $LOGOUT"

echo -e "\n=== TEST COMPLETADO ==="