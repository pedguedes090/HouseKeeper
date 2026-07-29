import { Directory, File, Paths } from 'expo-file-system';

const PROTECTED_IMAGE_CACHE_DIRECTORY = 'housekeeper-protected-images';

interface ProtectedImageLoadOptions {
  url: string;
  token: string;
  cacheScope: string;
  contentType?: string | null;
  signal: AbortSignal;
  forceDownload: boolean;
}

export async function loadProtectedImageAsset({
  url,
  token,
  cacheScope,
  contentType,
  signal,
  forceDownload,
}: ProtectedImageLoadOptions) {
  const imageCacheDirectory = new Directory(
    Paths.cache,
    PROTECTED_IMAGE_CACHE_DIRECTORY,
  );
  imageCacheDirectory.create({ idempotent: true, intermediates: true });
  const imageDirectory = new Directory(
    imageCacheDirectory,
    stableHash(`${cacheScope}:${url}`),
  );
  const completionMarker = new File(imageDirectory, '.complete');
  const cachedFile = imageDirectory.exists
    ? imageDirectory
        .list()
        .find(
          (entry): entry is File =>
            entry instanceof File &&
            entry.name !== completionMarker.name &&
            entry.size > 0,
        )
    : undefined;

  if (!forceDownload && completionMarker.exists && cachedFile) {
    return { uri: cachedFile.uri, objectUrl: null };
  }

  if (imageDirectory.exists) {
    imageDirectory.delete();
  }
  imageDirectory.create({ idempotent: true, intermediates: true });

  try {
    const file = await File.downloadFileAsync(url, imageDirectory, {
      headers: { Authorization: `Bearer ${token}` },
      idempotent: true,
      signal,
    });
    if (!file.exists || file.size <= 0) {
      throw new Error('Tệp ảnh tải về đang trống.');
    }
    new File(imageDirectory, '.complete').write(String(Date.now()));
    return { uri: file.uri, objectUrl: null };
  } catch (error) {
    if (imageDirectory.exists) {
      imageDirectory.delete();
    }
    throw error;
  }
}

export async function clearProtectedImageCache() {
  const imageCacheDirectory = new Directory(
    Paths.cache,
    PROTECTED_IMAGE_CACHE_DIRECTORY,
  );
  if (imageCacheDirectory.exists) {
    imageCacheDirectory.delete();
  }
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
