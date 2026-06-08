import type { SyncPayload, SyncResponse } from '@clausage/shared';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function postSync(
  apiUrl: string,
  token: string,
  payload: SyncPayload,
): Promise<SyncResponse> {
  const res = await fetch(`${apiUrl.replace(/\/$/, '')}/api/sync`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) detail = body.error;
    } catch {
      /* non-JSON error body */
    }
    if (res.status === 401) {
      throw new ApiError(401, `Authentication failed — your token is invalid or expired. ${detail}`);
    }
    throw new ApiError(res.status, `Sync failed: ${detail}`);
  }

  return (await res.json()) as SyncResponse;
}
