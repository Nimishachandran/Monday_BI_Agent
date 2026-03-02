// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { runAgent, AgentMessage } from '@/lib/agent';

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json() as {
      message: string;
      history: AgentMessage[];
    };

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const result = await runAgent(message, history ?? []);
    return NextResponse.json(result);
  } catch (err) {
    console.error('Agent error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
