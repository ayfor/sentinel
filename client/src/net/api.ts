import type { Fix, LatLng, ZonePolygon } from '@shared/types';

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

export async function putPatrol(points: LatLng[]): Promise<void> {
  const res = await fetch('/api/patrol', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ points }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { reason?: string } | null;
    throw new Error(body?.reason ?? `patrol rejected (${res.status})`);
  }
}

export async function deletePatrol(): Promise<void> {
  const res = await fetch('/api/patrol', { method: 'DELETE' });
  if (!res.ok && res.status !== 404) {
    throw new Error(`patrol delete failed (${res.status})`);
  }
}

export async function getTrack(id: string): Promise<Fix[]> {
  const res = await fetch(`/api/assets/${id}/track`);
  if (!res.ok) throw new Error(`track fetch failed (${res.status})`);
  return (await res.json()) as Fix[];
}
