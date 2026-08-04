# Thiết kế tính năng Hũ chi tiêu

Ngày: 2026-08-04
Trạng thái: Đã duyệt hướng sản phẩm, chờ duyệt đặc tả triển khai

## 1. Mục tiêu

Hũ chi tiêu giúp người dùng biết tiền đã được chi vào đâu và mức chi của từng
nhóm đang cách hạn mức tháng bao xa. “Hũ” là một nhóm thống kê có hạn mức, không
phải ví điện tử, không chứa tiền thật và không theo dõi thu nhập hay số dư.

Tính năng phải kết nối tự nhiên với hóa đơn, quét AI và trợ lý AI hiện có mà
không làm giao diện trở thành ứng dụng kế toán cá nhân dày đặc.

Thành công của phiên bản đầu nghĩa là người dùng có thể:

- Tạo các hũ chi tiêu riêng và đặt hạn mức mặc định theo tháng.
- Nhập một khoản chi hằng ngày trong vài thao tác.
- Tự ghi nhận khoản chi khi xác nhận một hóa đơn đã thanh toán.
- Xem đã chi, phần hạn mức còn lại và trạng thái của từng hũ.
- Đặt hạn mức riêng cho một tháng đặc biệt mà không đổi mức mặc định.
- Hỏi trợ lý AI về tổng chi, xu hướng và hũ sắp hoặc đã vượt hạn mức.

## 2. Ngoài phạm vi

Phiên bản này không:

- Theo dõi thu nhập, lương, số dư tài khoản hoặc dòng tiền ròng.
- Giữ tiền thật, chuyển tiền hoặc kết nối ngân hàng.
- Chuyển phần hạn mức chưa dùng sang tháng sau.
- Chia sẻ hũ giữa nhiều tài khoản hoặc phân quyền thành viên gia đình.
- Tự động đưa ra tư vấn đầu tư hay quyết định tài chính.
- Quy đổi tỷ giá giữa các loại tiền.

## 3. Kiến trúc thông tin

Thanh điều hướng dưới giữ tối đa năm mục:

1. Trang chủ
2. Lịch
3. Quét
4. Hũ
5. Kho

“Kho” gộp hai khu vực Giấy tờ và Tài sản bằng một bộ chuyển chế độ đơn giản.
Việc gộp này giải phóng vị trí cho Hũ mà không tạo tab thứ sáu.

Trợ lý AI vẫn được giữ nguyên. Người dùng mở trợ lý từ Trang chủ và từ lối tắt
trong màn Hũ; trợ lý không chiếm thêm một tab điều hướng.

## 4. Khái niệm miền

### 4.1. Hũ chi tiêu

Mỗi hũ thuộc duy nhất một tài khoản và có:

- Tên, icon, màu nhận diện.
- Loại tiền, mặc định là VND.
- Hạn mức tháng mặc định.
- Thứ tự hiển thị.
- Trạng thái đang dùng hoặc đã lưu trữ.

Ứng dụng tạo sẵn một bộ hũ gợi ý khi người dùng bắt đầu:

- Ăn uống
- Di chuyển
- Nhà cửa
- Hóa đơn định kỳ
- Mua sắm
- Khác

Người dùng có thể giữ, đổi tên, thay hạn mức, sắp xếp hoặc lưu trữ các hũ này.
Hũ có giao dịch chỉ được lưu trữ, không xóa cứng, nhằm bảo toàn lịch sử.

### 4.2. Hạn mức tháng

Hạn mức hiệu lực của một hũ trong một tháng được xác định như sau:

1. Lần đầu tháng được xem hoặc có giao dịch, hệ thống tạo một bản chụp hạn mức
   tháng từ hạn mức mặc định hiện tại.
2. Nếu người dùng điều chỉnh riêng tháng đó, bản chụp được đánh dấu là ngoại lệ
   và cập nhật bằng giá trị mới.

Kỳ mới bắt đầu theo tháng và múi giờ của tài khoản. Phần chưa dùng không được
cộng sang kỳ sau. Thay đổi hạn mức mặc định chỉ áp dụng cho những tháng chưa có
bản chụp. Nhờ vậy, hạn mức và tỷ lệ của các báo cáo tháng cũ không bị thay đổi
hồi tố.

### 4.3. Khoản chi

Mỗi khoản chi có:

