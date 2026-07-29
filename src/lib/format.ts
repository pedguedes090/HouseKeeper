import {
  AssetCategory,
  BillCategory,
  BillDueStatus,
  DocumentType,
  Recurrence,
  UrgencyLevel,
  WarrantyStatus,
} from '@/lib/types';

export function formatCurrency(
  value: number | null | undefined,
  currency = 'VND',
) {
  if (value == null || Number.isNaN(value)) return '—';

  try {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'VND' ? 0 : 2,
    }).format(value);
  } catch {
    return `${new Intl.NumberFormat('vi-VN').format(value)} ${currency}`;
  }
}

export function formatDate(value: string | null | undefined, compact = false) {
  if (!value) return 'Không có hạn';
  const [year, month, day] = value.slice(0, 10).split('-');
  if (!year || !month || !day) return value;
  return compact ? `${day}/${month}` : `${day}/${month}/${year}`;
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export const documentTypeLabels: Record<DocumentType, string> = {
  NATIONAL_ID: 'Căn cước',
  PASSPORT: 'Hộ chiếu',
  DRIVER_LICENSE: 'Giấy phép lái xe',
  INSURANCE: 'Bảo hiểm',
  VEHICLE_REGISTRATION: 'Giấy tờ xe',
  OTHER: 'Giấy tờ khác',
};

export const billCategoryLabels: Record<BillCategory, string> = {
  ELECTRICITY: 'Tiền điện',
  WATER: 'Tiền nước',
  INTERNET: 'Internet',
  SERVICE_FEE: 'Phí dịch vụ',
  SUBSCRIPTION: 'Gói đăng ký',
  INSURANCE: 'Bảo hiểm',
  RENT: 'Tiền thuê nhà',
  OTHER: 'Chi phí khác',
};

export const assetCategoryLabels: Record<AssetCategory, string> = {
  PHONE: 'Điện thoại',
  LAPTOP: 'Laptop',
  TELEVISION: 'Tivi',
  AIR_CONDITIONER: 'Máy lạnh',
  HOME_APPLIANCE: 'Gia dụng',
  VEHICLE: 'Xe cộ',
  OTHER: 'Khác',
};

export const recurrenceLabels: Record<Recurrence, string> = {
  ONE_TIME: 'Một lần',
  WEEKLY: 'Hàng tuần',
  MONTHLY: 'Hàng tháng',
  QUARTERLY: 'Hàng quý',
  YEARLY: 'Hàng năm',
};

export const urgencyLabels: Record<UrgencyLevel, string> = {
  EXPIRED: 'Đã hết hạn',
  CRITICAL: 'Cần xử lý',
  WARNING: 'Sắp hết hạn',
  NOTICE: 'Cần lưu ý',
  SAFE: 'An toàn',
  NO_EXPIRY: 'Không có hạn',
};

export const billDueLabels: Record<BillDueStatus, string> = {
  OVERDUE: 'Quá hạn',
  DUE_TODAY: 'Đến hạn hôm nay',
  DUE_SOON: 'Sắp đến hạn',
  UPCOMING: 'Sắp tới',
  INACTIVE: 'Đã hoàn tất',
};

export const warrantyLabels: Record<WarrantyStatus, string> = {
  EXPIRED: 'Hết bảo hành',
  ENDING_SOON: 'Sắp hết bảo hành',
  VALID: 'Còn bảo hành',
  UNKNOWN: 'Chưa rõ',
};

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function greeting() {
  const hour = new Date().getHours();
  if (hour < 11) return 'Chào buổi sáng,';
  if (hour < 18) return 'Chào buổi chiều,';
  return 'Chào buổi tối,';
}
