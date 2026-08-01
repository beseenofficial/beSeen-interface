import { afterEach, describe, expect, it, vi } from 'vitest';
import { AVATAR_MAX_BYTES, validateAvatar } from '@/lib/avatar';

afterEach(() => vi.unstubAllGlobals());

function file(type: string, size = 16): File {
  return new File([new Uint8Array(size)], 'avatar', { type });
}

function dimensions(width = 128, height = 128) {
  const close = vi.fn();
  vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width, height, close })));
  return close;
}

describe('avatar validation', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])(
    'accepts a valid %s image and releases its bitmap',
    async (type) => {
      const close = dimensions(512, 512);
      await expect(validateAvatar(file(type))).resolves.toBeUndefined();
      expect(close).toHaveBeenCalledOnce();
    },
  );

  it('rejects unsupported image formats before decoding', async () => {
    const createBitmap = vi.fn();
    vi.stubGlobal('createImageBitmap', createBitmap);
    await expect(validateAvatar(file('image/gif'))).rejects.toThrow(
      'Please select a JPEG, PNG, or WebP image.',
    );
    expect(createBitmap).not.toHaveBeenCalled();
  });

  it('rejects files larger than 5 MiB before decoding', async () => {
    const createBitmap = vi.fn();
    vi.stubGlobal('createImageBitmap', createBitmap);
    await expect(validateAvatar(file('image/png', AVATAR_MAX_BYTES + 1))).rejects.toThrow(
      'The profile image must be 5 MB or smaller.',
    );
    expect(createBitmap).not.toHaveBeenCalled();
  });

  it('rejects images below 128×128 and still releases the bitmap', async () => {
    const close = dimensions(127, 256);
    await expect(validateAvatar(file('image/webp'))).rejects.toThrow(
      'The profile image must be at least 128×128 pixels.',
    );
    expect(close).toHaveBeenCalledOnce();
  });
});
