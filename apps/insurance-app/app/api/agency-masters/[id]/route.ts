import { NextResponse } from 'next/server';
import { updateAgencyMaster, deleteAgencyMaster } from '@/services/agencyMasters';
import { isValidLogoDataUrl } from '@/lib/agencyLogo';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  if (!body.name || !body.representative || !body.phone) {
    return NextResponse.json({ error: '全項目を入力してください' }, { status: 400 });
  }
  if (body.logoDataUrl && !isValidLogoDataUrl(body.logoDataUrl)) {
    return NextResponse.json({ error: 'ロゴ画像の形式またはサイズが不正です' }, { status: 400 });
  }
  const updated = updateAgencyMaster(id, {
    name: body.name,
    representative: body.representative,
    phone: body.phone,
    logoDataUrl: body.logoDataUrl || undefined,
  });
  if (!updated) {
    return NextResponse.json({ error: '代理店が見つかりません' }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = deleteAgencyMaster(id);
  if (!deleted) {
    return NextResponse.json({ error: '代理店が見つかりません' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
