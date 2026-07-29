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
  signal,
}: ProtectedImageLoadOptions) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!response.ok) {
    throw new Error(fileResponseMessage(response.status));
  }
  const responseType = response.headers.get('content-type') ?? '';
  if (responseType && !responseType.startsWith('image/')) {
    throw new Error('Máy chủ không trả về một tệp ảnh hợp lệ.');
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  return { uri: objectUrl, objectUrl };
}

export async function clearProtectedImageCache() {
  // Web object URLs are revoked by SecureImageViewer when it unmounts.
}

function fileResponseMessage(status: number) {
  if (status === 401 || status === 403) {
    return 'Phiên đăng nhập không còn hiệu lực.';
  }
  if (status === 404) return 'Không tìm thấy ảnh trên máy chủ.';
  return `Không tải được ảnh từ máy chủ (${status}).`;
}
