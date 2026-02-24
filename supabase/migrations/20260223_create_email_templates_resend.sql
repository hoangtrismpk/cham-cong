-- ============================================================
-- Email Templates table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            TEXT UNIQUE NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT DEFAULT '',
    subject         TEXT NOT NULL DEFAULT '',
    content         TEXT NOT NULL DEFAULT '',
    category        TEXT NOT NULL DEFAULT 'system'
                    CHECK (category IN ('onboarding','security','attendance','leave','system')),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    variables       TEXT[] NOT NULL DEFAULT '{}',
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by      TEXT NOT NULL DEFAULT 'System',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access on email_templates" ON public.email_templates;
CREATE POLICY "Admin full access on email_templates"
    ON public.email_templates FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.roles r ON r.id = p.role_id
        WHERE p.id = auth.uid() AND r.name = 'admin'
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.roles r ON r.id = p.role_id
        WHERE p.id = auth.uid() AND r.name = 'admin'
    ));

-- Seed default templates
INSERT INTO public.email_templates (slug, name, description, subject, content, category, is_active, variables) VALUES

('account-registration', 'Account Registration', 'Welcome email for new staff members',
 'Chào mừng {{user_name}} đến với {{company_name}}!',
 '<!DOCTYPE html>
<html><head><style>
  body{margin:0;padding:0;background:#f1f5f9;}
  .wrapper{max-width:600px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);}
  .header{background:linear-gradient(135deg,#0f172a,#1e3a5f);padding:32px;text-align:center;}
  .logo{color:#38bdf8;font-size:22px;font-weight:800;}
  .body{padding:40px 32px;}
  h1{color:#1e293b;font-size:24px;margin:0 0 16px;}
  p{color:#475569;line-height:1.7;margin:0 0 16px;}
  .info-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:20px 0;}
  .button{background:#3b82f6;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;}
  .footer{background:#f8fafc;padding:20px 32px;text-align:center;color:#94a3b8;font-size:12px;border-top:1px solid #e2e8f0;}
</style></head>
<body><div class="wrapper">
  <div class="header"><div class="logo">⏱ {{company_name}}</div></div>
  <div class="body">
    <h1>Chào mừng {{user_name}}! 🎉</h1>
    <p>Tài khoản của bạn đã được tạo thành công trên <strong>{{company_name}}</strong>.</p>
    <div class="info-box">
      <p style="margin:0;font-size:13px;"><strong>Email:</strong> {{user_email}}</p>
      <p style="margin:4px 0 0;font-size:13px;"><strong>Mật khẩu tạm:</strong> {{temp_password}}</p>
    </div>
    <a class="button" href="{{login_url}}">Đăng nhập ngay →</a>
  </div>
  <div class="footer">{{company_name}} | {{support_email}}</div>
</div></body></html>',
 'onboarding', true, ARRAY['user_name','user_email','company_name','temp_password','login_url','support_email']),

('password-reset', 'Password Reset', 'Recovery instructions for forgotten credentials',
 'Reset Your Password - {{company_name}}',
 '<!DOCTYPE html>
<html><head><style>
  body{margin:0;padding:0;background:#f1f5f9;}
  .wrapper{max-width:600px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);}
  .header{background:#0f172a;padding:24px 32px;}
  .logo{color:#38bdf8;font-size:18px;font-weight:800;}
  .body{padding:40px 32px;}
  h1{color:#1e293b;font-size:22px;margin:0 0 16px;}
  p{color:#475569;line-height:1.7;margin:0 0 16px;}
  .button{background:#3b82f6;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;}
  .footer{background:#f8fafc;padding:20px 32px;text-align:center;color:#94a3b8;font-size:12px;border-top:1px solid #e2e8f0;}
</style></head>
<body><div class="wrapper">
  <div class="header"><div class="logo">⏱ {{company_name}}</div></div>
  <div class="body">
    <h1>Password Reset Request</h1>
    <p>Hello <strong>{{user_name}}</strong>,</p>
    <p>We received a request to reset your password. Click below to continue. Link expires in {{expiry_time}}.</p>
    <a class="button" href="{{reset_link}}">Reset Password →</a>
    <p style="margin-top:24px;font-size:13px;color:#94a3b8;">If you did not request this, please ignore this email.</p>
  </div>
  <div class="footer">{{company_name}} | {{support_email}}</div>
</div></body></html>',
 'security', true, ARRAY['user_name','company_name','reset_link','expiry_time','support_email']),

('password-changed', 'Password Changed', 'Confirmation of successful password update',
 'Mật khẩu của bạn đã được thay đổi - {{company_name}}',
 '<!DOCTYPE html>
<html><body>
  <div style="font-family:sans-serif;padding:40px;max-width:600px;margin:0 auto;">
    <h1>Xin chào {{user_name}},</h1>
    <p>Mật khẩu tài khoản tại <strong>{{company_name}}</strong> vừa được thay đổi lúc <strong>{{changed_at}}</strong>.</p>
    <p>Nếu đây không phải là bạn, vui lòng <a href="{{support_url}}">liên hệ bộ phận hỗ trợ</a> ngay lập tức.</p>
    <hr/><p style="font-size:12px;color:#666;">{{company_name}} | {{support_email}}</p>
  </div>
</body></html>',
 'security', false, ARRAY['user_name','company_name','changed_at','support_url','support_email']),

('unknown-device-login', 'Unknown Device Login', 'Security alert for unrecognized login attempt',
 '⚠️ Cảnh báo bảo mật: Đăng nhập từ thiết bị lạ',
 '<!DOCTYPE html>
<html><body>
  <div style="font-family:sans-serif;padding:40px;max-width:600px;margin:0 auto;">
    <h1 style="color:#ef4444;">⚠️ Cảnh báo bảo mật</h1>
    <p>Xin chào <strong>{{user_name}}</strong>,</p>
    <p>Chúng tôi phát hiện đăng nhập từ thiết bị chưa được nhận dạng:</p>
    <ul>
      <li>Thời gian: <strong>{{login_time}}</strong></li>
      <li>Địa điểm: <strong>{{location}}</strong></li>
      <li>Thiết bị: <strong>{{device}}</strong></li>
      <li>IP: <strong>{{ip_address}}</strong></li>
    </ul>
    <a href="{{reset_link}}" style="background:#ef4444;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Bảo vệ tài khoản ngay</a>
  </div>
</body></html>',
 'security', true, ARRAY['user_name','login_time','location','device','ip_address','reset_link']),

('leave-approved', 'Leave Request Approved', 'Notification when leave request is approved',
 '✅ Đơn nghỉ phép đã được duyệt - {{leave_dates}}',
 '<!DOCTYPE html>
<html><body>
  <div style="font-family:sans-serif;padding:40px;max-width:600px;margin:0 auto;">
    <h1 style="color:#22c55e;">✅ Đơn nghỉ phép được duyệt</h1>
    <p>Xin chào <strong>{{user_name}}</strong>,</p>
    <p>Đơn nghỉ phép của bạn đã được <strong>{{approver_name}}</strong> duyệt.</p>
    <p><strong>Thời gian nghỉ:</strong> {{leave_dates}}</p>
    <p><strong>Loại phép:</strong> {{leave_type}}</p>
    <p>Chúc bạn nghỉ ngơi vui vẻ! 🏖️</p>
  </div>
</body></html>',
 'leave', true, ARRAY['user_name','approver_name','leave_dates','leave_type']),

('daily-attendance-report', 'Daily Attendance Report', 'Daily summary report sent to Admin every evening',
 '📊 Báo cáo chấm công ngày {{report_date}} - {{company_name}}',
 '<!DOCTYPE html>
<html><body>
  <div style="font-family:sans-serif;padding:40px;max-width:600px;margin:0 auto;">
    <h1>📊 Báo cáo ngày {{report_date}}</h1>
    <table width="100%" style="border-collapse:collapse;">
      <tr style="background:#1e293b;color:white;">
        <th style="padding:10px;text-align:left;">Chỉ số</th>
        <th style="padding:10px;text-align:right;">Số lượng</th>
      </tr>
      <tr><td style="padding:10px;">✅ Đúng giờ</td><td style="padding:10px;text-align:right;">{{on_time_count}}</td></tr>
      <tr><td style="padding:10px;">⏰ Đi muộn</td><td style="padding:10px;text-align:right;">{{late_count}}</td></tr>
      <tr><td style="padding:10px;">❌ Vắng mặt</td><td style="padding:10px;text-align:right;">{{absent_count}}</td></tr>
      <tr><td style="padding:10px;">🏖️ Nghỉ phép</td><td style="padding:10px;text-align:right;">{{on_leave_count}}</td></tr>
    </table>
  </div>
</body></html>',
 'attendance', true, ARRAY['report_date','company_name','on_time_count','late_count','absent_count','on_leave_count'])

ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Resend Config table (single-row config)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.resend_config (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key         TEXT NOT NULL DEFAULT '',
    from_email      TEXT NOT NULL DEFAULT '',
    from_name       TEXT NOT NULL DEFAULT '',
    reply_to        TEXT DEFAULT '',
    is_configured   BOOLEAN NOT NULL DEFAULT false,
    test_status     TEXT DEFAULT NULL CHECK (test_status IN ('success','failed', NULL)),
    last_tested_at  TIMESTAMPTZ DEFAULT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.resend_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access on resend_config" ON public.resend_config;
CREATE POLICY "Admin full access on resend_config"
    ON public.resend_config FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.roles r ON r.id = p.role_id
        WHERE p.id = auth.uid() AND r.name = 'admin'
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.roles r ON r.id = p.role_id
        WHERE p.id = auth.uid() AND r.name = 'admin'
    ));

-- Seed one empty config row
INSERT INTO public.resend_config (api_key, from_email, from_name, is_configured)
SELECT '', '', '', false
WHERE NOT EXISTS (SELECT 1 FROM public.resend_config);
