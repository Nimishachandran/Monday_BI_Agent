# Decision Log — Monday.com BI Agent

**Candidate:** [Your Name]  
**Date:** March 2026  
**Time Spent:** 6 hours

---

## 1. Tech Stack Decisions

### LLM: Groq (`llama-3.3-70b-versatile`) over OpenAI/Claude

**Decision:** Use Groq's free tier instead of paid LLM APIs.

**Rationale:** The assignment requires a *hosted prototype* accessible by evaluators at any time with no prior notice. Paid APIs (Claude, GPT-4) carry rate limits and cost per call — a stress-test of 20+ queries by an evaluator could fail or incur unexpected costs. Groq's free tier provides 14,400 requests/day with generous token limits, zero cost, and response times of 200–400ms (faster than paid alternatives). `llama-3.3-70b-versatile` supports function/tool calling with quality comparable to GPT-3.5-turbo for structured data tasks.

**Trade-off:** llama-3.3-70b occasionally produces less nuanced business language than GPT-4/Claude Opus. Mitigated with a detailed system prompt that constrains response format.

---

### Framework: Next.js 14 (App Router) + Vercel

**Decision:** Full-stack Next.js with Vercel deployment.

**Rationale:** Fastest path to a production-grade hosted prototype. API routes co-located with UI eliminates a separate backend. Vercel's zero-config deployment means the evaluator gets a live URL with no setup required. The App Router's server components improve performance. Alternative (separate FastAPI backend) would add ~45 minutes of deployment complexity with no user-facing benefit.

---

### Monday.com: REST GraphQL API (not MCP)

**Decision:** Direct GraphQL API calls rather than MCP server.

**Rationale:** MCP (Model Context Protocol) is a bonus feature per the spec. Implementing a full MCP server would consume ~2 hours of the 6-hour budget for marginal gain. The direct API approach achieves the same result — live tool calls with visible traces — with less infrastructure. Every query hits Monday.com's `/v2` endpoint at call time; no data is cached, meeting the "live API calls" requirement.

**Architecture choice:** Tool-calling (function calling) over RAG. The data fits in a single API response (~300 deals, ~200 WOs), making retrieval-augmented generation unnecessary and slower. Tool calls give cleaner execution traces.

---

## 2. Data Quality Decisions

### Normalization at Query Time (not Import Time)

**Decision:** Normalize messy data in code when fetched, not when imported to Monday.com.

**Rationale:** The assignment explicitly states "data is intentionally messy — your agent must handle inconsistencies." Cleaning during import would hide the problem-solving. Runtime normalization demonstrates the agent's resilience. Key normalizations applied:

- **Closure Probability**: Categorical text ("High/Medium/Low") → numeric multipliers for weighted pipeline calculation
- **Deal Stage letter prefixes**: "A. Lead Generated" → "Lead Generated" for clean display
- **Embedded header rows**: Row 181 in the Deals CSV contains a duplicate header row — filtered at query time
- **Execution Status heterogeneity**: Values include "Completed", "Not Started", month names ("June", "November"), "Doc", and "Executed until current month" — all normalized to consistent categories
- **Quantity units**: "5360 HA", "2 Acr" — numeric value separated from unit string
- **Null handling**: Empty strings, "None", "N/A", "-", "0" all treated as null where contextually appropriate

### Data Quality Transparency

**Decision:** Surface data quality caveats in agent responses.

**Rationale:** Founders need to trust the data. Where fields are missing (e.g., ~60% of deals lack a Close Date, Won deals mostly missing deal values), the agent explicitly states this rather than silently omitting records or presenting incomplete sums as complete.

---

## 3. UX Decisions

### Visible Tool-Call Traces

**Decision:** Collapsible trace panel per response showing raw API call details.

**Rationale:** The spec requires "visible API/tool-call traces." Collapsed by default keeps the UI clean for executives; expandable satisfies the evaluation requirement. Each trace shows tool name, arguments, and success/failure with record counts.

### Suggested Queries on Empty State

**Decision:** 6 pre-built query suggestions on first load.

**Rationale:** Reduces time-to-first-value for evaluators. The suggestions cover the key business dimensions (pipeline, sector, revenue, billing) mentioned in the spec's problem statement.

### Conversational History

**Decision:** Full conversation history passed to LLM on each turn.

**Rationale:** Enables follow-up questions ("which sector?" → "show me only Mining") without repeating context. History is maintained in React state (no persistence needed for prototype phase).

---

## 4. Assumptions Made

1. **Currency**: All monetary values are in Indian Rupees (₹) based on "Amount in Rupees" column names and Indian fiscal year format (FY25-26) in invoice numbers.
2. **Quarter**: Current quarter is Q1 2026 (January–March 2026) based on today's date context.
3. **Sector mapping**: "Energy" in user queries maps to "Renewables" (closest sector in data). Stated in responses.
4. **Deal value for Dead/Won deals**: Many are null — excluded from pipeline value calculations, disclosed in data quality notes.
5. **Board column IDs**: Monday.com generates column IDs dynamically. The normalization layer maps both human-readable names and typical Monday.com auto-generated IDs to handle either.
