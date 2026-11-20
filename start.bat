@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist EquipmentTracker.exe (
    echo ОШИБКА: EquipmentTracker.exe не найден.
    echo Сначала запустите build.bat
    pause
    exit /b 1
)

if not exist frontend\dist\index.html (
    if not exist web\dist\index.html (
        echo ОШИБКА: index.html не найден.
        echo Сначала запустите build.bat
        pause
        exit /b 1
    )
)

echo Запуск сервера...
echo Веб-интерфейс: http://localhost:8080
echo Нажмите Ctrl+C для остановки
echo.

start "" "http://localhost:8080"
EquipmentTracker.exe

pause