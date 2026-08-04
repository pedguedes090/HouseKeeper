import { expect, Page, test } from '@playwright/test';

const user = {
  id: 'user-e2e',
  email: 'e2e@example.com',
  displayName: 'Khôi Nguyên',
  timeZone: 'Asia/Ho_Chi_Minh',
};

async function mockAuthenticatedApi(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('housekeeper.accessToken', 'test-access');
    localStorage.setItem('housekeeper.refreshToken', 'test-refresh');
  });
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/auth/me')) {
      await route.fulfill({ json: user });
      return;
    }
    if (url.pathname.endsWith('/dashboard')) {
      await route.fulfill({
        json: {
          urgentDocumentCount: 0,
          unpaidBillCount: 0,
          expiringWarrantyCount: 0,
          amountDueByCurrency: {},
          urgentDocuments: [],
          upcomingBills: [],
          expiringWarranties: [],
          upcomingReminders: [],
        },
      });
      return;
    }
    if (
      url.pathname.endsWith('/documents') ||
      url.pathname.endsWith('/assets')
    ) {
      await route.fulfill({ json: [] });
      return;
    }
    if (url.pathname.endsWith('/scans/scan-expense-1')) {
      await route.fulfill({
        json: {
          id: 'scan-expense-1',
          targetType: 'EXPENSE',
          status: 'REVIEW_REQUIRED',
          originalFileName: 'receipt.jpg',
          contentType: 'image/jpeg',
          fileUrl: '/api/v1/scans/scan-expense-1/file',
          extractedDataJson: JSON.stringify({
            _isRelevant: true,
            _confidence: 0.94,
            _warnings: [],
            amount: 85000,
            currency: 'VND',
            merchant: 'Quán ăn',
            spentAt: '2026-08-04',
            title: 'Bữa trưa',
            suggestedJarName: 'Ăn uống',
          }),
          confirmedSourceId: null,
          errorMessage: null,
          createdAt: '2026-08-04T05:00:00Z',
        },
      });
      return;
    }
    if (url.pathname.endsWith('/spending/overview')) {
      await route.fulfill({
        json: {
          month: '2026-08',
          currencyTotals: { VND: 85000 },
          jars: [
            {
              id: 'jar-food',
              name: 'Ăn uống',
              icon: 'restaurant-outline',
              color: '#0058BE',
              currency: 'VND',
              limitAmount: 100000,
              spentAmount: 85000,
              remainingAmount: 15000,
              usagePercent: 85,
              state: 'NEAR_LIMIT',
              monthlyOverride: false,
            },
          ],
          recentExpenses: [],
          thresholdEvents: [
            {
              id: 'threshold-80',
              jarId: 'jar-food',
              jarName: 'Ăn uống',
              month: '2026-08',
              thresholdPercent: 80,
              spentAmount: 85000,
              limitAmount: 100000,
              createdAt: '2026-08-04T05:10:00Z',
            },
          ],
        },
      });
      return;
    }
    if (url.pathname.endsWith('/spending/jars')) {
      await route.fulfill({
        json: [
          {
            id: 'jar-food',
            name: 'Ăn uống',
            icon: 'restaurant-outline',
            color: '#0058BE',
            currency: 'VND',
            defaultMonthlyLimit: 4000000,
            displayOrder: 0,
            archived: false,
          },
        ],
      });
      return;
    }
    if (url.pathname.endsWith('/reminders')) {
      await route.fulfill({ json: [] });
      return;
    }
    if (
      url.pathname.endsWith('/spending/expenses') &&
      route.request().method() === 'GET'
    ) {
      await route.fulfill({
        json: {
          items: [
            {
              id: 'expense-1',
              jarId: 'jar-food',
              amount: 45000,
              currency: 'VND',
              title: 'Bữa sáng',
              merchant: 'Quán quen',
              spentAt: '2026-08-04T05:00:00Z',
              note: null,
              receiptFileUrl: null,
              sourceType: 'MANUAL',
              sourceId: null,
              excludedFromStats: false,
            },
          ],
          page: 0,
          size: 100,
          totalItems: 1,
          hasMore: false,
        },
      });
      return;
    }
    await route.fulfill({ status: 404, json: { message: 'Not mocked' } });
  });
}

