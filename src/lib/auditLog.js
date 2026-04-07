import { getAccessToken } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// INSERT в audit_log через прямой REST (не supabase.from — оно зависает)
async function insertAuditLog(payload) {
  const token = getAccessToken();
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/audit_log`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Ошибки аудита не должны ломать основной поток
  }
}

// ============================================================
// Запись auth-событий: auth.login / auth.logout
// ============================================================
export async function logAuthEvent(userId, action) {
  if (!userId) return;
  await insertAuditLog({
    user_id: userId,
    action,
    entity_type: 'auth',
    entity_id: userId,
  });
}

// ============================================================
// Запись скачиваний файлов: storage.downloaded
// (не используется — скачиваний в приложении пока нет)
// ============================================================
export async function logStorageDownload(userId, fileName, bucketId) {
  if (!userId) return;
  await insertAuditLog({
    user_id: userId,
    action: 'storage.downloaded',
    entity_type: 'storage',
    entity_id: fileName,
    meta: { bucket_id: bucketId },
  });
}

// ============================================================
// Чтение из audit_log views через REST
// ============================================================

async function auditGet(path) {
  const token = getAccessToken();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(`Audit read failed: HTTP ${res.status}`);
  return res.json();
}

export async function getAuditFeed(limit = 50) {
  return auditGet(`audit_log?order=created_at.desc&limit=${limit}`);
}

export async function getEntityHistory(entityType, entityId) {
  return auditGet(
    `audit_log?entity_type=eq.${entityType}&entity_id=eq.${entityId}&order=created_at.desc`
  );
}

export async function getDailyStats() {
  return auditGet('audit_daily_stats?order=day.desc');
}
