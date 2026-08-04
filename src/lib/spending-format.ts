import { BudgetState } from '@/lib/types';

export const budgetStateLabels: Record<BudgetState, string> = {
  UNSET: 'Chưa đặt hạn mức',
  NORMAL: 'Bình thường',
  NEAR_LIMIT: 'Gần hạn mức',
  OVER_LIMIT: 'Đã vượt',
};

export function budgetState(spent: number, limit: number): BudgetState {
  if (limit <= 0) return 'UNSET';
  const usage = spent / limit;
  if (usage >= 1) return 'OVER_LIMIT';
  if (usage >= 0.8) return 'NEAR_LIMIT';
  return 'NORMAL';
}

export function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonth(value: string) {
  const [year, month] = value.split('-').map(Number);
  if (!year || !month || month < 1 || month > 12) return value;
  return `Tháng ${month}, ${year}`;
}

export function shiftMonth(value: string, delta: number) {
  const [year, month] = value.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
