# Spending Jars Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add monthly spending jars, daily expenses, bill-linked expenses, receipt scanning, spending-aware AI answers, a five-item navigation structure, and a screenshot-backed verification report without removing any existing House Keeper capability.

**Architecture:** Add a bounded `spending` domain to the Spring Boot backend with jar, monthly-limit snapshot, and expense aggregates. Expose authenticated REST endpoints consumed by focused Expo Router screens; existing bill payments and scan jobs integrate through idempotent source links. Keep the current grounded assistant architecture and add spending as another deterministic data source before AI rewrites.

**Tech Stack:** Java 21, Spring Boot 4.1, Spring Data JPA, Flyway, MySQL/H2, React Native 0.86, Expo SDK 57, Expo Router, TanStack Query, TypeScript, Playwright web verification.

## Global Constraints

- A spending jar is a monthly statistical category, not stored money.
- Do not add income, balances, transfers, bank connections, or exchange-rate conversion.
- Every jar and expense belongs to exactly one authenticated user.
- Monthly unused budget never rolls forward.
- Monthly limit history must not change when the default limit changes later.
- Default currency is VND; never add different currencies into one total.
- Preserve the existing AI assistant and all existing documents, bills, assets, reminders, scans, and maintenance behavior.
- Keep bottom navigation at exactly five visible items: Home, Calendar, Scan, Spending, Storage.
- AI may suggest extracted or classified values, but the user confirms before saving.
- All interactive targets remain at least 44×44 and all budget states include text, not color alone.
- Frontend completion requires `typecheck`, `lint`, Expo Doctor, backend tests, Playwright flows, and PNG evidence under `docs/verification/2026-08-04-spending-jars/`.
- The backend repository has no baseline commit and contains pre-existing staged/untracked user work; modify and test exact files but do not create a partial backend commit.

---

## Planned File Structure

Backend files created:

- `House-Keeper-be/src/main/resources/db/migration/V5__add_spending_jars_and_expenses.sql`: schema, indexes, ownership foreign keys, and idempotency constraint.
- `House-Keeper-be/src/main/java/com/example/housekeeperbe/spending/SpendingJar.java`: jar aggregate root.
- `House-Keeper-be/src/main/java/com/example/housekeeperbe/spending/SpendingJarMonthlyLimit.java`: immutable month snapshot with optional override.
- `House-Keeper-be/src/main/java/com/example/housekeeperbe/spending/Expense.java`: manual/bill/scan expense record.
- `House-Keeper-be/src/main/java/com/example/housekeeperbe/spending/ExpenseSourceType.java`: `MANUAL`, `BILL_PAYMENT`, `SCAN`.
- `House-Keeper-be/src/main/java/com/example/housekeeperbe/spending/MonthlyLimitSource.java`: `DEFAULT_SNAPSHOT`, `USER_OVERRIDE`.
- `House-Keeper-be/src/main/java/com/example/housekeeperbe/spending/SpendingJarRepository.java`: owned jar queries.
- `House-Keeper-be/src/main/java/com/example/housekeeperbe/spending/SpendingJarMonthlyLimitRepository.java`: monthly snapshot queries.
- `House-Keeper-be/src/main/java/com/example/housekeeperbe/spending/ExpenseRepository.java`: owned, paginated and aggregate expense queries.
- `House-Keeper-be/src/main/java/com/example/housekeeperbe/spending/SpendingThresholdEvent.java`: one delivery record per jar/month/threshold.
- `House-Keeper-be/src/main/java/com/example/housekeeperbe/spending/SpendingThresholdEventRepository.java`: threshold deduplication queries.
- `House-Keeper-be/src/main/java/com/example/housekeeperbe/spending/SpendingDtos.java`: validated requests and API responses.
- `House-Keeper-be/src/main/java/com/example/housekeeperbe/spending/SpendingService.java`: ownership, snapshot, totals and idempotency rules.
- `House-Keeper-be/src/main/java/com/example/housekeeperbe/spending/SpendingController.java`: `/api/v1/spending` endpoints.
- `House-Keeper-be/src/test/java/com/example/housekeeperbe/spending/SpendingServiceIntegrationTests.java`: domain and ownership tests.
- `House-Keeper-be/src/test/java/com/example/housekeeperbe/spending/SpendingControllerTests.java`: authenticated request/validation tests.

