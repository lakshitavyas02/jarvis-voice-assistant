# 🎯 Jarvis - AI Voice Assistant

A browser-based AI voice assistant inspired by Marvel's Jarvis, built with HTML, CSS, JavaScript, and Flask backend integrated with OpenAI GPT. Now featuring real-time data integration and system control capabilities!

## ✨ Features

### 🎙️ **Core Voice Features**

- **Voice Recognition** - Uses Web Speech API for real-time voice input
- **Text-to-Speech** - Responds with natural voice using SpeechSynthesis API
- **Wake Word Detection** - Say "Hey Jarvis" to activate
- **Customizable Settings** - Voice selection, speech rate, auto-speak controls

### 🤖 **AI & Intelligence**

- **OpenAI GPT Integration** - Powered by GPT-3.5/GPT-4 for intelligent responses
- **Contextual Awareness** - Remembers conversation history
- **Natural Language Processing** - Understands complex queries and commands

### 📊 **Real-time Data Integration**

- **📈 Stock Market Data** - Live stock prices, changes, market cap
- **₿ Cryptocurrency Prices** - Real-time crypto values and 24h changes
- **🌤️ Weather Information** - Current weather conditions for any city
- **⏰ Time & Date** - World time zones and current date/time

### 🖥️ **System Control**

- **📁 File Operations** - Create folders and manage files
- **💻 System Information** - CPU, memory, disk usage monitoring
- **🚀 Application Control** - Launch calculator, notepad, file manager
- **🌐 Web Actions** - Open websites via voice commands

### 💬 **Interface & Design**

- **Real-time Chat Interface** - Beautiful conversation display
- **Responsive Design** - Works on desktop and mobile devices
- **Modern UI** - Sleek animations and visual feedback
- **Cross-platform Support** - Windows, macOS, Linux compatible

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Python Flask with CORS support
- **AI**: OpenAI GPT API (GPT-3.5/GPT-4)
- **Voice**: Web Speech API, SpeechSynthesis API
- **Data APIs**: Yahoo Finance (yfinance), CoinGecko, OpenWeatherMap
- **System**: psutil for system monitoring
- **Styling**: Modern CSS with animations and gradients

## 📁 Project Structure

```
jarvis-voice-assistant/
├── frontend/
│   ├── index.html          # Main UI
│   ├── style.css           # Styling with animations
│   └── script.js           # Voice recognition & AI logic
├── backend/
│   ├── app.py              # Flask server
│   ├── config.py           # Configuration
│   ├── requirements.txt    # Python dependencies
│   └── .env.example        # Environment variables template
├── venv/                   # Virtual environment
└── README.md               # This file
```

## 🚀 Setup Instructions

### 1. Clone and Setup Virtual Environment

```bash
# Navigate to project directory
cd jarvis-voice-assistant

# Virtual environment should already be created, but if not:
python -m venv venv

# Activate virtual environment
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

### 2. Install Backend Dependencies

```bash
# Navigate to backend directory
cd backend

# Install required packages
pip install -r requirements.txt
```

### 3. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env file and add your API keys
OPENAI_API_KEY=your_openai_api_key_here
OPENWEATHER_API_KEY=your_openweather_api_key_here
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key_here
SPORTS_API_KEY=your_sports_api_key_here
FLASK_ENV=development
FLASK_DEBUG=True
```

**Required API Keys:**

1. **OpenAI API Key** (Required)

   - Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
   - Create a new API key
   - Copy and paste it into your `.env` file

