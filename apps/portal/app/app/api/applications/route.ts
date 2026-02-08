/**
 * Application API - Collection Operations
 * アプリケーション一覧の取得・作成
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateApplicationInput } from '@/lib/validation';
import { apiError, handleApiError } from '@/lib/api-helpers';
import { fetchAllApplications } from '@/lib/database';

// GET: すべてのアプリケーションを取得
export async function GET() {
  try {
    const applications = await fetchAllApplications();
    return NextResponse.json(applications);
  } catch (error) {
    return handleApiError('fetch applications', error);
  }
}

// POST: 新しいアプリケーションを作成
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = validateApplicationInput(body);

    if (!result.valid) {
      return apiError(result.error, 400);
    }

    const application = await prisma.application.create({
      data: result.data,
    });

    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    return handleApiError('create application', error);
  }
}
