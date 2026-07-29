import { apiRequest, clearSession, storeSession } from '@/lib/api/transport';
import { bytesToBase64, utf8 } from '@/lib/encoding';
import { serializeLoginProof, signBytes } from '@/lib/keys';
import type { AuthConfig, AuthenticatedResult, DerivedKeys, User } from '@/types';

export const authApi = {
  config(signal?: AbortSignal) {
    return apiRequest<AuthConfig>('/v1/auth/config', { signal });
  },
  async register(input: {
    walletAddress: string;
    username: string;
    avatar: string | null;
    keys: DerivedKeys;
  }): Promise<User> {
    const result = await apiRequest<AuthenticatedResult>('/v1/auth/register', {
      method: 'POST',
      body: {
        walletAddress: input.walletAddress.toUpperCase(),
        username: input.username.trim().toLowerCase(),
        avatar: input.avatar,
        keys: {
          signing: { algorithm: 'Ed25519', publicKey: bytesToBase64(input.keys.signingPublicKey) },
          encryption: {
            algorithm: 'X25519',
            publicKey: bytesToBase64(input.keys.encryptionPublicKey),
          },
        },
      },
    });
    await storeSession(result.auth);
    return result.user;
  },
  async login(walletAddress: string, keys: DerivedKeys): Promise<User> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const requestId = crypto.randomUUID().toLowerCase();
      const issuedAt = new Date().toISOString();
      const signature = await signBytes(
        utf8(serializeLoginProof(walletAddress, requestId, issuedAt)),
        keys.signingPrivateKey,
      );
      try {
        const result = await apiRequest<AuthenticatedResult>('/v1/auth/login', {
          method: 'POST',
          body: { walletAddress: walletAddress.toUpperCase(), requestId, issuedAt, signature },
        });
        await storeSession(result.auth);
        return result.user;
      } catch (cause) {
        const code = (cause as { code?: string }).code;
        if (attempt === 0 && (code === 'LOGIN_PROOF_EXPIRED' || code === 'LOGIN_PROOF_REPLAYED')) {
          continue;
        }
        throw cause;
      }
    }
    throw new Error('A fresh login proof could not be created.');
  },
  async logout(): Promise<void> {
    try {
      await apiRequest('/v1/auth/logout', { method: 'POST', auth: true, retryAfterRefresh: false });
    } finally {
      await clearSession();
    }
  },
};

