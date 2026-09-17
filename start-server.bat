@echo off
TITLE Bara-Awlia Medical Hall - Medicine Shortage Management
COLOR 0A

echo ========================================================
echo   BARA-AWLIA MEDICAL HALL - SHORTAGE COLLECTION SYSTEM
echo ========================================================
echo.

cd /d "%~dp0"

:: 1. Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please download and install Node.js (LTS version) from https://nodejs.org
    pause
    exit /b 1
)

:: 2. Check if .env exists, if not copy from .env.example
if not exist ".env" (
    if exist ".env.example" (
        echo [INFO] Creating .env file from .env.example...
        copy ".env.example" ".env" >nul
    ) else (
        echo [INFO] Creating default .env file...
        echo DATABASE_URL="file:./dev.db">.env
        echo SESSION_SECRET="pharmacy-local-secret-key-salt-9823471029384710293847">>.env
        echo COOKIE_SECURE="false">>.env
        echo PORT=3000>>.env
    )
)

:: 3. Check if node_modules exists
if not exist "node_modules\" (
    echo [INFO] Installing required dependencies (first-time setup, please wait)...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed! Please check your internet connection.
        pause
        exit /b 1
    )
)

:: 4. Check if database exists
if not exist "prisma\dev.db" (
    echo [INFO] Initializing SQLite database...
    call npx prisma db push
    echo [INFO] Seeding initial users and medicines...
    call npx prisma db seed
)

:: 5. Check if production build exists
if not exist ".next\" (
    echo [INFO] Compiling production build (one-time setup, please wait)...
    call npm run build
    if %errorlevel% neq 0 (
        echo [ERROR] Build failed!
        pause
        exit /b 1
    )
)

echo.
echo ========================================================
echo   SERVER STARTING...
echo   Local PC:    http://localhost:3000
echo   Staff Phones: Connect to pharmacy Wi-Fi and open IP
echo ========================================================
echo.

:: Open browser automatically after 3 seconds
start "" http://localhost:3000

:: Start production server
call npm start

pause
