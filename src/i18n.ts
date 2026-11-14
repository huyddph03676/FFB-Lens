export type Language = 'vi' | 'en';

export const englishUi: Record<string, string> = {
  'Ngôn ngữ': 'Language',
  'Dữ liệu trên máy': 'Stored locally',
  'Phân tích Reels': 'Analyze Reels',
  'ngay khi xem Page.': 'while viewing a Page.',
  'Mở tab Reels của Page, bấm Quét để cuộn và xếp hạng những Reel Facebook tải trên tab.': 'Open a Page’s Reels tab, then scan to scroll and rank the Reels Facebook loads there.',
  '01 / PAGE ĐANG XEM': '01 / CURRENT PAGE',
  'Quét tab Reels': 'Scan the Reels tab',
  'URL Facebook Page': 'Facebook Page URL',
  'Nhận Page từ tab': 'Use Page from tab',
  'Mở tab Reels ↗': 'Open Reels tab ↗',
  'Mở tab Reels của Page rồi bấm biểu tượng FFB Lens. Có thể nhập URL Page thủ công.': 'Open a Page’s Reels tab and click FFB Lens. You can also enter a Page URL.',
  'GIỚI HẠN LẦN CUỘN': 'SCROLL LIMIT',
  '10 lần': '10 scrolls', '30 lần': '30 scrolls', '60 lần': '60 scrolls', '100 lần': '100 scrolls',
  'Quét Reels trên tab': 'Scan Reels on tab', 'Dừng': 'Stop',
  'Chưa quét. Chrome sẽ hỏi quyền đọc tab Facebook khi bạn bấm Quét lần đầu; không cần mở DevTools.': 'No scan yet. Chrome will ask for Facebook access when you scan for the first time. DevTools is not needed.',
  'Ghi một Reel thủ công': 'Add a Reel manually', '· bắt buộc': '· required',
  'Lấy URL Reel từ tab đang mở': 'Use Reel URL from tab',
  'LƯỢT XEM': 'VIEWS', 'LƯỢT THÍCH': 'LIKES', 'BÌNH LUẬN': 'COMMENTS', 'CHIA SẺ': 'SHARES',
  'Tùy chọn': 'Optional', 'CAPTION · TÙY CHỌN': 'CAPTION · OPTIONAL',
  'Nội dung Reel đang xem': 'Caption of the open Reel', 'NGÀY ĐĂNG · TÙY CHỌN': 'POSTED DATE · OPTIONAL',
  '+ Ghi Reel và xếp hạng': '+ Save and rank Reel',
  'Số liệu có thể được Facebook làm tròn. Chỉ số không hiển thị sẽ để trống; kết quả là Top của Reel đã đọc, không phải toàn bộ lịch sử Page.': 'Facebook may round metrics. Unavailable values stay blank. Rankings cover scanned Reels, not the Page’s full history.',
  'Nhập dữ liệu hoặc xem mẫu': 'Import data or view sample', 'Nhập CSV': 'Import CSV', 'Xem dữ liệu mẫu': 'View sample data',
  'Tổng quan': 'Overview', '02 / TỔNG QUAN': '02 / OVERVIEW', 'Tập dữ liệu hiện tại': 'Current dataset',
  'Sau bộ lọc': 'After filters', 'TỔNG LƯỢT XEM': 'TOTAL VIEWS', 'Có dữ liệu views': 'Views available',
  'TRUNG VỊ VIEWS': 'MEDIAN VIEWS', 'TB VIEWS': 'AVG VIEWS', 'Trên Reel có views': 'Among Reels with views',
  'MAX VIEWS': 'MAX VIEWS', 'Trong tập đã lọc': 'In filtered data', 'CÓ NGÀY ĐĂNG': 'WITH POSTED DATE',
  'REEL NỔI BẬT NHẤT THEO VIEWS': 'MOST VIEWED REEL', 'Mở Reel ↗': 'Open Reel ↗',
  '03 / BẢNG XẾP HẠNG': '03 / RANKINGS', 'Danh sách Reels': 'Reel rankings', '0 kết quả': '0 results',
  'Xếp hạng phản ánh Reel đã quét, ghi hoặc nhập. Phạm vi quét có giới hạn và có thể thiếu Reel hoặc chỉ số.': 'Rankings include scanned, saved, and imported Reels. A scan may miss Reels or metrics.',
  'TÌM KIẾM': 'SEARCH', 'SẮP XẾP': 'SORT BY', 'Nhiều lượt xem': 'Most views', 'Nhiều lượt thích': 'Most likes',
  'Nhiều bình luận': 'Most comments', 'Nhiều chia sẻ': 'Most shares', 'Mới nhất': 'Newest', 'Cũ nhất': 'Oldest',
  'THỜI GIAN': 'TIME RANGE', 'Tất cả dữ liệu': 'All data', '7 ngày': '7 days', '30 ngày': '30 days',
  '90 ngày': '90 days', 'Tùy chỉnh': 'Custom', 'Từ ngày': 'From', 'Đến ngày': 'To',
  'Tất cả Page': 'All Pages', 'NGUỒN DỮ LIỆU': 'DATA SOURCE', 'Tất cả nguồn': 'All sources',
  'VIEWS TỐI THIỂU': 'MINIMUM VIEWS', 'Không giới hạn': 'No minimum',
  'Outlier = views ÷ trung vị views của cùng Page trong kỳ đã chọn. Cần ít nhất 5 Reel có views và trung vị > 0. Tìm kiếm, nguồn, ngưỡng views và Top không đổi nhóm so sánh.': 'Outlier = Reel views ÷ median views for the same Page in the selected period. At least 5 Reels with views and a median above 0 are required. Search, source, minimum views, and Top do not change the comparison group.',
  '0 Reels đã lưu': '0 Reels saved', 'Xóa dữ liệu': 'Clear data', 'QUYỀN RIÊNG TƯ': 'PRIVACY',
  'https://www.facebook.com/tenpage/reels/': 'https://www.facebook.com/page-name/reels/'
};

