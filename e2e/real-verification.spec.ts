import {
  APIRequestContext,
  APIResponse,
  expect,
  Page,
  request,
  test,
} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const runRealVerification = process.env.HOUSEKEEPER_REAL_E2E === '1';
const apiBaseUrl =
  process.env.HOUSEKEEPER_API_URL ?? 'http://127.0.0.1:8080/api/v1/';
const month = '2026-08';
const evidenceDir = path.resolve(
  'docs/verification/2026-08-04-spending-jars',
);

type Tokens = {
  accessToken: string;
  refreshToken: string;
};

type Jar = {
  id: string;
  name: string;
  icon: string;
  color: string;
  currency: string;
  defaultMonthlyLimit: number;
  displayOrder: number;
  archived: boolean;
};

type Expense = {
  id: string;
};

async function responseJson<T>(response: APIResponse): Promise<T> {
  if (!response.ok()) {
    throw new Error(
      `${response.url()} failed: ${response.status()} ${await response.text()}`,
    );
  }
  return response.json() as Promise<T>;
}

async function authApi(tokens: Tokens) {
  return request.newContext({
    baseURL: apiBaseUrl,
    extraHTTPHeaders: {
      Authorization: `Bearer ${tokens.accessToken}`,
    },
  });
}

async function register(
  api: APIRequestContext,
  emailSuffix: string,
): Promise<Tokens> {
  return responseJson<Tokens>(
    await api.post('auth/register', {
      data: {
        email: `spending.verify.${emailSuffix}.${Date.now()}@example.com`,
        displayName: 'Khôi Nguyên',
        password: 'HouseKeeper@2026',
      },
    }),
  );
}

async function createExpense(
  api: APIRequestContext,
  jarId: string,
  amount: number,
  title: string,
  spentAt = '2026-08-04T05:00:00Z',
) {
  return responseJson<Expense>(
    await api.post('spending/expenses', {
      data: {
        jarId,
        amount,
        currency: 'VND',
        title,
        merchant: 'Dữ liệu kiểm chứng',
        spentAt,
        note: 'Tạo qua API công khai trong bộ kiểm chứng',
        receiptFileUrl: null,
      },
    }),
  );
}

async function screenshot(
  page: Page,
  name: string,
) {
  await page.waitForTimeout(450);
  await page.screenshot({
    path: path.join(evidenceDir, name),
    fullPage: true,
  });
}

