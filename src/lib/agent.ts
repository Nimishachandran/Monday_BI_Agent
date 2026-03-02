// src/lib/agent.ts
import Groq from 'groq-sdk';
import { getBoardItems, getBoardColumns, itemsToObjects } from './monday';
import {
  DEAL_COLS, WO_COLS,
  normalizeSector, normalizeDealStatus, normalizeDealStage, normalizeProbability,
  probabilityToNumber, normalizeAmount, formatCurrency, formatDate,
  isThisQuarter, isOverdue, normalizeExecutionStatus, normalizeInvoiceStatus,
  removeDuplicateHeaders, isNullish, safeStr
} from './normalize';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Board IDs — NOTE: these are correct after swapping in .env.local
const DEALS_BOARD_ID = process.env.MONDAY_DEALS_BOARD_ID!;   // 5026915566 = Deal funnel
const WO_BOARD_ID    = process.env.MONDAY_WORKORDERS_BOARD_ID!; // 5026915676 = Work Orders

const TOOLS: Groq.Chat.Completions.Tool[] = [
  {
    type: 'function',
    function: {
      name: 'get_pipeline_summary',
      description: 'Get pipeline summary across all deals — total value, by status, stage, sector. Best for "how is pipeline looking" questions.',
      parameters: {
        type: 'object',
        properties: {
          filter_sector: { type: 'string', description: 'Optional sector filter e.g. Mining, Renewables' },
          filter_quarter: { type: 'boolean', description: 'Filter to current quarter only' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_deals_data',
      description: 'Fetch all deals for detailed analysis — owner performance, specific stage counts, deal listings.',
      parameters: {
        type: 'object',
        properties: { reason: { type: 'string' } },
        required: ['reason']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_revenue_summary',
      description: 'Get revenue and billing summary from work orders — billed, collected, outstanding, collection rate.',
      parameters: {
        type: 'object',
        properties: { filter_sector: { type: 'string', description: 'Optional sector filter' } }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_work_orders_data',
      description: 'Fetch all work orders for detailed analysis — overdue WOs, execution status, specific WO questions.',
      parameters: {
        type: 'object',
        properties: { reason: { type: 'string' } },
        required: ['reason']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_deals_by_sector',
      description: 'Get deals filtered to one specific sector.',
      parameters: {
        type: 'object',
        properties: { sector: { type: 'string' } },
        required: ['sector']
      }
    }
  }
];

async function executeTool(name: string, args: Record<string, unknown>): Promise<{ result: unknown; trace: string }> {
  const traceStart = `🔧 Tool: ${name}\n📥 Args: ${JSON.stringify(args, null, 2)}\n`;
  try {
    switch (name) {
      case 'get_deals_data': {
        const items = await getBoardItems(DEALS_BOARD_ID);
        let rows = itemsToObjects(items);
        rows = removeDuplicateHeaders(rows, '_name', 'Deal Name');
        const normalized = rows.map(normalizeDealsRow);
        return { result: { count: normalized.length, rows: normalized }, trace: `${traceStart}✅ Fetched ${normalized.length} deals (live API)` };
      }
      case 'get_work_orders_data': {
        const items = await getBoardItems(WO_BOARD_ID);
        const normalized = itemsToObjects(items).map(normalizeWorkOrderRow);
        return { result: { count: normalized.length, rows: normalized }, trace: `${traceStart}✅ Fetched ${normalized.length} work orders (live API)` };
      }
      case 'search_deals_by_sector': {
        const sector = normalizeSector(args.sector as string);
        const items = await getBoardItems(DEALS_BOARD_ID);
        const rows = itemsToObjects(items).map(normalizeDealsRow);
        const filtered = rows.filter(r => normalizeSector(r.sector).toLowerCase() === sector.toLowerCase());
        return { result: { count: filtered.length, sector, rows: filtered }, trace: `${traceStart}✅ Found ${filtered.length} deals in "${sector}"` };
      }
      case 'get_pipeline_summary': {
        const items = await getBoardItems(DEALS_BOARD_ID);
        let rows = itemsToObjects(items).map(normalizeDealsRow).filter(r => r.deal_name && r.deal_name !== 'Deal Name');
        if (args.filter_sector) rows = rows.filter(r => normalizeSector(r.sector).toLowerCase() === normalizeSector(args.filter_sector as string).toLowerCase());
        if (args.filter_quarter) rows = rows.filter(r => isThisQuarter(r.tentative_close_date) || isThisQuarter(r.close_date));
        return { result: buildPipelineSummary(rows), trace: `${traceStart}✅ Pipeline summary from ${rows.length} deals (live API)` };
      }
      case 'get_revenue_summary': {
        const items = await getBoardItems(WO_BOARD_ID);
        let rows = itemsToObjects(items).map(normalizeWorkOrderRow);
        if (args.filter_sector) rows = rows.filter(r => normalizeSector(r.sector).toLowerCase() === normalizeSector(args.filter_sector as string).toLowerCase());
        return { result: buildRevenueSummary(rows), trace: `${traceStart}✅ Revenue summary from ${rows.length} work orders (live API)` };
      }
      default:
        return { result: { error: 'Unknown tool' }, trace: `${traceStart}❌ Unknown tool` };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { result: { error: msg }, trace: `${traceStart}❌ Error: ${msg}` };
  }
}

function normalizeDealsRow(row: Record<string, string>) {
  return {
    deal_name:        safeStr(row._name),
    owner:            safeStr(row[DEAL_COLS.owner]),
    client:           safeStr(row[DEAL_COLS.client]),
    status:           normalizeDealStatus(row[DEAL_COLS.status]),
    close_date:       row[DEAL_COLS.close_date] ?? '',
    close_date_fmt:   formatDate(row[DEAL_COLS.close_date]),
    probability:      normalizeProbability(row[DEAL_COLS.probability]),
    probability_num:  probabilityToNumber(row[DEAL_COLS.probability]),
    deal_value:       normalizeAmount(row[DEAL_COLS.deal_value]),
    deal_value_fmt:   formatCurrency(normalizeAmount(row[DEAL_COLS.deal_value])),
    tentative_close_date: row[DEAL_COLS.tentative_close] ?? '',
    stage:            normalizeDealStage(row[DEAL_COLS.stage]),
    product:          safeStr(row[DEAL_COLS.product]),
    sector:           normalizeSector(row[DEAL_COLS.sector]),
    created_date:     formatDate(row[DEAL_COLS.created_date]),
    is_this_quarter:  isThisQuarter(row[DEAL_COLS.tentative_close]),
  };
}

function normalizeWorkOrderRow(row: Record<string, string>) {
  const amountExclGST = normalizeAmount(row[WO_COLS.amount_excl_gst]);
  const billedExcl    = normalizeAmount(row[WO_COLS.billed_excl_gst]);
  const collected     = normalizeAmount(row[WO_COLS.collected]);
  const receivable    = normalizeAmount(row[WO_COLS.receivable]);

  return {
    deal_name:        safeStr(row._name),
    customer:         safeStr(row[WO_COLS.customer]),
    serial:           safeStr(row[WO_COLS.serial]),
    nature_of_work:   safeStr(row[WO_COLS.nature_of_work]),
    execution_status: normalizeExecutionStatus(row[WO_COLS.execution_status]),
    delivery_date:    formatDate(row[WO_COLS.delivery_date]),
    po_date:          formatDate(row[WO_COLS.po_date]),
    document_type:    safeStr(row[WO_COLS.document_type]),
    start_date:       formatDate(row[WO_COLS.start_date]),
    end_date:         formatDate(row[WO_COLS.end_date]),
    is_overdue:       isOverdue(row[WO_COLS.end_date]),
    personnel:        safeStr(row[WO_COLS.personnel]),
    sector:           normalizeSector(row[WO_COLS.sector]),
    type_of_work:     safeStr(row[WO_COLS.type_of_work]),
    amount_excl_gst:  amountExclGST,
    amount_fmt:       formatCurrency(amountExclGST),
    billed_excl_gst:  billedExcl,
    billed_fmt:       formatCurrency(billedExcl),
    collected,
    collected_fmt:    formatCurrency(collected),
    receivable,
    receivable_fmt:   formatCurrency(receivable),
    invoice_status:   normalizeInvoiceStatus(row[WO_COLS.invoice_status]),
    wo_status:        safeStr(row[WO_COLS.wo_status]),
    billing_status:   safeStr(row[WO_COLS.billing_status]),
    is_priority:      !isNullish(row[WO_COLS.ar_priority]),
  };
}

function buildPipelineSummary(rows: ReturnType<typeof normalizeDealsRow>[]) {
  const open   = rows.filter(r => r.status === 'Open');
  const won    = rows.filter(r => r.status === 'Won');
  const dead   = rows.filter(r => r.status === 'Dead');
  const onHold = rows.filter(r => r.status === 'On Hold');

  const totalValue    = open.reduce((s, r) => s + (r.deal_value ?? 0), 0);
  const weightedValue = open.reduce((s, r) => s + (r.deal_value ?? 0) * r.probability_num, 0);
  const wonValue      = won.reduce((s, r) => s + (r.deal_value ?? 0), 0);
  const missingValues = open.filter(r => r.deal_value === null).length;

  const bySector: Record<string, { count: number; value: number }> = {};
  const byStage: Record<string, number> = {};
  const byProbability: Record<string, { count: number; value: number }> = {};

  for (const r of open) {
    if (!bySector[r.sector]) bySector[r.sector] = { count: 0, value: 0 };
    bySector[r.sector].count++;
    bySector[r.sector].value += r.deal_value ?? 0;

    byStage[r.stage] = (byStage[r.stage] ?? 0) + 1;

    if (!byProbability[r.probability]) byProbability[r.probability] = { count: 0, value: 0 };
    byProbability[r.probability].count++;
    byProbability[r.probability].value += r.deal_value ?? 0;
  }

  return {
    total_deals: rows.length,
    open_deals: open.length,
    won_deals: won.length,
    dead_deals: dead.length,
    on_hold_deals: onHold.length,
    total_pipeline_value: formatCurrency(totalValue),
    weighted_pipeline_value: formatCurrency(weightedValue),
    won_value: formatCurrency(wonValue),
    this_quarter_open: open.filter(r => r.is_this_quarter).length,
    deals_missing_value: missingValues,
    data_completeness: `${(((open.length - missingValues) / Math.max(open.length, 1)) * 100).toFixed(0)}%`,
    by_sector: bySector,
    by_stage: byStage,
    by_probability: byProbability,
  };
}

function buildRevenueSummary(rows: ReturnType<typeof normalizeWorkOrderRow>[]) {
  const totalAmount    = rows.reduce((s, r) => s + (r.amount_excl_gst ?? 0), 0);
  const totalBilled    = rows.reduce((s, r) => s + (r.billed_excl_gst ?? 0), 0);
  const totalCollected = rows.reduce((s, r) => s + (r.collected ?? 0), 0);
  const totalReceivable = rows.reduce((s, r) => s + (r.receivable ?? 0), 0);

  const byStatus: Record<string, number> = {};
  const byInvoice: Record<string, number> = {};
  const bySector: Record<string, { count: number; amount: number }> = {};

  for (const r of rows) {
    byStatus[r.wo_status] = (byStatus[r.wo_status] ?? 0) + 1;
    byInvoice[r.invoice_status] = (byInvoice[r.invoice_status] ?? 0) + 1;
    if (!bySector[r.sector]) bySector[r.sector] = { count: 0, amount: 0 };
    bySector[r.sector].count++;
    bySector[r.sector].amount += r.amount_excl_gst ?? 0;
  }

  return {
    total_work_orders: rows.length,
    total_contract_value: formatCurrency(totalAmount),
    total_billed: formatCurrency(totalBilled),
    total_collected: formatCurrency(totalCollected),
    total_receivable: formatCurrency(totalReceivable),
    collection_rate: totalBilled > 0 ? `${((totalCollected / totalBilled) * 100).toFixed(1)}%` : 'N/A',
    billing_rate: totalAmount > 0 ? `${((totalBilled / totalAmount) * 100).toFixed(1)}%` : 'N/A',
    overdue_count: rows.filter(r => r.is_overdue && r.wo_status?.toLowerCase() !== 'closed').length,
    priority_accounts: rows.filter(r => r.is_priority).length,
    by_wo_status: byStatus,
    by_invoice_status: byInvoice,
    by_sector: bySector,
  };
}

export interface AgentMessage { role: 'user' | 'assistant'; content: string; }
export interface AgentResponse { answer: string; traces: string[]; toolsUsed: string[]; }

export async function runAgent(userMessage: string, conversationHistory: AgentMessage[]): Promise<AgentResponse> {
  const traces: string[] = [];
  const toolsUsed: string[] = [];

  const systemPrompt = `You are a Business Intelligence agent for a founder/executive with live Monday.com data.

Boards:
1. **Deals Board** (346 records) — status: Open/Won/Dead/On Hold | probability: High/Medium/Low | values in ₹ | sectors | stages
2. **Work Orders Board** (176 records) — billing amounts | invoice status: Fully/Partially/Not Billed | collections | execution status

RULES:
- Call exactly ONE tool, then give your FINAL answer immediately after receiving results
- NEVER call a second tool in the same turn
- Format all money as ₹Cr/₹L/₹K
- Give 3-5 bullet insights, be specific with numbers
- Note data quality issues only if significant

Date context: March 2026. Q1 2026 = Jan–Mar 2026.
Sectors: Mining, Powerline, Renewables, Railways, DSP, Construction, Tender, Aviation, Manufacturing, Others`;

  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage }
  ];

  // Round 1: allow one round of tool calls
  const r1 = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages,
    tools: TOOLS,
    tool_choice: 'auto',
    max_tokens: 2048,
    temperature: 0.1,
  });

  const msg1 = r1.choices[0].message;

  if (msg1.tool_calls && msg1.tool_calls.length > 0) {
    messages.push({ role: 'assistant', content: msg1.content ?? '', tool_calls: msg1.tool_calls });

    for (const tc of msg1.tool_calls) {
      toolsUsed.push(tc.function.name);
      const { result, trace } = await executeTool(tc.function.name, JSON.parse(tc.function.arguments));
      traces.push(trace);
      messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) });
    }

    // Round 2: force final answer, no tools allowed
    const r2 = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: 2048,
      temperature: 0.2,
    });

    return { answer: r2.choices[0].message.content ?? 'Unable to generate response.', traces, toolsUsed };
  }

  return { answer: msg1.content ?? 'Unable to generate response.', traces, toolsUsed };
}