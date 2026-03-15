#!/bin/bash
# Bomberman Online - Database Deployment Script
set -e

echo "🎮 Bomberman Online - Database Deployment"
echo "=========================================="

# Check for Supabase CLI
if command -v supabase &> /dev/null; then
    echo "✅ Supabase CLI found"
    echo "📊 Deploying schema..."
    supabase db push
    echo "✅ Schema deployed!"
else
    echo "⚠️  Supabase CLI not found"
    echo "Install: npm install -g supabase"
    echo "Or deploy manually via Supabase Dashboard"
fi
