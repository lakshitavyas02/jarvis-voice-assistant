@echo off
echo Starting Jarvis Backend Server...
cd backend
call ..\venv\Scripts\activate
pip install -r requirements.txt
echo.
echo Backend server starting on http://localhost:5000
echo Make sure to add your OpenAI API key to backend\.env file
echo.
python app.py
pause