2. **OpenWeather API Key** (Optional - for weather features)

   - Go to [OpenWeatherMap API](https://openweathermap.org/api)
   - Sign up for a free account
   - Get your API key from the dashboard

3. **Alpha Vantage API Key** (Optional - for enhanced stock data)

   - Go to [Alpha Vantage](https://www.alphavantage.co/support/#api-key)
   - Get a free API key

4. **Sports API Key** (Optional - for sports scores)
   - Choose a sports data provider
   - Get API key for live sports data

**Note:** Stock and crypto data work without additional API keys using free services!

### 4. Run the Backend Server

```bash
# From the backend directory
python app.py
```

The Flask server will start on `http://localhost:5000`

### 5. Open the Frontend

```bash
# Open frontend/index.html in your browser
# Or use a local server (recommended):

# Using Python's built-in server
cd ../frontend
python -m http.server 8000

# Then open http://localhost:8000 in your browser
```

## 🎮 How to Use

### Voice Commands

1. **Click the microphone button** or say **"Hey Jarvis"** to activate
2. **Speak your command** clearly
3. **Wait for response** - Jarvis will both display and speak the answer

### Example Commands

#### 🎙️ **Basic Commands**

- "What time is it?"
- "Tell me a joke"
- "Calculate 25 times 4"
- "Tell me about artificial intelligence"

#### 📊 **Real-time Data**

- "What's Apple's stock price?"
- "How is Tesla performing today?"
- "What's Bitcoin worth right now?"
- "Ethereum price please"
- "What's the weather in New York?"
- "How hot is it in London?"

#### 🖥️ **System Control**

- "How much RAM am I using?"
- "What's my disk usage?"
- "Create folder called MyProject"
- "Open calculator"
- "Open notepad"
- "Launch file manager"

#### 🌐 **Web Actions**

- "Open YouTube"
- "Open Google"
- "Open GitHub"

### Text Input

- Type messages in the text input field
- Press Enter or click the send button

### Settings

- Click the gear icon to access settings
- Customize voice, speech rate, and features
- Toggle wake word detection and auto-speak

## 🔧 Customization

### Adding New Voice Commands

Edit `backend/app.py` in the `JarvisAssistant.process_command()` method:

```python
def process_command(self, user_input):
    user_input = user_input.lower().strip()

    # Add your custom commands here
    if "custom command" in user_input:
        return "Your custom response"

    # ... existing code
```

### Styling Changes

Modify `frontend/style.css` to customize:

- Colors and themes
- Animations
- Layout and spacing
- Responsive breakpoints

### Voice Settings

Adjust voice parameters in `frontend/script.js`:

- Speech rate
- Voice selection
- Volume and pitch

## 📊 **Supported Data Sources**

### 📈 **Financial Data**

- **Yahoo Finance** - Real-time stock prices (free, no API key required)
- **CoinGecko** - Cryptocurrency data (free, no API key required)
- **Alpha Vantage** - Enhanced stock data (optional, API key required)

### 🌤️ **Weather Data**

- **OpenWeatherMap** - Current weather conditions (API key required)

### 🖥️ **System Information**

- **psutil** - Cross-platform system monitoring
- **Native OS APIs** - File operations and application launching

### 🏀 **Sports Data** (Framework Ready)

- **ESPN API** - Sports scores and statistics (API key required)
- **The Sports DB** - Sports data (API key required)

## 🌐 Browser Compatibility

- **Chrome/Edge**: Full support (recommended)
- **Firefox**: Partial support (no wake word detection)
- **Safari**: Limited support
- **Mobile**: Works on modern mobile browsers

## 🔒 Security Notes

- Keep your OpenAI API key secure
- Don't commit `.env` file to version control
- Use HTTPS in production
- Consider rate limiting for API calls

## 🐛 Troubleshooting

### Common Issues

1. **Microphone not working**

   - Check browser permissions
   - Ensure HTTPS (required for microphone access)

2. **Backend connection failed**

   - Verify Flask server is running on port 5000
   - Check CORS settings
   - Ensure OpenAI API key is valid

3. **Voice not working**

   - Check browser's speech synthesis support
   - Try different voices in settings

4. **API errors**
   - Verify OpenAI API key
   - Check API usage limits
   - Ensure internet connection

## 📈 Recent Updates & Future Enhancements

### ✅ **Recently Added**

- [x] **Real-time Stock Market Data** - Live stock prices and market information
- [x] **Cryptocurrency Integration** - Real-time crypto prices and changes
- [x] **Weather API Integration** - Current weather conditions worldwide
- [x] **System Control** - File operations, system monitoring, app launching
- [x] **Enhanced Context Awareness** - Smart data integration based on queries

### 🚀 **Future Enhancements**

- [ ] **Smart Home Integration** - Control IoT devices and smart home systems
- [ ] **Calendar & Email Management** - Google Calendar and Gmail integration
- [ ] **News & RSS Feeds** - Real-time news updates and briefings
- [ ] **Multi-language Support** - Voice commands in multiple languages
- [ ] **Voice Training** - Personalized voice recognition improvement
- [ ] **Offline Mode** - Basic functionality without internet connection
- [ ] **Mobile App** - Progressive Web App (PWA) for mobile devices
- [ ] **Custom Plugins** - Extensible plugin system for third-party integrations

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**Enjoy your AI voice assistant! 🚀**
