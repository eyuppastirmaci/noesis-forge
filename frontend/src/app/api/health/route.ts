import { NextResponse } from 'next/server';

export async function GET() {
  try {
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'noesis-forge-frontend',
      version: '1.0.0'
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      service: 'noesis-forge-frontend',
      error: 'Health check failed'
    }, { status: 500 });
  }
} 