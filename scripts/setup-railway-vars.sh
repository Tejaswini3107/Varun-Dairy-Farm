#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Varun Dairy Farm — Railway Environment Variables Setup
# ─────────────────────────────────────────────────────────────────────────────

set -e

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   Varun Dairy Farm — Railway Variable Setup          ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── Service IDs ───────────────────────────────────────────────────────────────
read -p "Enter your Railway PROJECT ID: " RAILWAY_PROJECT_ID
read -p "Enter your API Service ID:      " API_SERVICE_ID
read -p "Enter your Web Service ID:      " WEB_SERVICE_ID

echo ""
echo "── PostgreSQL (copy from Railway PostgreSQL service → Variables) ──"
read -p "Enter DATABASE_URL: " DATABASE_URL

echo ""
echo "── Redis (copy from Railway Redis service → Variables) ──"
read -p "Enter REDIS_URL:  " REDIS_URL
read -p "Enter REDIS_HOST: " REDIS_HOST
read -p "Enter REDIS_PORT (default 6379): " REDIS_PORT
REDIS_PORT="${REDIS_PORT:-6379}"

echo ""
echo "📦 Setting API service variables..."
echo ""

railway variables set \
  --project "$RAILWAY_PROJECT_ID" \
  --environment production \
  --service "$API_SERVICE_ID" \
  NODE_ENV="production" \
  PORT="4000" \
  JWT_SECRET="REPLACE_WITH_64_CHAR_RANDOM_SECRET_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  ALLOWED_ORIGINS="REPLACE_WITH_YOUR_WEB_RAILWAY_URL,http://localhost:5173" \
  DATABASE_URL="$DATABASE_URL" \
  REDIS_URL="$REDIS_URL" \
  REDIS_HOST="$REDIS_HOST" \
  REDIS_PORT="$REDIS_PORT" \
  RAZORPAY_KEY_ID="rzp_test_REPLACE_ME" \
  RAZORPAY_KEY_SECRET="REPLACE_WITH_RAZORPAY_SECRET" \
  RAZORPAY_WEBHOOK_SECRET="REPLACE_WITH_WEBHOOK_SECRET" \
  FIREBASE_PROJECT_ID="dummy-firebase-project" \
  FIREBASE_CLIENT_EMAIL="dummy@dummy-project.iam.gserviceaccount.com" \
  FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\ndummy_key_replace_later\n-----END PRIVATE KEY-----\n" \
  GUPSHUP_API_KEY="REPLACE_WITH_GUPSHUP_KEY" \
  GUPSHUP_APP_NAME="VarunDairy"

echo "✅ API variables set!"
echo ""
echo "🌐 Setting Web service variables..."
echo ""

railway variables set \
  --project "$RAILWAY_PROJECT_ID" \
  --environment production \
  --service "$WEB_SERVICE_ID" \
  VITE_API_URL="REPLACE_WITH_YOUR_API_RAILWAY_URL" \
  VITE_SUPABASE_URL="REPLACE_WITH_SUPABASE_URL" \
  VITE_SUPABASE_ANON_KEY="REPLACE_WITH_SUPABASE_ANON_KEY" \
  VITE_RAZORPAY_KEY_ID="rzp_test_REPLACE_ME"

echo "✅ Web variables set!"
echo ""

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   Now add these 3 secrets to GitHub:                        ║"
echo "║   github.com/Tejaswini3107/Varun-Dairy-Farm                 ║"
echo "║   → Settings → Secrets and variables → Actions              ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║                                                              ║"
echo "║   RAILWAY_TOKEN          → from Railway account settings    ║"
echo "║   RAILWAY_API_SERVICE_ID → $API_SERVICE_ID  ║"
echo "║   RAILWAY_WEB_SERVICE_ID → $WEB_SERVICE_ID  ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "⚠️  Still replace these in Railway dashboard when ready:"
echo "   → JWT_SECRET         (run: openssl rand -hex 32)"
echo "   → ALLOWED_ORIGINS    (your web Railway public URL)"
echo "   → VITE_API_URL       (your API Railway public URL)"
echo "   → RAZORPAY_*         (from razorpay.com dashboard)"
echo "   → FIREBASE_*         (from Firebase console)"
echo ""
echo "🎉 All done!"
echo ""
