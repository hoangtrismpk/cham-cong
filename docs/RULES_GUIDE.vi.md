# 📜 Hướng Dẫn Sử Dụng "Luật Hệ Thống" (Rules System)

> **Cơ chế hoạt động**: Antigravity sử dụng cơ chế **Hybrid Trigger** (Kết hợp Tự động & Gọi tên) để đảm bảo code vừa nhanh vừa chuẩn.

---

## 1. Phân Loại Rules

### 🤖 Nhóm Tự Động (Auto-Active)
*Luôn chạy ngầm, bạn không cần gọi.*

| Rule | Kích hoạt khi | Chức năng |
| :--- | :--- | :--- |
| **`security`** | **Luôn luôn** | Chặn hardcode API Key, SQL Injection, XSS. |
| **`frontend`** | File `.js`, `.css`, `.tsx` | Chuẩn hóa UI, Spacing, Responsive. |
| **`backend`** | File `.py`, `.js`, `.sql` | Chuẩn Clean Architecture, API Response. |
| **`gemini`** | **Luôn luôn** | Cấu hình lõi, tính cách Agent. |
| **`code-quality`** | Khi nộp PR/Commit | Kiểm tra độ phức tạp, naming, linter. |
| **`error-logging`** | Khi có lỗi | Tự động ghi nhận bug vào `ERRORS.md`. |
| **`malware-protection`** | Khi link/deps lạ | Chống virus, phishing và npm typosquatting. |
| **`runtime-watchdog`** | Khi thực thi | Chặn vòng lặp vô hạn và treo tiến trình. |
| **`i18n-protocol`** | Khi dùng văn bản | Chuẩn hóa đa ngôn ngữ (Tiếng Việt/Anh). |
| **`testing-standard`** | Khi viết Test | Quy định format Unit/E2E test. |
| **`docs-update`** | Khi có tính năng mới | Tự động đồng bộ tài liệu hệ thống. |
| **`strict-protocol`** | **Luôn luôn** | Ép buộc tuân thủ quy trình làm việc nghiêm ngặt. |
| **`system-update`** | **Luôn luôn** | Kiểm tra và cập nhật phiên bản Agent. |
| **`orchestration`** | **Luôn luôn** | Quy trình làm việc, quản lý tác vụ và các nguyên tắc cốt lõi của Agent. |

### 🛠️ Nhóm Theo Yêu Cầu (On-Demand / @Tags)
*Chỉ chạy khi có ngữ cảnh phù hợp hoặc được bạn gọi đích danh.*

| Tag Gọi | Tên Rule | Chức năng |
| :--- | :--- | :--- |
| **`@biz`** | `business` | Kiểm tra logic nghiệp vụ, tính tiền, quyền hạn. |
| **`@legal`** | `compliance` | Rà soát GDPR, bảo mật dữ liệu, Logging chuẩn. |
| **`@arch`** | `architecture-review` | Đánh giá khả năng chịu tải, HA, Microservices. |
| **`@debug`** | `debug` | Kích hoạt quy trình 4 bước: Điều tra -> Test -> Sửa -> Báo cáo. |

---

## 2. Cách Sử Dụng Semantic Tags (@)

Bạn có thể dùng ký tự `@` trong lệnh chat để **ép buộc** Agent tập trung vào một khía cạnh cụ thể.

### Ví dụ thực tế:

**1. Khi Review Logic Tính Tiền:**
> "Agent, hãy `@biz` check lại hàm tính thuế này xem có bị lỗi làm tròn số (Float) không?"
*(Agent sẽ lôi `rules/business.md` ra để soi kỹ vấn đề Decimal vs Float)*

**2. Khi Audit Bảo Mật Dữ Liệu:**
> "Code này `@legal` có vi phạm quy tắc log email người dùng không?"
*(Agent sẽ đối chiếu với `rules/compliance.md` về PII masking)*

**3. Khi Sửa Lỗi Khó:**
> "Hệ thống đang bị lỗi 500, `@debug` điều tra giúp tôi."
*(Agent kích hoạt chế độ Sherlock Holmes)*

**4. Khi Thiết Kế Hệ Thống Lớn:**
> "Tôi muốn xây dựng module Payment, `@arch` tư vấn giải pháp chịu tải cao."
*(Agent dùng `rules/architecture-review.md` để tư vấn Redis/Queue)*

---

## 3. Tại sao cần chia ra như vậy?

*   Nếu nạp **tất cả** luật cùng lúc: Agent sẽ bị "quá tải" (Cognitive Overload), dẫn đến xử lý chậm và hay quên các chi tiết nhỏ.
*   Cơ chế **@Tags** giúp bạn điều hướng sự tập trung của Agent vào đúng chỗ cần thiết nhất tại thời điểm đó.

> **Mẹo**: Hãy coi các Rule này là các "Cố vấn chuyên môn". Khi cần ai, hãy gọi tên người đó!
