#!/bin/sh
# Docker entrypoint script for ATS Resume Analyzer

# Create data directory if it doesn't exist
mkdir -p /app/backend/data

# Initialize database if needed
if [ ! -f /app/backend/data/dev.db ]; then
    echo "Initializing database..."
    npx prisma migrate deploy || true
fi

# Start the application
echo "Starting ATS Resume Analyzer on port $PORT..."
node dist/index.js