Backend files modified:

- `House-Keeper-be/src/main/java/com/example/housekeeperbe/bill/Bill.java`
- `House-Keeper-be/src/main/java/com/example/housekeeperbe/bill/BillDtos.java`
- `House-Keeper-be/src/main/java/com/example/housekeeperbe/bill/BillService.java`
- `House-Keeper-be/src/main/java/com/example/housekeeperbe/scan/ScanTargetType.java`
- `House-Keeper-be/src/main/java/com/example/housekeeperbe/scan/ScanService.java`
- `House-Keeper-be/src/main/java/com/example/housekeeperbe/scan/ScanController.java`
- `House-Keeper-be/src/main/java/com/example/housekeeperbe/scan/AiExtractionProvider.java`
- `House-Keeper-be/src/main/java/com/example/housekeeperbe/assistant/AssistantQuery.java`
- `House-Keeper-be/src/main/java/com/example/housekeeperbe/assistant/AssistantQueryInterpreter.java`
- `House-Keeper-be/src/main/java/com/example/housekeeperbe/assistant/AssistantService.java`
- Corresponding existing backend test files.

Frontend files created:

- `House-Keeper-fe/src/app/(tabs)/spending.tsx`: monthly overview.
- `House-Keeper-fe/src/app/(tabs)/storage.tsx`: combined Documents/Assets surface.
- `House-Keeper-fe/src/app/spending/jar/[id].tsx`: jar detail and monthly override.
- `House-Keeper-fe/src/app/spending/jars.tsx`: create, edit, reorder and archive jars.
- `House-Keeper-fe/src/app/spending/expense/form.tsx`: quick manual expense entry.
- `House-Keeper-fe/src/app/spending/scan/[id].tsx`: receipt draft confirmation.
- `House-Keeper-fe/src/components/domain/spending-jar-row.tsx`: compact progress row.
- `House-Keeper-fe/src/components/domain/expense-row.tsx`: expense list item.
- `House-Keeper-fe/src/lib/spending-format.ts`: month and budget-state helpers.
- `House-Keeper-fe/e2e/spending-jars.spec.ts`: browser-level verification.
- `House-Keeper-fe/playwright.config.ts`: local Expo web test configuration.
- `House-Keeper-fe/docs/verification/2026-08-04-spending-jars/TEST_REPORT.md`: executed checks and evidence index.

Frontend files modified:

- `House-Keeper-fe/src/lib/types.ts`
- `House-Keeper-fe/src/lib/housekeeper-api.ts`
- `House-Keeper-fe/src/lib/format.ts`
- `House-Keeper-fe/src/app/_layout.tsx`
- `House-Keeper-fe/src/app/(tabs)/_layout.tsx`
- `House-Keeper-fe/src/app/(tabs)/documents.tsx`
- `House-Keeper-fe/src/app/(tabs)/inventory.tsx`
- `House-Keeper-fe/src/app/bills/form.tsx`
- `House-Keeper-fe/src/app/bills/[id].tsx`
- `House-Keeper-fe/src/app/(tabs)/index.tsx`
- `House-Keeper-fe/src/app/assistant.tsx`
- `House-Keeper-fe/package.json`
- `House-Keeper-fe/package-lock.json`

---

### Task 1: Spending domain schema and entities

**Files:**

- Create the V5 migration, four entities, two enums and four repositories listed above.
- Test: `House-Keeper-be/src/test/java/com/example/housekeeperbe/spending/SpendingServiceIntegrationTests.java`

**Interfaces:**

- Produces `SpendingService.ensureDefaultJars(String userId)`.
- Produces `SpendingDtos.MonthOverview overview(String userId, YearMonth month)`.
- Produces `SpendingDtos.ExpenseResponse createExpense(String userId, SpendingDtos.ExpenseRequest request)`.
- Produces `SpendingDtos.ExpenseResponse recordBillPayment(String userId, Bill bill, BillPayment payment)`.
- Produces `SpendingDtos.ExpenseResponse createScannedExpense(String userId, String scanId, SpendingDtos.ExpenseRequest request)`.

- [ ] **Step 1: Write failing persistence tests**

Add tests that save two users, create jars for the first user, and assert:

