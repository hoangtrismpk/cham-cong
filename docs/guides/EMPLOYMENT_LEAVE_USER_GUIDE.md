# 📚 Employment Types & Leave Management - User Guide

**Version:** 1.0  
**Last Updated:** 2026-02-07

---

## 🎯 Tổng quan

Hệ thống quản lý phân loại nhân viên và nghỉ phép cho phép:

- ✅ 3 loại nhân viên: Full-time, Part-time, Intern
- ✅ Lịch làm việc tự động theo từng loại
- ✅ 4 loại nghỉ phép: Cả ngày, Nửa ngày (sáng/chiều), Theo giờ
- ✅ Tự động tính toán giờ công và lương
- ✅ Workflow phê duyệt nghỉ phép

---

## 👥 Dành cho HR/Admin

### 1. Thiết lập loại nhân viên

**Bước 1:** Vào trang quản lý nhân viên
```
/admin/employees → Chọn nhân viên → Edit
```

**Bước 2:** Chọn loại nhân viên

![Employment Type Selector](screenshots/employment-type-selector.png)

- **👔 Full-time (Chính thức):** 
  - Làm việc 5 ngày/tuần (T2-T6)
  - Giờ cố định: 08:30 - 18:00 (8 giờ/ngày)
  - Lịch được thiết lập tự động

- **⏰ Part-time (Bán thời gian):**
  - Chọn ca sáng HOẶC ca chiều cho từng ngày
  - Ca sáng: 08:30 - 12:30 (4 giờ)
  - Ca chiều: 13:30 - 18:00 (4.5 giờ)

- **🎓 Intern (Thực tập sinh):**
  - Tự do tùy chỉnh giờ làm mỗi ngày
  - Linh hoạt theo lịch học

**Bước 3:** Thiết lập lịch làm việc

Hệ thống sẽ hiển thị editor phù hợp với loại nhân viên đã chọn.

---

### 2. Phê duyệt đơn nghỉ phép

**Bước 1:** Vào trang phê duyệt
```
/admin/leave-approvals
```

**Bước 2:** Xem danh sách đơn chờ duyệt

Mỗi đơn sẽ hiển thị:
- Thông tin nhân viên
- Ngày nghỉ và loại nghỉ
- Tổng số giờ nghỉ
- Lý do nghỉ (nếu có)
- Ảnh minh chứng (nếu có)

**Bước 3:** Duyệt hoặc Từ chối

- **✅ Duyệt:** Click nút "Duyệt" → Xác nhận
- **❌ Từ chối:** Click nút "Từ chối" → Nhập lý do → Xác nhận

**Lưu ý:**
- Khi duyệt: Hệ thống tự động tính toán lại giờ công
- Khi từ chối: Nhân viên sẽ nhận được thông báo với lý do

---

### 3. Xem báo cáo giờ công

**Trang Work Summary:**
```
/admin/work-summary?employee_id={id}&date={YYYY-MM-DD}
```

Hiển thị:
- ⏰ Lịch làm việc vs thực tế chấm công
- 📝 Thông tin nghỉ phép (nếu có)
- 💼 Giờ làm thực tế (Clocked hours - Leave hours)
- 💰 Giờ tính lương (bao gồm leave có phép)

**Công thức tính:**
```
Giờ làm thực tế = Giờ chấm công - Giờ nghỉ phép
Giờ tính lương = Giờ làm thực tế + Nghỉ phép được duyệt
```

---

## 👤 Dành cho Nhân viên

### 1. Xem lịch làm việc của mình

**Cách 1:** Vào trang Profile
```
/my-profile → Tab "Lịch làm việc"
```

Hiển thị:
- Loại nhân viên của bạn
- Lịch làm việc mặc định theo tuần
- Tổng giờ làm/tuần

**Cách 2:** Check thông báo push

Hệ thống sẽ tự động gửi nhắc nhở:
- 15 phút trước giờ vào
- 15 phút trước giờ tan

---

### 2. Xin nghỉ phép

**Bước 1:** Vào trang nghỉ phép
```
/leaves → Click "Tạo đơn mới"
```

**Bước 2:** Điền form

![Leave Request Form](screenshots/leave-request-form.png)

**Chọn ngày nghỉ:**
- Không thể chọn ngày đã qua
- Chọn ngày trong tương lai

**Chọn loại nghỉ:**

1. **📅 Nghỉ cả ngày**
   - Nghỉ toàn bộ ngày làm việc
   - Tính = số giờ theo lịch

2. **🌅 Nghỉ nửa ngày (Sáng)**
   - Nghỉ từ 08:30 - 12:30
   - Tính = 4 giờ

3. **🌆 Nghỉ nửa ngày (Chiều)**
   - Nghỉ từ 13:30 - 18:00
   - Tính = 4 giờ

4. **⏰ Nghỉ theo giờ**
   - Tự chọn khoảng thời gian cụ thể
   - Ví dụ: 09:00 - 11:00 (2 giờ)

**Nhập lý do (không bắt buộc):**
- Ốm đau
- Việc gia đình
- Cá nhân

**Đính kèm ảnh (không bắt buộc):**
- Giấy khám bệnh
- Minh chứng khác

**Bước 3:** Gửi đơn

Click "📤 Gửi đơn xin nghỉ" → Đợi phê duyệt

---

### 3. Theo dõi đơn nghỉ phép

