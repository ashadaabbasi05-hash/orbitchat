#!/bin/bash

# Orbit Chat - Setup Script
# This script helps set up both frontend and backend

set -e

echo "🚀 Orbit Chat - Complete Setup"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ npm $(npm -v)${NC}"
echo ""

# Frontend setup
echo -e "${YELLOW}📦 Setting up Frontend...${NC}"
npm install
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
echo ""

# Backend setup
echo -e "${YELLOW}📦 Setting up Backend...${NC}"
if [ ! -d "backend" ]; then
    echo -e "${RED}❌ Backend directory not found${NC}"
    exit 1
fi

cd backend
npm install
echo -e "${GREEN}✓ Backend dependencies installed${NC}"
cd ..
echo ""

# Supabase setup info
echo -e "${YELLOW}🗄️  Supabase Configuration${NC}"
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  Backend .env not found. Creating from example...${NC}"
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example backend/.env
        echo -e "${GREEN}✓ Created backend/.env${NC}"
        echo -e "${YELLOW}⚠️  Please update backend/.env with your Supabase credentials${NC}"
    fi
fi
echo ""

# Frontend env check
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Frontend .env not found${NC}"
    if [ -f ".env.example" ]; then
        echo -e "${YELLOW}Creating .env from example...${NC}"
        cat > .env << EOF
VITE_SUPABASE_URL=https://tqriemfhsxzhsvqxpyin.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_jBWlTuVbsRlWMbXe93wcgg_2AWYDfxA
EOF
        echo -e "${GREEN}✓ Created .env for frontend${NC}"
    fi
fi

echo ""
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "1. Update backend/.env with your Supabase Service Role Key:"
echo "   - SUPABASE_URL: Your Supabase project URL"
echo "   - SUPABASE_SERVICE_KEY: Your Supabase service role key"
echo ""
echo "2. Generate RSA keys (or let backend auto-generate):"
echo "   - Uncomment RSA_PRIVATE_KEY and RSA_PUBLIC_KEY in backend/.env"
echo "   - Or leave commented to auto-generate"
echo ""
echo "3. Start the backend:"
echo "   - cd backend && npm run dev"
echo ""
echo "4. In another terminal, start the frontend:"
echo "   - npm run dev"
echo ""
echo "5. Deploy Supabase Edge Functions:"
echo "   - supabase functions deploy key-exchange"
echo ""
echo -e "${YELLOW}🔗 Resources:${NC}"
echo "- Backend: http://localhost:3000"
echo "- Frontend: http://localhost:5173"
echo "- Supabase Dashboard: https://app.supabase.com"
echo ""
