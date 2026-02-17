# 🚀 QUICK START: Apply WordPress Migration

## ⚡ Cách nhanh nhất (2 phút)

### Bước 1: Mở Supabase SQL Editor
👉 Click vào link này: https://supabase.com/dashboard/project/uffyhbinfvivqnjrhvvq/sql/new

### Bước 2: Copy SQL bên dưới

```sql
-- Migration: WordPress Configuration
-- Created: 2026-02-07
-- Purpose: Store WordPress integration settings for media upload

-- Create wordpress_config table
CREATE TABLE IF NOT EXISTS wordpress_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_url TEXT NOT NULL,
  username TEXT NOT NULL,
  app_password TEXT NOT NULL, -- Will be encrypted in application layer
  is_active BOOLEAN DEFAULT true,
  last_tested_at TIMESTAMP,
  test_status TEXT CHECK (test_status IN ('success', 'failed', 'pending')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_wordpress_config_active ON wordpress_config(is_active);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_wordpress_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_wordpress_config_updated_at
  BEFORE UPDATE ON wordpress_config
  FOR EACH ROW
  EXECUTE FUNCTION update_wordpress_config_updated_at();

-- Add comment
COMMENT ON TABLE wordpress_config IS 'Stores WordPress integration configuration for media uploads';
COMMENT ON COLUMN wordpress_config.app_password IS 'WordPress Application Password (should be encrypted)';
COMMENT ON COLUMN wordpress_config.test_status IS 'Last connection test result: success, failed, or pending';
```

### Bước 3: Paste vào SQL Editor và Click "RUN"

### Bước 4: Verify
Chạy query này để kiểm tra:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'wordpress_config';
```

Nếu trả về 1 row → ✅ **Thành công!**

---

## 🎉 Xong rồi!

Bây giờ có thể:
1. Vào **Admin > Settings > Integrations**
2. Cấu hình WordPress
3. Upload file ngay!

---

**Thời gian**: < 2 phút  
**Không cần**: Password, CLI tools, hay bất cứ thứ gì phức tạp!