**Vào trang lịch sử:**
```
/leaves → Tab "Lịch sử"
```

**Trạng thái đơn:**

- **⏳ Chờ duyệt:** Đơn đang chờ quản lý xem xét
- **✅ Đã duyệt:** Đơn đã được phê duyệt
- **❌ Từ chối:** Đơn bị từ chối (xem lý do)
- **🚫 Đã hủy:** Bạn đã tự hủy đơn

**Hành động:**

- **Hủy đơn:** Chỉ hủy được đơn đang "Chờ duyệt"
- **Xem lý do:** Click vào đơn để xem chi tiết

---

### 4. Xem giờ công của mình

**Trang Timesheets:**
```
/timesheets
```

Hiển thị theo từng ngày:
- Giờ vào/ra thực tế
- Nghỉ phép của bạn
- Tổng giờ làm được tính lương

**Chú thích màu sắc:**
- 🟢 Xanh: Đi làm đầy đủ
- 🟡 Vàng: Có nghỉ phép
- 🔴 Đỏ: Thiếu giờ

---

## 🔄 Quy trình tự động

### 1. Cron Job: Tính toán giờ công hàng ngày

**Thời gian:** Mỗi đêm lúc 00:30

**Hành động:**
1. Lấy dữ liệu chấm công của ngày hôm trước
2. Lấy nghỉ phép được duyệt
3. Tính toán:
   - Giờ làm thực tế
   - Giờ tính lương
4. Lưu vào bảng `daily_work_summary`

**Kết quả:**
- Dữ liệu sẵn sàng cho payroll
- Báo cáo tự động

---

### 2. Notification: Nhắc nhở chấm công

**Thời gian:** Tùy theo loại nhân viên

**Logic:**

| Loại NV | Nghỉ phép | Nhắc sáng | Nhắc chiều |
|---------|-----------|-----------|------------|
| Full-time | Không | ✅ 08:15 | ✅ 17:45 |
| Full-time | Cả ngày | ❌ | ❌ |
| Full-time | Nửa sáng | ❌ | ✅ 17:45 |
| Full-time | Nửa chiều | ✅ 08:15 | ❌ |
| Part-time | Ca sáng | ✅ 08:15 | ❌ |
| Part-time | Ca chiều | ❌ | ✅ 13:15 |
| Intern | Tùy lịch | ✅ (start-15m) | ✅ (end-15m) |

---

## ❓ FAQ

### Q1: Tôi là part-time, có thể thay đổi ca làm không?

**A:** Có thể!

- Vào `/my-profile` → Tab "Lịch làm việc"
- Chọn ca sáng/chiều cho từng ngày
- Click "Lưu"

Lịch mới sẽ có hiệu lực từ tuần tiếp theo.

---

### Q2: Xin nghỉ gấp phải làm sao?

**A:** Quy trình:

1. Submit đơn xin nghỉ trên hệ thống (dù là gấp)
2. Liên hệ trực tiếp với quản lý qua phone/chat
3. Quản lý sẽ duyệt đơn trên hệ thống

**Lưu ý:** Vẫn phải submit đơn để hệ thống tính giờ công đúng.

---

### Q3: Nghỉ cả ngày nhưng vẫn nhận được nhắc chấm công?

**A:** Kiểm tra:

1. Đơn nghỉ đã được **duyệt** chưa?
2. Notification cache → Restart app

Nếu vẫn lỗi, báo IT.

---

### Q4: Giờ tính lương sai, làm sao?

**A:** Liên hệ HR/Admin để:

1. Kiểm tra lịch sử chấm công
2. Kiểm tra đơn nghỉ phép
3. Trigger tính toán lại (manual)

Admin có thể xem chi tiết trong `/admin/work-summary`.

---

### Q5: Tôi là Intern, muốn đổi lịch tuần sau?

**A:** Linh hoạt hoàn toàn!

1. Vào `/my-profile` → "Lịch làm việc"
2. Bỏ chọn/chọn lại các ngày
3. Điều chỉnh giờ vào/ra từng ngày
4. Lưu

Có thể thay đổi bất cứ lúc nào.

---

## 🛠️ Xử lý sự cố

### Vấn đề: Form xin nghỉ báo lỗi

**Nguyên nhân thường gặp:**
1. Chọn ngày đã qua
2. Giờ kết thúc trước giờ bắt đầu (nghỉ theo giờ)
3. Chưa nhập lý do (nếu bắt buộc)

**Giải pháp:** Check validation message màu đỏ ở trên form.

---

### Vấn đề: Không thấy lịch làm việc

**Nguyên nhân:**
- HR chưa thiết lập loại nhân viên
- Chưa có schedule template

**Giải pháp:** Liên hệ HR để setup.

---

### Vấn đề: Giờ công bị sai

**Debug steps:**
1. Check lịch sử chấm công → Có đúng giờ vào/ra?
2. Check đơn nghỉ phép → Có bị trùng không?
3. Xem work summary → Cách tính có hợp lý?

Nếu vẫn sai → Report to Admin.

---

## 📞 Liên hệ hỗ trợ

**Technical Support:**
- Email: support@company.com
- Hotline: 1900-xxxx

**HR Department:**
- Email: hr@company.com
- Extension: xxx

---

**Phiên bản:** 1.0  
**Cập nhật:** 2026-02-07  
**Người viết:** Tiger (Dev Team)
