  @echo off
title Portfolio Automation Studio GUI
echo ========================================================
echo   Launching Portfolio Automation Studio GUI...
echo ========================================================
bun run gui
if %errorlevel% neq 0 (
  npx tsx scripts/automation-gui.ts
)
pause
