# 🚀 Tính năng: Báo cáo bù tự động

**Ngày**: 2026-02-07

---

## 🎯 Mục tiêu:
Tự động phát hiện và nhắc nhở nhân viên báo cáo bù cho những ngày còn thiếu.

---

## 🛠️ Cách hoạt động:

### 1. Phân tích ngày thiếu (`getMissingReports`)
Hệ thống sẽ quét 30 ngày gần nhất và tìm các ngày:
- ❌ Không phải Thứ 7, Chủ Nhật
- ❌ Không phải ngày nghỉ phép đã duyệt (Approved Leave)
- ❌ Chưa có báo cáo nào (Work Report)
=> Đưa vào danh sách **Cần báo cáo bù**.

### 2. Giao diện nhắc nhở (`MissingReports`)
- Hiển thị danh sách ngày thiếu ngay trên cột Lịch sử báo cáo.
- Icon cảnh báo ⚠️ màu cam nổi bật.
- Hiển thị rõ ngày thiếu (Thứ, dd/mm/yyyy).

### 3. Thao tác nhanh
- **Click vào ngày thiếu**:
  - Form bên trái tự động chuyển sang ngày đó.
  - Loại báo cáo tự động chuyển thành **"Báo cáo bù"**.
  - Scroll mượt mà lên đầu form.

---

## 🧪 Test Case:

1. **Check ngày thường**:
   - Nếu hôm qua chưa báo cáo -> Phải hiện trong list.
   - Nếu hôm nay chưa báo cáo -> Không hiện (vì cuối ngày mới tính thiếu).

2. **Check ngày nghỉ**:
   - Tạo đơn nghỉ phép (Approved) cho ngày X.
   - Xóa báo cáo ngày X (nếu có).
   - Kiểm tra list: Ngày X **không được hiện** (vì đã xin nghỉ).

3. **Check cuối tuần**:
   - Các ngày T7, CN trong quá khứ không được hiện.

4. **Thao tác**:
   - Click vào ngày thiếu -> Form update đúng ngày & loại báo cáo.

---

## 📁 Files thay đổi:

- `app/actions/work-reports.ts`: Thêm logic `getMissingReports`.
- `components/reports/missing-reports.tsx`: UI hiển thị list.
- `components/reports/report-form.tsx`: Nhận props `initialDate`.
- `components/reports/reports-container.tsx`: Layout & State management.
- `app/reports/page.tsx`: Refactor dùng container.

---

**Developed by**: Tiger 🐯
