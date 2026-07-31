export const AVATAR_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

const INVALID_TYPE_MESSAGE = 'Please select a JPEG, PNG, or WebP image.';
const TOO_LARGE_MESSAGE = 'The profile image must be 5 MB or smaller.';
const TOO_SMALL_MESSAGE = 'The profile image must be at least 128×128 pixels.';
const UNREADABLE_MESSAGE = 'The selected profile image could not be read.';

const AVATAR_API_ERROR_MESSAGES: Record<string, string> = {
  INVALID_AVATAR:
    'Please select a valid JPEG, PNG, or WebP image of at least 128×128 pixels.',
  AVATAR_TOO_LARGE: 'The profile image must be 5 MB or smaller.',
  AVATAR_STORAGE_UNAVAILABLE:
    'The profile image service is temporarily unavailable. Please try again.',
};

async function imageDimensions(file: File): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    try {
      return { width: bitmap.width, height: bitmap.height };
    } finally {
      bitmap.close();
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error(UNREADABLE_MESSAGE));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function validateAvatar(file: File): Promise<void> {
  if (!AVATAR_ALLOWED_TYPES.includes(file.type as (typeof AVATAR_ALLOWED_TYPES)[number])) {
    throw new Error(INVALID_TYPE_MESSAGE);
  }
  if (file.size > AVATAR_MAX_BYTES) {
    throw new Error(TOO_LARGE_MESSAGE);
  }

  let dimensions: { width: number; height: number };
  try {
    dimensions = await imageDimensions(file);
  } catch (cause) {
    if (cause instanceof Error && cause.message === UNREADABLE_MESSAGE) throw cause;
    throw new Error(UNREADABLE_MESSAGE);
  }

  if (dimensions.width < 128 || dimensions.height < 128) {
    throw new Error(TOO_SMALL_MESSAGE);
  }
}

export function avatarApiErrorMessage(cause: unknown): string | null {
  const code = cause instanceof Error && 'code' in cause ? String(cause.code) : '';
  return AVATAR_API_ERROR_MESSAGES[code] ?? null;
}
