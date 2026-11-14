# FFB Lens — Facebook Reels Analyzer

Chrome Extension Manifest V3 chạy trong Side Panel cạnh tab Facebook. Chế độ chính cuộn tab Reels của Page đang mở, đọc thẻ Reel và dữ liệu Reel Facebook đã tải vào tab, rồi xếp hạng trong Side Panel. CSV và nhập tay là phương án phụ. Giao diện có thể chuyển giữa Tiếng Việt và English bằng menu trên thanh đầu, và nhớ lựa chọn trên máy. Dữ liệu được xử lý và lưu cục bộ trong IndexedDB; không gửi lên máy chủ.

## Kiến trúc

```
public/manifest.json       MV3; sidePanel, activeTab, scripting và quyền Facebook tùy chọn
public/service-worker.js    mở Side Panel khi bấm biểu tượng extension
src/main.ts                 dashboard và luồng nhập/lọc/xuất
src/i18n.ts                 bản dịch giao diện và thông báo lỗi tiếng Anh
src/data/csv.ts             đọc/ghi CSV và ánh xạ cột
src/data/normalize.ts       số, URL, ngày, danh tính Reel
src/data/engine.ts          loại trùng, lọc, xếp hạng, thống kê
src/data/sources.ts         contract nguồn dữ liệu, adapter CSV và bước kiểm tra trước khi lưu
src/data/manual-page.ts     nhận diện URL Page và ghi Reel do người dùng chọn
src/facebook/content.ts     đọc thẻ Reel hiển thị và cuộn tab theo giới hạn
src/facebook/extract.ts     chuẩn hóa URL Reel và số liệu hiển thị
src/facebook/observer.ts    quan sát phản hồi GraphQL đã được Facebook tải trên tab Reels
src/facebook/graph.ts       chỉ lấy URL, caption, ngày và số liệu Reel từ phản hồi đó
scripts/build-content.mjs  đóng gói content script riêng cho MV3
src/data/db.ts              lưu IndexedDB trên máy
src/data/xlsx.ts            tạo XLSX cục bộ
public/sample-reels.csv     dữ liệu giả để thử giao diện; không phải dữ liệu Facebook thực
public/privacy.html         trang quyền riêng tư có thể mở trong extension
public/privacy-en.html      bản tiếng Anh của trang quyền riêng tư
```

Lớp xử lý chỉ nhận các bản ghi `Reel`, nên có thể thêm nguồn dữ liệu được cấp quyền sau này mà không đổi thuật toán xếp hạng.

[Báo cáo nghiên cứu Phase 4](docs/facebook-integration-research.md) ghi lại giới hạn quyền truy cập và API. Cơ chế quét chạy sau khi người dùng bấm trên tab Reels; addon chỉ quan sát phản hồi mà Facebook đã tự tải cho trang và không tự gọi API, đọc cookie hoặc vượt kiểm soát truy cập. Xem [chính sách quyền riêng tư](docs/privacy.md) và [danh sách kiểm tra phát hành](docs/release-checklist.md).

## Cài đặt và chạy

Yêu cầu Node.js 20.19+ hoặc 22.12+ và Chrome 114+.

```bash
npm install
npm test
npm run build
npm run package
```

1. Mở `chrome://extensions` trong Chrome.
2. Bật **Developer mode**.
3. Chọn **Load unpacked** rồi chọn thư mục `dist` của dự án.
4. Mở `https://www.facebook.com/fearlessmotivationofficial/reels/` hoặc tab Reels của Page muốn phân tích.
5. Bấm biểu tượng **FFB Lens** trên thanh công cụ để mở Side Panel. Addon nhận URL Page từ tab; nếu cần, bấm **Nhận Page từ tab**.
6. Chọn giới hạn 10–100 lần cuộn, bấm **Quét Reels trên tab** và cấp quyền Facebook khi Chrome hỏi lần đầu. Addon tải lại tab Reels một lần để ghi nhận số liệu Facebook trả về ngay lúc trang mở, rồi tự cuộn. Side Panel cập nhật số Reel, số Reel có dữ liệu Facebook và bảng xếp hạng khi quét; bấm **Dừng** để kết thúc sớm. Không cần mở DevTools hoặc dán lệnh vào Console.
7. Chọn **English** trong menu **Ngôn ngữ** ở đầu Side Panel nếu muốn giao diện tiếng Anh. Dùng bộ lọc, thống kê hoặc mục **Ghi một Reel thủ công** nếu thiếu số liệu. CSV nằm trong mục **Nhập dữ liệu hoặc xem mẫu**.

