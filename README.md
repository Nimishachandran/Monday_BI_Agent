# Monday.com BI Agent

A conversational Business Intelligence agent that answers founder-level queries using **live** Monday.com data.

## Live Demo
> Deploy to Vercel → your-app.vercel.app

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **LLM**: Groq API (`llama-3.3-70b-versatile`) — free tier, fast, tool-calling support
- **Monday.com**: GraphQL API v2 (live, no caching)
- **UI**: Tailwind CSS, dark dashboard theme
- **Hosting**: Vercel (zero-config deploy)

---

## Setup Guide

### 1. Clone & Install
```bash
git clone <your-repo>
cd monday-bi-agent
npm install
```

### 2. Set Up Monday.com Boards

**Import CSVs as boards:**
1. Go to Monday.com → New Board → Import from Excel/CSV
2. Import `Deal_funnel_Data.csv` → Name it **"Deal Funnel"**
3. Import `Work_Order_Tracker_Data.csv` → Name it **"Work Order Tracker"**

**Configure column types in Monday.com (important!):**

For Deal Funnel board:
| Column | Type |
|--------|------|
| Deal Name | Item Name (default) |
| Owner code | Text |
| Client Code | Text |
| Deal Status | Status |
| Close Date (A) | Date |
| Closure Probability | Text |
| Masked Deal value | Numbers |
| Tentative Close Date | Date |
| Deal Stage | Text |
| Product deal | Text |
| Sector/service | Text |
| Created Date | Date |

For Work Order Tracker board:
| Column | Type |
|--------|------|
| Deal name masked | Item Name (default) |
| Customer Name Code | Text |
| Serial # | Text |
| Nature of Work | Text |
| Execution Status | Status |
| Data Delivery Date | Date |
| Date of PO/OI | Date |
| Document Type | Text |
| Probable Start Date | Date |
| Probable End Date | Date |
| BD/KAM Personnel code | Text |
| Sector | Text |
| Type of Work | Text |
| Amount in Rupees (Excl of GST) (Masked) | Numbers |
| Billed Value in Rupees (Excl of GST) (Masked) | Numbers |
| Collected Amount in Rupees (Incl of GST) (Masked) | Numbers |
| Amount Receivable (Masked) | Numbers |
| Invoice Status | Status |
| WO Status (billed) | Status |
| Billing Status | Status |

**Get Board IDs:**
1. Open each board in Monday.com
2. Look at the URL: `monday.com/boards/XXXXXXXXX` — that number is the board ID

**Get API Key:**
1. Monday.com → Profile (top right) → Developers → API → Copy token

### 3. Get Groq API Key
1. Go to [console.groq.com](https://console.groq.com)
2. Sign up (free) → API Keys → Create Key

### 4. Configure Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```
MONDAY_API_KEY=your_monday_api_token
MONDAY_DEALS_BOARD_ID=your_deals_board_id
MONDAY_WORKORDERS_BOARD_ID=your_work_orders_board_id
GROQ_API_KEY=your_groq_api_key
```

### 5. Run Locally
```bash
npm run dev
# Open http://localhost:3000
```

### 6. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Or via Vercel Dashboard:
1. Push code to GitHub
2. Import repo in Vercel
3. Add all 4 environment variables in Vercel project settings
4. Deploy

---

## Sample Queries to Try

- "How's our pipeline looking for this quarter?"
- "Which sector has the most deal value in the open pipeline?"
- "Show me the Renewables pipeline"
- "What's our total billed vs collected revenue?"
- "How many work orders are overdue?"
- "What's the weighted pipeline value across all open deals?"
- "Who are our top owners by deal count?"
- "How many deals are at Negotiations stage?"

---

## Architecture

```
User Message
    ↓
Next.js API Route /api/chat
    ↓
Groq Agent (llama-3.3-70b) with tool definitions
    ↓
Tool calls → Monday.com GraphQL API (LIVE, no cache)
    ↓
Data normalization (handle nulls, inconsistent formats)
    ↓
Analytics computation
    ↓
Groq synthesizes final answer
    ↓
Response with: answer + tool traces + tools used
```

## Data Normalization Strategy

The data is intentionally messy. Key normalizations applied at query time:

- **Closure Probability**: "High/Medium/Low" text → numeric equivalents (0.85/0.55/0.20)
- **Deal Stage**: Strip letter prefixes ("A. Lead Generated" → "Lead Generated")
- **Dates**: Multiple format support (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY)
- **Sectors**: Case normalization + alias mapping
- **Currencies**: Formatted as ₹Cr/₹L/₹K for readability
- **Duplicate headers**: Row 181 in deals has a duplicate header — filtered out
- **Execution Status**: Month names ("June") → "In Progress (June)"
- **Quantities**: Embedded units ("5360 HA") → separated value + unit
- **Null handling**: Empty strings, "None", "N/A", "-" all treated as null

---

## Project Structure

```
src/
├── app/
│   ├── api/chat/route.ts    # Agent API endpoint
│   ├── page.tsx             # Chat UI
│   ├── layout.tsx           # Root layout
│   └── globals.css          # Dark dashboard styles
└── lib/
    ├── agent.ts             # Groq agent + tool definitions + execution
    ├── monday.ts            # Monday.com GraphQL client
    └── normalize.ts         # Data normalization utilities
```
