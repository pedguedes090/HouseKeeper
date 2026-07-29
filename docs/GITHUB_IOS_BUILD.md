# Build IPA chưa ký bằng GitHub Actions

Workflow `.github/workflows/ios-ipa.yml` build ứng dụng iPhone trên runner
`macos-26`, sau đó đóng gói app thành IPA chưa ký. Expo SDK 57 cần Xcode 26.4
trở lên và ứng dụng yêu cầu iOS 16.4 trở lên, nên không dùng runner macOS cũ
hơn.

Workflow không cần tài khoản Expo, Apple ID, certificate hoặc provisioning
profile. Nó chỉ chạy thủ công và không chạy khi push hoặc mở pull request.

## Chạy build

1. Đưa mã nguồn lên repository GitHub.
2. Bảo đảm workflow nằm trên nhánh mặc định.
3. Mở tab `Actions`.
4. Chọn `Build unsigned iOS IPA`.
5. Chọn `Run workflow`.
6. Khi job hoàn tất, tải artifact
   `HouseKeeper-iOS-unsigned-<run number>`.

Artifact chứa:

- `HouseKeeper-<version>-<build>-unsigned.ipa`.
- File `.sha256` để kiểm tra tính toàn vẹn.

GitHub tự xóa artifact sau 14 ngày.

## Workflow kiểm tra những gì

Trước khi đóng gói, workflow xác minh:

- TypeScript typecheck, ESLint và Expo Doctor đều đạt.
- Bundle ID là `com.khoinguyen.housekeeper`.
- Phiên bản và build number đúng.
- Executable chứa kiến trúc `arm64` dành cho iPhone.
- Bundle chứa backend
  `https://house-keeper.truyenlaunch.dev/api/v1`.
- App chưa có chữ ký và IPA có đúng cấu trúc `Payload/*.app`.

## Lưu ý về cài đặt

IPA do workflow tạo ra chưa thể cài trực tiếp lên iPhone nguyên bản. Bạn phải ký
lại IPA bằng certificate và provisioning profile phù hợp với thiết bị hoặc kênh
phân phối của mình.

Certificate tự tạo không được iOS nguyên bản tin cậy. Nếu mục tiêu là cài trực
tiếp không qua môi trường tùy biến, chữ ký cuối vẫn phải dùng tài khoản và
provisioning của Apple.
