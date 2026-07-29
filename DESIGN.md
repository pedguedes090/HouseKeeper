---
name: House Keeper
description: Trợ lý bình tĩnh giúp gia đình chủ động trước mọi hạn quan trọng.
colors:
  primary: "#0058BE"
  primary-bright: "#2170E4"
  primary-soft: "#DCE9FF"
  primary-surface: "#EFF4FF"
  canvas: "#F8F9FF"
  surface: "#FFFFFF"
  ink: "#0B1C30"
  ink-muted: "#424754"
  border: "#C2C6D6"
  success: "#006C49"
  success-soft: "#D1FAE5"
  warning: "#825100"
  warning-soft: "#FEF3C7"
  danger: "#BA1A1A"
  danger-soft: "#FEE2E2"
typography:
  display:
    fontFamily: "Be Vietnam Pro"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Be Vietnam Pro"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.333
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Be Vietnam Pro"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Be Vietnam Pro"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Be Vietnam Pro"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.333
    letterSpacing: "0.02em"
rounded:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  page: "20px"
  xl: "24px"
  section: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "12px 24px"
    height: "48px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "12px 24px"
    height: "48px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "16px"
  input:
    backgroundColor: "{colors.primary-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
    height: "52px"
  chip-selected:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
---

# Design System: House Keeper

## Overview

**Creative North Star: "Điểm tựa bình tĩnh"**

House Keeper phải tạo cảm giác như một người trợ lý gia đình đáng tin: nhìn thấy
việc quan trọng, sắp xếp nó rõ ràng rồi đưa ra một hành động vừa đủ. Bố cục ưu
tiên khoảng thở, các khối thông tin dễ quét bằng mắt và một màu xanh chủ đạo
được dành cho điều đang hoạt động hoặc cần hành động.

Hệ thống giữ sát Figma HouseKeeper: nền xanh-trắng rất nhạt, thẻ 12px, Be Vietnam
Pro và điều hướng dưới năm mục. Màn hình mới phải trông như phần còn lại của cùng
một sản phẩm, không biến thành dashboard doanh nghiệp, ứng dụng giao dịch tài
chính hoặc màn trình diễn AI.

**Key Characteristics:**

- Một việc ưu tiên rõ ràng trên mỗi màn hình.
- Danh sách dễ quét, chi tiết tiết lộ dần.
- Trạng thái luôn có nhãn chữ bên cạnh màu.
- Chuyển động ngắn 150–220ms và chỉ diễn tả thay đổi trạng thái.
- Khoảng chạm tối thiểu 44×44 trên Android và iOS.

## Colors

Bảng màu dùng xanh dương làm tín hiệu tin cậy, xanh lá cho trạng thái an toàn,
vàng nâu cho sắp đến hạn và đỏ trầm chỉ cho việc thực sự nguy cấp.

### Primary

- **Xanh Chủ Động:** dùng cho CTA, tab đang chọn, mục điều hướng hiện tại và
  tiêu đề thương hiệu.
- **Xanh Sáng Tin Cậy:** dùng trong mảng insight lớn và điểm nhấn phụ.
- **Xanh Sương:** dùng cho nền trường nhập, tin nhắn AI và vùng dữ liệu liên quan.

### Secondary

- **Xanh An Toàn:** dùng cho đã thanh toán, bảo hành còn hiệu lực và xác nhận.
- **Hổ Phách Nhắc Việc:** dùng cho sắp đến hạn hoặc cần lưu ý nhưng chưa khẩn cấp.
- **Đỏ Hành Động:** chỉ dùng cho quá hạn, chưa thanh toán đã muộn và lỗi chặn tác vụ.

### Neutral

- **Canvas Lạnh:** nền mặc định, giữ độ tách lớp mà không tạo cảm giác giấy kem.
- **Mực Đậm:** chữ chính và tiêu đề.
- **Mực Dịu:** mô tả, metadata và nhãn phụ.
- **Đường Biên Dịu:** viền trường, thẻ và divider.

### Named Rules

**The One Blue Rule.** Xanh chủ đạo chỉ đánh dấu hành động chính hoặc trạng thái
đang chọn; không rải xanh lên mọi thành phần trang trí.

**The Urgency Earns Red Rule.** Đỏ chỉ xuất hiện khi dữ liệu chứng minh người dùng
đã hoặc sắp bỏ lỡ một hạn quan trọng.

## Typography

**Display Font:** Be Vietnam Pro  
**Body Font:** Be Vietnam Pro  

**Character:** Một sans duy nhất giúp giao diện tiếng Việt rõ ràng, thân thiện và
nhất quán giữa dữ liệu, biểu mẫu và hội thoại.

### Hierarchy

