/**
 * Sanitização de inputs — proteção XSS stored
 */
const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
};

export function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/[&<>"'/]/g, (c) => HTML_ESCAPE_MAP[c] ?? c);
}

export function sanitizePlainText(str, maxLen = 2000) {
  if (str == null) return '';
  return escapeHtml(String(str).trim()).slice(0, maxLen);
}

export function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase().slice(0, 254);
}

export function sanitizeObjectStrings(obj, maxLen = 2000) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') {
      out[k] = sanitizePlainText(v, maxLen);
    } else if (v && typeof v === 'object') {
      out[k] = sanitizeObjectStrings(v, maxLen);
    } else {
      out[k] = v;
    }
  }
  return out;
}
