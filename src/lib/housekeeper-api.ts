import { File, UploadType } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

import {
  API_BASE_URL,
  ApiError,
  apiFetch,
  getAccessToken,
} from '@/lib/api';
import {
  AssetInput,
  AssetRecord,
  AssistantAnswer,
  AssistantHistoryMessage,
  BillInput,
  BillRecord,
  DashboardData,
  DocumentInput,
  DocumentRecord,
  ExpenseInput,
  ExpenseRecord,
  MaintenanceRecord,
  PaymentRecord,
  PickedFile,
  ReminderRecord,
  ScanJob,
  ScanTargetType,
  SpendingJar,
  SpendingOverview,
} from '@/lib/types';

const MAX_SCAN_IMAGE_EDGE = 2400;
const SCAN_IMAGE_COMPRESSION = 0.78;

async function prepareNativeScanFile(file: PickedFile): Promise<PickedFile> {
  if (!file.mimeType.startsWith('image/')) return file;

  try {
    const context = ImageManipulator.manipulate(file.uri);
    const original = await context.renderAsync();
    const longestEdge = Math.max(original.width, original.height);

    if (longestEdge > MAX_SCAN_IMAGE_EDGE) {
      if (original.width >= original.height) {
        context.resize({ width: MAX_SCAN_IMAGE_EDGE, height: null });
      } else {
        context.resize({ width: null, height: MAX_SCAN_IMAGE_EDGE });
      }
    }

    const rendered =
      longestEdge > MAX_SCAN_IMAGE_EDGE ? await context.renderAsync() : original;
    const result = await rendered.saveAsync({
      compress: SCAN_IMAGE_COMPRESSION,
      format: SaveFormat.JPEG,
    });

    return {
      uri: result.uri,
      name: file.name.replace(/\.[^.]+$/, '') + '.jpg',
      mimeType: 'image/jpeg',
    };
  } catch (error) {
    throw new ApiError(
      0,
      'Không thể chuẩn bị ảnh để tải lên. Hãy thử chụp lại hoặc chọn ảnh khác.',
      error,
    );
  }
}

function parseNativeUploadResult<T>(status: number, body: string): T {
  let payload: unknown = body;
  try {
    payload = body ? JSON.parse(body) : null;
  } catch {
    // Keep the raw response so a non-JSON proxy error can still be reported.
  }

  if (status < 200 || status >= 300) {
    const message =
      typeof payload === 'object' &&
      payload !== null &&
      'message' in payload &&
      typeof payload.message === 'string'
        ? payload.message
        : 'Không thể tải ảnh lên máy chủ.';
    throw new ApiError(status, message, payload);
  }

  return payload as T;
}

