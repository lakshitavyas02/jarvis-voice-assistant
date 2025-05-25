@echo off
echo Starting Jarvis Frontend Server...
cd frontend
echo.
echo Frontend server starting on http://localhost:8000
echo Open your browser and go to: http://localhost:8000
echo.
python -m http.server 8000
pause
