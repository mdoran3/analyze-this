# Analyze This - Advanced Music Analysis Platform

**Analyze This** is a comprehensive React + Vite web application for musicians, producers, and music enthusiasts to analyze songs with professional-grade tools. Get instant musical insights including key detection, BPM analysis, MIDI generation, and more — all processed locally in your browser.

Powered by [Essentia.js](https://essentia.upf.edu/) and enhanced with cloud storage, user authentication, and interactive MIDI previews.

---

## ✨ Key Features

### 🎵 **Audio Analysis**
- 🎶 **Multi-format support**: MP3, WAV, FLAC, M4A, OGG, AAC
- 🔑 **Key detection**: Musical key + mode with confidence scoring  
- 🥁 **BPM detection**: Advanced tempo analysis with multiple algorithms
- 📊 **Circle of Fifths**: Interactive visualization of musical relationships
- ⚡ **Real-time processing**: Fast, in-browser analysis (no uploads required)

### 🎹 **MIDI Generation & Preview**
- 🎼 **Chord progressions**: Generate MIDI from detected harmonies
- 🎵 **Scale patterns**: Export scales in various modes
- � **Arpeggiated grooves**: Create flowing melodic patterns
- 🔊 **Live preview**: Play generated MIDI with Web Audio API synthesis
- 💾 **MIDI export**: Download standard MIDI files for your DAW

### 👤 **User Experience**
- 🔐 **User authentication**: Secure signup/signin with email confirmation
- � **Project management**: Save and organize your analyses in the cloud
- 📱 **Responsive design**: Works seamlessly on desktop and mobile
- 🎨 **Professional UI**: Clean, musician-focused interface
- 🔒 **Privacy-first**: Audio processing stays local, only results saved to cloud

---

## 🛠️ Tech Stack

### **Frontend**
- [React 18](https://react.dev/) + [Vite](https://vitejs.dev/) - Modern development environment
- [Essentia.js](https://essentia.upf.edu/documentation/essentiajs/) - WebAssembly audio analysis
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) - MIDI playback synthesis
- [react-dropzone](https://react-dropzone.js.org/) - Drag & drop file handling

### **Backend & Database**
- [Supabase](https://supabase.com/) - PostgreSQL database with real-time features
- **Row Level Security** - Secure, user-scoped data access
- **Email authentication** - Built-in user management with confirmation

### **Audio Processing**
- **Advanced BPM detection** - Multiple algorithms with confidence scoring
- **Key detection algorithms** - Krumhansl-Schmuckler and Temperley profiles
- **MIDI generation** - Chord extraction and pattern creation
- **Real-time synthesis** - Browser-based audio playback

---

## � Quick Start

### **Prerequisites**
- Node.js 18+ and npm
- Modern web browser with Web Audio API support

### **Installation**

1. **Clone the repository:**
```

2. **Install dependencies:**
```bash
npm install
```

3. **Start development server:**
```bash
npm run dev
```

4. **Open your browser:**
   - Navigate to `http://localhost:5173`
   - Start analyzing your music! 🎵

> **Note**: The app works fully offline for audio analysis. For cloud features like user accounts and project saving, see the Supabase setup section below.

---

## 📖 Usage Guide

### **Basic Analysis**
1. **Upload audio**: Drag & drop or click to select audio files
2. **Wait for processing**: Analysis runs locally in your browser
3. **View results**: Key, BPM, and confidence scores appear instantly
4. **Explore visualizations**: Interactive Circle of Fifths shows musical relationships

### **MIDI Features**
1. **Generate patterns**: Click "Generate MIDI" for chords, scales, or arpeggios
2. **Preview audio**: Use play buttons to hear generated patterns
3. **Export MIDI**: Download `.mid` files for use in your DAW
4. **Customize patterns**: Adjust tempo and pattern complexity

### **Project Management**
1. **Sign up**: Create account with email confirmation
2. **Save projects**: Name and store your analyses in the cloud
3. **Access anywhere**: Sign in from any device to view saved projects
4. **Organize work**: Track your musical analysis history

---

## 🎯 Features in Detail

### **Audio Analysis Engine**
- **Key Detection**: Uses multiple algorithms including Krumhansl-Schmuckler and Temperley key profiles
- **BPM Analysis**: Advanced tempo detection with autocorrelation and onset detection methods
- **Confidence Scoring**: Reliability metrics for all analysis results
- **Format Support**: Handles all major audio formats via Web Audio API

### **MIDI Generation**
- **Chord Progressions**: Extract harmonic content and generate playable MIDI
- **Scale Patterns**: Create scale runs in detected key with various modes
- **Arpeggiated Patterns**: Generate flowing melodic patterns based on harmonic analysis
- **Tempo Matching**: MIDI playback synchronized to detected BPM

### **Cloud Integration**
- **User Authentication**: Secure email-based signup with confirmation
- **Project Storage**: PostgreSQL database with Row Level Security
- **Real-time Sync**: Instant access to projects across devices
- **Privacy Protection**: Only analysis results stored, audio stays local

---

## 🔧 Development

### **Project Structure**
```
src/
├── components/          # React components
│   ├── AuthModal.jsx   # User authentication
│   ├── MidiExport.jsx  # MIDI generation & preview
│   ├── SavePrompt.jsx  # Project saving workflow
│   └── ...
├── auth/               # Authentication context
├── engine/             # Audio analysis worker
├── utils/              # Utilities (MIDI, audio)
└── api/                # Supabase integration
```

### **Available Scripts**
```bash
npm run dev          # Start development server
npm run build        # Build for production  
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### **Key Dependencies**
- `@supabase/supabase-js` - Database and authentication
- `essentia.js` - Audio analysis algorithms
- `react-dropzone` - File upload handling
- `vite` - Build tool and development server

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**: Follow the existing code style
4. **Test thoroughly**: Ensure audio analysis and MIDI features work
5. **Submit a pull request**: Describe your changes clearly

### **Development Guidelines**
- Use TypeScript-style JSDoc comments
- Maintain responsive design principles
- Test with various audio formats
- Preserve user privacy (local audio processing)

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- **[Essentia.js](https://essentia.upf.edu/)** - Incredible audio analysis library
- **[Supabase](https://supabase.com/)** - Seamless backend-as-a-service
- **[Web Audio API](https://webaudio.github.io/web-audio-api/)** - Browser audio processing
- **Music Theory Community** - For algorithm insights and feedback

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/mdoran3/analyze-this/issues)
- **Discussions**: [GitHub Discussions](https://github.com/mdoran3/analyze-this/discussions)
- **Documentation**: Check `SUPABASE_SETUP.md` for backend setup

---

**Built with ❤️ for the music community**bash
git clone https://github.com/mdoran3/analyze-this.git
cd analyze-this
