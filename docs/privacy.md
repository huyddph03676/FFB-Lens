# Chính sách quyền riêng tư — FFB Lens

Cập nhật: 14/11/2026. Áp dụng cho extension FFB Lens phiên bản 0.5.1 hiện tại.

## Dữ liệu được xử lý

- Khi người dùng bấm **Quét Reels trên tab**, extension tải lại tab Reels một lần, đọc các thẻ Reel và quan sát phản hồi GraphQL mà Facebook đã tải cho tab đó. Chỉ URL Reel, caption, ngày đăng, lượt xem, thích, bình luận và chia sẻ (nếu có trong phản hồi) được giữ lại. Extension cuộn theo giới hạn đã chọn, cũng có thể đọc tệp CSV do người dùng tự chọn hoặc bản ghi nhập tay. Dữ liệu chuẩn hóa được lưu trong IndexedDB của Chrome trên thiết bị.
- URL Page gắn ngữ cảnh cho Reel được quét, nhập tay hoặc dòng CSV thiếu `page_url`. Extension không tự gọi endpoint Facebook, không đọc cookie, mật khẩu hoặc nội dung ngoài tab đang được người dùng chọn. Phản hồi GraphQL được xử lý tạm thời để lấy các trường Reel nêu trên; phản hồi thô không được lưu.

## Chia sẻ và truyền dữ liệu

FFB Lens hiện không có máy chủ, tài khoản, analytics hay mã theo dõi. Mã extension không gửi URL, số liệu hoặc caption đã đọc đến FFB Lens hoặc bên thứ ba. Khi người dùng mở Reel gốc, Chrome điều hướng đến URL đó theo thao tác của người dùng.

## Quyền truy cập

Extension yêu cầu quyền Chrome `sidePanel`, `activeTab` và `scripting`. Khi người dùng bấm Quét lần đầu, Chrome hỏi cấp quyền host Facebook tùy chọn. Quyền host có thể được giữ lại cho lần sau và có thể thu hồi trong quản lý extension. Addon đăng ký một content script trên Facebook để quan sát phản hồi Reel khi ở tab Reels; script đọc thẻ và cuộn chỉ được chèn vào tab Reels mà người dùng chọn. Không có quyền đọc lịch sử duyệt web.

Lựa chọn ngôn ngữ Tiếng Việt/English được lưu trong localStorage của extension trên thiết bị để giữ lại khi mở Side Panel lần sau. Trang quyền riêng tư có bản tiếng Anh riêng.

## Xóa và xuất dữ liệu

Người dùng có thể xuất danh sách đang hiển thị thành CSV/XLSX. Tệp xuất do Chrome lưu theo lựa chọn của người dùng. Nút **Xóa dữ liệu** trong Side Panel xóa toàn bộ bản ghi Reels của extension khỏi IndexedDB sau khi xác nhận. Gỡ extension hoặc xóa dữ liệu trang/extension trong Chrome cũng có thể xóa bản ghi này. FFB Lens không giữ bản sao máy chủ để khôi phục.

## Giới hạn

Kết quả chỉ phản ánh Reel được tải và nhận diện trong phạm vi lần quét, cùng dữ liệu nhập bổ sung. Số liệu Facebook có thể được làm tròn hoặc thiếu. Việc sử dụng cơ chế thu thập tự động cần phù hợp với điều khoản Meta và quyền mà người dùng được cấp.

Nếu phiên bản sau thay đổi cách xử lý hoặc chia sẻ dữ liệu, chính sách này và thông báo trong extension cần được cập nhật trước khi phát hành.
