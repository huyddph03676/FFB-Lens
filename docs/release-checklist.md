# Chuẩn bị phát hành FFB Lens 0.5.1

## Trạng thái hiện tại

- Có mã nguồn MV3, icon 16/48/128 px, Side Panel, tệp mẫu, trang quyền riêng tư trong extension và chính sách quyền riêng tư nháp để đăng công khai.
- Gói extension nằm ở `release/ffb-lens-0.5.1.zip` sau khi chạy lệnh đóng gói. Gói không chứa `node_modules`, mã nguồn TypeScript hoặc khóa truy cập.
- Cần kiểm thử thực tế trên tab Reels của nhiều Page vì Meta có thể thay đổi cấu trúc DOM; bản build chưa được xác minh end-to-end trên phiên Facebook đăng nhập thực.

## Gate trước khi tải lên Chrome Web Store

1. Chạy `npm ci`, `npm test`, `npm run build`, rồi kiểm tra `dist/manifest.json` và gói ZIP.
2. Thử trên Chrome tại tab Reels của nhiều Page: cấp quyền Facebook khi bấm Quét lần đầu, xác nhận tab tải lại một lần, quét 10/30 lần cuộn, dừng sớm, kiểm tra URL, ngày đăng, likes và comments của vài Reel bằng mắt và đối chiếu SortLens. Chuyển Tiếng Việt/English khi đang quét và sau khi có kết quả; đóng/mở Side Panel để kiểm tra lựa chọn ngôn ngữ, mở trang quyền riêng tư ở cả hai ngôn ngữ. Kiểm tra dòng trạng thái báo bao nhiêu Reel có dữ liệu Facebook, trường thiếu, loại trùng, lọc và đóng/mở Side Panel. Thử cả trường hợp từ chối quyền, mở panel ở tab khác rồi chuyển sang Facebook. Thử thêm CSV mẫu và xuất CSV/XLSX.
3. Xác minh điều kiện được phép tự động thu thập từ Meta trước khi dùng rộng rãi hoặc phát hành. Chuẩn bị ảnh chụp màn hình và mô tả listing nêu rõ addon đọc DOM và phản hồi Reel đã tải trong tab, số liệu có thể làm tròn và phạm vi quét có giới hạn. Không dùng dữ liệu mẫu như số liệu thật.
4. Đăng **chính sách quyền riêng tư** lên một URL công khai do nhà phát hành kiểm soát. Tệp `docs/privacy.md` là bản nháp để duyệt; đường dẫn tệp cục bộ không thay thế URL trong Developer Dashboard. [Chrome Web Store yêu cầu chính sách cho extension xử lý dữ liệu người dùng, kể cả khi lưu cục bộ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq/).
5. Điền Privacy practices và các thông tin listing phù hợp với hành vi thực tế. [Tài liệu Google](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy/) yêu cầu các khai báo này nhất quán với chính sách quyền riêng tư.
6. Chủ tài khoản nhà phát hành tự kiểm tra thông tin liên hệ, tài khoản phát triển và quy trình duyệt. [Chrome Web Store nhận tệp ZIP qua Developer Dashboard](https://developer.chrome.com/docs/webstore/publish/). Chưa tải lên hay xuất bản trong bước này.

## Lệnh đóng gói

```bash
npm run build
npm run package
```

Sau khi build lại, hãy tạo ZIP mới để tránh tải phiên bản cũ. Nếu thêm Facebook connector sau này, phải đánh giá lại quyền, chính sách dữ liệu, phạm vi thông báo cho người dùng và mô tả listing trước khi phát hành.
