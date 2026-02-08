/**
 * Application API - Individual Operations
 * 個別アプリケーションのCRUD操作
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateApplicationInput } from '@/lib/validation';
import { apiError, handleApiError } from '@/lib/api-helpers';

// GET: 特定のアプリケーションを取得
export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const application = await prisma.application.findUnique({
      where: { id: params.id },
    });

    if (!application) {
      return apiError('Application not found', 404);
    }

    return NextResponse.json(application);
  } catch (error) {
    return handleApiError('fetch application', error);
  }
}

// PUT: アプリケーションを更新
export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const body = await request.json();
    const result = validateApplicationInput(body);

    if (!result.valid) {
      return apiError(result.error, 400);
    }

    const application = await prisma.application.update({
      where: { id: params.id },
      data: result.data,
    });

    return NextResponse.json(application);
  } catch (error) {
    return handleApiError('update application', error);
  }
}

// DELETE: アプリケーションを削除
export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    await prisma.application.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Application deleted successfully' });
  } catch (error) {
    return handleApiError('delete application', error);
  }
}