`npm run dev` chạy trang giao diện trong trình duyệt để phát triển nhanh. Để thử hành vi của Chrome Extension, chạy `npm run build` rồi tải lại thư mục `dist` trong `chrome://extensions`. Sau mỗi lần build mới, bấm **Reload** trên thẻ extension.

### Khi quét không ra kết quả

- Đọc dòng trạng thái ngay dưới nút Quét. Nếu Chrome hỏi quyền Facebook, chọn **Allow**; nếu từ chối, nút Quét sẽ báo thiếu quyền.
- Nếu trạng thái báo **0 liên kết ứng viên**, kiểm tra đúng tab `facebook.com/<page>/reels/`, đợi lưới Reel hiện ra rồi quét lại. Nếu có liên kết nhưng **0 Reel**, giao diện Facebook có thể đã đổi định dạng URL; chụp lưới Reels và dòng trạng thái để đối chiếu.
- Nếu có Reel nhưng **0 có views**, bộ đọc chưa nhận ra cách Facebook hiển thị số trên Page đó; không nên suy đoán số liệu.
- Nếu có views nhưng **0 Reel có dữ liệu Facebook**, phần quan sát phản hồi chưa nhận ra cấu trúc dữ liệu của Page đó. Ngày đăng, likes và comments có thể vẫn trống; chụp dòng trạng thái để kiểm tra tiếp.
- Các cảnh báo `Permissions-Policy` và dòng `Stop!` trong DevTools Console do Facebook phát ra khi mở Console; chúng không phải lỗi của FFB Lens. Không dán mã vào Console.

## Định dạng CSV

Cần cột `reel_url`. Các cột còn lại tùy chọn:

`page_name,page_url,reel_id,reel_url,caption,views,likes,comments,shares,published_at,collected_at,source`

Hỗ trợ CSV dấu phẩy, chấm phẩy hoặc tab; UTF-8 BOM; dấu ngoặc kép và ô nhiều dòng. Số lượt xem như `1.2K`, `2.5M`, `1,2 triệu`, `1,234` được chuẩn hóa. Giá trị sai hoặc thiếu giữ trống. Ngày hỗ trợ ISO hoặc `dd/mm/yyyy`. Dòng thiếu URL HTTP(S) hợp lệ bị bỏ qua. URL Page nhập trong giao diện chỉ bổ sung `page_url` khi dòng CSV thiếu trường này.

## Cách kiểm thử thủ công

1. Trên tab Reels của một Page, mở side panel và xác nhận URL Page được nhận diện. Chọn 10 lần cuộn rồi bấm **Quét Reels trên tab**. Kiểm tra số Reel nhận diện tăng và bảng có URL mở Reel gốc.
2. So sánh vài Reel với số đang hiển thị trên Facebook và với bản xuất SortLens của cùng Page. Kiểm tra riêng ngày đăng, likes, comments và số Reel có dữ liệu Facebook trong dòng trạng thái. Chỉ số vắng mặt phải để trống; số làm tròn như `1.2M` được hiểu là xấp xỉ 1.200.000. Thử nút **Dừng** và quét lại để xác nhận không nhân đôi Reel.
3. Nếu muốn thử dữ liệu mẫu, mở **Nhập dữ liệu hoặc xem mẫu**; mẫu có 6 Reels và số `1,2 triệu` được hiểu là 1.200.000.
4. Chuyển Top 10/20 và sắp xếp views/likes; thử bộ lọc 7/30/90 ngày, tùy chỉnh, Page, nguồn và views tối thiểu.
5. Kiểm tra 6 thẻ thống kê, Reel nhiều views nhất và Outlier Score. Điểm outlier dùng nhóm cùng Page trong kỳ thời gian đã chọn; với dữ liệu mẫu phải xuất hiện điểm cho các Reel có views.
6. Xuất CSV và XLSX, mở hai tệp để kiểm tra thứ tự, số dòng, các cột nguồn và `outlier_score`.
7. Đóng rồi mở Side Panel: dữ liệu vẫn còn trong IndexedDB. Bấm **Xóa dữ liệu** để xóa các bản ghi trên máy sau khi xác nhận.
8. Nếu Page thay đổi DOM, ghi lại URL Page, ảnh chụp một thẻ Reel và số hiển thị để cập nhật bộ đọc. Bản build chưa được kiểm tra trên phiên đăng nhập Facebook thực trong môi trường này.

