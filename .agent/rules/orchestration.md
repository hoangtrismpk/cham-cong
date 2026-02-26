---
trigger: always_on
---

# ORCHESTRATION.MD - Workflow & Agentic Principles

> **Mục tiêu**: Hướng dẫn quy trình làm việc, quản lý tác vụ và các nguyên tắc cốt lõi của Agent để đảm bảo tính tự trị, chính xác và chuyên nghiệp.

## 🛠️ 1. Workflow Orchestration (Điều phối Luồng công việc)

### 1.1 Khởi động với Plan Mode (Mặc định)
- **BẮT BUỘC** vào `plan mode` đối với MỌI tác vụ không phải là chỉnh sửa nhỏ (từ 3 bước trở lên hoặc liên quan đến quyết định kiến trúc).
- Nếu có bất kỳ vấn đề nào đi chệch hướng, **DỪNG LẠI và Re-plan ngay lập tức** - không tiếp tục cố gắng mù quáng.
- Sử dụng plan mode cả cho các bước kiểm tra (verification), không chỉ riêng cho việc xây dựng/code.
- Viết specification chi tiết ngay từ đầu để giảm bớt sự mơ hồ.

### 1.2 Chiến lược sử dụng Subagent
- Sử dụng subagent một cách rộng rãi để giữ context window chính sạch sẽ.
- Giao phó việc nghiên cứu, khám phá và phân tích song song cho các subagent.
- Đối với các vấn đề phức tạp, hãy sử dụng nhiều tài nguyên tính toán hơn thông qua các subagent.
- **Mỗi subagent chỉ tập trung vào một nhiệm vụ duy nhất** để thực thi hiệu quả.

### 1.3 Vòng lặp Tự cải thiện (Self-Improvement Loop)
- Sau MỌI sự điều chỉnh từ người dùng: cập nhật `tasks/lessons.md` với pattern vừa học.
- Tự viết các quy tắc (rules) để tránh mắc lại cùng một sai lầm.
- Lặp lại liên tục các bài học này cho đến khi tỷ lệ lỗi giảm xuống.
- Review lại các lessons vào mỗi đầu phiên làm việc đối với dự án tương ứng.

### 1.4 Kiểm chứng trước khi Hoàn thành (Verification Before Done)
- **KHÔNG BAO GIỜ** đánh dấu tác vụ là hoàn thành mà không chứng minh được nó hoạt động.
- Đối chiếu (Diff) hành vi giữa branch/luồng chính và những thay đổi của bạn khi cần.
- Tự hỏi bản thân: *"Liệu một Staff Engineer có duyệt đoạn code này không?"*
- Chạy test, kiểm tra log, và chứng minh tính đúng đắn.

### 1.5 Yêu cầu sự Thanh lịch (Balanced Elegance)
- Đối với các thay đổi phức tạp: hãy dừng lại và hỏi *"Có cách nào thanh lịch (elegant) hơn không?"*
- Nếu một giải pháp sửa lỗi (fix) có vẻ khiên cưỡng/hacky: *"Với tất cả những gì tôi biết hiện tại, hãy triển khai giải pháp thanh lịch."*
- Bỏ qua bước này đối với các lỗi đơn giản, rõ ràng - không over-engineer (làm quá phức tạp vấn đề).
- Tự thách thức kết quả công việc của mình trước khi trình bày.

### 1.6 Tự chủ sửa lỗi (Autonomous Bug Fixing)
- Khi nhận được báo cáo lỗi: **Cứ thế mà sửa**. Đừng yêu cầu người dùng cầm tay chỉ việc.
- Chỉ ra các log, error, test đang fail - và sau đó giải quyết chúng.
- Người dùng không cần phải chuyển đổi context (Zero context switching).
- Đi sửa các CI tests bị fail mà không cần ai bảo phải làm thế nào.

---

## 📋 2. Task Management (Quản lý Tác vụ)

Mọi tác vụ lớn phải tuân thủ trình tự sau:
1. **Plan First**: Viết kế hoạch vào `tasks/todo.md` với các mục có thể tick chọn.
2. **Verify Plan**: Kiểm tra và thống nhất kế hoạch trước khi bắt đầu thực thi.
3. **Track Progress**: Tích hoàn thành các mục trong quá trình làm.
4. **Explain Changes**: Tóm tắt ở mức độ khái quát (high-level) tại mỗi bước.
5. **Document Results**: Bổ sung phần review vào `tasks/todo.md` khi hoàn tất.
6. **Capture Lessons**: Cập nhật `tasks/lessons.md` sau các lần sửa lỗi/điều chỉnh.

---

## 🌟 3. Core Principles (Nguyên tắc Cốt lõi)

- **Simplicity First (Ưu tiên sự đơn giản)**: Mọi thay đổi phải đơn giản nhất có thể. Tác động đến ít code nhất có thể.
- **No Laziness (Tránh lười biếng)**: Phải tìm ra nguyên nhân gốc rễ (root causes). Không vá víu tạm bợ. Tuân thủ tiêu chuẩn của Senior Developer.
- **Minimal Impact (Tác động tối thiểu)**: Thay đổi chỉ nên chạm đến những gì thật sự cần thiết. Tránh tạo ra bugs mới (Regression-Averse).
