from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
from config import Config
import datetime
import pytz
import requests
import os
import subprocess
import platform
import psutil
import yfinance as yf
import json
import shutil

app = Flask(__name__)
CORS(app)

# Configure OpenAI
client = OpenAI(api_key=Config.OPENAI_API_KEY)

class JarvisAssistant:
    def __init__(self):
        self.conversation_history = []

    def process_command(self, user_input):
        """Process user command and return appropriate response"""
        user_input_lower = user_input.lower().strip()

        # Handle website opening commands
        if "open" in user_input_lower and any(site in user_input_lower for site in ["youtube", "google", "github", "stackoverflow"]):
            return self.handle_website_command(user_input_lower)

        # Handle system control commands that require direct action
        if self.is_system_command(user_input_lower):
            return self.handle_system_command(user_input_lower)

        # Let OpenAI handle all other queries intelligently
        return self.get_ai_response(user_input)

    def handle_website_command(self, command):
        """Handle website opening commands"""
        websites = {
            "youtube": "https://youtube.com",
            "google": "https://google.com",
            "github": "https://github.com",
            "stackoverflow": "https://stackoverflow.com"
        }

        for site, url in websites.items():
            if site in command:
                return f"Opening {site.title()} for you", url

        return "I'm not sure which website you'd like me to open"

    def is_system_command(self, command):
        """Check if command requires direct system action"""
        system_triggers = [
            "create folder", "make folder", "new folder",
            "open calculator", "open notepad", "open file manager",
            "open application", "launch app", "start app"
        ]
        return any(trigger in command for trigger in system_triggers)

    def handle_system_command(self, command):
        """Handle system control commands"""
        try:
            # Folder creation
            if any(phrase in command for phrase in ["create folder", "make folder", "new folder"]):
                # Extract folder name
                folder_name = self.extract_folder_name(command)
                if folder_name:
                    return self.create_folder(folder_name)
                else:
                    return "Please specify a folder name to create"

            # Application opening
            elif any(phrase in command for phrase in ["open calculator", "open notepad", "open file manager"]):
                if "calculator" in command:
                    return self.open_application("calculator")
                elif "notepad" in command:
                    return self.open_application("notepad")
                elif "file manager" in command:
                    return self.open_application("file manager")

            return "I'm not sure how to handle that system command"

        except Exception as e:
            return f"Error executing system command: {str(e)}"

    def extract_folder_name(self, command):
        """Extract folder name from command"""
        # Simple extraction - look for quoted names or names after "called"
        if '"' in command:
            start = command.find('"') + 1
            end = command.find('"', start)
            if end > start:
                return command[start:end]

        if "called" in command:
            parts = command.split("called")
            if len(parts) > 1:
                return parts[1].strip().strip('"\'')

        # Fallback: look for common patterns
        words = command.split()
        for i, word in enumerate(words):
            if word in ["folder", "directory"] and i + 1 < len(words):
                return words[i + 1].strip('"\'')

        return None

    def get_current_time_context(self):
        """Get current time information for AI context"""
        now_utc = datetime.datetime.now(pytz.UTC)
        local_time = datetime.datetime.now()

        # Get times for major cities
        timezones = {
            'UTC': now_utc,
            'Los Angeles': now_utc.astimezone(pytz.timezone('America/Los_Angeles')),
            'New York': now_utc.astimezone(pytz.timezone('America/New_York')),
            'London': now_utc.astimezone(pytz.timezone('Europe/London')),
            'Tokyo': now_utc.astimezone(pytz.timezone('Asia/Tokyo')),
            'Mumbai': now_utc.astimezone(pytz.timezone('Asia/Kolkata')),
            'Sydney': now_utc.astimezone(pytz.timezone('Australia/Sydney'))
        }

        time_context = f"Current time information (for reference):\n"
        time_context += f"Local time: {local_time.strftime('%I:%M %p, %A, %B %d, %Y')}\n"
        time_context += f"UTC: {now_utc.strftime('%I:%M %p, %A, %B %d, %Y')}\n"

        for city, time_obj in timezones.items():
            if city != 'UTC':
                time_context += f"{city}: {time_obj.strftime('%I:%M %p, %A, %B %d, %Y')} ({time_obj.tzinfo.zone})\n"

        return time_context

    def get_weather_data(self, city):
        """Get current weather data for a city"""
        if not Config.OPENWEATHER_API_KEY or Config.OPENWEATHER_API_KEY == "your_openweather_api_key_here":
            return None

        try:
            url = f"http://api.openweathermap.org/data/2.5/weather"
            params = {
                'q': city,
                'appid': Config.OPENWEATHER_API_KEY,
                'units': 'metric'  # Celsius
            }

            response = requests.get(url, params=params, timeout=5)
            if response.status_code == 200:
                data = response.json()

                weather_info = {
                    'city': data['name'],
                    'country': data['sys']['country'],
                    'temperature': data['main']['temp'],
                    'feels_like': data['main']['feels_like'],
                    'humidity': data['main']['humidity'],
                    'description': data['weather'][0]['description'],
                    'main': data['weather'][0]['main'],
                    'wind_speed': data.get('wind', {}).get('speed', 'N/A')
                }

                return weather_info
            else:
                return None

        except Exception as e:
            print(f"Weather API error: {e}")
            return None

    def get_weather_context(self, user_input):
        """Extract city from user input and get weather data"""
        # Simple city extraction - you could make this more sophisticated
        weather_keywords = ['weather', 'temperature', 'hot', 'cold', 'rain', 'sunny', 'cloudy']
        if not any(keyword in user_input.lower() for keyword in weather_keywords):
            return None

        # Common city patterns
        city_patterns = [
            'weather in ', 'weather at ', 'temperature in ', 'temperature at ',
            'hot in ', 'cold in ', 'rain in ', 'sunny in ', 'cloudy in '
        ]

        city = None
        user_lower = user_input.lower()

        for pattern in city_patterns:
            if pattern in user_lower:
                start_idx = user_lower.find(pattern) + len(pattern)
                remaining = user_input[start_idx:].strip()
                # Take the next word(s) as city name
                city = remaining.split('?')[0].split('.')[0].strip()
                break

        # If no pattern found, try to extract city names from common cities
        common_cities = [
            'mumbai', 'delhi', 'bangalore', 'chennai', 'kolkata', 'hyderabad',
            'london', 'paris', 'tokyo', 'new york', 'los angeles', 'chicago',
            'sydney', 'melbourne', 'toronto', 'vancouver', 'dubai', 'singapore'
        ]

        if not city:
            for common_city in common_cities:
                if common_city in user_lower:
                    city = common_city
                    break

        if city:
            weather_data = self.get_weather_data(city)
            if weather_data:
                weather_context = f"\nCurrent weather in {weather_data['city']}, {weather_data['country']}:\n"
                weather_context += f"Temperature: {weather_data['temperature']}°C (feels like {weather_data['feels_like']}°C)\n"
                weather_context += f"Condition: {weather_data['description'].title()}\n"
                weather_context += f"Humidity: {weather_data['humidity']}%\n"
                weather_context += f"Wind Speed: {weather_data['wind_speed']} m/s\n"
                return weather_context

        return None

    # ===== REAL-TIME DATA INTEGRATION =====

    def get_stock_data(self, symbol):
        """Get current stock price data"""
        try:
            stock = yf.Ticker(symbol.upper())
            info = stock.info
            hist = stock.history(period="1d")

            if hist.empty:
                return None

            current_price = hist['Close'].iloc[-1]
            prev_close = info.get('previousClose', current_price)
            change = current_price - prev_close
            change_percent = (change / prev_close) * 100 if prev_close else 0

            return {
                'symbol': symbol.upper(),
                'name': info.get('longName', symbol.upper()),
                'price': round(current_price, 2),
                'change': round(change, 2),
                'change_percent': round(change_percent, 2),
                'currency': info.get('currency', 'USD'),
                'market_cap': info.get('marketCap'),
                'volume': info.get('volume')
            }
        except Exception as e:
            print(f"Stock API error: {e}")
            return None

    def get_crypto_data(self, symbol):
        """Get cryptocurrency data using free API"""
        try:
            # Using CoinGecko free API (no key required)
            url = f"https://api.coingecko.com/api/v3/simple/price"
            params = {
                'ids': self.get_crypto_id(symbol),
                'vs_currencies': 'usd',
                'include_24hr_change': 'true',
                'include_market_cap': 'true'
            }

            response = requests.get(url, params=params, timeout=5)
            if response.status_code == 200:
                data = response.json()
                crypto_id = self.get_crypto_id(symbol)

                if crypto_id in data:
                    crypto_info = data[crypto_id]
                    return {
                        'symbol': symbol.upper(),
                        'price': crypto_info.get('usd', 0),
                        'change_24h': crypto_info.get('usd_24h_change', 0),
                        'market_cap': crypto_info.get('usd_market_cap', 0)
                    }
            return None
        except Exception as e:
            print(f"Crypto API error: {e}")
            return None

    def get_crypto_id(self, symbol):
        """Map crypto symbols to CoinGecko IDs"""
        crypto_map = {
            'BTC': 'bitcoin',
            'ETH': 'ethereum',
            'ADA': 'cardano',
            'DOT': 'polkadot',
            'LTC': 'litecoin',
            'XRP': 'ripple',
            'DOGE': 'dogecoin',
            'SOL': 'solana',
            'MATIC': 'matic-network',
            'AVAX': 'avalanche-2'
        }
        return crypto_map.get(symbol.upper(), symbol.lower())

    def get_sports_data(self, team_name):
        """Get sports scores (using free API)"""
        try:
            # Using free sports API - ESPN or similar
            # For demo, returning mock data since most sports APIs require keys
            return {
                'team': team_name,
                'status': 'No live games found',
                'note': 'Sports data requires API key configuration'
            }
        except Exception as e:
            print(f"Sports API error: {e}")
            return None

    # ===== SYSTEM CONTROL FUNCTIONS =====

    def get_system_info(self):
        """Get system information"""
        try:
            # Get system stats
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')

            return {
                'cpu_usage': f"{cpu_percent}%",
                'memory_total': f"{memory.total // (1024**3)} GB",
                'memory_used': f"{memory.used // (1024**3)} GB",
                'memory_percent': f"{memory.percent}%",
                'disk_total': f"{disk.total // (1024**3)} GB",
                'disk_used': f"{disk.used // (1024**3)} GB",
                'disk_free': f"{disk.free // (1024**3)} GB",
                'disk_percent': f"{(disk.used/disk.total)*100:.1f}%",
                'platform': platform.system(),
                'platform_version': platform.version()
            }
        except Exception as e:
            print(f"System info error: {e}")
            return None

    def create_folder(self, folder_name, path=None):
        """Create a new folder"""
        try:
            if path is None:
                path = os.path.expanduser("~/Desktop")

            full_path = os.path.join(path, folder_name)
            os.makedirs(full_path, exist_ok=True)
            return f"Created folder '{folder_name}' at {full_path}"
        except Exception as e:
            return f"Error creating folder: {str(e)}"

    def open_application(self, app_name):
        """Open an application"""
        try:
            system = platform.system().lower()

            # Common applications mapping
            apps = {
                'calculator': {
                    'windows': 'calc.exe',
                    'darwin': 'Calculator',
                    'linux': 'gnome-calculator'
                },
                'notepad': {
                    'windows': 'notepad.exe',
                    'darwin': 'TextEdit',
                    'linux': 'gedit'
                },
                'file manager': {
                    'windows': 'explorer.exe',
                    'darwin': 'Finder',
                    'linux': 'nautilus'
                },
                'browser': {
                    'windows': 'start chrome',
                    'darwin': 'open -a "Google Chrome"',
                    'linux': 'google-chrome'
                }
            }

            app_lower = app_name.lower()
            if app_lower in apps and system in apps[app_lower]:
                cmd = apps[app_lower][system]

                if system == 'windows':
                    subprocess.Popen(cmd, shell=True)
                else:
                    subprocess.Popen(cmd.split())

                return f"Opening {app_name}"
            else:
                return f"Application '{app_name}' not found or not supported"

        except Exception as e:
            return f"Error opening application: {str(e)}"

    # ===== CONTEXT INTEGRATION METHODS =====

    def get_realtime_data_context(self, user_input):
        """Get real-time data context for stocks, crypto, sports"""
        user_input_lower = user_input.lower()

        # Stock price queries
        stock_keywords = ['stock', 'price', 'share', 'ticker', 'market']
        if any(keyword in user_input_lower for keyword in stock_keywords):
            # Extract stock symbol
            common_stocks = ['apple', 'aapl', 'google', 'googl', 'microsoft', 'msft',
                           'tesla', 'tsla', 'amazon', 'amzn', 'meta', 'nvidia', 'nvda']

            for stock in common_stocks:
                if stock in user_input_lower:
                    symbol = self.get_stock_symbol(stock)
                    stock_data = self.get_stock_data(symbol)
                    if stock_data:
                        context = f"\nCurrent stock data for {stock_data['name']} ({stock_data['symbol']}):\n"
                        context += f"Price: ${stock_data['price']} {stock_data['currency']}\n"
                        context += f"Change: ${stock_data['change']} ({stock_data['change_percent']:+.2f}%)\n"
                        if stock_data['market_cap']:
                            context += f"Market Cap: ${stock_data['market_cap']:,}\n"
                        return context

        # Cryptocurrency queries
        crypto_keywords = ['bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'cryptocurrency']
        if any(keyword in user_input_lower for keyword in crypto_keywords):
            for crypto in ['btc', 'eth', 'ada', 'sol', 'doge']:
                if crypto in user_input_lower or self.get_crypto_name(crypto) in user_input_lower:
                    crypto_data = self.get_crypto_data(crypto)
                    if crypto_data:
                        context = f"\nCurrent cryptocurrency data for {crypto_data['symbol']}:\n"
                        context += f"Price: ${crypto_data['price']:,.2f} USD\n"
                        context += f"24h Change: {crypto_data['change_24h']:+.2f}%\n"
                        if crypto_data['market_cap']:
                            context += f"Market Cap: ${crypto_data['market_cap']:,.0f}\n"
                        return context

        return None

    def get_system_context(self, user_input):
        """Get system information context"""
        user_input_lower = user_input.lower()

        # System info queries
        system_keywords = ['system', 'cpu', 'memory', 'ram', 'disk', 'storage', 'performance']
        if any(keyword in user_input_lower for keyword in system_keywords):
            system_info = self.get_system_info()
            if system_info:
                context = f"\nCurrent system information:\n"
                context += f"CPU Usage: {system_info['cpu_usage']}\n"
                context += f"Memory: {system_info['memory_used']}/{system_info['memory_total']} ({system_info['memory_percent']})\n"
                context += f"Disk: {system_info['disk_used']}/{system_info['disk_total']} ({system_info['disk_percent']})\n"
                context += f"Platform: {system_info['platform']}\n"
                return context

        return None

    def get_stock_symbol(self, name):
        """Map company names to stock symbols"""
        stock_map = {
            'apple': 'AAPL',
            'google': 'GOOGL',
            'microsoft': 'MSFT',
            'tesla': 'TSLA',
            'amazon': 'AMZN',
            'meta': 'META',
            'nvidia': 'NVDA',
            'netflix': 'NFLX',
            'spotify': 'SPOT'
        }
        return stock_map.get(name.lower(), name.upper())

    def get_crypto_name(self, symbol):
        """Map crypto symbols to names"""
        crypto_names = {
            'btc': 'bitcoin',
            'eth': 'ethereum',
            'ada': 'cardano',
            'sol': 'solana',
            'doge': 'dogecoin'
        }
        return crypto_names.get(symbol.lower(), symbol)

    def get_ai_response(self, user_input):
        """Get response from OpenAI GPT"""
        try:
            # Add user input to conversation history
            self.conversation_history.append({"role": "user", "content": user_input})

            # Keep conversation history manageable (last 10 messages)
            if len(self.conversation_history) > 10:
                self.conversation_history = self.conversation_history[-10:]

            # Add current time context for time-related queries
            enhanced_personality = Config.ASSISTANT_PERSONALITY
            if any(keyword in user_input.lower() for keyword in ['time', 'date', 'when', 'what day']):
                enhanced_personality += f"\n\n{self.get_current_time_context()}"

            # Add weather context for weather-related queries
            weather_context = self.get_weather_context(user_input)
            if weather_context:
                enhanced_personality += f"\n\n{weather_context}"

            # Add real-time data context
            data_context = self.get_realtime_data_context(user_input)
            if data_context:
                enhanced_personality += f"\n\n{data_context}"

            # Add system context for system-related queries
            system_context = self.get_system_context(user_input)
            if system_context:
                enhanced_personality += f"\n\n{system_context}"

            # Create messages for OpenAI
            messages = [
                {"role": "system", "content": enhanced_personality}
            ] + self.conversation_history

            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=messages,
                max_tokens=150,
                temperature=0.7
            )

            ai_response = response.choices[0].message.content.strip()

            # Add AI response to conversation history
            self.conversation_history.append({"role": "assistant", "content": ai_response})

            return ai_response

        except Exception as e:
            return f"I'm sorry, I'm having trouble processing that request. Error: {str(e)}"

# Initialize Jarvis
jarvis = JarvisAssistant()

@app.route('/')
def home():
    return jsonify({"message": "Jarvis AI Assistant Backend is running!"})

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        user_message = data.get('message', '')

        if not user_message:
            return jsonify({"error": "No message provided"}), 400

        # Process the command
        response = jarvis.process_command(user_message)

        # Handle website opening commands
        if isinstance(response, tuple):
            message, url = response
            return jsonify({
                "response": message,
                "action": "open_website",
                "url": url
            })

        return jsonify({"response": response})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "assistant": Config.ASSISTANT_NAME})

if __name__ == '__main__':
    app.run(debug=Config.FLASK_DEBUG, host='0.0.0.0', port=5000)