## Phạm vi và giới hạn

- Hoạt động trong mã: quét có giới hạn trên tab Reels, đọc URL/số hiển thị và phản hồi Reel đã tải trong tab, dừng quét, loại trùng, xếp hạng, lọc, thống kê, lưu cục bộ, nhập tay/CSV, xuất CSV/XLSX.
- Chưa có: xác minh toàn bộ lịch sử Page, Meta Graph API, phân tích hình/âm thanh video. Tính năng AI đã được gỡ bỏ.
- Giới hạn: Facebook có thể thay đổi DOM hoặc cấu trúc phản hồi; chỉ số có thể bị làm tròn hoặc vắng mặt. Số chia sẻ thường chỉ hiện khi mở Reel, không có trong bản xuất SortLens tham chiếu; nếu tab Reels không tải trường này thì addon để trống. Top N chỉ là Top của **Reel đã đọc trong số lần cuộn**, không phải toàn bộ Page. Chưa kiểm thử end-to-end trên phiên Facebook đăng nhập thực. CSV giới hạn 20 MB; bảng hiện tối đa 100 dòng.

### Outlier Score

`Outlier Score = views của Reel / trung vị views của các Reel cùng Page trong khoảng thời gian đã chọn`. Chỉ tính nếu nhóm có ít nhất 5 Reel có views và trung vị lớn hơn 0. Nhóm so sánh dùng dữ liệu đã nhập, không phụ thuộc tìm kiếm, nguồn, views tối thiểu hay Top; vì vậy thay đổi các bộ lọc này không làm điểm của một Reel tự đổi. Reel thiếu Page hoặc thiếu views không có điểm. Các trường hợp chưa đủ dữ liệu hiển thị dấu `—` và xuất trống.

## Lưu ý về quyền truy cập Facebook

1. Ưu tiên tệp xuất hoặc dữ liệu do chủ Page cung cấp và xác nhận quyền sử dụng; ghi rõ `source` và `collected_at`.
2. Nếu dùng Meta Graph API, xác định loại Page, quyền và tính năng đã được duyệt trước khi thiết kế connector. Quyền đọc nội dung Page sở hữu và quyền truy cập nội dung công khai của Page khác là hai trường hợp khác nhau; không giả định API trả đầy đủ views của mọi Reel.
3. Content script đọc DOM và phản hồi Reel Facebook đã tải vào tab người dùng đang mở, rồi tự cuộn khi bấm Quét. Theo [Meta](https://about.fb.com/news/2021/04/how-we-combat-scraping/), tự động thu thập từ sản phẩm của họ cần được cho phép trước. Quyền Chrome `activeTab` không phải là quyền do Meta cấp. Cần làm rõ điều kiện sử dụng trước khi phát hành hoặc dùng rộng rãi.

Tài liệu tham khảo: [Chrome Side Panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel), [Chrome Manifest](https://developer.chrome.com/docs/extensions/reference/manifest), [Meta Page API](https://developers.facebook.com/docs/graph-api/reference/page/), [Meta Page Feed](https://developers.facebook.com/docs/graph-api/reference/page/feed/), [Meta về thu thập dữ liệu tự động](https://about.fb.com/news/2021/04/how-we-combat-scraping/).
