@echo off
REM ==========================================
REM ClawTrade AI - Development Setup Script (Windows)
REM ==========================================

echo.
echo ==========================================
echo   ClawTrade AI - Development Setup
echo ==========================================
echo.

REM Check for required tools
echo Checking requirements...

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is required but not installed.
    exit /b 1
)

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: npm is required but not installed.
    exit /b 1
)

for /f "tokens=2 delims=v" %%i in ('node -v') do set NODE_VERSION=%%i
for /f "tokens=1 delims=." %%j in ("%NODE_VERSION%") do set NODE_MAJOR=%%j

if %NODE_MAJOR% LSS 20 (
    echo ERROR: Node.js 20 or higher is required.
    echo Current version: Node.js %NODE_VERSION%
    exit /b 1
)

echo OK: Node.js %NODE_VERSION% detected
echo.

REM Install dependencies
echo Installing dependencies...
call npm install

REM Generate Prisma client
echo.
echo Generating Prisma client...
call npm run db:generate --workspace=@clawtrade/database

REM Copy environment file
if not exist .env (
    echo.
    echo Creating .env file from .env.example...
    copy .env.example .env
    echo WARNING: Please update .env with your configuration before running.
)

echo.
echo ==========================================
echo   Setup complete!
echo ==========================================
echo.
echo Next steps:
echo 1. Update .env with your configuration
echo 2. Start infrastructure: docker-compose up -d postgres redis
echo 3. Run migrations: npm run db:migrate --workspace=@clawtrade/database
echo 4. Seed database: npm run db:seed --workspace=@clawtrade/database
echo 5. Start development: npm run dev
echo.