test('spending overview shows the monthly entry points', async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto('/spending?month=2026-08');

  await expect(
    page.getByRole('heading', { name: 'Hũ chi tiêu' }),
  ).toBeVisible();
  await expect(page.getByText('Tháng 8, 2026')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Thêm khoản chi' }),
  ).toBeVisible();
});

test('manual expense edit keeps deletion and statistics controls available', async ({
  page,
}) => {
  await mockAuthenticatedApi(page);
  await page.goto(
    '/spending/expense/form?id=expense-1&month=2026-08',
  );

  await expect(page.getByLabel('Tên khoản chi *')).toHaveValue('Bữa sáng');
  await expect(page.getByText('Không tính vào thống kê')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Xóa khoản chi' }),
  ).toBeVisible();
});

test('primary navigation contains exactly five focused destinations', async ({
  page,
}) => {
  await mockAuthenticatedApi(page);
  await page.goto('/spending?month=2026-08');

  const labels = ['Trang chủ', 'Lịch', 'Quét', 'Hũ', 'Kho'];
  for (const label of labels) {
    await expect(page.getByRole('tab', { name: label })).toBeVisible();
  }
  await expect(page.getByRole('tab')).toHaveCount(5);
  await expect(page.getByRole('tab', { name: 'Giấy tờ' })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Tài sản' })).toHaveCount(0);
});

test('storage switches between documents and assets without adding tabs', async ({
  page,
}) => {
  await mockAuthenticatedApi(page);
  await page.goto('/storage?segment=documents');

  await expect(page.getByText('Kho gia đình')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Thêm giấy tờ' }).last(),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Tài sản & bảo hành' }).click();
  await expect(
    page.getByRole('button', { name: 'Thêm tài sản' }).last(),
  ).toBeVisible();
});

test('receipt scan stays secondary and opens an editable confirmation draft', async ({
  page,
}) => {
  await mockAuthenticatedApi(page);
  await page.goto('/spending/expense/form?month=2026-08');
  await expect(
    page.getByRole('button', { name: 'Quét biên lai' }),
  ).toBeVisible();

  await page.goto('/spending/scan/scan-expense-1?month=2026-08');
  await expect(page.getByText('Kiểm tra biên lai')).toBeVisible();
  await expect(page.getByLabel('Số tiền *')).toHaveValue('85000');
  await expect(
    page.getByRole('button', { name: 'Xác nhận khoản chi' }),
  ).toBeVisible();
});

test('assistant and home surface one actionable spending insight', async ({
  page,
}) => {
  await mockAuthenticatedApi(page);
  await page.goto('/assistant');
  await expect(
    page.getByRole('button', {
      name: 'Tháng này tôi đã tiêu bao nhiêu?',
    }),
  ).toBeVisible();

  await page.goto('/?month=2026-08');
  await expect(
    page.getByText('Ăn uống đã dùng 85% hạn mức'),
  ).toBeVisible();
});

test('notifications show persisted spending threshold events', async ({
  page,
}) => {
  await mockAuthenticatedApi(page);
  await page.goto('/notifications');

  await expect(page.getByText('Ăn uống đã chạm 80% hạn mức')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Mở hũ Ăn uống' }),
  ).toBeVisible();
});

test('bill form links future payments to a spending jar', async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto('/bills/form');

  await expect(page.getByText('Hũ ghi nhận chi tiêu *')).toBeVisible();
  await expect(
    page.getByText('Khi thanh toán, House Keeper tự tạo một khoản chi đúng một lần.'),
  ).toBeVisible();
});
