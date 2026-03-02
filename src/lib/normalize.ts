// src/lib/normalize.ts
// Real column IDs verified from live Monday.com API

// ── DEALS board column IDs (board: 5026915566) ────────────────────────────────
export const DEAL_COLS = {
  owner:           'text_mm118xfj',
  client:          'text_mm111a9x',
  status:          'color_mm11wwmc',
  close_date:      'date_mm11y5zp',
  probability:     'color_mm11ngwk',
  deal_value:      'numeric_mm11kehw',
  tentative_close: 'date_mm11d0r4',
  stage:           'dropdown_mm113vmy',
  product:         'dropdown_mm11hj4m',
  sector:          'dropdown_mm11peh3',
  created_date:    'date_mm11m3zt',
};

// ── WORK ORDERS board column IDs (board: 5026915676) ─────────────────────────
export const WO_COLS = {
  customer:             'dropdown_mm11jw8d',
  serial:               'dropdown_mm11gj7d',
  nature_of_work:       'color_mm11htgh',
  last_exec_month:      'color_mm11nr6q',
  execution_status:     'color_mm112e2j',
  delivery_date:        'date_mm11xb9k',
  po_date:              'date_mm11e9f7',
  document_type:        'color_mm11dcwb',
  start_date:           'date_mm115d49',
  end_date:             'date_mm11yqbr',
  personnel:            'color_mm11abwj',
  sector:               'color_mm119q9g',
  type_of_work:         'color_mm114f85',
  platform:             'color_mm111zk6',
  last_invoice_date:    'date_mm111mnn',
  invoice_no:           'dropdown_mm11kpag',
  amount_excl_gst:      'numeric_mm1153eb',
  amount_incl_gst:      'numeric_mm11jw6c',
  billed_excl_gst:      'numeric_mm11w4zd',
  billed_incl_gst:      'numeric_mm11n50f',
  collected:            'numeric_mm11hx63',
  to_bill_excl:         'numeric_mm11gxr5',
  to_bill_incl:         'numeric_mm11r5ge',
  receivable:           'numeric_mm11p95a',
  ar_priority:          'color_mm112c8e',
  qty_ops:              'numeric_mm11cj7c',
  qty_po:               'dropdown_mm11my2m',
  qty_billed:           'numeric_mm11zg88',
  qty_balance:          'numeric_mm11509m',
  invoice_status:       'color_mm11823v',
  exp_billing_month:    'text_mm11gx8e',
  actual_billing_month: 'color_mm11p7te',
  actual_collection_month: 'text_mm113epn',
  wo_status:            'color_mm119a5g',
  collection_status:    'text_mm11bbyr',
  collection_date:      'text_mm1199s5',
  billing_status:       'color_mm11wzq0',
};

// ── Probability normalization ─────────────────────────────────────────────────
export function normalizeProbability(raw: string | null | undefined): string {
  if (!raw || raw.trim() === '') return 'Unknown';
  const v = raw.trim().toLowerCase();
  if (v === 'high') return 'High (75–100%)';
  if (v === 'medium') return 'Medium (40–74%)';
  if (v === 'low') return 'Low (0–39%)';
  const num = parseFloat(v.replace('%', ''));
  if (!isNaN(num)) {
    const pct = num > 1 ? num : num * 100;
    if (pct >= 75) return 'High (75–100%)';
    if (pct >= 40) return 'Medium (40–74%)';
    return 'Low (0–39%)';
  }
  return raw;
}

export function probabilityToNumber(raw: string | null | undefined): number {
  if (!raw) return 0;
  const v = raw.trim().toLowerCase();
  if (v.includes('high')) return 0.85;
  if (v.includes('medium')) return 0.55;
  if (v.includes('low')) return 0.2;
  const num = parseFloat(v.replace('%', ''));
  if (!isNaN(num)) return num > 1 ? num / 100 : num;
  return 0;
}

