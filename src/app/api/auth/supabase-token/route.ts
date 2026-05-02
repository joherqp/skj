import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import jwt from 'jsonwebtoken';

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    });

    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const secret = process.env.SUPABASE_JWT_SECRET;
    if (!secret) {
      console.error("SUPABASE_JWT_SECRET is missing");
      return new NextResponse('Server Configuration Error', { status: 500 });
    }

    const payload = {
      aud: 'authenticated',
      role: 'authenticated',
      sub: session.user.id,
      email: session.user.email,
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7), // 7 days
    };

    const token = jwt.sign(payload, secret);

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error issuing Supabase token:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
