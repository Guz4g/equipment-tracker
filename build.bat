@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

echo === Сборка фронтенда ===
cd /d "%~dp0frontend"
if not exist package.json (
    echo ОШИБКА: frontend/package.json не найден
    exit /b 1
)
call npm install
if errorlevel 1 goto :err
call npm run build
if errorlevel 1 goto :err
cd /d "%~dp0"

echo === Сборка backend ===
set CGO_ENABLED=0
go mod tidy
if errorlevel 1 goto :err
go build -ldflags="-s -w" -o EquipmentTracker.exe ./cmd/server
if errorlevel 1 goto :err

echo.
echo === Готово ===
echo Файл: EquipmentTracker.exe
echo Статика: frontend\dist\
echo Запуск: start.bat
exit /b 0

:err
echo.
echo !!! Ошибка сборки. Смотрите вывод выше.
pause
exit /b 1