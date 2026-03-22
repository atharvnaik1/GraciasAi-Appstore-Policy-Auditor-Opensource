# Gracias AI - App Store Compliance Auditor (Open Source)

AI-powered iOS App Store compliance auditor. Upload your `.ipa` file and get a comprehensive audit against Apple's Review Guidelines — before you submit.

**Live at: [opensource.gracias.sh](https://opensource.gracias.sh)**

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

### Setup

```bash
# Clone the repo
git clone https://github.com/atharvnaik1/Gracias-Ai---Appstore-Playstore-Policy-Auditor-Opensource-.git
cd Gracias-Ai---Appstore-Playstore-Policy-Auditor-Opensource-

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

## Deployment

A deployment script is included for Ubuntu 24.04 VMs:

```bash
# On the server, create .env.local first
echo 'MONGODB_URI=your_mongodb_uri_here' > /opt/gracias-ai/.env.local

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

Built by [Gracias AI](https://gracias.sh)
