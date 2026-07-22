import type { LatLng, ZonePolygon } from '@shared/types';

/** REST commands (D1). Errors resolve to the server's reason string. */

export async function postZone(ring: LatLng[]): Promise<ZonePolygon> {
  const res = await fetch('/api/zones', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ring }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { reason?: string } | null;
    throw new Error(body?.reason ?? `zone rejected (${res.status})`);
  }
  return (await res.json()) as ZonePolygon;
}

export async function deleteZone(id: string): Promise<void> {
  const res = await fetch(`/api/zones/${id}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) {
    const body = (await res.json().catch(() => null)) as { reason?: string } | null;
    throw new Error(body?.reason ?? `delete failed (${res.status})`);
  }
}
