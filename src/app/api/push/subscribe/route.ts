import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/serverAdmin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await request.json();
    const userId = body?.userId as string | undefined;
    const endpoint = body?.subscription?.endpoint as string | undefined;
    const p256dh = body?.subscription?.keys?.p256dh as string | undefined;
    const auth = body?.subscription?.keys?.auth as string | undefined;

    if (!userId || !endpoint) {
      return NextResponse.json({ error: 'Missing userId or subscription endpoint' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert(
        {
          user_id: userId,
          endpoint,
          p256dh: p256dh ?? null,
          auth: auth ?? null,
          user_agent: request.headers.get('user-agent'),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' },
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
