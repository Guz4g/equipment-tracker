@echo off
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Требуются права администратора. Запустите от имени администратора.
  pause
  exit /b 1
)
netsh advfirewall firewall add rule name="Equipment Tracker" dir=in action=allow protocol=TCP localport=8080
echo Правило добавлено.
pause