```java
assertThat(spendingService.listJars(owner.getId())).hasSize(6);
assertThat(spendingService.listJars(other.getId())).isEmpty();
assertThat(spendingService.createExpense(owner.getId(), request).amount())
        .isEqualByComparingTo("85000");
```

Add a snapshot test:

```java
var august = spendingService.overview(owner.getId(), YearMonth.of(2026, 8));
spendingService.updateJar(owner.getId(), jarId, updateWithLimit("5000000"));
var augustAgain = spendingService.overview(owner.getId(), YearMonth.of(2026, 8));
var september = spendingService.overview(owner.getId(), YearMonth.of(2026, 9));
assertThat(augustAgain.jars().getFirst().limitAmount())
        .isEqualByComparingTo(august.jars().getFirst().limitAmount());
assertThat(september.jars().getFirst().limitAmount())
        .isEqualByComparingTo("5000000");
```

- [ ] **Step 2: Run the new test and confirm the missing-domain failure**

Run:

```powershell
.\gradlew.bat test --tests "*SpendingServiceIntegrationTests"
```

Expected: compilation fails because the `spending` package does not exist.

- [ ] **Step 3: Add the V5 migration**

Create `spending_jars`, `spending_jar_monthly_limits`, `expenses`, and
`spending_threshold_events`. Use `DECIMAL(15,2)`, `CHAR(7)` for `year_month`,
`VARCHAR(3)` for currency, cascade ownership foreign keys, and:

```sql
CONSTRAINT uk_spending_limit_jar_month UNIQUE (jar_id, year_month);
CREATE UNIQUE INDEX uk_expense_source
    ON expenses (user_id, source_type, source_id);
```

Add nullable `spending_jar_id` to `bills` with an owned jar foreign key.

- [ ] **Step 4: Implement entities and repositories**

Use constructors that take domain values, keep setters private, and expose
methods:

```java
void update(SpendingDtos.JarRequest request)
void archive()
void setMonthlyLimit(BigDecimal amount, MonthlyLimitSource source)
void updateManual(SpendingDtos.ExpenseRequest request, SpendingJar jar)
void excludeFromStats(boolean excluded)
```

Repository queries must always include user ownership and must aggregate by
month bounds rather than loading every expense into memory.

- [ ] **Step 5: Implement minimal service rules**

Seed these default names once per user:

```java
List.of("Ăn uống", "Di chuyển", "Nhà cửa", "Hóa đơn định kỳ", "Mua sắm", "Khác")
```

Resolve month bounds in the user time zone, materialize limit snapshots, reject
currency mismatch, and treat a zero limit as “not configured”.

- [ ] **Step 6: Run spending and full backend tests**

Run:

```powershell
.\gradlew.bat test --tests "*SpendingServiceIntegrationTests"
.\gradlew.bat test
```

Expected: all tests pass.

- [ ] **Step 7: Review backend workspace without committing**

Run:

```powershell
git status --short
git diff --check
```

Do not commit in the backend repository because it has no baseline commit.

---

### Task 2: Authenticated spending REST API

**Files:**

- Create `SpendingDtos.java`, `SpendingController.java`.
- Create `SpendingControllerTests.java`.
- Modify `GlobalExceptionHandler.java` only if a new validation error needs a stable API code.

**Interfaces:**

- Consumes the Task 1 service.
- Produces:

```text
GET    /api/v1/spending/overview?month=2026-08
GET    /api/v1/spending/jars
POST   /api/v1/spending/jars
PUT    /api/v1/spending/jars/{id}
PATCH  /api/v1/spending/jars/{id}/archive
PUT    /api/v1/spending/jars/{id}/monthly-limit/{yearMonth}
DELETE /api/v1/spending/jars/{id}/monthly-limit/{yearMonth}
GET    /api/v1/spending/expenses?month=2026-08&jarId=&page=0&size=30
POST   /api/v1/spending/expenses
PUT    /api/v1/spending/expenses/{id}
DELETE /api/v1/spending/expenses/{id}
PATCH  /api/v1/spending/expenses/{id}/excluded
```

- [ ] **Step 1: Write failing controller tests**

Cover unauthenticated `401`, invalid `month`, negative amount, another user’s
jar, archive-with-linked-bill conflict, and paginated response metadata.

- [ ] **Step 2: Run controller tests to confirm failure**

