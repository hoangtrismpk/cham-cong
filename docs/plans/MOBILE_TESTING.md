# Hướng dẫn Kiểm tra trên Mobile (Điện thoại)

Do ứng dụng sử dụng tính năng **Định vị (GPS)**, việc kiểm tra trên điện thoại yêu cầu giao thức **HTTPS** (Bắt buộc).

## Cách 1: Deploy lên Vercel (Khuyên dùng)
Đây là cách tốt nhất để App hoạt động 100% chức năng (Camera, GPS mic...)

1. Truy cập [Vercel.com](https://vercel.com) và đăng nhập (GitHub/GitLab).
2. Tạo **New Project**.
3. Import Repository **Cham-Cong** của bạn.
4. Trong phần **Environment Variables**, thêm các biến sau (lấy từ `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Nhấn **Generic Deploy**.
6. Sau khi xong, gửi link (ví dụ: `cham-cong.vercel.app`) qua điện thoại để test.

---

## Cách 2: Dùng mạng LAN (Nhanh, nhưng GPS có thể KHÔNG chạy)
Cách này chỉ để test giao diện (UI), tính năng GPS thường sẽ bị trình duyệt chặn vì không bảo mật (HTTP).

1. Đảm bảo điện thoại và máy tính dùng chung 1 mạng Wi-Fi.
2. Trên máy tính, IP của bạn là: **`192.168.1.21`**
3. Trên điện thoại, mở Chrome/Safari truy cập:
   👉 **`http://192.168.1.21:3000`**

⚠️ **Lưu ý**: Nếu bấm Check-in mà báo lỗi "Geolocation not supported" hoặc "Origin not secure", bạn buộc phải dùng **Cách 1**.