const exactErrors: Record<string, string> = {
  'Chức năng này chỉ hoạt động trong Chrome Extension.': 'This feature works only in the Chrome extension.',
  'Hãy mở tab Reels của Facebook Page rồi bấm lại biểu tượng addon.': 'Open a Facebook Page’s Reels tab and click the extension icon again.',
  'Không thể nhận diện Page.': 'Could not identify the Page.',
  'Tab đang mở chưa phải URL của một Reel Facebook.': 'The open tab is not a Facebook Reel URL.',
  'Không thể nhận diện Reel.': 'Could not identify the Reel.',
  'Không truy cập được tab Facebook.': 'Could not access the Facebook tab.',
  'Tab Facebook tải quá lâu. Hãy đợi trang hiện Reels rồi quét lại.': 'The Facebook tab took too long to load. Wait for Reels to appear, then scan again.',
  'Quét Reels chỉ hoạt động trong Chrome Extension.': 'Reel scanning works only in the Chrome extension.',
  'Chrome chưa được cấp quyền đọc tab Facebook. Bấm Quét và cho phép để tiếp tục.': 'Chrome does not have Facebook tab access. Click Scan and allow access to continue.',
  'Hãy mở mục Reels của Facebook Page rồi bấm biểu tượng addon trên chính tab đó.': 'Open a Facebook Page’s Reels tab and click the extension icon on that tab.',
  'Không nhận diện được Page từ tab Reels.': 'Could not identify the Page from the Reels tab.',
  'Không thể bắt đầu quét.': 'Could not start scanning.',
  'Không lưu được kết quả quét.': 'Could not save scan results.',
  'CSV vượt giới hạn 20 MB.': 'The CSV exceeds the 20 MB limit.',
  'URL Page phải thuộc facebook.com và dùng http/https.': 'The Page URL must use http/https and belong to facebook.com.',
  'Không thể nhập CSV.': 'Could not import the CSV.',
  'Không thể ghi Reel.': 'Could not save the Reel.',
  'Không thể tải dữ liệu mẫu.': 'Could not load sample data.',
  'Không thể xóa dữ liệu cục bộ.': 'Could not clear local data.',
  'Không thể mở lưu trữ cục bộ. Hãy kiểm tra quyền lưu dữ liệu của Chrome.': 'Could not open local storage. Check Chrome’s storage permissions.',
  'URL Page không hợp lệ.': 'Invalid Page URL.',
  'Nguồn dữ liệu có Reel URL không hợp lệ.': 'A data source has an invalid Reel URL.',
  'Nguồn dữ liệu thiếu nhãn source.': 'A data source is missing its source label.',
  'Nguồn dữ liệu thiếu thời điểm thu thập hợp lệ.': 'A data source is missing a valid collection date.',
  'Nguồn dữ liệu có ngày đăng không hợp lệ.': 'A data source has an invalid posted date.',
  'Nguồn dữ liệu dùng chỉ số khác views. Cần ánh xạ chỉ số riêng trước khi nhập.': 'This source uses a metric other than views. Map that metric before importing.',
  'CSV có ô chưa đóng dấu ngoặc kép.': 'The CSV contains an unclosed quoted field.',
  'Tệp CSV trống.': 'The CSV file is empty.',
  'CSV cần cột reel_url (hoặc url/link).': 'The CSV needs a reel_url (or url/link) column.',
  'Hãy mở tab Reels của Facebook Page hoặc nhập URL Page hợp lệ.': 'Open a Facebook Page’s Reels tab or enter a valid Page URL.',
  'URL Reel phải có dạng facebook.com/reel/123456…': 'The Reel URL must look like facebook.com/reel/123456…',
  'Ngày đăng không hợp lệ.': 'Invalid posted date.',
  'Đã đạt giới hạn số lần cuộn.': 'Reached the scroll limit.',
  'Đã dừng theo yêu cầu.': 'Stopped as requested.',
  'Đã rời tab Reels.': 'The tab left the Reels page.',
  'Không còn Reel mới khi cuộn; có thể đã tới cuối phần nội dung tải được.': 'No new Reels appeared while scrolling; the loaded list may have ended.',
  'Đã đạt giới hạn 1.500 Reel.': 'Reached the 1,500 Reel limit.',
  'Chỉ quét khi tab đang ở mục Reels của một Page.': 'Scanning works only on a Page’s Reels tab.',
  'Không thể đọc tab Reels.': 'Could not read the Reels tab.',
  'Đã thấy Reel nhưng không đọc được số lượt xem; Facebook có thể đã đổi cách hiển thị.': 'Reels were found, but views could not be read. Facebook may have changed their display.'
};

