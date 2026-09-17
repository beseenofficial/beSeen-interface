import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestFriendbotFunding } from '@/lib/friendbot';

const ADDRESS = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';

function fetchMock() {
  return vi.mocked(fetch);
}

describe('friendbot funding', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
  });

  it('funds the connected address on testnet', async () => {
    await expect(requestFriendbotFunding(ADDRESS, 'testnet')).resolves.toBe(true);
    expect(fetchMock()).toHaveBeenCalledTimes(1);
    expect(fetchMock().mock.calls[0][0]).toBe(
      `https://friendbot.stellar.org/?addr=${ADDRESS}`,
    );
    expect(fetchMock().mock.calls[0][1]).toMatchObject({ method: 'GET' });
  });

  it('normalises the address to its canonical uppercase form', async () => {
    await requestFriendbotFunding(ADDRESS.toLowerCase(), 'testnet');
    expect(fetchMock().mock.calls[0][0]).toBe(
      `https://friendbot.stellar.org/?addr=${ADDRESS}`,
    );
  });

  it('never calls friendbot on the public network', async () => {
    await expect(requestFriendbotFunding(ADDRESS, 'public')).resolves.toBe(false);
    expect(fetchMock()).not.toHaveBeenCalled();
  });

  it('reports failure instead of throwing when the account already exists', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 400 })));
    await expect(requestFriendbotFunding(ADDRESS, 'testnet')).resolves.toBe(false);
  });

  it('reports failure instead of throwing when friendbot is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );
    await expect(requestFriendbotFunding(ADDRESS, 'testnet')).resolves.toBe(false);
  });
});