```powershell
.\gradlew.bat test --tests "*SpendingControllerTests"
```

- [ ] **Step 3: Define exact DTO validation**

Use `@Positive` for expenses, `@PositiveOrZero` for limits, ISO three-letter
currency, title max 190, merchant max 190, note max 2000, and `PageResponse<T>`
with `items`, `page`, `size`, `totalItems`, `hasMore`.

- [ ] **Step 4: Implement controller ownership routing**

Every method obtains the user only through:

```java
String userId = CurrentUser.id(jwt);
```

Never accept `userId` in a request body or query parameter.

- [ ] **Step 5: Run controller and full backend tests**

```powershell
.\gradlew.bat test --tests "*SpendingControllerTests"
.\gradlew.bat test
```

Expected: all pass.

---

### Task 3: Bill payment integration and idempotency

**Files:**

- Modify `Bill.java`, `BillDtos.java`, `BillService.java`.
- Modify `CoreDomainIntegrationTests.java`.
- Test in `SpendingServiceIntegrationTests.java`.

**Interfaces:**

- Adds `String spendingJarId` to bill upsert and response DTOs.
- Adds `String expenseId` to payment response.
- Consumes `SpendingService.recordBillPayment`.

- [ ] **Step 1: Write a failing retry test**

Create a monthly bill linked to a VND jar, pay the same period twice, then:

```java
assertThat(first.expenseId()).isEqualTo(retry.expenseId());
assertThat(expenseRepository.countByUserId(owner.getId())).isEqualTo(1);
```

Also assert a USD bill cannot link to a VND jar and a bill without a jar returns
a validation conflict before payment.

- [ ] **Step 2: Run the focused failure**

```powershell
.\gradlew.bat test --tests "*CoreDomainIntegrationTests.retrying*"
```

- [ ] **Step 3: Extend the bill model and DTO**

Store the optional jar relation on the bill. Validate ownership and currency
when creating or updating the bill. When paying, call:

```java
SpendingDtos.ExpenseResponse expense =
        spendingService.recordBillPayment(userId, bill, payment);
return BillDtos.PaymentResponse.from(payment, expense.id());
```

For an existing payment retry, ensure the linked expense exists and return the
same IDs.

- [ ] **Step 4: Run all bill, spending and backend tests**

```powershell
.\gradlew.bat test --tests "*CoreDomainIntegrationTests"
.\gradlew.bat test --tests "*SpendingServiceIntegrationTests"
.\gradlew.bat test
```

---

### Task 4: Frontend contracts, compatibility and query layer

**Files:**

- Modify `package.json`, `package-lock.json`, `src/lib/types.ts`, `src/lib/housekeeper-api.ts`, `src/lib/format.ts`.
- Create `src/lib/spending-format.ts`.

**Interfaces:**

- Produces `SpendingJarRecord`, `SpendingOverview`, `ExpenseRecord`,
  `ExpenseInput`, `PagedResponse<T>`.
- Produces `queryKeys.spendingOverview(month)`, `queryKeys.spendingJars`,
  `queryKeys.spendingExpenses(month, jarId)`.
- Produces API methods matching Task 2.

- [ ] **Step 1: Align Expo package versions**

Run:

```powershell
npx expo install --fix
```

Then remove confirmed unused template dependencies:

```powershell
npm uninstall @expo/ui @react-native-async-storage/async-storage expo-camera expo-device expo-glass-effect expo-symbols expo-web-browser
```

Remove the unused `expo-camera` config plugin and Face ID usage string because
no biometric feature is implemented in this scope.

- [ ] **Step 2: Add Playwright development dependency and scripts**

Add scripts:

```json
"test:e2e": "playwright test",
"test:e2e:update": "playwright test --update-snapshots"
```

Install `@playwright/test` as a dev dependency.

- [ ] **Step 3: Add TypeScript contracts**

Use:

```ts
export type BudgetState = 'UNSET' | 'NORMAL' | 'NEAR_LIMIT' | 'OVER_LIMIT';
export type ExpenseSourceType = 'MANUAL' | 'BILL_PAYMENT' | 'SCAN';
```

`SpendingOverview` contains `month`, `currencyTotals`, `jars`, and
`recentExpenses`; jar summaries include `spentAmount`, `limitAmount`,
`remainingAmount`, `usagePercent`, and `state`.

