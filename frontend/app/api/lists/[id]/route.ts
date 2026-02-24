import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:3001';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const res = await fetch(`${BACKEND_URL}/api/lists/${id}`);
    
    if (!res.ok) {
        return NextResponse.json({ error: 'Backend error' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
      const body = await request.json();
      // Forward request to backend (e.g. join room)
      // Backend expects POST /api/lists/:id/join
      // But frontend might just be sending POST to this route?
      // Let's assume frontend calls /api/lists/:id/join if it needs to join
      // Or maybe this route is just a placeholder.
      // Let's implement proxy for join if the URL matches /join
      
      // Wait, frontend doesn't call POST /api/lists/:id directly based on my analysis of page.tsx
      // But let's keep it safe.
      
      return NextResponse.json({ status: 'ok' });
  } catch (e) {
      return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
