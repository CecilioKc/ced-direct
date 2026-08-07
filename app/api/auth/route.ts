import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';
import { signToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { code, password } = await request.json();

    if (!code || !password) {
      return NextResponse.json(
        { error: 'Code and password are required' },
        { status: 400 }
      );
    }

    const agent = db.prepare(
      'SELECT * FROM agents WHERE code = ?'
    ).get(code.toUpperCase()) as any;

    if (!agent) {
      return NextResponse.json(
        { error: 'Invalid code or password' },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, agent.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid code or password' },
        { status: 401 }
      );
    }

    const token = signToken({
      agentId: agent.id,
      name: agent.name,
      code: agent.code,
      role: agent.role,
    });

    const response = NextResponse.json({
      success: true,
      name: agent.name,
      role: agent.role,
      code: agent.code,
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      maxAge: 60 * 60 * 8, // 8 hours
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('token', '', { maxAge: 0, path: '/' });
  return response;
}