const BLUX_API_URL = 'https://api.blux.cc';
const BLUX_JWT_STORAGE_KEY = '__BLUX__JWT_STORE';

type BluxApiResponse = {
  result?: unknown;
  error?: unknown;
  message?: unknown;
};

export function usesBluxApiSigner(authMethod: string | undefined) {
  return Boolean(authMethod && authMethod !== 'wallet');
}

function apiErrorMessage(status: number, body: BluxApiResponse | null) {
  if (status === 401) {
    return 'Your Blux sign-in session expired. Sign out, then sign in again.';
  }
  if (status === 404) {
    return 'Your Blux account could not be found. Sign out, then sign in again.';
  }
  if (status === 429) {
    return 'Blux received too many signing requests. Wait a moment and try again.';
  }
  if (status >= 500) {
    return 'Blux could not sign the message right now. Please try again.';
  }

  const detail = body?.error ?? body?.message;
  return typeof detail === 'string' && detail.trim()
    ? `Blux could not sign the message: ${detail}`
    : 'Blux could not sign the message. Please try again.';
}

export async function signMessageWithBluxApi(
  message: string,
  dependencies: {
    storage?: Pick<Storage, 'getItem'>;
    fetcher?: typeof fetch;
  } = {},
) {
  const storage = dependencies.storage ?? window.localStorage;
  const fetcher = dependencies.fetcher ?? window.fetch.bind(window);
  const jwt = storage.getItem(BLUX_JWT_STORAGE_KEY);

  if (!jwt) {
    throw new Error(
      'Your Blux sign-in session expired. Sign out, then sign in again.',
    );
  }

  let response: Response;
  try {
    response = await fetcher(`${BLUX_API_URL}/users/sign-message`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });
  } catch {
    throw new Error(
      'Blux could not be reached to sign the message. Check your connection and try again.',
    );
  }

  let body: BluxApiResponse | null = null;
  try {
    body = (await response.json()) as BluxApiResponse;
  } catch {}

  if (!response.ok) {
    throw new Error(apiErrorMessage(response.status, body));
  }

  if (typeof body?.result !== 'string' || !body.result.trim()) {
    throw new Error('Blux returned an unsupported message signature.');
  }

  return body.result;
}