- [ ] **Step 4: Add API methods and format helpers**

Implement exact routes from Task 2 and helpers:

```ts
budgetState(spent: number, limit: number): BudgetState
formatMonth('2026-08'): string
shiftMonth('2026-08', delta: number): string
```

- [ ] **Step 5: Verify static frontend checks**

```powershell
npm run typecheck
npm run lint
npx expo-doctor
```

Expected: all checks pass.

- [ ] **Step 6: Commit the compatibility and contracts slice**

```powershell
git add package.json package-lock.json app.json src/lib
git commit -m "feat: add spending contracts and compatible Expo dependencies"
```

---

### Task 5: Spending overview, jar management and manual expense UI

**Files:**

- Create all spending screens and spending domain components except `spending/scan/[id].tsx`.
- Modify root and tab layouts.

**Interfaces:**

- Consumes Task 4 contracts and API.
- Produces routes `/spending/jar/[id]`, `/spending/jars`,
  `/spending/expense/form`.

- [ ] **Step 1: Add failing Playwright route smoke tests**

Create tests that sign in, open `/spending`, and expect:

```ts
await expect(page.getByRole('heading', { name: 'Hũ chi tiêu' })).toBeVisible();
await expect(page.getByText('Tháng 8, 2026')).toBeVisible();
await expect(page.getByRole('button', { name: 'Thêm khoản chi' })).toBeVisible();
```

- [ ] **Step 2: Build the compact overview**

Use one summary surface, row-based jars, five recent expenses, and a single
floating action. Do not add pie charts. Include month previous/next controls
with 44×44 targets and screen-reader labels.

- [ ] **Step 3: Build quick expense entry**

Required fields are amount, jar, title, spent date. Hide merchant, note, and
receipt under “Thêm chi tiết”. Preserve form values after API failure.

- [ ] **Step 4: Build jar detail and management**

Support create, edit, monthly override, remove override, reorder, archive, and
paginated expense loading. Show text states “Bình thường”, “Gần hạn mức”, “Đã
vượt”, and “Chưa đặt hạn mức”.

- [ ] **Step 5: Wire cache invalidation**

After mutations invalidate the exact month overview, jar list, jar detail,
expense list, dashboard, and assistant-derived UI keys.

- [ ] **Step 6: Run typecheck, lint and route smoke tests**

```powershell
npm run typecheck
npm run lint
npm run test:e2e -- --grep "spending overview"
```

- [ ] **Step 7: Commit the core spending UI**

```powershell
git add src/app src/components/domain src/lib
git commit -m "feat: add monthly spending jars and expense entry"
```

---

### Task 6: Five-item navigation and Storage surface

**Files:**

- Create `(tabs)/storage.tsx`.
- Modify `(tabs)/_layout.tsx`, `(tabs)/documents.tsx`, `(tabs)/inventory.tsx`.
- Modify Home quick actions so “Thêm giấy tờ” still opens the document form and
  Storage-related “view all” links open the correct Storage segment.

**Interfaces:**

- Produces visible tabs: `index`, `calendar`, `scan`, `spending`, `storage`.
- Retains legacy routes for deep links but hides them from the tab bar.

- [ ] **Step 1: Add a failing navigation test**

Assert exactly these five labels:

```ts
for (const label of ['Trang chủ', 'Lịch', 'Quét', 'Hũ', 'Kho']) {
  await expect(page.getByRole('tab', { name: label })).toBeVisible();
}
await expect(page.getByRole('tab', { name: 'Giấy tờ' })).toHaveCount(0);
await expect(page.getByRole('tab', { name: 'Tài sản' })).toHaveCount(0);
```

- [ ] **Step 2: Extract reusable document and asset content**

Export `DocumentsContent` and `InventoryContent` while preserving their default
route components. The Storage screen uses a two-option segmented choice and
renders only one content tree at a time.

- [ ] **Step 3: Update tab layout**

Register spending and storage, and set `href: null` on legacy documents and
inventory tab routes. Keep all detail routes unchanged.

- [ ] **Step 4: Run navigation regression**

Verify Home, Calendar, Scan, Storage/Documents, Storage/Assets, document detail,
and asset detail.

- [ ] **Step 5: Commit navigation**

```powershell
git add src/app
git commit -m "feat: add spending and combined storage navigation"
```

