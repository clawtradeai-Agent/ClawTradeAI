#!/bin/bash
# ==========================================
# ClawTrade AI - Development Setup Script
# ==========================================

set -e

echo "🦾 ClawTrade AI - Development Setup"
echo "===================================="

# Check for required tools
echo "📋 Checking requirements..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is required but not installed."
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker is recommended for running infrastructure services."
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js 20 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🗄️  Generating Prisma client..."
npm run db:generate --workspace=@clawtrade/database

# Copy environment file
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env with your configuration before running."
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env with your configuration"
echo "2. Start infrastructure: docker-compose up -d postgres redis"
echo "3. Run migrations: npm run db:migrate --workspace=@clawtrade/database"
echo "4. Seed database: npm run db:seed --workspace=@clawtrade/database"
echo "5. Start development: npm run dev"
echo ""
