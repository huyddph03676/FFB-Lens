# Phase 4 — Nghiên cứu tích hợp dữ liệu Facebook

> **Cập nhật phiên bản 0.5.0:** Addon hiện quét tab Reels, tự cuộn tối đa 100 bước và quan sát phản hồi Reel mà Facebook đã tải vào tab để lấy ngày đăng, lượt xem, lượt thích, bình luận và caption. Addon không tự gửi truy vấn GraphQL. CSV SortLens do người dùng gửi xác nhận các trường này trong 6 Reel tham chiếu; tệp không có cột chia sẻ. Chưa kiểm thử end-to-end trên phiên Facebook đăng nhập thực, nên cần xác minh độ phủ trên Page người dùng. Quyền Chrome cho phép thao tác kỹ thuật, nhưng không thay thế sự cho phép của Meta theo [chính sách thu thập tự động](https://about.fb.com/news/2021/04/how-we-combat-scraping/). Các kết luận “chưa triển khai” bên dưới phản ánh giai đoạn nghiên cứu trước phiên bản 0.4.1.

Kiểm tra ngày **14/11/2026**. Tài liệu Meta và quyền truy cập có thể thay đổi; kiểm tra lại trước khi phát triển connector. Báo cáo này phân biệt khả năng kỹ thuật, quyền truy cập và mức độ đầy đủ của dữ liệu.

## Kết luận triển khai ở giai đoạn nghiên cứu ban đầu

Ở giai đoạn này, CSV là nguồn dữ liệu đầu tiên. Những nhận định trong bảng là lịch sử quyết định, không mô tả bản build 0.5.0. Bản hiện tại có content script và quyền Facebook tùy chọn; vẫn không dùng Meta Graph API chính thức và không cam kết quét toàn bộ lịch sử Page.

| Nguồn | Khả năng kỹ thuật | Điều kiện truy cập và giới hạn | Quyết định hiện tại |
|---|---|---|---|
| CSV do người dùng cung cấp | Nhập, chuẩn hóa, xếp hạng và xuất đã hoạt động | Người cung cấp chịu trách nhiệm có quyền sử dụng dữ liệu; độ đầy đủ chưa xác minh | Giữ làm nguồn mặc định |
| Graph API cho Page do người dùng quản lý | Có Page API và [Reel video insights](https://developers.facebook.com/docs/graph-api/reference/video/video_insights/) | Cần Page role/token và các quyền được Meta cấp; phải xác minh endpoint danh sách Reel và từng trường trên Page thực tế | Chỉ làm thử nghiệm sau khi có Page và quyền phù hợp |
| Graph API cho Page khác | [Page Public Content Access](https://developers.facebook.com/docs/graph-api/reference/page/) có thể cho phép một số dữ liệu công khai nếu được duyệt | Không chứng minh được danh sách Reel đầy đủ hoặc mọi lượt xem của Page bất kỳ | Chưa triển khai |
| Meta Content Library | Có dữ liệu công khai và bộ lọc Reels | [Môi trường truy cập kiểm soát dành cho nghiên cứu](https://developers.facebook.com/docs/content-library-and-api); API dùng trong môi trường nghiên cứu/cleanroom được duyệt, tải CSV có điều kiện riêng | Không coi là connector Chrome phổ thông |
| Content script trên tab Facebook | Chrome cho phép [đọc DOM của trang](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts/) khi có quyền phù hợp | Meta nói [thu thập tự động cần được cho phép trước](https://about.fb.com/news/2021/04/how-we-combat-scraping/). Quyền trình duyệt không thay thế quyền từ Meta | Chưa triển khai |
| Nhà cung cấp dữ liệu có giấy phép | Có thể chuyển dữ liệu được cấp quyền vào contract nguồn chung | Cần hợp đồng nêu phạm vi, quyền lưu/xuất và định nghĩa chỉ số | Chỉ cân nhắc khi có nguồn cụ thể |

## Điểm cần xác minh ở Meta Graph API

1. [Page API](https://developers.facebook.com/docs/graph-api/reference/page/) phân biệt dữ liệu Page sở hữu với dữ liệu công khai được cấp tính năng Page Public Content Access. Được đăng nhập Facebook trong Chrome không tự tạo quyền Graph API.
2. [Page Feed](https://developers.facebook.com/docs/graph-api/reference/page/feed/) hướng danh sách Reels sang `Page VideoReels`, nhưng [tham chiếu `Page VideoReels`](https://developers.facebook.com/docs/graph-api/reference/page/video_reels/) hiện ghi thao tác đọc trên endpoint đó không được hỗ trợ. **Hai trang tài liệu chưa nhất quán**; cần xác minh bằng tài khoản thử nghiệm có quyền trên Page sở hữu, không suy ra rằng endpoint đọc hoạt động cho Page khác.
3. [Reel video insights](https://developers.facebook.com/docs/graph-api/reference/video/video_insights/) có nhiều metric khác nhau: `blue_reels_play_count` không tính replay, `fb_reels_total_plays` tính replay. [Meta Content Library](https://developers.facebook.com/docs/content-library-and-api/appendix/data-dictionary) định nghĩa views theo nội dung xuất hiện trên màn hình, với các điều kiện hiển thị số liệu. Không tự động ghi các metric này vào cột `views` hiện tại hoặc trộn chúng trong một bảng xếp hạng nếu chưa định nghĩa phép so sánh.
4. [Page Feed](https://developers.facebook.com/docs/graph-api/reference/page/feed/) có giới hạn trả về và quy tắc phân trang. Ngay cả khi API trả dữ liệu, phải kiểm tra số Reel trong khoảng thời gian, giới hạn truy vấn, nội dung ẩn/giới hạn và thời điểm thu thập trước khi gọi kết quả là Top toàn bộ Page.

## Điều biết được từ sản phẩm tham khảo

[Hướng dẫn SortLens](https://usesortlens.com/knowledge-base/facebook) mô tả extension hoạt động trên tab Reels, cuộn để tải thêm trong khoảng thời gian chọn và dùng các số Facebook cung cấp cho trình duyệt; lượt xem hiển thị có thể đã làm tròn. Đây là mô tả hành vi sản phẩm, không xác nhận giấy phép thu thập hay khả năng lấy toàn bộ lịch sử của Page. FFB Lens có bộ đọc và luồng quét riêng, không dùng lại mã SortLens.

## Kiến trúc đã chuẩn bị

`src/data/sources.ts` định nghĩa `SourceAdapter` và `SourceBatch`. Adapter hiện tại là `csvFileSource`; nó đánh dấu phạm vi là `unverified`. Mọi batch đi qua `ingestSourceBatch` để kiểm tra URL, timestamp, số liệu và chống trùng trước khi lưu. Contract phân biệt `user_supplied_views`, số views hiển thị, Reel plays và Content Library views; ingestion từ chối đẩy Reel plays hoặc Content Library views vào trường `views` như thể cùng một chỉ số.

Thông tin `source` và `collected_at` đã được lưu trên từng Reel. Metadata cấp batch như `coverage`, `accessBasis` và `viewsMetric` hiện chỉ tồn tại trong lúc nhập. **Trước khi phát hành connector API**, cần lưu chúng lâu dài và bổ sung UI giải thích định nghĩa chỉ số, độ đầy đủ và quyền sử dụng. Không coi giá trị `accessBasis` do code tự khai báo là bằng chứng đã được Meta phê duyệt.

## Các bước để thử nguồn Meta chính thức

1. Chọn một **Page do người thử quản lý** và một Meta app có quyền cần thiết. Xác minh quyền và phiên bản Graph API trong tài liệu Meta tại thời điểm thử; không gửi access token vào chat, CSV hoặc kho mã.
2. Dùng công cụ chính thức như Graph API Explorer để kiểm tra liệu Page có thể liệt kê Reel hay không, ID/permalink/ngày đăng/caption có trả đủ không, và metric nào thực sự có thể đọc. Ghi lại các lỗi quyền và giới hạn phân trang.
3. So sánh một mẫu Reel với giao diện quản trị Page để xác định định nghĩa và thời điểm cập nhật metric. Không chuyển `plays` thành `views` nếu không có cơ sở.
4. Nếu bài thử thành công và quyền sử dụng được xác nhận, thiết kế luồng OAuth/token phù hợp và cách lưu provenance trước khi thêm adapter. Chỉ xin quyền Chrome tối thiểu khi connector đó thực sự hoạt động; [Chrome hỗ trợ quyền tùy chọn](https://developer.chrome.com/docs/extensions/reference/api/permissions/) khi cần.
5. Kiểm thử phạm vi: số Reel đã đọc, ngày cũ nhất/mới nhất, số trang phân trang, số trường thiếu và trạng thái hoàn tất. UI chỉ được gọi “Top N của Page trong kỳ” khi phạm vi đã được xác minh; nếu không, ghi “Top N trong dữ liệu đã thu thập”.

### Với Page tham khảo Fearless Motivation

Không có xác nhận rằng người dùng quản lý Page này hoặc được cấp Page Public Content Access. Do đó, từ URL `https://www.facebook.com/fearlessmotivationofficial/reels/` hiện chỉ có thể gắn ngữ cảnh cho dữ liệu nhập. Không thể cam kết lấy 10 Reel nhiều lượt xem nhất toàn bộ lịch sử Page bằng extension hiện tại.
