export function madridToday(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function webOrigin(): string {
  return (process.env.WEB_ORIGIN || 'https://dedalo.proyectos.cristiancode.dev').replace(/\/$/, '');
}

export function runCode(): string {
  return 'DDO-' + Math.random().toString(36).slice(2, 6).toUpperCase();
}

export const LIVE_RUN_STATUSES = ['confirmed', 'running'] as const;
