// src/lib/agent.ts
import Groq from "groq-sdk";
import { getBoardItems, itemsToObjects } from "./monday";
import {
  DEAL_COLS,
  WO_COLS,
  normalizeSector,
  normalizeDealStatus,
  normalizeDealStage,
  normalizeProbability,
  probabilityToNumber,
  normalizeAmount,
  formatCurrency,
  isThisQuarter,
  isOverdue,
  normalizeExecutionStatus,
  normalizeInvoiceStatus,
  safeStr,
} from "./normalize";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const DEALS_BOARD_ID = process.env.MONDAY_DEALS_BOARD_ID!;
const WO_BOARD_ID = process.env.MONDAY_WORKORDERS_BOARD_ID!;

/* =========================
   TOOLS (Literal Safe)
========================= */

const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "get_pipeline_summary",
      description: "Get pipeline summary across all deals.",
      parameters: {
        type: "object",
        properties: {
          filter_sector: { type: "string" },
          filter_quarter: { type: "boolean" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_revenue_summary",
      description: "Get revenue and billing summary.",
      parameters: {
        type: "object",
        properties: {
          filter_sector: { type: "string" },
        },
      },
    },
  },
];

/* =========================
   TYPES
========================= */

export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AgentResponse {
  answer: string;
  traces: string[];
  toolsUsed: string[];
}

/* =========================
   MAIN AGENT
========================= */

export async function runAgent(
  userMessage: string,
  conversationHistory: AgentMessage[]
): Promise<AgentResponse> {
  const traces: string[] = [];
  const toolsUsed: string[] = [];

  const systemPrompt = `
You are a Business Intelligence agent using LIVE Monday.com data.

Rules:
- Call exactly ONE tool.
- After receiving tool data, give FINAL answer.
- Format money as ₹Cr / ₹L / ₹K.
- Give 3–5 bullet insights.
`;

  const messages: any[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: "user", content: userMessage },
  ];

  const r1 = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages,
    tools: TOOLS as any,
    tool_choice: "auto",
    temperature: 0.1,
    max_tokens: 2048,
  });

  const msg1 = r1.choices[0].message;

  /* =========================
     TOOL EXECUTION
  ========================= */

  if (msg1.tool_calls && msg1.tool_calls.length > 0) {
    messages.push({
      role: "assistant",
      content: msg1.content ?? "",
      tool_calls: msg1.tool_calls,
    });

    for (const tc of msg1.tool_calls) {
      toolsUsed.push(tc.function.name);

      let result: any = {};
      let trace = `🔧 Tool: ${tc.function.name}\n`;

      if (tc.function.name === "get_pipeline_summary") {
        const items = await getBoardItems(DEALS_BOARD_ID);
        const rows = itemsToObjects(items).map(normalizeDealsRow);
        result = buildPipelineSummary(rows);
        trace += `✅ Processed ${rows.length} deals`;
      }

      if (tc.function.name === "get_revenue_summary") {
        const items = await getBoardItems(WO_BOARD_ID);
        const rows = itemsToObjects(items).map(normalizeWorkOrderRow);
        result = buildRevenueSummary(rows);
        trace += `✅ Processed ${rows.length} work orders`;
      }

      traces.push(trace);

      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      });
    }

    const r2 = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.2,
      max_tokens: 2048,
    });

    return {
      answer: r2.choices[0].message.content ?? "No response.",
      traces,
      toolsUsed,
    };
  }

  return {
    answer: msg1.content ?? "No response.",
    traces,
    toolsUsed,
  };
}

/* =========================
   NORMALIZATION
========================= */

function normalizeDealsRow(row: Record<string, string>) {
  return {
    deal_name: safeStr(row._name),
    status: normalizeDealStatus(row[DEAL_COLS.status]),
    sector: normalizeSector(row[DEAL_COLS.sector]),
    stage: normalizeDealStage(row[DEAL_COLS.stage]),
    probability: normalizeProbability(row[DEAL_COLS.probability]),
    probability_num: probabilityToNumber(row[DEAL_COLS.probability]),
    deal_value: normalizeAmount(row[DEAL_COLS.deal_value]),
    tentative_close_date: row[DEAL_COLS.tentative_close] ?? "",
    is_this_quarter: isThisQuarter(row[DEAL_COLS.tentative_close]),
  };
}

function normalizeWorkOrderRow(row: Record<string, string>) {
  const amount = normalizeAmount(row[WO_COLS.amount_excl_gst]);
  const billed = normalizeAmount(row[WO_COLS.billed_excl_gst]);
  const collected = normalizeAmount(row[WO_COLS.collected]);

  return {
    sector: normalizeSector(row[WO_COLS.sector]),
    wo_status: safeStr(row[WO_COLS.wo_status]),
    invoice_status: normalizeInvoiceStatus(row[WO_COLS.invoice_status]),
    amount_excl_gst: amount,
    billed_excl_gst: billed,
    collected,
    is_overdue: isOverdue(row[WO_COLS.end_date]),
  };
}

/* =========================
   SUMMARIES
========================= */

function buildPipelineSummary(rows: ReturnType<typeof normalizeDealsRow>[]) {
  const open = rows.filter((r) => r.status === "Open");

  const total = open.reduce((s, r) => s + (r.deal_value ?? 0), 0);
  const weighted = open.reduce(
    (s, r) => s + (r.deal_value ?? 0) * r.probability_num,
    0
  );

  return {
    open_deals: open.length,
    total_pipeline_value: formatCurrency(total),
    weighted_pipeline_value: formatCurrency(weighted),
  };
}

function buildRevenueSummary(rows: ReturnType<typeof normalizeWorkOrderRow>[]) {
  const totalAmount = rows.reduce((s, r) => s + (r.amount_excl_gst ?? 0), 0);
  const totalBilled = rows.reduce((s, r) => s + (r.billed_excl_gst ?? 0), 0);
  const totalCollected = rows.reduce((s, r) => s + (r.collected ?? 0), 0);

  return {
    total_work_orders: rows.length,
    total_contract_value: formatCurrency(totalAmount),
    total_billed: formatCurrency(totalBilled),
    total_collected: formatCurrency(totalCollected),
  };
}