# Báo cáo kiểm chứng — Hũ chi tiêu

Ngày kiểm chứng: 04/08/2026
Múi giờ: Asia/Ho_Chi_Minh

## Kết quả

- Backend: `.\gradlew.bat clean test` — **PASS**
- Migration MySQL 8: Flyway V5 — **PASS**, schema ở phiên bản 5
- Tích hợp thật: `HOUSEKEEPER_REAL_E2E=1 npx playwright test e2e/real-verification.spec.ts` — **1/1 PASS** trong 42,9 giây
- UI hồi quy: `npm run test:e2e` — **8/8 PASS**, 1 bài tích hợp thật được bỏ qua theo thiết kế
- TypeScript: `npm run typecheck` — **PASS**
- ESLint: `npm run lint` — **PASS**
- Expo Doctor: `npx expo-doctor` — **20/20 PASS**

## Phạm vi đã kiểm tra

- Tạo 6 hũ mặc định riêng cho từng tài khoản.
- Hạn mức theo tháng, trạng thái bình thường / gần mức / vượt mức.
- Đổi hạn mức riêng cho tháng và khôi phục snapshot mặc định.
- Thêm, sửa, xóa và loại/trả lại khoản chi khỏi thống kê.
- Phân tách dữ liệu giữa hai tài khoản.
- Phân tách tháng 07/2026 và 08/2026.
- Tổng tiền được nhóm riêng theo VND và USD, không quy đổi ngầm.
- Hóa đơn liên kết hũ; gửi thanh toán hai lần chỉ tạo một khoản chi.
- Quét biên lai, sửa bản nháp và xác nhận hai lần không tạo khoản chi trùng.
- Trợ lý trả lời tổng chi từ dữ liệu đã lưu.
- Cảnh báo 80% và 100% được lưu và hiển thị.
- Điều hướng chính đúng 5 mục; Kho gộp giấy tờ và tài sản.

Kịch bản thật đăng ký tài khoản mới và tạo dữ liệu qua API công khai, không
chèn trực tiếp vào database. Endpoint quét ảnh và AI provider cục bộ được gọi
thật; sau đó nội dung bản nháp được cập nhật qua API `/scans/{id}/draft` để
ảnh kiểm chứng giao diện có dữ liệu ổn định, tái lập được.

## Ảnh kiểm chứng

1. `01-auth-sign-in.png` — đăng nhập
2. `02-home-insight.png` — insight chi tiêu ở trang chủ
3. `03-calendar-bills.png` — hóa đơn trên lịch
4. `04-scan-existing-targets.png` — ba loại quét cũ vẫn giữ nguyên
5. `05-storage-documents.png` — Kho / giấy tờ
6. `06-storage-assets.png` — Kho / tài sản và bảo hành
7. `07-spending-onboarding.png` — tài khoản mới với 6 hũ mặc định
8. `08-spending-overview.png` — tổng quan tháng
9. `09-add-expense.png` — nhập khoản chi và lối vào quét biên lai
10. `10-jar-normal.png` — hũ ở mức bình thường
11. `11-jar-near-limit.png` — hũ gần hạn mức
12. `12-jar-over-limit.png` — hũ vượt hạn mức
13. `13-month-limit-override.png` — hạn mức riêng của tháng
14. `14-bill-linked-expense.png` — hóa đơn liên kết hũ
15. `15-receipt-ai-review.png` — kiểm tra bản nháp biên lai
16. `16-spending-assistant.png` — trợ lý trả lời chi tiêu
17. `17-notifications.png` — cảnh báo 80% và vượt mức