async function uploadNativeScan(targetType: ScanTargetType, file: PickedFile) {
  // This lightweight request also refreshes an expired access token when needed.
  await apiFetch('/auth/me');
  const accessToken = getAccessToken();
  if (!accessToken) {
    throw new ApiError(401, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  }

  const prepared = await prepareNativeScanFile(file);
  try {
    const result = await new File(prepared.uri).upload(`${API_BASE_URL}/scans`, {
      httpMethod: 'POST',
      uploadType: UploadType.MULTIPART,
      fieldName: 'file',
      mimeType: prepared.mimeType,
      parameters: { targetType },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return parseNativeUploadResult<ScanJob>(result.status, result.body);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      0,
      'Không thể tải ảnh lên máy chủ. Hãy kiểm tra Internet rồi thử lại.',
      error,
    );
  }
}

export const queryKeys = {
  dashboard: ['dashboard'] as const,
  documents: ['documents'] as const,
  document: (id: string) => ['documents', id] as const,
  bills: ['bills'] as const,
  bill: (id: string) => ['bills', id] as const,
  payments: (id: string) => ['bills', id, 'payments'] as const,
  assets: ['assets'] as const,
  asset: (id: string) => ['assets', id] as const,
  maintenance: (id: string) => ['assets', id, 'maintenance'] as const,
  reminders: ['reminders'] as const,
  scans: ['scans'] as const,
  scan: (id: string) => ['scans', id] as const,
  spendingJars: ['spending', 'jars'] as const,
  spendingOverview: (month: string) => ['spending', 'overview', month] as const,
  spendingExpenses: (month: string, jarId?: string) => ['spending', 'expenses', month, jarId ?? 'all'] as const,
};

export const housekeeperApi = {
  dashboard: () => apiFetch<DashboardData>('/dashboard'),

  listDocuments: () => apiFetch<DocumentRecord[]>('/documents'),
  getDocument: (id: string) => apiFetch<DocumentRecord>(`/documents/${id}`),
  createDocument: (input: DocumentInput) =>
    apiFetch<DocumentRecord>('/documents', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateDocument: (id: string, input: DocumentInput) =>
    apiFetch<DocumentRecord>(`/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  deleteDocument: (id: string) =>
    apiFetch<void>(`/documents/${id}`, { method: 'DELETE' }),

  listBills: () => apiFetch<BillRecord[]>('/bills'),
  getBill: (id: string) => apiFetch<BillRecord>(`/bills/${id}`),
  createBill: (input: BillInput) =>
    apiFetch<BillRecord>('/bills', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateBill: (id: string, input: BillInput) =>
    apiFetch<BillRecord>(`/bills/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  deleteBill: (id: string) =>
    apiFetch<void>(`/bills/${id}`, { method: 'DELETE' }),
  listPayments: (id: string) =>
    apiFetch<PaymentRecord[]>(`/bills/${id}/payments`),
  recordPayment: (
    id: string,
    input: {
      amount?: number;
      paidAt?: string;
      note?: string;
      expectedPeriodDueDate?: string;
    },
  ) =>
    apiFetch<PaymentRecord>(`/bills/${id}/payments`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  listSpendingJars: () => apiFetch<SpendingJar[]>('/spending/jars'),
  getSpendingOverview: (month: string) =>
    apiFetch<SpendingOverview>(`/spending/overview?month=${encodeURIComponent(month)}`),
  createSpendingJar: (input: Omit<SpendingJar, 'id' | 'archived'>) =>
    apiFetch<SpendingJar>('/spending/jars', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateSpendingJar: (id: string, input: Omit<SpendingJar, 'id' | 'archived'>) =>
    apiFetch<SpendingJar>(`/spending/jars/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  archiveSpendingJar: (id: string) =>
    apiFetch<void>(`/spending/jars/${id}/archive`, { method: 'PATCH' }),
  listExpenses: (month: string, jarId?: string) => {
    const params = new URLSearchParams({ month, page: '0', size: '100' });
    if (jarId) params.set('jarId', jarId);
    return apiFetch<{ items: ExpenseRecord[]; page: number; size: number; totalItems: number; hasMore: boolean }>(
      `/spending/expenses?${params.toString()}`,
    );
  },
  createExpense: (input: ExpenseInput) =>
    apiFetch<ExpenseRecord>('/spending/expenses', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateExpense: (id: string, input: ExpenseInput) =>
    apiFetch<ExpenseRecord>(`/spending/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  deleteExpense: (id: string) =>
    apiFetch<void>(`/spending/expenses/${id}`, { method: 'DELETE' }),

  listAssets: () => apiFetch<AssetRecord[]>('/assets'),
  getAsset: (id: string) => apiFetch<AssetRecord>(`/assets/${id}`),
  createAsset: (input: AssetInput) =>
    apiFetch<AssetRecord>('/assets', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateAsset: (id: string, input: AssetInput) =>
    apiFetch<AssetRecord>(`/assets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  deleteAsset: (id: string) =>
    apiFetch<void>(`/assets/${id}`, { method: 'DELETE' }),
  listMaintenance: (id: string) =>
    apiFetch<MaintenanceRecord[]>(`/assets/${id}/maintenance`),
  createMaintenance: (
    id: string,
    input: Omit<MaintenanceRecord, 'id' | 'assetId'>,
  ) =>
    apiFetch<MaintenanceRecord>(`/assets/${id}/maintenance`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  listReminders: () => apiFetch<ReminderRecord[]>('/reminders'),
  dismissReminder: (id: string) =>
    apiFetch<ReminderRecord>(`/reminders/${id}/dismiss`, { method: 'PATCH' }),

  askAssistant: (question: string, history: AssistantHistoryMessage[] = []) =>
    apiFetch<AssistantAnswer>('/assistant/ask', {
      method: 'POST',
      body: JSON.stringify({ question, history }),
    }),

  listScans: () => apiFetch<ScanJob[]>('/scans'),
  getScan: (id: string) => apiFetch<ScanJob>(`/scans/${id}`),
  uploadScan: async (targetType: ScanTargetType, file: PickedFile) => {
    if (Platform.OS !== 'web') {
      return uploadNativeScan(targetType, file);
    }

    const body = new FormData();
    body.append('targetType', targetType);
    const response = await fetch(file.uri);
    const blob = await response.blob();
    body.append('file', blob, file.name);
    return apiFetch<ScanJob>('/scans', { method: 'POST', body });
  },
  updateScanDraft: (id: string, extractedDataJson: string) =>
    apiFetch<ScanJob>(`/scans/${id}/draft`, {
      method: 'PATCH',
      body: JSON.stringify({ extractedDataJson }),
    }),
  confirmScan: (
    id: string,
    targetType: ScanTargetType,
    input: DocumentInput | BillInput | AssetInput | ExpenseInput,
  ) =>
    apiFetch<{ id: string }>(`/scans/${id}/confirm/${targetType.toLowerCase()}`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  deleteScan: (id: string) =>
    apiFetch<void>(`/scans/${id}`, { method: 'DELETE' }),
};
