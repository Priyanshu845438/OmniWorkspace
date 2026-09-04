@echo off
echo =======================================================
echo   OmniWorkspace - Windows Application Builder (.exe)
echo =======================================================

echo [1/3] Compiling Server, Client, and Electron bundles...
call npm run build
if %errorlevel% neq 0 (
    echo Error: Build failed.
    exit /b %errorlevel%
)

echo [2/3] Running Vitest Automated Test Suite...
call npm test
if %errorlevel% neq 0 (
    echo Error: Tests failed. Aborting packaging.
    exit /b %errorlevel%
)

echo [3/3] Packaging Windows NSIS Installer and Portable Executable...
call npx electron-builder --win --x64
if %errorlevel% neq 0 (
    echo Error: Windows packaging failed.
    exit /b %errorlevel%
)

echo =======================================================
echo   SUCCESS! Windows Binaries Created in release/
echo   - release\OmniWorkspace Setup 1.0.0.exe
echo   - release\OmniWorkspace 1.0.0.exe
echo =======================================================
pause
