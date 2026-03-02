// src/lib/monday.ts
// Live Monday.com GraphQL API client — NO caching, every call is live

const MONDAY_API_URL = 'https://api.monday.com/v2';

export interface MondayItem {
  id: string;
  name: string;
  column_values: Array<{ id: string; text: string; value: string }>;
}

export interface BoardData {
  id: string;
  name: string;
  items_page: {
    cursor: string | null;
    items: MondayItem[];
  };
}

async function mondayRequest(query: string, variables?: Record<string, unknown>) {
  const apiKey = process.env.MONDAY_API_KEY;
  if (!apiKey) throw new Error('MONDAY_API_KEY not configured');

  const res = await fetch(MONDAY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
      'API-Version': '2024-01',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) throw new Error(`Monday API HTTP error: ${res.status}`);
  const data = await res.json();
  if (data.errors) throw new Error(`Monday API error: ${JSON.stringify(data.errors)}`);
  return data.data;
}

// ── Tool: Get all items from a board (paginated) ──────────────────────────────
export async function getBoardItems(boardId: string, limit = 200): Promise<MondayItem[]> {
  const query = `
    query GetBoardItems($boardId: ID!, $limit: Int!) {
      boards(ids: [$boardId]) {
        id
        name
        items_page(limit: $limit) {
          cursor
          items {
            id
            name
            column_values {
              id
              text
              value
            }
          }
        }
      }
    }
  `;

  const data = await mondayRequest(query, { boardId, limit });
  const board = data?.boards?.[0];
  if (!board) throw new Error(`Board ${boardId} not found`);

  let items = board.items_page.items;
  let cursor = board.items_page.cursor;

  // Paginate through all items
  while (cursor) {
    const pageQuery = `
      query GetNextPage($boardId: ID!, $limit: Int!, $cursor: String!) {
        next_items_page(limit: $limit, cursor: $cursor) {
          cursor
          items {
            id
            name
            column_values { id text value }
          }
        }
      }
    `;
    const pageData = await mondayRequest(pageQuery, { boardId, limit, cursor });
    items = [...items, ...pageData.next_items_page.items];
    cursor = pageData.next_items_page.cursor;
  }

  return items;
}

// ── Tool: Get board column definitions ───────────────────────────────────────
export async function getBoardColumns(boardId: string) {
  const query = `
    query GetBoardColumns($boardId: ID!) {
      boards(ids: [$boardId]) {
        id
        name
        columns { id title type }
      }
    }
  `;
  const data = await mondayRequest(query, { boardId });
  return data?.boards?.[0];
}

// ── Tool: Get board summary stats ─────────────────────────────────────────────
export async function getBoardSummary(boardId: string) {
  const query = `
    query GetBoardSummary($boardId: ID!) {
      boards(ids: [$boardId]) {
        id
        name
        items_count
        columns { id title type }
      }
    }
  `;
  const data = await mondayRequest(query, { boardId });
  return data?.boards?.[0];
}

// ── Tool: Search items by column value ───────────────────────────────────────
export async function searchItemsByColumnValue(
  boardId: string,
  columnId: string,
  value: string
) {
  const query = `
    query SearchItems($boardId: ID!, $columnId: String!, $value: String!) {
      items_page_by_column_values(
        limit: 200
        board_id: $boardId
        columns: [{ column_id: $columnId, column_values: [$value] }]
      ) {
        cursor
        items {
          id
          name
          column_values { id text value }
        }
      }
    }
  `;
  const data = await mondayRequest(query, { boardId, columnId, value });
  return data?.items_page_by_column_values?.items ?? [];
}

// ── Helper: Convert Monday items to plain objects ────────────────────────────
export function itemsToObjects(items: MondayItem[]): Record<string, string>[] {
  return items.map((item) => {
    const obj: Record<string, string> = { _id: item.id, _name: item.name };
    for (const col of item.column_values) {
      obj[col.id] = col.text || '';
    }
    return obj;
  });
}
