@echo off
REM Orbit Chat - Setup Script for Windows
REM This script helps set up both frontend and backend

echo.
echo 🚀 Orbit Chat - Complete Setup
echo ================================
echo.

REM Check Node.js
where /q node
if errorlevel 1 (
    echo ❌ Node.js not found. Please install Node.js 18+
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo ✓ Node.js %NODE_VERSION%

REM Check npm
where /q npm
if errorlevel 1 (
    echo ❌ npm not found
    exit /b 1
)

for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo ✓ npm %NPM_VERSION%
echo.

REM Frontend setup
echo 📦 Setting up Frontend...
call npm install
if errorlevel 1 (
    echo ❌ Frontend installation failed
    exit /b 1
)
echo ✓ Frontend dependencies installed
echo.

REM Backend setup
echo 📦 Setting up Backend...
if not exist "backend" (
    echo ❌ Backend directory not found
    exit /b 1
)

cd backend
call npm install
if errorlevel 1 (
    echo ❌ Backend installation failed
    exit /b 1
)
echo ✓ Backend dependencies installed
cd ..
echo.

REM Supabase setup info
echo 🗄️  Supabase Configuration
if not exist "backend\.env" (
    echo ⚠️  Backend .env not found. Creating from example...
    if exist "backend\.env.example" (
        copy backend\.env.example backend\.env
        echo ✓ Created backend\.env
        echo ⚠️  Please update backend\.env with your Supabase credentials
    )
)
echo.

REM Frontend env check
if not exist ".env" (
    echo ⚠️  Frontend .env not found. Creating...
    (
        echo VITE_SUPABASE_URL=https://tqriemfhsxzhsvqxpyin.supabase.co
        echo VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_jBWlTuVbsRlWMbXe93wcgg_2AWYDfxA
    ) > .env
    echo ✓ Created .env for frontend
)

echo.
echo ✅ Setup Complete!
echo.
echo 📝 Next Steps:
echo 1. Update backend\.env with your Supabase Service Role Key:
echo    - SUPABASE_URL: Your Supabase project URL
echo    - SUPABASE_SERVICE_KEY: Your Supabase service role key
echo.
echo 2. Start the backend in one terminal:
echo    - cd backend ^&^& npm run dev
echo.
echo 3. In another terminal, start the frontend:
echo    - npm run dev
echo.
echo 4. Deploy Supabase Edge Functions:
echo    - supabase functions deploy key-exchange
echo.
echo 🔗 Resources:
echo - Backend: http://localhost:3000
echo - Frontend: http://localhost:5173
echo - Supabase Dashboard: https://app.supabase.com
echo.
