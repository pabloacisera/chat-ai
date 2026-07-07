#!/bin/sh
set -e

echo "Running database schema sync..."
npx prisma db push

echo "Starting application..."
exec "$@"
