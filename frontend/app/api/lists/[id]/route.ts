import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

// Fallback in-memory storage for local development without KV credentials
// Note: This data will be lost when the server restarts
// This is a shared variable across API calls in the same lambda instance (warm start)
// BUT on Vercel, this will be reset frequently.
const globalStore = global as unknown as { listStore: Record<string, any> };
if (!globalStore.listStore) {
  globalStore.listStore = {};
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    // Try Vercel KV first
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const list = await kv.get(`list:${id}`);
      if (!list) {
        return NextResponse.json({ error: 'List not found' }, { status: 404 });
      }
      return NextResponse.json(list);
    } 
    
    // Fallback to memory store
    console.log('[WARN] Using In-Memory Store (Data will be lost on restart)');
    if (globalStore.listStore[id]) {
      return NextResponse.json(globalStore.listStore[id]);
    }
    
    return NextResponse.json({ error: 'List not found' }, { status: 404 });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // This endpoint might be used for joining or specific updates
  // For now, let's keep it simple
  return NextResponse.json({ status: 'ok' });
}
