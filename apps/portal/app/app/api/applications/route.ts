/**
 * Application API - Collection Operations
 * アプリケーション一覧の取得・作成
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateApplicationInput } from '@/lib/validation';

// GET: すべてのアプリケーションを取得
export async function GET() {
  try {
    const applications = await prisma.application.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(applications);
  } catch (error) {
    console.error('Error fetching applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}

// POST: 新しいアプリケーションを作成
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = validateApplicationInput(body);

    if (!result.valid) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    const application = await prisma.application.create({
      data: result.data,
    });

    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    console.error('Error creating application:', error);
    return NextResponse.json(
      { error: 'Failed to create application' },
      { status: 500 }
    );
  }
}