- Số tiền lớn hơn 0 và loại tiền.
- Hũ nhận khoản chi.
- Nội dung ngắn.
- Thời điểm chi.
- Cửa hàng hoặc nhà cung cấp, ghi chú và ảnh biên lai tùy chọn.
- Nguồn tạo: nhập tay, thanh toán hóa đơn hoặc quét biên lai.
- Mã nguồn liên kết để chống ghi trùng.

Khoản chi chỉ được gắn vào hũ có cùng loại tiền. Ứng dụng không cộng các loại
tiền khác nhau thành một con số. Khi tài khoản có nhiều loại tiền, tổng quan
hiển thị từng loại tiền thành các dòng ngắn riêng biệt.

## 5. Luồng người dùng

### 5.1. Bắt đầu sử dụng Hũ

Lần đầu mở Hũ, người dùng thấy lời giải thích ngắn và bộ hũ gợi ý. Người dùng
có thể:

- Dùng nhanh bộ hũ mặc định và nhập hạn mức sau.
- Chỉnh tên và hạn mức trước khi bắt đầu.

Không bắt người dùng khai báo thu nhập hoặc hoàn thành một trình thiết lập dài.

### 5.2. Nhập nhanh khoản chi

Nút nổi “Thêm khoản chi” mở một sheet ngắn theo thứ tự:

1. Số tiền.
2. Hũ.
3. Nội dung.
4. Ngày chi, mặc định là hiện tại.

Cửa hàng, ghi chú và ảnh biên lai nằm trong phần “Thêm chi tiết”. Nút “Quét biên
lai” là hành động phụ trong sheet này, không thêm một loại quét thứ tư vào màn
Quét chính.

Sau khi lưu, ứng dụng cập nhật ngay tổng hũ và hiển thị phản hồi ngắn. Nếu giao
dịch đưa hũ qua ngưỡng 80% hoặc 100%, phản hồi nêu rõ số tiền còn lại hoặc số
tiền đã vượt.

### 5.3. Ghi nhận từ hóa đơn

Mỗi hóa đơn có thể gắn với một hũ. Khi người dùng đánh dấu đã thanh toán:

- Nếu hóa đơn đã có hũ, hệ thống tạo khoản chi từ lần thanh toán.
- Nếu chưa có hũ, sheet xác nhận yêu cầu chọn hũ trước khi hoàn tất.
- Một lần thanh toán chỉ tạo tối đa một khoản chi.
- Thử lại cùng một kỳ hóa đơn trả về khoản chi đã tồn tại, không nhân đôi.

Khoản chi liên kết với thanh toán hiển thị nguồn để người dùng hiểu vì sao nó
được tạo. Người dùng có thể đổi hũ hoặc loại khoản đó khỏi thống kê, nhưng không
xóa cứng khoản chi liên kết trong khi bản ghi thanh toán gốc vẫn tồn tại. Khoản
chi nhập tay vẫn có thể sửa hoặc xóa bình thường.

### 5.4. Quét biên lai

Từ luồng thêm khoản chi, người dùng có thể chụp hoặc chọn ảnh. AI đề xuất:

- Số tiền.
- Ngày chi.
- Cửa hàng.
- Nội dung.
- Hũ phù hợp.

AI chỉ tạo bản nháp. Người dùng phải xác nhận trước khi lưu. Ứng dụng cảnh báo
khi phát hiện ảnh, cửa hàng, số tiền và ngày giống một khoản chi đã tồn tại.

### 5.5. Điều chỉnh một tháng đặc biệt

Từ chi tiết hũ, người dùng chọn “Điều chỉnh tháng này”, nhập hạn mức mới và thấy
rõ rằng thay đổi chỉ áp dụng cho tháng đang xem. Người dùng có thể xóa ngoại lệ
để quay lại hạn mức mặc định.

## 6. Thiết kế màn hình

### 6.1. Tổng quan Hũ

Màn chính ưu tiên khả năng quét nhanh, không đặt nhiều biểu đồ:

- Bộ chuyển tháng ở đầu màn hình.
- Tổng đã chi và tổng hạn mức theo từng loại tiền.
- Danh sách hũ, mỗi hàng gồm tên, đã chi/hạn mức, thanh tiến độ và nhãn trạng
  thái.
- Tối đa năm khoản chi gần đây.
- Nút nổi “Thêm khoản chi”.

Ba trạng thái:

- Bình thường: dưới 80%.
- Gần hạn mức: từ 80% đến dưới 100%.
- Đã vượt: từ 100% trở lên.

Màu không phải tín hiệu duy nhất; mỗi trạng thái luôn có nhãn chữ. Không dùng
biểu đồ tròn cho mọi hũ, không lồng thẻ nhiều lớp và không đưa danh sách dài lên
trang đầu.