export function translateError(message: string, language: Language): string {
  if (language === 'vi') return message;
  const noViewsSuffix = ' Đã thấy Reel nhưng không đọc được số lượt xem; Facebook có thể đã đổi cách hiển thị.';
  if (message.endsWith(noViewsSuffix)) return `${translateError(message.slice(0, -noViewsSuffix.length), language)} ${exactErrors[noViewsSuffix.trim()]}`;
  if (exactErrors[message]) return exactErrors[message];
  const metric = message.match(/^(Lượt xem|Lượt thích|Bình luận|Chia sẻ) không hợp lệ\. Ví dụ: 1200, 1\.2K hoặc 2,5 triệu\.$/);
  if (metric) return `Invalid ${({ 'Lượt xem': 'views', 'Lượt thích': 'likes', 'Bình luận': 'comments', 'Chia sẻ': 'shares' } as Record<string, string>)[metric[1]]}. Example: 1200, 1.2K, or 2.5M.`;
  const invalidMetric = message.match(/^Nguồn dữ liệu có (views|likes|comments|shares) không hợp lệ\.$/);
  if (invalidMetric) return `A data source has an invalid ${invalidMetric[1]} value.`;
  const noLinks = message.match(/^Không nhận diện được URL Reel trên tab \((\d+) liên kết ứng viên\)\. Facebook có thể đang tải nội dung hoặc đã đổi cấu trúc trang\.$/);
  if (noLinks) return `No Reel URL was found on the tab (${noLinks[1]} candidate links). Facebook may still be loading or may have changed its page structure.`;
  return message;
}
