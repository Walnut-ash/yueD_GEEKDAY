import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

// Fallback in-memory storage for local development without KV credentials
// Note: This data will be lost when the server restarts
// This is a shared variable across API calls in the same lambda instance (warm start)
// BUT on Vercel, this will be reset frequently.
// FOR HACKATHON DEMO: It's better than nothing if KV is not set up.
// But we strongly recommend setting up Vercel KV.

// We need a way to persist this variable across requests if not using KV.
// Actually, in Next.js App Router, `global` variable might persist in dev mode.
// Let's attach it to global to be safe in dev.
const globalStore = global as unknown as { listStore: Record<string, any> };
if (!globalStore.listStore) {
  globalStore.listStore = {};
}

export async function POST(request: Request) {
  try {
    const list = await request.json();
    
    if (!list || !list.id) {
      return NextResponse.json({ error: 'Invalid list data' }, { status: 400 });
    }

    // Try Vercel KV first
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      await kv.set(`list:${list.id}`, list);
      return NextResponse.json(list);
    } 
    
    // Fallback to memory store
    console.log('[WARN] Using In-Memory Store (Data will be lost on restart)');
    globalStore.listStore[list.id] = list;
    
    return NextResponse.json(list);
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
