class JarvisVoiceAssistant {
  constructor() {
    this.isListening = false;
    this.isSpeaking = false;
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.voices = [];
    this.settings = {
      voice: null,
      rate: 1.0,
      wakeWordEnabled: true,
      autoSpeak: true,
    };

    // Backend URL
    this.backendUrl = "http://localhost:5000";

    // Initialize the assistant
    this.init();
  }

  init() {
    this.checkMicrophonePermissions();
    this.setupSpeechRecognition();
    this.setupEventListeners();
    this.loadVoices();
    this.checkBackendConnection();
    this.setupWakeWordDetection();
  }

  async checkMicrophonePermissions() {
    try {
      // Check if we can access the microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop()); // Stop the stream immediately
      console.log("Microphone access granted");
      this.updateStatus("Microphone ready - Click to speak", "ready");
    } catch (error) {
      console.error("Microphone access error:", error);
      let errorMessage = "";

      if (error.name === "NotAllowedError") {
        errorMessage =
          "Microphone access denied. Please allow microphone access and refresh the page.";
      } else if (error.name === "NotFoundError") {
        errorMessage = "No microphone found. Please connect a microphone.";
      } else {
        errorMessage = "Microphone error: " + error.message;
      }

      this.updateStatus(errorMessage, "error");
    }
  }

  async testMicrophone() {
    const micTestButton = document.getElementById("micTestButton");
    const originalText = micTestButton.textContent;

    try {
      micTestButton.textContent = "🎤 Testing...";
      micTestButton.disabled = true;

      // Test microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Create audio context to analyze audio levels
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      microphone.connect(analyser);
      analyser.fftSize = 256;

      let maxVolume = 0;
      let testDuration = 3000; // 3 seconds
      let startTime = Date.now();

      this.updateStatus("Speak now to test your microphone...", "listening");

      const checkAudio = () => {
        analyser.getByteFrequencyData(dataArray);
        const volume = Math.max(...dataArray);
        maxVolume = Math.max(maxVolume, volume);

        if (Date.now() - startTime < testDuration) {
          requestAnimationFrame(checkAudio);
        } else {
          // Test complete
          stream.getTracks().forEach((track) => track.stop());
          audioContext.close();

          micTestButton.textContent = originalText;
          micTestButton.disabled = false;

          if (maxVolume > 10) {
            this.updateStatus(
              `✅ Microphone working! Max volume: ${maxVolume}`,
              "ready"
            );
            this.addMessage(
              `Microphone test successful! Detected audio levels up to ${maxVolume}. Your microphone is working properly.`,
              "assistant"
            );
          } else {
            this.updateStatus(
              "❌ No audio detected. Check microphone settings.",
              "error"
            );
            this.addMessage(
              "Microphone test failed. No audio was detected. Please check your microphone settings and try again.",
              "assistant"
            );
          }
        }
      };

      checkAudio();
    } catch (error) {
      console.error("Microphone test error:", error);
      micTestButton.textContent = originalText;
      micTestButton.disabled = false;

      let errorMessage = "Microphone test failed: ";
      if (error.name === "NotAllowedError") {
        errorMessage += "Permission denied. Please allow microphone access.";
      } else if (error.name === "NotFoundError") {
        errorMessage += "No microphone found.";
      } else {
        errorMessage += error.message;
      }

      this.updateStatus(errorMessage, "error");
      this.addMessage(errorMessage, "assistant");
    }
  }

  playBeep() {
    // Create a subtle audio beep to indicate listening started
    try {
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.1
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      // Silently fail if audio context not available
      console.log("Audio beep not available");
    }
  }

  setupSpeechRecognition() {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();

      this.recognition.continuous = true; // Changed to true for longer listening
      this.recognition.interimResults = true;
      this.recognition.lang = "en-US";
      this.recognition.maxAlternatives = 1;

      // Set a custom timeout for stopping recognition
      this.recognitionTimeout = null;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.updateUI("listening");
        this.updateStatus("Listening... Speak now! (10 seconds)", "listening");
        console.log("Speech recognition started");

        // Play a subtle beep to indicate listening started
        this.playBeep();

        // Set a 10-second timeout to stop listening with countdown
        let timeLeft = 10;
        this.recognitionTimeout = setInterval(() => {
          timeLeft--;
          if (timeLeft > 0 && this.isListening) {
            this.updateStatus(
              `Listening... Speak now! (${timeLeft} seconds)`,
              "listening"
            );
          } else if (this.isListening) {
            console.log("Recognition timeout - stopping");
            this.stopListening();
            this.updateStatus(
              "Listening timeout - Click microphone to try again",
              "ready"
            );
          }
        }, 1000);
      };