- **Display** (700, 32px, 40px): tổng tiền hoặc tiêu đề thương hiệu hiếm dùng.
- **Headline** (600, 24px, 32px): tiêu đề màn hình.
- **Title** (600, 20px, 28px): tiêu đề section và insight.
- **Body** (400, 16px, 24px): nội dung, trường nhập và hội thoại.
- **Supporting** (400, 14px, 20px): metadata và mô tả.
- **Label** (500, 12px, 16px, 0.02em): chip, nút nhỏ và nhãn trạng thái.

### Named Rules

**The Native Reading Rule.** Không thu nhỏ body dưới 14px và không dùng display
font trong nút, nhãn hoặc dữ liệu.

## Elevation

Hệ thống phẳng theo mặc định và tạo chiều sâu bằng lớp màu. Shadow chỉ xuất hiện
cho FAB, bottom sheet, thanh nhập AI hoặc thẻ ưu tiên đang nổi trên nội dung.

### Shadow Vocabulary

- **Low:** `0 1px 2px rgba(0,0,0,0.05)` cho navigation và bề mặt cố định.
- **Action:** `0 4px 8px rgba(0,88,190,0.18)` cho FAB và CTA nổi.
- **Sheet:** `0 -10px 20px rgba(0,0,0,0.10)` cho confirmation bottom sheet.

### Named Rules

**The Flat-By-Default Rule.** Thẻ thường dùng border hoặc nền tonal; không ghép
viền mảnh với shadow mờ lớn chỉ để trang trí.

## Components

### Buttons

- **Shape:** CTA chính dạng pill; nút nhỏ trong thẻ dùng góc 8px.
- **Primary:** xanh chủ đạo, chữ trắng, cao tối thiểu 48px.
- **Focus / Pressed:** focus ring rõ; pressed giảm sáng nhẹ trong 150ms.
- **Secondary:** nền trắng, viền xanh chủ đạo; không dùng shadow trang trí.
- **Disabled:** giảm độ tương phản nhưng vẫn đọc được, không chỉ thay opacity chữ.

### Chips

- **Style:** pill 32–40px; trạng thái chưa chọn dùng nền xanh sương.
- **State:** mục đã chọn dùng xanh chủ đạo và chữ trắng; luôn có nhãn.

### Cards / Containers

- **Corner Style:** 12px cho thẻ, 16px cho bottom sheet hoặc khối xác nhận.
- **Background:** trắng hoặc xanh sương, không lồng nhiều lớp thẻ.
- **Shadow Strategy:** phẳng theo mặc định; dùng border dịu 1px.
- **Internal Padding:** 16px, section quan trọng có thể dùng 20–24px.

### Inputs / Fields

- **Style:** nền xanh sương hoặc trắng, cao tối thiểu 52px, góc 12px.
- **Focus:** viền xanh chủ đạo 2px và label giữ nguyên vị trí.
- **Error / Disabled:** có icon, nhãn chữ và hướng xử lý; không dùng màu đơn độc.

### Navigation

Bottom navigation có năm mục: Trang chủ, Lịch, Quét, Giấy tờ/Gia hạn và Tài sản.
Mục hiện tại dùng xanh chủ đạo; mục còn lại dùng mực dịu. Khi có AI như tab riêng,
tab AI chỉ thay một mục phụ, không làm thay đổi cấu trúc điều hướng giữa màn hình.

### AI Confirmation Sheet

AI luôn trả bản nháp trong bottom sheet. Các trường quan trọng có thể chỉnh sửa,
confidence thấp phải có cảnh báo, và nút Lưu chỉ hoạt động sau khi dữ liệu bắt
buộc hợp lệ.

## Do's and Don'ts

### Do:

- **Do** giữ bố cục, hệ màu xanh và ngôn ngữ thị giác của Figma HouseKeeper.
- **Do** đặt việc cấp bách nhất trước và đi kèm một CTA cụ thể.
- **Do** dùng skeleton, empty state có hướng dẫn và lỗi có nút thử lại.
- **Do** giữ vùng chạm tối thiểu 44×44 và tương phản WCAG AA.
- **Do** để người dùng kiểm tra bản nháp AI trước khi lưu.

### Don't:

- **Don't** biến màn hình thành dashboard doanh nghiệp dày đặc số liệu hoặc bảng.
- **Don't** mô phỏng ứng dụng giao dịch tài chính bằng cảnh báo đỏ khắp nơi.
- **Don't** gamification hoặc dùng hoạt ảnh trang trí kéo dài.
- **Don't** dùng AI như lớp trang trí không gắn với dữ liệu người dùng.
- **Don't** thay đổi hoàn toàn bố cục, hệ màu xanh và ngôn ngữ thị giác của Figma.
- **Don't** dùng card góc trên 16px, gradient text, side-stripe hoặc glassmorphism
  làm phong cách mặc định.
