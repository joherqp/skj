import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/serverAdmin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await request.json();
    const userId = body?.userId as string | undefined;
    const endpoint = body?.endpoint as string | undefined;

    if (!userId && !endpoint) {
      return NextResponse.json({ error: 'Missing userId or endpoint' }, { status: 400 });
    }

    let query = supabaseAdmin.from('push_subscriptions').delete();
    if (endpoint) {
      query = query.eq('endpoint', endpoint);
    } else if (userId) {
      query = query.eq('user_id', userId);
    }

    const { error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
