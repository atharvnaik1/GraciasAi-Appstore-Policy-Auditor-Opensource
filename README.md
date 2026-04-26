# ipaShip - App Store Compliance Auditor (Open Source)

AI-powered iOS App Store compliance auditor. Upload your `.ipa` file and get a comprehensive audit against Apple's Review Guidelines — before you submit.

**Live at: [opensource.ipaship.com](https://opensource.ipaship.com)**

## Features

- **IPA Analysis** — Upload `.ipa` files (up to 150MB) for automated compliance auditing
- **Full Guidelines Coverage** — Checks all 6 major App Store Review Guideline categories: Safety, Performance, Business, Design, Legal & Privacy, and Technical
- **Multi-Provider AI** — Bring your own key from Anthropic (Claude), OpenAI (GPT), Google Gemini, or OpenRouter
- **Model Selection** — Choose specific models per provider (Claude Sonnet 4, GPT-4o, Gemini 2.5 Flash, etc.)
- **Real-Time Streaming** — Watch your audit report generate live as the AI analyzes your code
- **Export Reports** — Download as Markdown or PDF
- **Zero-Trust Security** — Files processed in ephemeral temp storage and deleted immediately. API keys stay in your browser, never on our servers
- **100% Open Source** — Fully auditable codebase

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS, Framer Motion |
| Backend | Next.js API Routes (Node.js) |
| Database | MongoDB (Mongoose) |
| AI Providers | Anthropic, OpenAI, Google Gemini, OpenRouter |
| File Processing | Busboy (streaming uploads), `unzip` (IPA extraction) |
| Export | html2pdf.js, React Markdown |

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB URI (Atlas or local)
- API key from at least one AI provider
- `unzip` installed on the server/runtime environment

```bash
# Ubuntu/Debian
sudo apt-get update && sudo apt-get install -y unzip
```

### Setup

```bash
# Clone the repo
git clone https://github.com/atharvnaik1/ipaShip-Ai---Appstore-Playstore-Policy-Auditor-Opensource-.git
cd ipaShip-Ai---Appstore-Playstore-Policy-Auditor-Opensource-

# Install dependencies
npm install

# Create environment file
echo 'MONGODB_URI=your_mongodb_uri_here' > .env.local

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## How It Works

1. **Upload** — Drop your `.ipa` file. The server streams it to disk via Busboy without buffering in memory.
2. **Extract** — The IPA is unzipped and all relevant source files are collected (`.swift`, `.m`, `.plist`, `.entitlements`, `.storyboard`, `.xcprivacy`, etc.). Binary files and build artifacts are skipped.
3. **Analyze** — Source files are sent to your chosen AI provider with a structured audit prompt. The response streams back in real-time.
4. **Report** — You get a structured compliance report with pass/fail indicators, severity ratings, and a prioritized remediation plan.

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/audit` | Upload IPA, stream AI audit report |
| `POST` | `/api/save-report` | Save report to MongoDB |
| `GET` | `/api/visitor` | Increment and return visitor count |

## Client Wrappers / SDKs

ipaShip provides ready-to-use boilerplate SDKs and wrappers for various ecosystems and languages. You can find them in the `wrappers/` directory. Each wrapper is skeletoned to pragmatically audit your `.ipa` files directly from your CI/CD pipelines, backend backend, or build environments!

### Commands to Run Wrappers

Here are quick commands to interact with the given wrappers:

**Node.js / NPM**
```bash
cd wrappers/npm && npm install
node index.js
```

**Python**
```bash
cd wrappers/python
python3 ipaship.py
```

**Rust**
```bash
cd wrappers/rust
cargo run --release
```

**Go**
```bash
cd wrappers/go
go run ipaship.go
```

**Homebrew (MacOS CLI)**
```bash
brew install ./wrappers/homebrew/ipaship.rb
ipaship /path/to/app.ipa
```

**C / C++**
```bash
cd wrappers/c && gcc ipaship.c -o ipaship && ./ipaship
cd wrappers/cpp && g++ ipaship.cpp -o ipaship && ./ipaship
```

**Java & Kotlin**
```bash
# Java
cd wrappers/java && mvn clean install
# Kotlin
cd wrappers/kotlin && ./gradlew build
```

**Ruby**
```bash
cd wrappers/ruby
gem build ipaship.gemspec
```

**PHP**
```bash
cd wrappers/php
composer install
```

**C# / .NET**
```bash
cd wrappers/csharp-dotnet
dotnet build
```

**R**
```R
# Load inside your R script (wrappers/r)
source("R/ipaship.R")
ipaship_audit("app.ipa", "API_KEY")
```

**Linux (Bash CLI)**
```bash
chmod +x wrappers/linux/ipaship-cli.sh
./wrappers/linux/ipaship-cli.sh /path/to/app.ipa "YOUR_API_KEY"
```

**Swift & Apple Frameworks (Obj-C / Cocoapods)**
- Add `wrappers/swift-cocoapods` as a local Swift Package Dependency.
- Integrate the Objective-C headers from `wrappers/objc` into your build.

**Cross-Platform App Frameworks (Dart/Flutter, Expo, Ionic)**
- **Flutter:** Import `wrappers/flutter-dart` via local path dependency in your `pubspec.yaml`.
- **Expo:** Integrate `wrappers/expo/index.js` as an Expo config plugin.
- **Ionic:** Use the `wrappers/ionic` wrapper with Capacitor.

## Deployment

A deployment script is included for Ubuntu 24.04 VMs:

```bash
# On the server, create .env.local first
echo 'MONGODB_URI=your_mongodb_uri_here' > /opt/ipaship/.env.local

# Ensure unzip is installed (required by /api/audit extraction)
sudo apt-get update && sudo apt-get install -y unzip

# Then run the deploy script
chmod +x deploy.sh
./deploy.sh
```

The script sets up Node.js 20, PM2, Nginx (with streaming/upload support), and UFW firewall.

## Security

- **No cloud storage** — Files are processed in ephemeral `/tmp` directories and deleted immediately after audit
- **BYOK (Bring Your Own Key)** — API keys are stored in your browser's localStorage, never sent to our servers
- **No shell injection** — File extraction uses `execFile` (no shell), preventing command injection via filenames
- **Binary detection** — Binary plists and compiled files are detected and skipped
- **Rate limiting** — 5 requests per IP per minute via in-memory LRU cache
- **Prompt injection guards** — System/user message separation with explicit instructions to treat file contents as data only

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## License

Open source. See repository for details.

---

Built by [ipaShip](https://ipaship.com)
© ipaShip – Original Creator: Atharv Naik
