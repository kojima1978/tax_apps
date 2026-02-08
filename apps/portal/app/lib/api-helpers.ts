import { NextResponse } from 'next/server';

export function apiError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export function handleApiError(action: string, error: unknown) {
  console.error(`Error ${action}:`, error);
  return apiError(`Failed to ${action}`);
}