---

### Task 7: Receipt scan to expense draft

**Files:**

- Modify backend scan files listed above.
- Create frontend `spending/scan/[id].tsx`.
- Modify expense form and frontend scan types/API.
- Add backend and Playwright tests.

**Interfaces:**

- Adds `EXPENSE` to `ScanTargetType`.
- Adds `POST /api/v1/scans/{id}/confirm/expense`.
- Uses source type `SCAN` and scan ID for idempotency.

- [ ] **Step 1: Write failing extraction and confirmation tests**

Assert an expense receipt draft recognizes `amount`, `currency`, `merchant`,
`spentAt`, `title`, and suggested `jarId`; confirming twice returns the same
expense ID.

- [ ] **Step 2: Add backend expense scan target**

Extend the prompt with a strict expense JSON schema. Confirmation calls
`SpendingService.createScannedExpense` and marks the scan confirmed.

- [ ] **Step 3: Add the secondary receipt action**

Place “Quét biên lai” only inside expense entry. Reuse image picking/upload
helpers, then route to `/spending/scan/{id}`.

- [ ] **Step 4: Build confirmation screen**

Show protected receipt image, confidence/warnings, editable fields, jar
suggestion, duplicate warning, and explicit confirmation.

- [ ] **Step 5: Run scan and regression tests**

```powershell
Set-Location ..\House-Keeper-be
.\gradlew.bat test --tests "*Scan*" --tests "*Spending*"
Set-Location ..\House-Keeper-fe
npm run typecheck
npm run lint
npm run test:e2e -- --grep "receipt"
```

- [ ] **Step 6: Commit frontend receipt flow**

```powershell
git add src/app/spending src/lib
git commit -m "feat: add AI receipt expense review"
```

---

### Task 8: Spending-aware assistant and home insight

**Files:**

- Modify backend assistant query, interpreter and service files.
- Modify assistant backend tests.
- Modify frontend assistant types, routing, suggestions and Home screen.

**Interfaces:**

- Adds assistant item types `EXPENSE` and `SPENDING_JAR`.
- Adds deterministic intents `EXPENSE_TOTAL`, `EXPENSE_LIST`,
  `SPENDING_JAR_STATUS`, `SPENDING_TREND`.

- [ ] **Step 1: Write failing Vietnamese intent tests**

Cover:

```text
Tháng này tôi đã tiêu bao nhiêu?
Hũ nào sắp vượt hạn mức?
Tiền ăn uống tăng bao nhiêu so với tháng trước?
Liệt kê tiền cà phê tuần này.
```

Assert totals are grouped by currency and no cross-currency sum is emitted.

- [ ] **Step 2: Extend interpreter focus**

Classify spending phrases before generic bill phrases so “đã tiêu” does not
route to unpaid bills. Preserve all existing focus values and tests.

- [ ] **Step 3: Add spending answer composition**

Delegate spending calculations to `SpendingService`; keep `AssistantService`
responsible only for routing and answer assembly. Forecast text must contain
“ước tính” and use the elapsed-day run rate.

- [ ] **Step 4: Update frontend assistant**

Add spending suggestions, icons and deep links. Keep the existing conversation,
history, retry, grounded badge and AI enhancer behavior.

- [ ] **Step 5: Add one actionable Home insight**

Show at most one spending insight: first an over-limit jar, otherwise a
near-limit jar, otherwise a significant month-over-month increase. Do not copy
the full spending overview.

- [ ] **Step 6: Run assistant and frontend regression**

```powershell
Set-Location ..\House-Keeper-be
.\gradlew.bat test --tests "*Assistant*"
.\gradlew.bat test
Set-Location ..\House-Keeper-fe
npm run typecheck
npm run lint
```

- [ ] **Step 7: Commit frontend assistant and insight changes**

```powershell
git add src/app/assistant.tsx "src/app/(tabs)/index.tsx" src/lib
git commit -m "feat: add grounded spending insights to assistant"
```

---

### Task 9: Threshold notifications, edge cases and production hardening

**Files:**

- Modify backend `SpendingService.java`, `SpendingDtos.java`, and
  `SpendingController.java`.
- Use `SpendingThresholdEvent.java` and
  `SpendingThresholdEventRepository.java` created in Task 1.
