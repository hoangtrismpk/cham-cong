-- Seed email templates for email change flow
INSERT INTO public.email_templates (slug, name, description, subject, content, category, is_active, variables) VALUES

('email-change', 'Email Change Request', 'Sent to the OLD email address when a user requests an email change',
 'Xác nhận đổi địa chỉ Email - {{company_name}}',
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
    <h1>Yêu cầu đổi địa chỉ Email</h1>
    <p>Xin chào,</p>
    <p>Bạn vừa yêu cầu thay đổi địa chỉ email cho tài khoản từ <strong>{{old_email}}</strong> sang <strong>{{new_email}}</strong>. Để tiếp tục, vui lòng xác nhận bằng cách bấm vào đường dẫn dưới đây:</p>
    <a class="button" href="{{confirmation_url}}">Xác nhận đổi thay Email →</a>
    <p style="margin-top:24px;font-size:13px;color:#94a3b8;">Hoặc bạn có thể nhập mã này: <strong>{{token}}</strong></p>
    <p style="margin-top:24px;font-size:13px;color:#94a3b8;">Nếu bạn không yêu cầu thay đổi này, hãy bỏ qua email này hoặc liên hệ quản trị viên.</p>
  </div>
  <div class="footer">{{company_name}} | {{support_email}}</div>
</div></body></html>',
 'security', true, ARRAY['company_name','old_email','new_email','confirmation_url','token','support_email']),

('email-change-new', 'Confirm New Email', 'Sent to the NEW email address when a user requests an email change',
 'Xác nhận địa chỉ Email mới - {{company_name}}',
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
    <h1>Xác nhận Địa chỉ Email Mới</h1>
    <p>Xin chào,</p>
    <p>Bạn đang hoàn tất quy trình thay đổi email. Vui lòng xác nhận địa chỉ email mới này bằng cách bấm vào đường dẫn dưới đây:</p>
    <a class="button" href="{{confirmation_url}}">Xác nhận Email mới →</a>
    <p style="margin-top:24px;font-size:13px;color:#94a3b8;">Hoặc bạn có thể nhập mã này: <strong>{{new_token}}</strong></p>
  </div>
  <div class="footer">{{company_name}} | {{support_email}}</div>
</div></body></html>',
 'security', true, ARRAY['company_name','confirmation_url','new_token','support_email'])

ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  content = EXCLUDED.content,
  variables = EXCLUDED.variables;