// ── Currency / amount normalization ──────────────────────────────────────────
export function normalizeAmount(raw: string | null | undefined): number | null {
  if (!raw || raw.trim() === '' || raw.trim() === '0') return null;
  const cleaned = raw.replace(/[₹$,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export function formatCurrency(amount: number | null, currency = '₹'): string {
  if (amount === null) return 'N/A';
  if (amount >= 10_000_000) return `${currency}${(amount / 10_000_000).toFixed(2)}Cr`;
  if (amount >= 100_000) return `${currency}${(amount / 100_000).toFixed(2)}L`;
  if (amount >= 1000) return `${currency}${(amount / 1000).toFixed(1)}K`;
  return `${currency}${amount.toFixed(0)}`;
}

// ── Date normalization ────────────────────────────────────────────────────────
export function normalizeDate(raw: string | null | undefined): Date | null {
  if (!raw || raw.trim() === '') return null;
  const d = new Date(raw.trim());
  return isNaN(d.getTime()) ? null : d;
}

export function formatDate(raw: string | null | undefined): string {
  const d = normalizeDate(raw);
  if (!d) return 'N/A';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function isThisQuarter(raw: string | null | undefined): boolean {
  const d = normalizeDate(raw);
  if (!d) return false;
  const now = new Date();
  const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const qEnd = new Date(qStart.getFullYear(), qStart.getMonth() + 3, 0);
  return d >= qStart && d <= qEnd;
}

export function isOverdue(raw: string | null | undefined): boolean {
  const d = normalizeDate(raw);
  if (!d) return false;
  return d < new Date();
}

// ── Sector normalization ──────────────────────────────────────────────────────
const SECTOR_ALIASES: Record<string, string> = {
  'mining': 'Mining', 'powerline': 'Powerline', 'power line': 'Powerline',
  'renewables': 'Renewables', 'renewable': 'Renewables', 'energy': 'Renewables',
  'railways': 'Railways', 'railway': 'Railways', 'rail': 'Railways',
  'dsp': 'DSP', 'construction': 'Construction', 'tender': 'Tender',
  'aviation': 'Aviation', 'manufacturing': 'Manufacturing',
  'others': 'Others', 'other': 'Others',
};

export function normalizeSector(raw: string | null | undefined): string {
  if (!raw || raw.trim() === '') return 'Unknown';
  return SECTOR_ALIASES[raw.trim().toLowerCase()] ?? raw.trim();
}

// ── Deal Stage normalization ──────────────────────────────────────────────────
export function normalizeDealStage(raw: string | null | undefined): string {
  if (!raw || raw.trim() === '') return 'Unknown';
  return raw.trim().replace(/^[A-Z]\.\s*/, '');
}

// ── Deal Status normalization ─────────────────────────────────────────────────
export function normalizeDealStatus(raw: string | null | undefined): string {
  if (!raw || raw.trim() === '') return 'Unknown';
  const v = raw.trim().toLowerCase();
  if (v === 'open') return 'Open';
  if (v === 'won') return 'Won';
  if (v === 'dead' || v === 'lost') return 'Dead';
  if (v === 'on hold' || v === 'onhold') return 'On Hold';
  return raw.trim();
}

// ── Execution Status normalization ───────────────────────────────────────────
export function normalizeExecutionStatus(raw: string | null | undefined): string {
  if (!raw || raw.trim() === '') return 'Unknown';
  const v = raw.trim().toLowerCase();
  if (v === 'completed') return 'Completed';
  if (v === 'not started') return 'Not Started';
  if (v.includes('executed until')) return 'In Progress';
  if (v === 'doc') return 'Documentation';
  const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
  if (months.includes(v)) return `In Progress (${raw.trim()})`;
  return raw.trim();
}

// ── Invoice Status normalization ──────────────────────────────────────────────
export function normalizeInvoiceStatus(raw: string | null | undefined): string {
  if (!raw || raw.trim() === '') return 'Unknown';
  const v = raw.trim().toLowerCase();
  if (v.includes('fully')) return 'Fully Billed';
  if (v.includes('partially')) return 'Partially Billed';
  if (v.includes('not billed')) return 'Not Billed Yet';
  return raw.trim();
}

// ── Remove duplicate header rows ─────────────────────────────────────────────
export function removeDuplicateHeaders<T extends Record<string, string>>(
  rows: T[], headerKey: string, headerValue: string
): T[] {
  return rows.filter(row => row[headerKey]?.toLowerCase() !== headerValue.toLowerCase());
}

// ── Null/empty checker ────────────────────────────────────────────────────────
export function isNullish(val: string | null | undefined): boolean {
  if (val === null || val === undefined) return true;
  const v = val.trim().toLowerCase();
  return v === '' || v === 'null' || v === 'n/a' || v === 'none' || v === '-';
}

export function safeStr(val: string | null | undefined, fallback = 'N/A'): string {
  return isNullish(val) ? fallback : val!.trim();
}