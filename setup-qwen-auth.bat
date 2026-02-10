@echo off
REM MeowMoltBot Qwen OAuth Setup Script for Windows

echo ================================
echo MeowMoltBot Qwen OAuth Setup
echo ================================
echo.
echo This script will:
echo 1. Generate a device code for Qwen authentication
echo 2. Wait for you to authenticate in your browser
echo 3. Set Qwen as the default model
echo.
pause
echo.
echo Starting authentication...
echo.

REM Run the login command
docker exec -it openclaw-gateway-1 node dist/index.js models auth login --provider qwen-portal --set-default

echo.
echo ================================
echo Setup complete!
echo ================================
echo.
echo Next steps:
echo 1. Test the bot by messaging it on Telegram
echo 2. Pair your account using the pairing code
echo 3. MeowMoltBot will come to life!
echo.
pause
