import type { AuthConfig } from '@/types';

const FRIENDBOT_URL = 'https://friendbot.stellar.org/';

/**
 * Asks Stellar's friendbot to create and fund a brand-new account. Friendbot
 * only exists on testnet and answers 400 once an account already has a
 * balance, so every failure here is a no-op rather than an error worth
 * surfacing: the request is a courtesy top-up, not part of signing in.
 */
export async function requestFriendbotFunding(
  address: string,
  network: AuthConfig['stellarNetwork'],
): Promise<boolean> {
  if (network !== 'testnet') return false;
  try {
    const response = await fetch(
      `${FRIENDBOT_URL}?addr=${encodeURIComponent(address.toUpperCase())}`,
      { method: 'GET', credentials: 'omit', cache: 'no-store' },
    );
    return response.ok;
  } catch {
    return false;
  }
}