test.describe('real MySQL and API verification', () => {
  test.skip(!runRealVerification, 'Only runs against the real local services.');

  test('covers the approved spending-jar experience and captures evidence', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    fs.mkdirSync(evidenceDir, { recursive: true });

    await page.goto('/sign-in');
    await expect(page.getByText('Chào mừng trở lại')).toBeVisible();
    await screenshot(page, '01-auth-sign-in.png');

    const publicApi = await request.newContext({ baseURL: apiBaseUrl });
    const tokens = await register(publicApi, 'primary');
    const api = await authApi(tokens);

    await page.evaluate(
      ([accessToken, refreshToken]) => {
        localStorage.setItem('housekeeper.accessToken', accessToken);
        localStorage.setItem('housekeeper.refreshToken', refreshToken);
      },
      [tokens.accessToken, tokens.refreshToken],
    );

    const jars = await responseJson<Jar[]>(await api.get('spending/jars'));
    expect(jars).toHaveLength(6);
    const foodJar = jars.find((jar) => jar.name === 'Ăn uống');
    const billJar = jars.find((jar) => jar.name === 'Hóa đơn định kỳ');
    expect(foodJar).toBeTruthy();
    expect(billJar).toBeTruthy();

    await page.goto(`/spending?month=${month}`);
    await expect(
      page.getByRole('heading', { name: 'Hũ chi tiêu' }),
    ).toBeVisible();
    await screenshot(page, '07-spending-onboarding.png');

    await responseJson(
      await api.put(
        `spending/jars/${foodJar!.id}/monthly-limit/${month}`,
        { data: { amount: 1_000_000 } },
      ),
    );
    await responseJson(
      await api.put(
        `spending/jars/${billJar!.id}/monthly-limit/${month}`,
        { data: { amount: 2_000_000 } },
      ),
    );

    await page.goto(`/spending/expense/form?month=${month}`);
    await expect(page.getByText('Quét biên lai')).toBeVisible();
    await expect(page.getByLabel('Tên khoản chi *')).toBeVisible();
    await screenshot(page, '09-add-expense.png');

    const editableExpense = await createExpense(
      api,
      foodJar!.id,
      450_000,
      'Ăn uống trong tuần',
    );
    const updatedExpense = await responseJson<{ title: string }>(
      await api.put(`spending/expenses/${editableExpense.id}`, {
        data: {
          jarId: foodJar!.id,
          amount: 500_000,
          currency: 'VND',
          title: 'Ăn uống đầu tháng',
          merchant: 'Chợ và quán ăn',
          spentAt: '2026-08-04T05:00:00Z',
          note: 'Đã sửa khoản chi',
          receiptFileUrl: null,
        },
      }),
    );
    expect(updatedExpense.title).toBe('Ăn uống đầu tháng');
    await responseJson(
      await api.patch(`spending/expenses/${editableExpense.id}/excluded`, {
        data: { excluded: true },
      }),
    );
    const excludedOverview = await responseJson<{
      jars: Array<{ id: string; spentAmount: number }>;
    }>(await api.get(`spending/overview?month=${month}`));
    expect(
      excludedOverview.jars.find((jar) => jar.id === foodJar!.id)?.spentAmount,
    ).toBe(0);
    await responseJson(
      await api.patch(`spending/expenses/${editableExpense.id}/excluded`, {
        data: { excluded: false },
      }),
    );

    const deletableExpense = await createExpense(
      api,
      foodJar!.id,
      10_000,
      'Khoản chi tạm để kiểm tra xóa',
    );
    const deleteResponse = await api.delete(
      `spending/expenses/${deletableExpense.id}`,
    );
    expect(deleteResponse.status()).toBe(204);

    await page.goto(`/spending/jar/${foodJar!.id}?month=${month}`);
    await expect(page.getByText('Ăn uống đầu tháng')).toBeVisible();
    await screenshot(page, '10-jar-normal.png');

    await createExpense(api, foodJar!.id, 320_000, 'Cà phê và bữa trưa');
    await page.reload();
    await expect(page.getByText('Cà phê và bữa trưa')).toBeVisible();
    await screenshot(page, '11-jar-near-limit.png');

    await page.goto(`/spending?month=${month}`);
    await expect(page.getByText('Các hũ của bạn')).toBeVisible();
    await screenshot(page, '08-spending-overview.png');

    await page.goto(`/?month=${month}`);
    await expect(page.getByText(/Ăn uống đã dùng 82% hạn mức/)).toBeVisible();
    await screenshot(page, '02-home-insight.png');

    await createExpense(api, foodJar!.id, 220_000, 'Bữa tối gia đình');
    await page.goto(`/spending/jar/${foodJar!.id}?month=${month}`);
    await expect(page.getByText('Bữa tối gia đình')).toBeVisible();
    await screenshot(page, '12-jar-over-limit.png');

    await responseJson(
      await api.put(
        `spending/jars/${foodJar!.id}/monthly-limit/${month}`,
        { data: { amount: 1_200_000 } },
      ),
    );
    await page.reload();
    await expect(page.getByText('Dùng lại mặc định')).toBeVisible();
    await screenshot(page, '13-month-limit-override.png');
    const restoredLimit = await responseJson<{ limitAmount: number }>(
      await api.delete(
        `spending/jars/${foodJar!.id}/monthly-limit/${month}`,
      ),
    );
    expect(restoredLimit.limitAmount).toBe(0);
    await responseJson(
      await api.put(
        `spending/jars/${foodJar!.id}/monthly-limit/${month}`,
        { data: { amount: 1_200_000 } },
      ),
    );

    const documentRecord = await responseJson<{ id: string }>(
      await api.post('documents', {
        data: {
          type: 'NATIONAL_ID',
          title: 'Căn cước công dân',
          documentNumber: '079000000000',
          issuer: 'Cục Cảnh sát QLHC',
          issueDate: '2025-01-15',
          expirationDate: '2035-01-15',
          fileUrl: null,
          notes: 'Dữ liệu kiểm chứng',
        },
      }),
    );
    expect(documentRecord.id).toBeTruthy();
    const assetRecord = await responseJson<{ id: string }>(
      await api.post('assets', {
        data: {
          name: 'Máy lạnh phòng khách',
          category: 'AIR_CONDITIONER',
          brand: 'Panasonic',
          model: 'Inverter',
          serialNumber: 'VERIFY-2026',
          purchaseDate: '2026-01-10',
          purchasePrice: 12_500_000,
          currency: 'VND',
          warrantyExpiresOn: '2027-01-10',
          invoiceFileUrl: null,
          notes: 'Dữ liệu kiểm chứng',
        },
      }),
    );
    expect(assetRecord.id).toBeTruthy();

    await page.goto('/storage?segment=documents');
    await expect(page.getByText('Căn cước công dân')).toBeVisible();
    await screenshot(page, '05-storage-documents.png');
    await page.getByRole('button', { name: 'Tài sản & bảo hành' }).click();
    await expect(page.getByText('Máy lạnh phòng khách')).toBeVisible();
    await screenshot(page, '06-storage-assets.png');

    const bill = await responseJson<{ id: string }>(
      await api.post('bills', {
        data: {
          title: 'Tiền điện tháng 8',
          provider: 'EVN',
          category: 'ELECTRICITY',
          amount: 350_000,
          currency: 'VND',
          recurrence: 'MONTHLY',
          nextDueDate: '2026-08-20',
          reminderDaysBefore: 5,
          autoRenew: true,
          active: true,
          notes: 'Tự ghi nhận vào hũ khi thanh toán',
          invoiceFileUrl: null,
          spendingJarId: billJar!.id,
        },
      }),
    );
    await page.goto('/calendar');
    await expect(page.getByText('Tiền điện tháng 8')).toBeVisible();
    await screenshot(page, '03-calendar-bills.png');

    const firstPayment = await responseJson<{ expenseId: string }>(
      await api.post(`bills/${bill.id}/payments`, {
        data: {
          amount: 350_000,
          paidAt: '2026-08-04T06:00:00Z',
          note: 'Đã thanh toán',
          expectedPeriodDueDate: '2026-08-20',
        },
      }),
    );
    const secondPayment = await responseJson<{ expenseId: string }>(
      await api.post(`bills/${bill.id}/payments`, {
        data: {
          amount: 350_000,
          paidAt: '2026-08-04T06:05:00Z',
          note: 'Gửi lại để kiểm tra idempotent',
          expectedPeriodDueDate: '2026-08-20',
        },
      }),
    );
    expect(secondPayment.expenseId).toBe(firstPayment.expenseId);
    await page.goto(`/bills/${bill.id}`);
    await expect(page.getByText('Tiền điện tháng 8')).toBeVisible();
    await screenshot(page, '14-bill-linked-expense.png');

    await page.goto('/scan');
    await expect(
      page.getByLabel('Loại tài liệu cần quét'),
    ).toBeVisible();
    await screenshot(page, '04-scan-existing-targets.png');

    const iconPath = path.resolve('assets/images/icon.png');
    const scan = await responseJson<{ id: string }>(
      await api.post('scans', {
        multipart: {
          targetType: 'EXPENSE',
          file: {
            name: 'bien-lai-kiem-chung.png',
            mimeType: 'image/png',
            buffer: fs.readFileSync(iconPath),
          },
        },
        timeout: 100_000,
      }),
    );
    await responseJson(
      await api.patch(`scans/${scan.id}/draft`, {
        data: {
          extractedDataJson: JSON.stringify({
            _isRelevant: true,
            _confidence: 0.94,
            _warnings: [],
            amount: 85_000,
            currency: 'VND',
            merchant: 'Quán cà phê Nhà',
            spentAt: '2026-08-04',
            title: 'Cà phê buổi sáng',
            suggestedJarName: 'Ăn uống',
          }),
        },
      }),
    );
    await page.goto(`/spending/scan/${scan.id}?month=${month}`);
    await expect(page.getByLabel('Số tiền *')).toHaveValue('85000');
    await screenshot(page, '15-receipt-ai-review.png');

    const scanExpense = {
      jarId: foodJar!.id,
      amount: 85_000,
      currency: 'VND',
      title: 'Cà phê buổi sáng',
      merchant: 'Quán cà phê Nhà',
      spentAt: '2026-08-04T00:00:00Z',
      note: 'Xác nhận từ bản quét',
      receiptFileUrl: `/api/v1/scans/${scan.id}/file`,
    };
    const firstScanConfirmation = await responseJson<{ id: string }>(
      await api.post(`scans/${scan.id}/confirm/expense`, {
        data: scanExpense,
      }),
    );
    const secondScanConfirmation = await responseJson<{ id: string }>(
      await api.post(`scans/${scan.id}/confirm/expense`, {
        data: scanExpense,
      }),
    );
    expect(secondScanConfirmation.id).toBe(firstScanConfirmation.id);

    await page.goto('/assistant');
    await page
      .getByRole('button', { name: 'Tháng này tôi đã tiêu bao nhiêu?' })
      .click();
    await expect(page.getByText('Dựa trên dữ liệu đã lưu')).toBeVisible({
      timeout: 100_000,
    });
    await screenshot(page, '16-spending-assistant.png');

    await page.goto('/notifications');
    await expect(page.getByText(/Ăn uống đã chạm 80% hạn mức/)).toBeVisible();
    await expect(page.getByText(/Ăn uống đã vượt hạn mức/)).toBeVisible();
    await screenshot(page, '17-notifications.png');

    const previousMonthExpense = await createExpense(
      api,
      foodJar!.id,
      123_000,
      'Khoản chi tháng trước',
      '2026-07-20T05:00:00Z',
    );
    expect(previousMonthExpense.id).toBeTruthy();
    const julyOverview = await responseJson<{
      currencyTotals: Record<string, number>;
    }>(await api.get('spending/overview?month=2026-07'));
    expect(julyOverview.currencyTotals.VND).toBe(123_000);

    const usdJar = await responseJson<Jar>(
      await api.post('spending/jars', {
        data: {
          name: 'Du lịch USD',
          icon: 'airplane-outline',
          color: '#6D4C9A',
          currency: 'USD',
          defaultMonthlyLimit: 1_000,
          displayOrder: 6,
        },
      }),
    );
    await responseJson(
      await api.put(`spending/jars/${usdJar.id}/monthly-limit/${month}`, {
        data: { amount: 1_000 },
      }),
    );
    await responseJson(
      await api.post('spending/expenses', {
        data: {
          jarId: usdJar.id,
          amount: 25,
          currency: 'USD',
          title: 'Chi phí USD',
          merchant: null,
          spentAt: '2026-08-04T05:00:00Z',
          note: null,
          receiptFileUrl: null,
        },
      }),
    );
    const groupedOverview = await responseJson<{
      currencyTotals: Record<string, number>;
    }>(await api.get(`spending/overview?month=${month}`));
    expect(groupedOverview.currencyTotals.VND).toBeGreaterThan(0);
    expect(groupedOverview.currencyTotals.USD).toBe(25);

    const secondTokens = await register(publicApi, 'isolated');
    const secondApi = await authApi(secondTokens);
    const isolatedOverview = await responseJson<{
      currencyTotals: Record<string, number>;
      recentExpenses: unknown[];
      jars: Jar[];
    }>(await secondApi.get(`spending/overview?month=${month}`));
    expect(isolatedOverview.jars).toHaveLength(6);
    expect(isolatedOverview.recentExpenses).toHaveLength(0);
    expect(
      Object.values(isolatedOverview.currencyTotals).every(
        (amount) => amount === 0,
      ),
    ).toBe(true);

    await secondApi.dispose();
    await api.dispose();
    await publicApi.dispose();
  });
});
