import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/lib/db';
import type { AgencyMaster } from '@/types';

interface AgencyMasterRow {
  id: string;
  name: string;
  representative: string;
  phone: string;
  logo_data_url: string | null;
}

function rowToAgencyMaster(row: AgencyMasterRow): AgencyMaster {
  return {
    id: row.id,
    name: row.name,
    representative: row.representative,
    phone: row.phone,
    logoDataUrl: row.logo_data_url ?? undefined,
  };
}

// 空文字は「ロゴなし」として NULL に寄せる
function logoStorageValue(data: Omit<AgencyMaster, 'id'>): string | null {
  return data.logoDataUrl?.trim() || null;
}

export function listAgencyMasters(): AgencyMaster[] {
  const db = getDb();
  const rows = db.prepare('SELECT id, name, representative, phone, logo_data_url FROM agency_masters ORDER BY name').all() as AgencyMasterRow[];
  return rows.map(rowToAgencyMaster);
}

export function createAgencyMaster(data: Omit<AgencyMaster, 'id'>): AgencyMaster {
  const db = getDb();
  const id = uuidv4();
  const ts = new Date().toISOString();
  db.prepare('INSERT INTO agency_masters (id, name, representative, phone, logo_data_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    id, data.name, data.representative, data.phone, logoStorageValue(data), ts, ts,
  );
  return { id, ...data };
}

export function updateAgencyMaster(id: string, data: Omit<AgencyMaster, 'id'>): AgencyMaster | null {
  const db = getDb();
  const ts = new Date().toISOString();
  const result = db.prepare('UPDATE agency_masters SET name = ?, representative = ?, phone = ?, logo_data_url = ?, updated_at = ? WHERE id = ?').run(
    data.name, data.representative, data.phone, logoStorageValue(data), ts, id,
  );
  if (result.changes === 0) return null;
  return { id, ...data };
}

export function deleteAgencyMaster(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM agency_masters WHERE id = ?').run(id);
  return result.changes > 0;
}
