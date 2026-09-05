export const API = '/api';
export const TOKEN_KEY = 'dedalo.accessToken';
export const THEME_KEY = 'dedalo.theme';

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'client' | 'customer' | 'staff' | 'admin' | string;
  points: number;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface MazePrice {
  id: string;
  teamMin: number;
  teamMax: number;
  priceCents: number;
}

export interface Checkpoint {
  id: string;
  title: string;
  sortOrder: number;
}

export interface MazeItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  photoUrl: string;
  caption: string | null;
  parSec: number;
  durationMin: number;
  maxTeams: number;
  open: boolean;
  fromPriceCents: number;
  freeTeamsNow: number;
  prices?: MazePrice[];
  checkpoints?: Checkpoint[];
}

export interface TimelineEvent {
  id?: string;
  status: string;
  at: string;
  note?: string | null;
}

export interface VisitItem {
  checkpointId: string;
  title?: string;
  sortOrder?: number;
  at: string;
}

export interface RunItem {
  id: string;
  code: string;
  mazeId: string;
  mazeName?: string;
  mazeSlug?: string;
  parSec?: number;
  durationMin?: number;
  teamSize: number;
  totalCents: number;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  elapsedSec: number | null;
  qrSvg: string | null;
  qrUrl: string | null;
  civilDay: string;
  createdAt: string;
  events: TimelineEvent[];
  visits: VisitItem[];
  userId?: string;
  suggestedAction?: 'start' | 'checkpoint' | 'finish';
  nextCheckpoint?: Checkpoint | null;
  points?: number;
}

export interface DailyPoint {
  date: string;
  count: number;
}

export function money(cents: number): string {
  return (cents / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

export function timer(sec: number | null | undefined): string {
  if (sec == null) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.abs(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'confirmed':
      return 'Confirmada';
    case 'running':
      return 'En pasillo';
    case 'finished':
      return 'Meta';
    case 'dnf':
      return 'Sin meta';
    case 'cancelled':
      return 'Cancelada';
    default:
      return status;
  }
}

export function madridAt(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function humanizeApiError(err: unknown): string {
  const body = (err as { error?: { code?: string; message?: string } })?.error;
  const code = body?.code || '';
  const raw = String(body?.message || (err as { message?: string })?.message || '');
  const map: Record<string, string> = {
    MAZE_FULL: 'El pasillo está lleno. Espera a que salga un equipo.',
    ALREADY_RUNNING: 'Ya tienes una carrera viva en este circuito hoy.',
    MAZE_CLOSED: 'Este pasillo está cerrado hoy.',
    BAD_TEAM: 'Ese tamaño de grupo no cabe en este circuito.',
    BAD_STATUS: 'Esta carrera no admite esa acción ahora.',
    CHECKPOINT_ORDER: 'Hay que seguir el hilo de las estaciones.',
    CANNOT_CANCEL: 'Solo se puede cancelar una carrera confirmada.',
  };
  if (code && map[code]) return map[code];
  const stripped = raw.replace(/^[A-Z_]+:\s*/, '');
  if (stripped && stripped !== 'Http failure response for') return stripped;
  return 'No se pudo completar. Inténtalo de nuevo.';
}
