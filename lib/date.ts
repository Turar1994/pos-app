const OFFSET_MS = 5 * 60 * 60 * 1000 // UTC+5, Қазақстан (DST жоқ)

// Supabase "2026-07-06 10:42:04.123" форматын UTC деп оқу
function parseUTC(iso: string): Date {
  const s = iso.replace(' ', 'T')
  if (!s.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(s)) {
    return new Date(s + 'Z')
  }
  return new Date(s)
}

function toAlmaty(iso: string): Date {
  return new Date(parseUTC(iso).getTime() + OFFSET_MS)
}

function pad(n: number) { return String(n).padStart(2, '0') }

export function fmtDateTime(iso: string) {
  const d = toAlmaty(iso)
  return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth()+1)}.${d.getUTCFullYear()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
}

export function fmtDate(iso: string) {
  const d = toAlmaty(iso)
  return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth()+1)}.${d.getUTCFullYear()}`
}

export function fmtTime(iso: string) {
  const d = toAlmaty(iso)
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}
