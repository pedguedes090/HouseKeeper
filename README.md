# House Keeper Mobile

Ứng dụng React Native dùng Expo SDK 57 cho Android và iOS. Giao diện bám theo
file Figma House Keeper, dùng tiếng Việt và kết nối trực tiếp Spring Boot API.

## Tính năng

- Đăng ký, đăng nhập và lưu token trong Secure Store.
- Dashboard ưu tiên việc gấp.
- CRUD giấy tờ, hóa đơn, tài sản và lịch sử thanh toán.
- Theo dõi bảo hành, bảo dưỡng và lịch nhắc.
- Camera hoặc tệp ảnh → backend AI → người dùng kiểm tra → xác nhận.
- Trợ lý hỏi đáp dựa trên dữ liệu của chính người dùng.
- Đồng bộ lịch nhắc từ backend thành local notification.

## Chạy local

Yêu cầu Node.js và tunnel backend đang hoạt động.

```powershell
npm install
Copy-Item .env.example .env
npm start
```

Địa chỉ API mặc định cho Android, iOS và web:
`https://house-keeper.truyenlaunch.dev/api/v1`.

## Kiểm tra mã nguồn

```powershell
npm run typecheck
npm run lint
npx expo-doctor
```

## Android

Sinh native project:

```powershell
npm run prebuild:android
```

Build APK thử nghiệm qua EAS:

```powershell
npx eas-cli login
npm run build:android:preview
```

Profile `preview` tạo APK cài trực tiếp. Profile `production` tạo AAB cho Google
Play.

Build APK release trực tiếp trên Windows/macOS/Linux có Android SDK:

```powershell
npm run prebuild:android
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
$env:NODE_ENV="production"
$env:EXPO_PUBLIC_API_URL="https://house-keeper.truyenlaunch.dev/api/v1"
Set-Location android
.\gradlew.bat :app:assembleRelease -PreactNativeArchitectures=arm64-v8a
```

Điện thoại có thể kết nối qua Internet và không cần cùng mạng Wi-Fi với máy
chạy backend, miễn là tunnel HTTPS vẫn hoạt động.

## iOS

Build IPA chưa ký bằng GitHub Actions để tự ký lại sau:

1. Đọc hướng dẫn tại [`docs/GITHUB_IOS_BUILD.md`](docs/GITHUB_IOS_BUILD.md).
2. Đưa repository lên GitHub.
3. Chạy workflow `Build unsigned iOS IPA` trong tab Actions.

Workflow không cần tài khoản Expo/EAS, Apple ID hoặc certificate. IPA phải được
ký lại trước khi cài lên iPhone.

Build qua EAS:

```powershell
npm run prebuild:all
npm run build:ios:production
```

Build iOS production cần Apple Developer account khi EAS yêu cầu ký ứng dụng.

## Cấu hình

- `app.json`: bundle/package id và quyền hệ thống.
- `eas.json`: profile development, preview APK và production.
- `PRODUCT.md`: mục tiêu sản phẩm và tiêu chí UX.
- `DESIGN.md`: token và quy tắc giao diện lấy từ Figma.
