import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({
      id: session.agentId,
      name: session.user?.name,
      code: session.code,
      role: session.role,
      email: session.user?.email,
    });
  } catch (error) {
    console.error('Me error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
