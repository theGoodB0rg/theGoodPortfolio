// Escaping for values that reach innerHTML.
//
// public/data/projects.json is generated from GitHub repo metadata by
// scripts/fetch_projects.py, so its strings are machine-sourced rather than
// hand-written. The prerender step bakes them into static HTML, which makes
// escaping a build-time concern rather than only a runtime one.

const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, char => HTML_ENTITIES[char]);
}

// Only let through schemes that make sense for a link on this site. Anything
// else (javascript:, data:, vbscript:) collapses to '#' rather than becoming
// an executable href.
const SAFE_SCHEMES = ['http:', 'https:', 'mailto:'];

export function safeUrl(value) {
  if (!value) return '#';
  const raw = String(value).trim();

  // Relative paths and fragments never carry a scheme, so they are fine.
  if (/^[./#?]/.test(raw)) return escapeHtml(raw);

  try {
    const parsed = new URL(raw, 'https://thegoodb0rg.pages.dev/');
    if (!SAFE_SCHEMES.includes(parsed.protocol)) return '#';
    return escapeHtml(raw);
  } catch {
    return '#';
  }
}
