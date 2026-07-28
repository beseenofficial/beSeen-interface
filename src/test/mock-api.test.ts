import { describe, expect, it } from 'vitest';
import { api } from '@/lib/api';

const WALLET = 'GDNSSYSCSSJ76FER5WEEXME5G4MTCUBKDRQSKOYP36KUKVDB2VCMERS6';
const OTHER_WALLET = 'GBL3QK4BFIRWDBBJVLU3NHQZTC4GYZMEZCV6THUWBEENCC5ZM7PZ4FBM';
const DERIVED_KEY = 'GC6ZLZ6RJVN4BQWXEAJ7VTA3JZ2FWSGYUD2FHVL7WSGEIGYSPLQZQMJU';

function register(overrides: Partial<Parameters<typeof api.register>[0]> = {}) {
  return api.register({
    walletAddress: WALLET,
    derivedPublicKey: DERIVED_KEY,
    username: 'matin',
    avatarUrl: null,
    ...overrides,
  });
}

describe('mock api', () => {
  it('registers a wallet with its derived public key and finds it again', async () => {
    const user = await register();
    expect(user.walletAddress).toBe(WALLET);
    expect(user.derivedPublicKey).toBe(DERIVED_KEY);
    expect(user.username).toBe('matin');

    const found = await api.getUserByWallet(WALLET);
    expect(found?.id).toBe(user.id);
  });

  it('rejects duplicate wallets and duplicate usernames', async () => {
    await register();
    await expect(register()).rejects.toThrow(/already has/i);
    await expect(
      register({ walletAddress: OTHER_WALLET, username: 'matin' }),
    ).rejects.toThrow(/taken/i);
  });

  it('reports username availability with reasons', async () => {
    await register();
    await expect(api.checkUsername('matin')).resolves.toMatchObject({
      available: false,
      reason: 'taken',
    });
    await expect(api.checkUsername('admin')).resolves.toMatchObject({
      available: false,
      reason: 'reserved',
    });
    await expect(api.checkUsername('x')).resolves.toMatchObject({
      available: false,
      reason: 'invalid',
    });
    await expect(api.checkUsername('free_name')).resolves.toMatchObject({
      available: true,
      reason: null,
    });
  });

  it('updates username and logo', async () => {
    await register();
    const updated = await api.updateUser(WALLET, {
      username: 'newname',
      avatarUrl: 'data:image/png;base64,AAAA',
    });
    expect(updated.username).toBe('newname');
    expect(updated.avatarUrl).toBe('data:image/png;base64,AAAA');
  });

  it('serves public profiles without key material', async () => {
    await register();
    const profile = await api.getPublicProfile('matin');
    expect(profile).not.toBeNull();
    expect(profile).not.toHaveProperty('walletAddress');
    expect(profile).not.toHaveProperty('derivedPublicKey');
    await expect(api.getPublicProfile('missing')).resolves.toBeNull();
  });

  it('lists other users as followers with their derived public keys', async () => {
    const alice = await register();
    const bob = await register({
      walletAddress: OTHER_WALLET,
      username: 'bob',
      derivedPublicKey: 'GBL3QK4BFIRWDBBJVLU3NHQZTC4GYZMEZCV6THUWBEENCC5ZM7PZ4FBM',
    });

    const aliceFollowers = await api.getFollowers(alice.id);
    expect(aliceFollowers).toEqual([
      {
        userId: bob.id,
        username: 'bob',
        derivedPublicKey: bob.derivedPublicKey,
      },
    ]);
  });

  it('stores broadcasts opaquely and serves each recipient only their copy', async () => {
    const alice = await register();
    const broadcast = await api.publishBroadcast({
      senderId: alice.id,
      copies: [
        { recipientPublicKey: 'GKEY_ALICE', ciphertext: 'cipher-for-alice' },
        { recipientPublicKey: 'GKEY_BOB', ciphertext: 'cipher-for-bob' },
      ],
    });

    // The API assigned identity: uuid + sender linked to the user id.
    expect(broadcast.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(broadcast.senderId).toBe(alice.id);

    const aliceInbox = await api.getInbox('GKEY_ALICE');
    expect(aliceInbox).toHaveLength(1);
    expect(aliceInbox[0]).toMatchObject({
      id: broadcast.id,
      ciphertext: 'cipher-for-alice',
      sender: { id: alice.id, username: 'matin' },
    });
    // Bob gets his copy, strangers get nothing.
    await expect(api.getInbox('GKEY_BOB')).resolves.toHaveLength(1);
    await expect(api.getInbox('GKEY_NOBODY')).resolves.toHaveLength(0);
  });

  it('rejects broadcasts from unknown senders or without copies', async () => {
    const alice = await register();
    await expect(
      api.publishBroadcast({ senderId: 'ghost', copies: [{ recipientPublicKey: 'G', ciphertext: 'x' }] }),
    ).rejects.toThrow(/unknown sender/i);
    await expect(
      api.publishBroadcast({ senderId: alice.id, copies: [] }),
    ).rejects.toThrow(/at least one/i);
  });
});