### 6.2. Chi tiết hũ

Màn chi tiết gồm:

- Tên hũ, tháng đang xem và trạng thái.
- Đã chi, hạn mức và phần còn lại hoặc phần vượt.
- Danh sách giao dịch phân trang theo ngày.
- Hành động sửa hạn mức tháng này.
- Hành động sửa cấu hình mặc định của hũ.

Phân tích nâng cao, nếu có, nằm sau nút “Xem xu hướng” và chỉ hiển thị so sánh
sáu tháng gần nhất. Nó không nằm trên màn tổng quan.

### 6.3. Quản lý hũ

Người dùng có thể tạo, đổi tên, đổi icon/màu, đổi hạn mức mặc định, sắp xếp và
lưu trữ hũ. Ứng dụng cảnh báo trước khi lưu trữ hũ đang được gắn với hóa đơn
định kỳ và yêu cầu chọn hũ thay thế.

### 6.4. Trang chủ

Trang chủ không sao chép toàn bộ màn Hũ. Nó chỉ hiển thị một insight chi tiêu
khi thực sự hữu ích, ví dụ:

- “Hũ Ăn uống đã dùng 82% hạn mức.”
- “Chi tiêu tháng này cao hơn tháng trước 12%.”
- “Bạn có ba khoản thanh toán trong bảy ngày tới.”

Mỗi insight có một hành động cụ thể dẫn tới Hũ hoặc Lịch.

## 7. Trợ lý AI

Trợ lý AI hiện có được giữ nguyên và mở rộng thêm dữ liệu chi tiêu. Các câu hỏi
được hỗ trợ:

- “Tháng này tôi đã tiêu bao nhiêu?”
- “Tôi tiêu nhiều nhất vào hũ nào?”
- “Tiền ăn uống tăng bao nhiêu so với tháng trước?”
- “Hũ nào sắp vượt hạn mức?”
- “Liệt kê tiền cà phê tuần này.”
- “Nếu giữ mức chi hiện tại, cuối tháng hũ ăn uống dự kiến ra sao?”

Quy tắc an toàn:

- Tổng và danh sách giao dịch được tính từ database trước.
- AI chỉ diễn giải kết quả đã tính, không tự bịa số.
- Không cộng các loại tiền khác nhau.
- Dự báo phải ghi rõ là ước tính dựa trên tốc độ chi hiện tại.
- Trợ lý không đưa ra tư vấn đầu tư hoặc khẳng định người dùng “nên” chi tiêu thế
  nào.

## 8. Dữ liệu và API

Backend bổ sung ba miền độc lập:

### SpendingJar

- `id`
- `userId`
- `name`
- `icon`
- `color`
- `currency`
- `defaultMonthlyLimit`
- `displayOrder`
- `archived`
- timestamps

### SpendingJarMonthlyLimit

- `id`
- `jarId`
- `yearMonth`
- `limitAmount`
- `source`, nhận `DEFAULT_SNAPSHOT` hoặc `USER_OVERRIDE`
- Ràng buộc duy nhất trên `(jarId, yearMonth)`.

### Expense

- `id`
- `userId`
- `jarId`
- `amount`
- `currency`
- `title`
- `merchant`
- `spentAt`
- `note`
- `receiptFileUrl`
- `sourceType`
- `sourceId`
- `excludedFromStats`
- timestamps
- Ràng buộc duy nhất trên `(userId, sourceType, sourceId)` khi có nguồn liên
  kết.

API cần hỗ trợ:

- Danh sách, tạo, sửa, sắp xếp và lưu trữ hũ.
- Đọc và cập nhật hạn mức riêng theo tháng.
- Danh sách khoản chi theo tháng/hũ với phân trang.
- Tạo, sửa và xóa khoản chi nhập tay.
- Tổng quan theo tháng.
- Tạo khoản chi idempotent từ thanh toán hóa đơn.
- Quét biên lai và trả bản nháp để xác nhận.

Mọi truy vấn đều lấy `userId` từ access token; client không được truyền hoặc
thay đổi chủ sở hữu.

## 9. Luồng dữ liệu và tính nhất quán

- Tổng chi được tính từ các khoản chi đã lưu và không bị loại khỏi thống kê,
  không lưu một bộ đếm tổng riêng.