      this.recognition.onresult = (event) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Show interim results to user
        if (interimTranscript) {
          this.updateStatus(`Hearing: "${interimTranscript}"`, "listening");
        }

        if (finalTranscript) {
          console.log("Final transcript:", finalTranscript);
          // Clear the timeout since we got speech
          if (this.recognitionTimeout) {
            clearInterval(this.recognitionTimeout);
            this.recognitionTimeout = null;
          }
          this.stopListening();
          this.processUserInput(finalTranscript.trim());
        }
      };

      this.recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        this.stopListening();

        let errorMessage = "";
        switch (event.error) {
          case "no-speech":
            errorMessage =
              "No speech detected. Try speaking louder or closer to the microphone.";
            break;
          case "audio-capture":
            errorMessage =
              "Microphone not accessible. Please check permissions.";
            break;
          case "not-allowed":
            errorMessage =
              "Microphone access denied. Please allow microphone access.";
            break;
          case "network":
            errorMessage =
              "Network error. Please check your internet connection.";
            break;
          default:
            errorMessage = `Speech recognition error: ${event.error}`;
        }

        this.updateStatus(errorMessage, "error");

        // Auto-retry for no-speech errors
        if (event.error === "no-speech") {
          setTimeout(() => {
            this.updateStatus("Ready to assist - Try again", "ready");
          }, 3000);
        }
      };

      this.recognition.onend = () => {
        console.log("Speech recognition ended");
        this.stopListening();
      };
    } else {
      console.error("Speech recognition not supported");
      this.updateStatus("Speech recognition not supported", "error");
    }
  }

  setupEventListeners() {
    // Microphone button
    const micButton = document.getElementById("micButton");
    micButton.addEventListener("click", () => {
      if (this.isSpeaking) {
        // If Jarvis is speaking, stop the speech
        this.stopSpeaking();
      } else if (this.isListening) {
        this.stopListening();
      } else {
        this.startListening();
      }
    });

    // Text input
    const textInput = document.getElementById("textInput");
    const sendButton = document.getElementById("sendButton");

    sendButton.addEventListener("click", () => {
      const message = textInput.value.trim();
      if (message) {
        this.processUserInput(message);
        textInput.value = "";
      }
    });

    textInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        sendButton.click();
      }
    });

    // Settings
    const settingsButton = document.getElementById("settingsButton");
    const settingsPanel = document.getElementById("settingsPanel");
    const closeSettings = document.getElementById("closeSettings");

    settingsButton.addEventListener("click", () => {
      settingsPanel.classList.add("open");
    });

    closeSettings.addEventListener("click", () => {
      settingsPanel.classList.remove("open");
    });

    // Settings controls
    this.setupSettingsControls();

    // Microphone test button
    const micTestButton = document.getElementById("micTestButton");
    micTestButton.addEventListener("click", () => {
      this.testMicrophone();
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      // Spacebar to start/stop listening or stop speaking
      if (e.code === "Space" && !e.target.matches("input, textarea")) {
        e.preventDefault();
        if (this.isSpeaking) {
          this.stopSpeaking();
        } else if (this.isListening) {
          this.stopListening();
        } else {
          this.startListening();
        }
      }
      // Escape key to stop everything
      if (e.code === "Escape") {
        if (this.isSpeaking) {
          this.stopSpeaking();
        }
        if (this.isListening) {
          this.stopListening();
        }
      }
    });
  }

  setupSettingsControls() {
    const voiceSelect = document.getElementById("voiceSelect");
    const speechRate = document.getElementById("speechRate");
    const rateValue = document.getElementById("rateValue");
    const wakeWordToggle = document.getElementById("wakeWordToggle");
    const autoSpeak = document.getElementById("autoSpeak");

    voiceSelect.addEventListener("change", (e) => {
      const selectedVoice = this.voices.find(
        (voice) => voice.name === e.target.value
      );
      this.settings.voice = selectedVoice;
    });

    speechRate.addEventListener("input", (e) => {
      this.settings.rate = parseFloat(e.target.value);
      rateValue.textContent = e.target.value;
    });

    wakeWordToggle.addEventListener("change", (e) => {
      this.settings.wakeWordEnabled = e.target.checked;
    });

    autoSpeak.addEventListener("change", (e) => {
      this.settings.autoSpeak = e.target.checked;
    });
  }

  loadVoices() {
    const loadVoicesHandler = () => {
      this.voices = this.synthesis.getVoices();
      const voiceSelect = document.getElementById("voiceSelect");
      voiceSelect.innerHTML = "";

      // Filter and sort voices for better consistency
      const englishVoices = this.voices.filter((voice) =>
        voice.lang.startsWith("en")
      );
      const otherVoices = this.voices.filter(
        (voice) => !voice.lang.startsWith("en")
      );
      const sortedVoices = [...englishVoices, ...otherVoices];

      sortedVoices.forEach((voice) => {
        const option = document.createElement("option");
        option.value = voice.name;
        option.textContent = `${voice.name} (${voice.lang})`;
        voiceSelect.appendChild(option);

        // Set default voice (prefer high-quality English voices)
        if (!this.settings.voice && voice.lang.startsWith("en")) {
          // Prefer Microsoft or Google voices for consistency
          if (
            voice.name.includes("Microsoft") ||
            voice.name.includes("Google") ||
            voice.name.includes("Natural")
          ) {
            this.settings.voice = voice;
            option.selected = true;
          } else if (!this.settings.voice) {
            // Fallback to first English voice
            this.settings.voice = voice;
            option.selected = true;
          }
        }
      });

      // Log available voices for debugging
      console.log(
        "Available voices:",
        this.voices.map((v) => `${v.name} (${v.lang})`)
      );
      console.log("Selected default voice:", this.settings.voice?.name);
    };

    loadVoicesHandler();
    this.synthesis.addEventListener("voiceschanged", loadVoicesHandler);
  }

  async checkBackendConnection() {
    try {
      const response = await fetch(`${this.backendUrl}/health`);
      if (response.ok) {
        this.updateConnectionStatus(true);
      } else {
        this.updateConnectionStatus(false);
      }
    } catch (error) {
      console.error("Backend connection error:", error);
      this.updateConnectionStatus(false);
    }
  }

  updateConnectionStatus(connected) {
    const connectionStatus = document.getElementById("connectionStatus");
    const connectionText = document.getElementById("connectionText");

    if (connected) {
      connectionStatus.classList.add("connected");
      connectionStatus.classList.remove("disconnected");
      connectionText.textContent = "Connected";
    } else {
      connectionStatus.classList.add("disconnected");
      connectionStatus.classList.remove("connected");
      connectionText.textContent = "Disconnected";
    }
  }

  setupWakeWordDetection() {
    // Simple wake word detection using continuous listening
    if (this.recognition && this.settings.wakeWordEnabled) {
      setInterval(() => {
        if (
          !this.isListening &&
          !this.isSpeaking &&
          this.settings.wakeWordEnabled
        ) {
          // Start brief listening for wake word
          this.startWakeWordListening();
        }
      }, 3000);
    }
  }

  startWakeWordListening() {
    if (!this.recognition || this.isListening) return;

    const tempRecognition = new (window.SpeechRecognition ||
      window.webkitSpeechRecognition)();
    tempRecognition.continuous = false;
    tempRecognition.interimResults = false;
    tempRecognition.lang = "en-US";

    tempRecognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      if (transcript.includes("hey jarvis") || transcript.includes("jarvis")) {
        this.speak("Yes, how can I help you?");
        setTimeout(() => this.startListening(), 1000);
      }
    };

    tempRecognition.onerror = () => {
      // Silently handle errors for wake word detection
    };

    try {
      tempRecognition.start();
      setTimeout(() => {
        try {
          tempRecognition.stop();
        } catch (e) {
          // Ignore errors when stopping
        }
      }, 2000);
    } catch (e) {
      // Ignore errors when starting
    }
  }

  startListening() {
    if (!this.recognition || this.isListening) return;

    try {
      this.recognition.start();
    } catch (error) {
      console.error("Error starting recognition:", error);
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }

    // Clear the timeout
    if (this.recognitionTimeout) {
      clearInterval(this.recognitionTimeout);
      this.recognitionTimeout = null;
    }

    this.isListening = false;
    this.updateUI("idle");
    this.updateStatus("Ready to assist", "ready");
  }

  async processUserInput(message) {
    this.addMessage(message, "user");
    this.updateStatus("Processing...", "processing");

    try {
      const response = await fetch(`${this.backendUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: message }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      this.addMessage(data.response, "assistant");

      // Handle special actions
      if (data.action === "open_website" && data.url) {
        window.open(data.url, "_blank");
      }

      // Speak the response if auto-speak is enabled
      if (this.settings.autoSpeak) {
        this.speak(data.response);
      }
    } catch (error) {
      console.error("Error processing message:", error);
      const errorMessage =
        "I'm sorry, I'm having trouble connecting to my backend services. Please check your connection and try again.";
      this.addMessage(errorMessage, "assistant");

      if (this.settings.autoSpeak) {
        this.speak(errorMessage);
      }
    }

    this.updateStatus("Ready to assist", "ready");
  }

  speak(text) {
    if (!this.synthesis || this.isSpeaking) return;

    // Cancel any ongoing speech
    this.synthesis.cancel();

    // Wait a moment for cancellation to complete
    setTimeout(() => {
      this.performSpeech(text);
    }, 100);
  }

  performSpeech(text) {
    const utterance = new SpeechSynthesisUtterance(text);

    // Ensure consistent voice selection
    if (this.settings.voice) {
      utterance.voice = this.settings.voice;
    } else {
      // Fallback to a consistent default voice
      const voices = this.synthesis.getVoices();
      const englishVoices = voices.filter((voice) =>
        voice.lang.startsWith("en")
      );
      if (englishVoices.length > 0) {
        utterance.voice = englishVoices[0];
      }
    }

    // Set speech parameters for consistency
    utterance.rate = this.settings.rate;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.lang = "en-US";

    // Split long text to prevent voice switching
    if (text.length > 200) {
      this.speakInChunks(text);
      return;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.updateUI("speaking");
      this.updateStatus("Speaking...", "speaking");
      console.log(
        "Speech started with voice:",
        utterance.voice?.name || "default"
      );
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.updateUI("idle");
      this.updateStatus("Ready to assist", "ready");
    };

    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event);
      this.isSpeaking = false;
      this.updateUI("idle");
      this.updateStatus("Ready to assist", "ready");
    };

    // Additional event handlers for debugging
    utterance.onpause = () => {
      console.log("Speech paused");
    };

    utterance.onresume = () => {
      console.log("Speech resumed");
    };

    this.synthesis.speak(utterance);
  }

  speakInChunks(text) {
    // Split text into sentences for more consistent voice
    const sentences = text.match(/[^\.!?]+[\.!?]+/g) || [text];
    let currentIndex = 0;

    const speakNextChunk = () => {
      if (currentIndex >= sentences.length || !this.isSpeaking) {
        this.isSpeaking = false;
        this.updateUI("idle");
        this.updateStatus("Ready to assist", "ready");
        return;
      }

      const chunk = sentences[currentIndex].trim();
      if (chunk) {
        const utterance = new SpeechSynthesisUtterance(chunk);

        // Use the same voice for all chunks
        if (this.settings.voice) {
          utterance.voice = this.settings.voice;
        }

        utterance.rate = this.settings.rate;
        utterance.pitch = 1;
        utterance.volume = 1;
        utterance.lang = "en-US";

        utterance.onend = () => {
          currentIndex++;
          // Small delay between chunks to prevent voice switching
          setTimeout(speakNextChunk, 50);
        };

        utterance.onerror = (event) => {
          console.error("Chunk speech error:", event);
          currentIndex++;
          setTimeout(speakNextChunk, 100);
        };

        this.synthesis.speak(utterance);
      } else {
        currentIndex++;
        speakNextChunk();
      }
    };

    this.isSpeaking = true;
    this.updateUI("speaking");
    this.updateStatus("Speaking...", "speaking");
    speakNextChunk();
  }

  stopSpeaking() {
    if (this.synthesis && this.isSpeaking) {
      this.synthesis.cancel();
      this.isSpeaking = false;
      this.updateUI("idle");
      this.updateStatus("Speech stopped - Ready to assist", "ready");
      console.log("Speech manually stopped");
    }
  }

  addMessage(content, sender) {
    const chatMessages = document.getElementById("chatMessages");
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${sender}-message`;

    const avatarDiv = document.createElement("div");
    avatarDiv.className = "message-avatar";
    avatarDiv.innerHTML =
      sender === "user"
        ? '<i class="fas fa-user"></i>'
        : '<i class="fas fa-robot"></i>';

    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";
    contentDiv.innerHTML = `<p>${content}</p>`;

    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  updateUI(state) {
    const avatar = document.getElementById("jarvisAvatar");
    const micButton = document.getElementById("micButton");
    const micIcon = document.getElementById("micIcon");

    // Reset classes
    avatar.classList.remove("listening", "speaking");
    micButton.classList.remove("listening");

    switch (state) {
      case "listening":
        avatar.classList.add("listening");
        micButton.classList.add("listening");
        micIcon.className = "fas fa-microphone-slash";
        break;
      case "speaking":
        avatar.classList.add("speaking");
        micIcon.className = "fas fa-stop";
        break;
      default:
        micIcon.className = "fas fa-microphone";
    }
  }

  updateStatus(text, type) {
    const statusText = document.getElementById("statusText");
    const statusIndicator = document.getElementById("statusIndicator");

    statusText.textContent = text;

    // Reset classes
    statusIndicator.classList.remove("listening", "speaking", "error");

    if (type) {
      statusIndicator.classList.add(type);
    }
  }
}

// Initialize Jarvis when the page loads
document.addEventListener("DOMContentLoaded", () => {
  window.jarvis = new JarvisVoiceAssistant();
});
