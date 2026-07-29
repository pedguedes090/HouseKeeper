export type DocumentType =
  | 'NATIONAL_ID'
  | 'PASSPORT'
  | 'DRIVER_LICENSE'
  | 'INSURANCE'
  | 'VEHICLE_REGISTRATION'
  | 'OTHER';

export type UrgencyLevel =
  | 'EXPIRED'
  | 'CRITICAL'
  | 'WARNING'
  | 'NOTICE'
  | 'SAFE'
  | 'NO_EXPIRY';

export type BillCategory =
  | 'ELECTRICITY'
  | 'WATER'
  | 'INTERNET'
  | 'SERVICE_FEE'
  | 'SUBSCRIPTION'
  | 'INSURANCE'
  | 'RENT'
  | 'OTHER';

export type Recurrence =
  | 'ONE_TIME'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'YEARLY';

export type BillDueStatus =
  | 'OVERDUE'
  | 'DUE_TODAY'
  | 'DUE_SOON'
  | 'UPCOMING'
  | 'INACTIVE';

export type AssetCategory =
  | 'PHONE'
  | 'LAPTOP'
  | 'TELEVISION'
  | 'AIR_CONDITIONER'
  | 'HOME_APPLIANCE'
  | 'VEHICLE'
  | 'OTHER';

export type WarrantyStatus = 'EXPIRED' | 'ENDING_SOON' | 'VALID' | 'UNKNOWN';
export type MaintenanceType =
  | 'REPAIR'
  | 'MAINTENANCE'
  | 'INSPECTION'
  | 'CLEANING'
  | 'OTHER';

export type ScanTargetType = 'DOCUMENT' | 'BILL' | 'ASSET';
export type ScanStatus = 'PROCESSING' | 'REVIEW_REQUIRED' | 'CONFIRMED' | 'FAILED';

export interface TokenPair {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  timeZone: string;
}

export interface DocumentRecord {
  id: string;
  type: DocumentType;
  title: string;
  documentNumber: string | null;
  issuer: string | null;
  issueDate: string | null;
  expirationDate: string | null;
  fileUrl: string | null;
  notes: string | null;
  daysRemaining: number | null;
  urgency: UrgencyLevel;
}

export interface DocumentInput {
  type: DocumentType;
  title: string;
  documentNumber?: string | null;
  issuer?: string | null;
  issueDate?: string | null;
  expirationDate?: string | null;
  fileUrl?: string | null;
  notes?: string | null;
}

export interface BillRecord {
  id: string;
  title: string;
  provider: string | null;
  category: BillCategory;
  amount: number;
  currency: string;
  recurrence: Recurrence;
  nextDueDate: string;
  reminderDaysBefore: number;
  autoRenew: boolean;
  active: boolean;
  notes: string | null;
  invoiceFileUrl: string | null;
  daysUntilDue: number;
  dueStatus: BillDueStatus;
}

export interface BillInput {
  title: string;
  provider?: string | null;
  category: BillCategory;
  amount: number;
  currency: string;
  recurrence: Recurrence;
  nextDueDate: string;
  reminderDaysBefore: number;
  autoRenew: boolean;
  active: boolean;
  notes?: string | null;
  invoiceFileUrl?: string | null;
}

export interface PaymentRecord {
  id: string;
  billId: string;
  periodDueDate: string;
  paidAt: string;
  amount: number;
  note: string | null;
}

export interface AssetRecord {
  id: string;
  name: string;
  category: AssetCategory;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  purchaseDate: string | null;
  purchasePrice: number | null;
  currency: string;
  warrantyExpiresOn: string | null;
  invoiceFileUrl: string | null;
  notes: string | null;
  warrantyDaysRemaining: number | null;
  warrantyStatus: WarrantyStatus;
}

export interface AssetInput {
  name: string;
  category: AssetCategory;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  purchaseDate?: string | null;
  purchasePrice?: number | null;
  currency: string;
  warrantyExpiresOn?: string | null;
  invoiceFileUrl?: string | null;
  notes?: string | null;
}

export interface MaintenanceRecord {
  id: string;
  assetId: string;
  type: MaintenanceType;
  performedOn: string;
  description: string;
  provider: string | null;
  cost: number | null;
  currency: string;
  nextMaintenanceDate: string | null;
}

export interface ReminderRecord {
  id: string;
  sourceType: 'DOCUMENT' | 'BILL' | 'ASSET_WARRANTY' | 'ASSET_MAINTENANCE';
  sourceId: string;
  title: string;
  message: string;
  remindAt: string;
  status: 'PENDING' | 'SENT' | 'DISMISSED';
}

export interface DashboardData {
  urgentDocumentCount: number;
  unpaidBillCount: number;
  expiringWarrantyCount: number;
  amountDueByCurrency: Record<string, number>;
  urgentDocuments: DocumentRecord[];
  upcomingBills: BillRecord[];
  expiringWarranties: AssetRecord[];
  upcomingReminders: ReminderRecord[];
}

export interface AssistantItem {
  id: string;
  type:
    | 'BILL'
    | 'RECURRING_BILL'
    | 'BILL_PAYMENT'
    | 'DOCUMENT'
    | 'ASSET'
    | 'MAINTENANCE';
  title: string;
  dueDate: string | null;
  detail: string;
  routeId: string;
}

export interface AssistantHistoryMessage {
  role: 'USER' | 'ASSISTANT';
  content: string;
}

export interface AssistantAnswer {
  intent: string;
  message: string;
  items: AssistantItem[];
}

export interface ScanJob {
  id: string;
  targetType: ScanTargetType;
  status: ScanStatus;
  originalFileName: string;
  contentType: string;
  fileUrl: string;
  extractedDataJson: string;
  confirmedSourceId: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
}