- Modify `src/lib/notifications.ts`, spending screens and auth cache cleanup.
- Add tests.

**Interfaces:**

- Emits threshold event once at 80% and once at 100% per jar/month.
- Notification data contains `{ type: 'SPENDING_JAR', jarId, month }`.

- [ ] **Step 1: Write threshold tests**

Create expenses crossing 79→80→85→100→110 percent and assert exactly two
threshold events. Repeat in a new month and assert two new events.

- [ ] **Step 2: Implement deduplicated threshold state**

Persist threshold delivery state by user, jar, month and threshold. Notification
permission remains optional; the in-app state still records the event.

- [ ] **Step 3: Wire notification deep links**

Opening a spending notification routes to `/spending/jar/{jarId}?month=YYYY-MM`.

- [ ] **Step 4: Harden loading, offline and ownership errors**

Keep failed expense form data, show duplicate source as an existing record, and
clear spending query/image caches at logout.

- [ ] **Step 5: Run full automated checks**

```powershell
Set-Location ..\House-Keeper-be
.\gradlew.bat clean test
Set-Location ..\House-Keeper-fe
npm run typecheck
npm run lint
npx expo-doctor
```

---

### Task 10: End-to-end verification and screenshot evidence

**Files:**

- Create/update Playwright config and E2E tests.
- Create PNGs and `TEST_REPORT.md` under
  `docs/verification/2026-08-04-spending-jars/`.

**Interfaces:**

- Produces a reproducible evidence folder and final pass/fail report.

- [ ] **Step 1: Start real local services**

Run the Spring backend against the configured local database and Expo web with
`EXPO_PUBLIC_API_URL=http://localhost:8080/api/v1`. Record exact commands and
ports in the report.

- [ ] **Step 2: Create a fresh verification account**

Use a unique email for the run. Seed data only through public UI/API flows:
create document, bill, asset, jars, manual expenses, bill payment, and receipt
scan. Do not inject database rows directly for screenshots.

- [ ] **Step 3: Execute core regression flows**

Verify:

1. Sign-up, sign-in, logout and token refresh.
2. Home dashboard and actionable insight.
3. Calendar, bill create/edit/pay/delete.
4. Scan document/bill/asset and confirmation.
5. Storage switch, document CRUD and asset CRUD.
6. Maintenance display remains available.
7. Reminder list and notification synchronization.
8. Existing AI questions.

- [ ] **Step 4: Execute every spending flow**

Verify:

1. Default jar onboarding.
2. Create/edit/archive jar.
3. Default monthly limit.
4. One-month limit override and removal.
5. Manual expense create/edit/delete.
6. Normal, near-limit and over-limit states.
7. Month navigation with stable historical limits.
8. Bill payment creates exactly one expense on retry.
9. Receipt scan draft and confirmation.
10. Duplicate receipt warning.
11. Currency mismatch rejection.
12. Spending assistant totals, list, trend and forecast.
13. Notification threshold deduplication.

- [ ] **Step 5: Capture named screenshots**

Save at minimum:

```text
01-auth-sign-in.png
02-home-insight.png
03-calendar-bills.png
04-scan-existing-targets.png
05-storage-documents.png
06-storage-assets.png
07-spending-onboarding.png
08-spending-overview.png
09-add-expense.png
10-jar-normal.png
11-jar-near-limit.png
12-jar-over-limit.png
13-month-limit-override.png
14-bill-linked-expense.png
15-receipt-ai-review.png
16-spending-assistant.png
17-notifications.png
```

Use a consistent mobile viewport and capture after network/loading states settle.

- [ ] **Step 6: Write verification report**

For every flow, record `PASS` or `FAIL`, test data, screenshot filename, and any
known limitation. Include exact totals from Gradle, typecheck, lint, Expo Doctor,
and Playwright.

- [ ] **Step 7: Run final clean verification**

```powershell
Set-Location ..\House-Keeper-be
.\gradlew.bat clean test
Set-Location ..\House-Keeper-fe
npm ci
npm run typecheck
npm run lint
npx expo-doctor
npm run test:e2e
git diff --check
```

Expected: every command exits 0 and every required screenshot exists.

- [ ] **Step 8: Commit frontend evidence**

```powershell
git add e2e playwright.config.ts docs/verification package.json package-lock.json
git commit -m "test: verify spending jars end to end"
```
