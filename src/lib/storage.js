export async function safeGet(key, fallback = []) {
  try {
    const raw = localStorage.getItem(`mafia:${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export async function safeSet(key, value) {
  try {
    localStorage.setItem(`mafia:${key}`, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error("Storage error:", error);
    return false;
  }
}

export async function safeDelete(key) {
  localStorage.removeItem(`mafia:${key}`);
}
