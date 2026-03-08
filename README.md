# 🗣️ Swar-Vani — Voice-First AI Procurement for Bharat

> *"Suno Swar-Vani, Parle-G ke 10 carton ka sabse sasta rate batao"*
> *(Listen Swar-Vani, tell me the cheapest rate for 10 cartons of Parle-G)*

**Swar-Vani** is an AI-powered platform that enables India's kirana stores and SMEs to manage procurement, inventory, and marketplace operations through **voice in Hindi** — no screens, no typing, no English required.

[![Track](https://img.shields.io/badge/Track-Professional%2FStartup-purple)]()
[![Problem Statement](https://img.shields.io/badge/PS-AI%20for%20Retail%2C%20Commerce%20%26%20Market%20Intelligence-blue)]()
[![AWS](https://img.shields.io/badge/Powered%20by-Amazon%20Bedrock-orange)]()

---

## 🎯 The Problem

India has **63 million micro, small, and medium enterprises** that contribute **30% to the nation's GDP**. Yet:

- **78%** of kirana stores still track inventory manually on paper registers
- **92%** have never used a digital procurement tool — interfaces are complex and English-heavy
- **₹2,400 crore** is lost annually to stockouts caused by reactive (not predictive) restocking
- Most store owners are **comfortable with voice** but struggle with typing and navigation

## 💡 The Solution

Swar-Vani reimagines procurement as a **conversation** — not a form to fill.

A store owner speaks: *"Aaj ka doodh aur bread ka stock check karo, agar kam hai toh order laga do"* — and Ramu Kaka (the AI assistant):

1. **Understands** the intent in Hindi (with code-mixing support)
2. **Checks** inventory and compares prices across suppliers
3. **Responds** via voice with the best deal
4. **Executes** the order on confirmation

All hands-free. All in the language they think in.

## 🎬 Live Demo

The app includes a built-in **interactive demo mode** that showcases real conversations with Ramu Kaka — no account needed.

Just visit the app and click **"🎬 Watch Live Demo"** on the login screen.

## ✨ What's Built

### 🎙️ Voice Interface
- **Hindi voice input** → Amazon Transcribe → AI conversation → Amazon Polly → Hindi voice response
- Full speech-to-speech loop with natural Hindi responses
- Language selection: Hindi, English, Marathi
- Works on any browser with microphone access

### 🤖 Smart Conversation Engine (Ramu Kaka)
- Powered by **Amazon Bedrock (Nova Lite)** with a custom conversation engine
- Intent extraction: `check_inventory`, `compare_prices`, `create_order`, `list_low_stock`, `general_query`
- Multi-turn context: remembers conversation state across messages
- Hindi-first: thinks and responds in Hindi, handles code-mixed input naturally
- **Proactive alerts**: warns about low stock, out-of-stock items, festival-driven demand

### 📦 Inventory Management
- Real-time stock tracking with low-stock and out-of-stock detection
- Voice-driven stock updates ("Dettol ke 5 packet aaye hain")
- Reorder point alerts with days-of-stock estimation
- Visual dashboard with live inventory grid

### 💰 Smart Procurement
- Multi-supplier price comparison (Udaan, Jumbotail, LocalMart)
- Voice-initiated order creation with confirmation flow
- Order history and status tracking
- Festival calendar integration for demand forecasting

### 📒 Khata (Credit Ledger)
- Digital credit tracking for regular customers
- Voice: "Sharma ji ka ₹500 ka udhar likho" → creates khata entry
- Transaction history per customer
- Outstanding balance tracking

### 🏪 ONDC Marketplace
- Catalog management with sync to ONDC network
- Order management for incoming marketplace orders
- Stats dashboard (listed items, stock status, daily orders/revenue)
- Voice-driven catalog updates

### 📊 Analytics
- Daily store analytics: voice commands, orders, restock activity
- Stock health score
- Top depleted items tracking

## 🏗️ Architecture

```
┌─────────────────┐
│   Web App (React)│ ← Voice recording + chat + dashboards
│   + Cognito Auth │
└────────┬────────┘
         │ HTTPS
┌────────▼────────┐
│  API Gateway     │ ← REST API (10 endpoints)
│  + Lambda URLs   │ ← Direct voice endpoint (bypasses 29s GW timeout)
└────────┬────────┘
         │
┌────────▼────────┐     ┌──────────────┐
│  Lambda Functions│────→│ Amazon Bedrock│ (Nova Lite — conversation AI)
│  (10 handlers)   │     └──────────────┘
│                  │────→│ Transcribe    │ (Hindi ASR)
│                  │────→│ Polly (Kajal) │ (Hindi TTS)
└────────┬────────┘     └──────────────┘
         │
┌────────▼────────┐     ┌──────────────┐
│  DynamoDB        │     │ S3           │ (audio files)
│  (single-table)  │     └──────────────┘
└─────────────────┘
```

## ☁️ AWS Services Used

| AWS Service | Purpose |
|---|---|
| **Amazon Bedrock** (Nova Lite) | Conversation AI — intent parsing, Hindi response generation, price reasoning |
| **Amazon Transcribe** | Hindi speech-to-text (ASR) |
| **Amazon Polly** (Kajal voice) | Hindi text-to-speech (TTS) |
| **Amazon DynamoDB** | Store profiles, inventory, orders, khata, conversations (single-table design) |
| **Amazon S3** | Audio file storage for voice interactions |
| **Amazon Cognito** | Phone-number-based authentication |
| **Amazon API Gateway** | REST API with CORS, throttling |
| **AWS Lambda** (Node.js 20) | 10 serverless functions + Function URL for voice |
| **Amazon CloudFront + S3** | Static web hosting (SPA) |
| **AWS CDK** | Infrastructure as Code (5 stacks) |

## 🗂️ Project Structure

```
swar-vani/
├── infra/                          # AWS CDK Infrastructure
│   ├── bin/app.ts                  # CDK app entry (5 stacks)
│   └── lib/
│       ├── data-stack.ts           # DynamoDB + S3
│       ├── auth-stack.ts           # Cognito User Pool
│       ├── api-stack.ts            # API Gateway + 10 Lambdas
│       ├── ai-stack.ts             # Bedrock Agent (Phase 2)
│       └── web-stack.ts            # CloudFront + S3 hosting
├── src/
│   ├── handlers/                   # Lambda function handlers
│   │   ├── conversation.ts         # Chat endpoint (Bedrock AI)
│   │   ├── voice.ts                # Voice endpoint (Transcribe → AI → Polly)
│   │   ├── inventory.ts            # Stock management
│   │   ├── orders.ts               # Order CRUD
│   │   ├── products.ts             # Product search
│   │   ├── prices.ts               # Price comparison
│   │   ├── khata.ts                # Credit ledger
│   │   ├── ondc.ts                 # ONDC marketplace
│   │   ├── analytics.ts            # Store analytics
│   │   └── auth.ts                 # Auth helpers
│   └── lib/                        # Shared libraries
│       ├── conversation-engine.ts  # Core AI conversation logic (~970 LOC)
│       ├── bedrock.ts              # Bedrock model invocation
│       ├── dynamo.ts               # DynamoDB helpers
│       ├── product-master.ts       # 50-product FMCG catalog
│       ├── festival-calendar.ts    # Indian festival demand forecasting
│       ├── proactive-alerts.ts     # Stock alerts & recommendations
│       ├── ondc-mock.ts            # ONDC network simulation
│       ├── weather.ts              # Weather-based demand tips
│       └── types.ts                # TypeScript types
├── web/                            # React SPA (Vite + TypeScript)
│   └── src/
│       ├── App.tsx                 # Main app — chat + inventory sidebar
│       ├── DemoMode.tsx            # Interactive demo walkthrough
│       ├── LoginPage.tsx           # Cognito phone auth
│       ├── KhataDashboard.tsx      # Credit ledger UI
│       ├── OndcDashboard.tsx       # ONDC marketplace UI
│       ├── api.ts                  # API client
│       ├── auth.ts                 # Cognito auth
│       └── index.css               # Dark theme UI (~1600 LOC)
├── scripts/                        # Data seeding
│   ├── seed-data.ts                # 50 products, 3 suppliers, stores
│   ├── seed-demo-data.ts           # Demo conversation data
│   └── seed-ondc.ts                # ONDC catalog seed
├── .kiro/specs/                    # Requirements & design docs
│   └── swar-vani-procurement/
│       ├── requirements.md         # 20 user stories with acceptance criteria
│       └── design.md               # Full architecture & data models
└── README.md
```

**~7,300 lines of code** across backend, frontend, infrastructure, and tooling.

## 🛠️ Setup

### Prerequisites
- Node.js 20+
- AWS account with Bedrock access (Nova Lite model)
- AWS CDK CLI (`npm install -g aws-cdk`)

### Deploy Backend

```bash
# Install dependencies
npm install
cd infra && npm install && cd ..

# Deploy all stacks
cd infra && cdk deploy --all

# Note the outputs:
#   ApiUrl, VoiceFunctionUrl, UserPoolId, UserPoolClientId
```

### Seed Data

```bash
npx tsx scripts/seed-data.ts
npx tsx scripts/seed-demo-data.ts
npx tsx scripts/seed-ondc.ts
```

### Build & Deploy Web

```bash
cd web && npm install

# Create .env from template (fill in CDK outputs)
cp .env.example .env

# Build
npm run build

# Deploy to S3/CloudFront
cd ../infra && cdk deploy SwarVaniWebStack
```

## 🌐 Roadmap

- [ ] Multi-agent orchestration with Bedrock Agents (specialist agents for procurement, inventory, ONDC)
- [ ] Bedrock Knowledge Base for product catalog RAG
- [ ] Streaming ASR/TTS for sub-second perceived latency
- [ ] WhatsApp Business API integration
- [ ] IVR support for feature phones
- [ ] More Indian languages (Tamil, Telugu, Kannada, Bengali, etc.)
- [ ] Offline resilience with local caching
- [ ] Real B2B platform integration (Udaan, Jumbotail APIs)

## 👥 Team

| Member | Role |
|---|---|
| Ashish Mishra | Full-stack + AWS Architecture |
| Darshan Yadav | Full-stack + AWS Architecture |
| Parag Khachane | Full-stack + AWS Architecture |

## 📄 License

MIT License — see [LICENSE](LICENSE)

---

<p align="center">
  <b>Built for 🇮🇳 AI for Bharat Hackathon 2026</b><br>
  <i>Empowering Bharat's businesses, one voice command at a time.</i>
</p>
