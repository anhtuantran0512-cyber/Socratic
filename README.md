# Trạm Kiểm Định Socratic — Socratic Audit Atelier — Web MVP P1

Công cụ học tập an toàn thông tin ưu tiên quyền riêng tư, **chạy ngoại tuyến 100%** dành cho học sinh và người mới làm web bằng AI (Vibe Coding).

## Chạy cục bộ (không cần Internet)
```bash
python3 -m http.server 8000
# mở http://localhost:8000
```
Hoặc mở thẳng `index.html` bằng `file://`. Không có yêu cầu mạng ra ngoài — kiểm tra bằng DevTools → Network (0 requests).

## 16 tiêu chí nghiệm thu P1 (7,8/10 — Vòng 6)
- **Chức năng (6)**: Offline 100%, không gọi AI ngoài, hỗ trợ JS/TS+HTML+.env, quét cả chú thích, tách 3 nhóm màu, 4 mẫu nạp nhanh
- **Quyền riêng tư (4)**: Không lưu nội dung vào Storage/Cookies, nút Xóa trắng, Passport chỉ in tổng hợp, ghi trung thực cấu hình
- **Kiểm thử (4)**: 4 loại đánh giá, bộ mẫu 8 trường khóa nhãn, để trống trước khi chạy + thống kê riêng từng quy tắc, Rule Changelog
- **Hồ sơ (2)**: Hộp Ranh Giới Năng Lực cố định, hướng dẫn 4 bước Đo Mạng Độc Lập

## 6 quy tắc cốt lõi
- **QT-1.1** (đỏ gạch): Khóa dịch vụ có định dạng cố định — quét cả chú thích, nhãn “Cần xác minh”
- **QT-1.2** (đỏ gạch): Mật khẩu gán trực tiếp — phân biệt giữ chỗ & bẫy SHA-256
- **QT-2.1** (hổ phách): innerHTML/document.write — Socratic + tác dụng phụ
- **QT-2.2** (hổ phách): eval/Function — tình huống công thức
- **QT-2.3** (hổ phách): SQL concat — ẩn dụ thủ thư, OWASP parameterized queries
- **QT-3.1** (lam trầm): ID động trên URL — **không báo lỗi**, mở Checklist 3 câu hỏi

## Quy trình Đo Mạng Độc Lập (4 bước)
1. Ngắt Wi-Fi / mở gói cục bộ
2. DevTools → Network → Clear
3. Chạy quét + mở Socratic + xuất Release Passport
4. Xác nhận 0 requests & Application → Storage trống

## Dấu mộc kiểm định
```
ĐÃ RÀ SOÁT THEO PHẠM VI ĐƯỢC CÔNG BỐ
```
Tuyệt đối không dùng “100% An toàn” / “Đã kiểm định an toàn” / “Chứng nhận bảo mật”.

## Kiến trúc
- `index.html` — 4 khu vực (Bàn Kiểm Định / Passport / Benchmark Lab / Nghiệm Thu)
- `css/style.css` — Heritage Atelier: giấy #F4EFE6, thẻ #FFFDF9, mực #1C1B18, đỏ gạch #C83E2B, hổ phách #9A5B13, lam trầm #2B4C7E; SVG nội tuyến, không CDN
- `js/app.js` — Bộ 6 quy tắc cục bộ, Benchmark Lab 8 trường, Passport Markdown
