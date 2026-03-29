#!/bin/bash
# ==========================================
# ClawTrade AI - Start Script
# ==========================================

set -e

echo "🦾 Starting ClawTrade AI..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please copy .env.example to .env and configure it."
    exit 1
fi

# Start infrastructure if using Docker
if command -v docker-compose &> /dev/null; then
    echo "🐳 Starting infrastructure services..."
    docker-compose up -d postgres redis
    echo "⏳ Waiting for services to be ready..."
    sleep 5
fi

# Run database migrations
echo "🗄️  Running database migrations..."
npm run db:migrate --workspace=@clawtrade/database

# Seed database (optional)
echo "🌱 Seeding database..."
npm run db:seed --workspace=@clawtrade/database

# Start development servers
echo "🚀 Starting development servers..."
npm run dev