- Tháng thống kê được xác định theo múi giờ tài khoản.
- Sửa, xóa hoặc loại giao dịch khỏi thống kê làm tổng quan thay đổi ngay sau khi
  cache được vô hiệu.
- Lưu trữ hũ không làm mất giao dịch lịch sử.
- Xóa tài khoản phải xóa hũ, ngoại lệ hạn mức, khoản chi và ảnh biên lai liên
  quan.
- Thanh toán hóa đơn và tạo khoản chi chạy trong cùng transaction backend hoặc
  có khóa idempotency bảo đảm không tạo dữ liệu nửa chừng.

## 10. Thông báo

Ứng dụng có thể tạo một thông báo trong ứng dụng khi hũ lần đầu vượt 80% và lần
đầu đạt 100% trong tháng. Mỗi ngưỡng chỉ thông báo một lần cho mỗi hũ trong mỗi
tháng để tránh làm phiền.

Thông báo hệ thống là tùy chọn và tuân theo thiết lập của người dùng. Chạm thông
báo mở đúng chi tiết hũ.

## 11. Trạng thái lỗi và tình huống biên

- Không có hũ: hiển thị bộ hũ gợi ý và hành động bắt đầu.
- Không có giao dịch: giải thích cách nhập hoặc quét khoản chi đầu tiên.
- Hũ bị lưu trữ: vẫn xem được lịch sử nhưng không thể nhận giao dịch mới.
- Giao dịch khác loại tiền với hũ: chặn lưu và yêu cầu chọn hũ phù hợp.
- Giao dịch trùng nguồn: trả bản ghi hiện có thay vì báo lỗi chung.
- Mất mạng khi nhập: giữ bản nháp trên thiết bị và cho phép thử lại; không tự tạo
  bản ghi mới nhiều lần.
- AI không đọc được biên lai: giữ ảnh và mở biểu mẫu nhập tay với thông báo rõ.
- Hạn mức bằng 0: được hiểu là chưa đặt hạn mức, không phải đã vượt ngay lập tức.

## 12. Khả năng tiếp cận và hiệu năng

- Vùng chạm tối thiểu 44×44.
- Nội dung hỗ trợ cỡ chữ hệ thống và trình đọc màn hình.
- Thanh tiến độ luôn đi cùng con số và nhãn trạng thái.
- Danh sách giao dịch dùng phân trang và danh sách ảo hóa.
- Tổng quan tháng được tổng hợp ở backend, không tải toàn bộ giao dịch để cộng ở
  client.
- Chuyển động chỉ dùng cho phản hồi trạng thái, tôn trọng giảm chuyển động.

## 13. Kiểm thử

Backend:

- Cách chọn hạn mức mặc định và ngoại lệ theo tháng.
- Không chuyển phần chưa dùng sang tháng sau.
- Quyền sở hữu dữ liệu giữa các tài khoản.
- Idempotency khi thanh toán hóa đơn được thử lại.
- Khoản chi liên kết với thanh toán không thể bị xóa cứng nhưng có thể đổi hũ
  hoặc loại khỏi thống kê.
- Bản chụp hạn mức giữ báo cáo tháng cũ ổn định khi hạn mức mặc định thay đổi.
- Tổng hợp đúng theo múi giờ và loại tiền.
- Lưu trữ hũ không làm mất lịch sử.
- Không cộng tiền khác loại.
- Trợ lý trả lời bằng số đã được tính từ database.

Frontend:

- Luồng nhập nhanh và validation.
- Trạng thái 80%/100% và nhãn tiếp cận.
- Đổi tháng và đặt ngoại lệ hạn mức.
- Empty, loading, offline, retry và duplicate warning.
- Điều hướng Trang chủ – Lịch – Quét – Hũ – Kho.
- Gộp Kho không làm mất đường dẫn tới Giấy tờ và Tài sản.
- Trợ lý AI cũ tiếp tục hoạt động sau khi mở rộng dữ liệu.

## 14. Thứ tự phát hành

1. Hũ, hạn mức tháng, khoản chi nhập tay và tổng quan.
2. Liên kết thanh toán hóa đơn với khoản chi.
3. Gộp Giấy tờ/Tài sản thành Kho và cập nhật điều hướng.
4. Quét biên lai tạo bản nháp khoản chi.
5. Mở rộng trợ lý AI và insight trên Trang chủ.
6. Thông báo ngưỡng và phân tích sáu tháng.

Mỗi bước phải chạy độc lập và không làm gián đoạn các chức năng giấy tờ, hóa
đơn, tài sản, quét và trợ lý hiện có.
