import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-error-handler';
import { createReferrerSchema, updateReferrerSchema } from '@/types/validation';
import { REFERRER_INCLUDE } from '@/lib/prisma-includes';

/** Company の find-or-create */
async function upsertCompany(name: string) {
  return prisma.company.upsert({
    where: { name },
    update: {},
    create: { name },
  });
}

// GET + POST /api/referrers
export const listAndCreate = {
  async GET() {
    try {
      const items = await prisma.referrer.findMany({
        include: REFERRER_INCLUDE,
        orderBy: { company: { name: 'asc' } },
      });
      return NextResponse.json(items);
    } catch (e) {
      return handleApiError(e);
    }
  },

  async POST(request: NextRequest) {
    try {
      const body = await request.json();
      const data = createReferrerSchema.parse(body);
      const company = await upsertCompany(data.company);
      const created = await prisma.referrer.create({
        data: {
          companyId: company.id,
          name: data.name,
          department: data.department,
          active: true,
        },
        include: REFERRER_INCLUDE,
      });
      return NextResponse.json(created, { status: 201 });
    } catch (e) {
      return handleApiError(e);
    }
  },
};

// GET + PUT + DELETE /api/referrers/[id]
export const byId = {
  async GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const { id: rawId } = await params;
      const id = Number(rawId);
      const item = await prisma.referrer.findUnique({
        where: { id },
        include: REFERRER_INCLUDE,
      });
      if (!item) {
        return NextResponse.json({ error: '紹介者が見つかりません', code: 'NOT_FOUND' }, { status: 404 });
      }
      return NextResponse.json(item);
    } catch (e) {
      return handleApiError(e);
    }
  },

  async PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const { id: rawId } = await params;
      const id = Number(rawId);
      const body = await request.json();
      const data = updateReferrerSchema.parse(body);

      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.department !== undefined) updateData.department = data.department;
      if (data.active !== undefined) updateData.active = data.active;
      if (data.company !== undefined) {
        const company = await upsertCompany(data.company);
        updateData.companyId = company.id;
      }

      const updated = await prisma.referrer.update({
        where: { id },
        data: updateData,
        include: REFERRER_INCLUDE,
      });
      return NextResponse.json(updated);
    } catch (e) {
      return handleApiError(e);
    }
  },

  async DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const { id: rawId } = await params;
      const id = Number(rawId);
      await prisma.referrer.delete({ where: { id } });
      return new NextResponse(null, { status: 204 });
    } catch (e) {
      return handleApiError(e);
    }
  },
};
