echo "iniciando servidor..."

sleep 0.5s

python3 -m http.server 4000

sleep 0.5s

echo "iniciando api de express..."

cd packages/api-express/

npm run dev