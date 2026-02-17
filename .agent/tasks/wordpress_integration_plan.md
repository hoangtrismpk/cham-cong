# 📋 Implementation Plan: WordPress Integration

**Ngày tạo**: 2026-02-07  
**Người yêu cầu**: User  
**Độ ưu tiên**: High  
**Ước tính thời gian**: 4-6 giờ

---

## 🎯 Mục tiêu

Thêm tính năng **kết nối WordPress Media Library** vào phần **Admin > Settings > Integrations**, cho phép:
1. Cấu hình kết nối WordPress (URL, Username, App Password)
2. Kiểm tra kết nối với WordPress REST API
3. Upload file lên WordPress Media Library
4. Điều chỉnh các trang có upload file để phụ thuộc vào cấu hình này

---

## 📊 Phân tích Hiện trạng

### Các trang hiện có upload file:
1. **Reports** (`components/reports/report-form.tsx`)
   - Dòng 36-41: `handleFileChange` - Chọn file local
   - Dòng 56-62: Mock upload với `URL.createObjectURL`
   - ❌ **Vấn đề**: Chỉ tạo blob URL tạm thời, không upload thật

2. **Leave Requests** (`components/leaves/leave-request-form.tsx`)
   - Dòng 246-260: Input URL ảnh thủ công
   - ❌ **Vấn đề**: Người dùng phải tự upload và paste URL

### Trang Settings hiện tại:
- `app/admin/settings/integrations/page.tsx`: Chỉ là placeholder "Coming in v2.0"

---

## 🏗️ Kiến trúc Giải pháp

### 1. Database Schema
```sql
-- Bảng lưu cấu hình WordPress
CREATE TABLE wordpress_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_url TEXT NOT NULL,
  username TEXT NOT NULL,
  app_password TEXT NOT NULL, -- Encrypted
  is_active BOOLEAN DEFAULT true,
  last_tested_at TIMESTAMP,
  test_status TEXT, -- 'success' | 'failed'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. API Endpoints

#### a. Config Management
- `POST /api/admin/wordpress/config` - Lưu cấu hình
- `GET /api/admin/wordpress/config` - Lấy cấu hình hiện tại
- `POST /api/admin/wordpress/test` - Test kết nối
- `DELETE /api/admin/wordpress/config` - Xóa cấu hình

#### b. Media Upload
- `POST /api/wordpress/upload` - Upload file lên WordPress
- `GET /api/wordpress/media` - Lấy danh sách media (gallery)

### 3. Frontend Components

#### a. Settings Page
**File**: `app/admin/settings/integrations/page.tsx`
- Form cấu hình WordPress
- Test connection button
- Status indicator
- Security warning

#### b. WordPress Media Picker
**File**: `components/wordpress/media-picker.tsx`
- Upload button
- Media gallery modal
- File preview
- Progress indicator

#### c. Upload Hook
**File**: `hooks/use-wordpress-upload.ts`
- Check config status
- Upload file logic
- Error handling

---

## 📝 Chi tiết Triển khai

### Phase 1: Database & Backend (2h)

#### Task 1.1: Tạo Migration
**File**: `migrations/YYYYMMDD_wordpress_config.sql`
```sql
CREATE TABLE wordpress_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_url TEXT NOT NULL,
  username TEXT NOT NULL,
  app_password TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_tested_at TIMESTAMP,
  test_status TEXT CHECK (test_status IN ('success', 'failed', 'pending')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index cho query nhanh
CREATE INDEX idx_wordpress_config_active ON wordpress_config(is_active);
```

#### Task 1.2: API Routes
**File**: `app/api/admin/wordpress/config/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'

// GET - Lấy cấu hình
export async function GET(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const config = await db.query(
    'SELECT id, site_url, username, is_active, last_tested_at, test_status FROM wordpress_config WHERE is_active = true LIMIT 1'
  )

  return NextResponse.json(config.rows[0] || null)
}

// POST - Lưu cấu hình
export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { site_url, username, app_password } = await req.json()

  // Validate
  if (!site_url || !username || !app_password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Deactivate old configs
  await db.query('UPDATE wordpress_config SET is_active = false')

  // Insert new config
  const result = await db.query(
    `INSERT INTO wordpress_config (site_url, username, app_password, is_active)
     VALUES ($1, $2, $3, true)
     RETURNING id, site_url, username, is_active`,
    [site_url, username, app_password]
  )

  return NextResponse.json(result.rows[0])
}

// DELETE - Xóa cấu hình
export async function DELETE(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await db.query('UPDATE wordpress_config SET is_active = false')
  return NextResponse.json({ success: true })
}
```

**File**: `app/api/admin/wordpress/test/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { site_url, username, app_password } = await req.json()

  try {
    // Test WordPress REST API
    const response = await fetch(`${site_url}/wp-json/wp/v2/users/me`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${username}:${app_password}`).toString('base64')}`
      }
    })

    if (!response.ok) {
      throw new Error('Authentication failed')
    }

    const user = await response.json()

    // Update test status
    await db.query(
      `UPDATE wordpress_config 
       SET last_tested_at = NOW(), test_status = 'success'
       WHERE is_active = true`
    )

    return NextResponse.json({ 
      success: true, 
      user: { id: user.id, name: user.name } 
    })
  } catch (error: any) {
    await db.query(
      `UPDATE wordpress_config 
       SET last_tested_at = NOW(), test_status = 'failed'
       WHERE is_active = true`
    )

    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 400 })
  }
}
```

**File**: `app/api/wordpress/upload/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get active config
  const configResult = await db.query(
    'SELECT site_url, username, app_password FROM wordpress_config WHERE is_active = true LIMIT 1'
  )

  if (configResult.rows.length === 0) {
    return NextResponse.json({ 
      error: 'WordPress chưa được cấu hình. Vui lòng liên hệ Admin.' 
    }, { status: 400 })
  }

  const config = configResult.rows[0]
  const formData = await req.formData()
  const file = formData.get('file') as File

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  try {
    // Upload to WordPress
    const wpFormData = new FormData()
    wpFormData.append('file', file)

    const response = await fetch(`${config.site_url}/wp-json/wp/v2/media`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${config.username}:${config.app_password}`).toString('base64')}`
      },
      body: wpFormData
    })

    if (!response.ok) {
      throw new Error('Upload failed')
    }

    const media = await response.json()

    return NextResponse.json({
      success: true,
      url: media.source_url,
      id: media.id,
      title: media.title.rendered
    })
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
```

---

### Phase 2: Settings UI (1.5h)

#### Task 2.1: Settings Page
**File**: `app/admin/settings/integrations/page.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, XCircle, ExternalLink } from 'lucide-react'

interface WordPressConfig {
  id: string
  site_url: string
  username: string
  is_active: boolean
  last_tested_at: string | null
  test_status: 'success' | 'failed' | 'pending' | null
}

export default function IntegrationsSettingsPage() {
  const [config, setConfig] = useState<WordPressConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  const [formData, setFormData] = useState({
    site_url: '',
    username: '',
    app_password: ''
  })

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/admin/wordpress/config')
      if (res.ok) {
        const data = await res.json()
        if (data) {
          setConfig(data)
          setFormData({
            site_url: data.site_url,
            username: data.username,
            app_password: '••••••••' // Masked
          })
        }
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.site_url || !formData.username || !formData.app_password) {
      toast.error('Vui lòng điền đầy đủ thông tin')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/admin/wordpress/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        toast.success('Lưu cấu hình thành công!')
        await loadConfig()
      } else {
        throw new Error('Failed to save')
      }
    } catch (error) {
      toast.error('Lưu cấu hình thất bại')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      const res = await fetch('/api/admin/wordpress/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()

      if (data.success) {
        toast.success(`Kết nối thành công! User: ${data.user.name}`)
        await loadConfig()
      } else {
        toast.error(`Kết nối thất bại: ${data.error}`)
      }
    } catch (error) {
      toast.error('Không thể kiểm tra kết nối')
    } finally {
      setTesting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Bạn có chắc muốn xóa cấu hình WordPress?')) return

    try {
      const res = await fetch('/api/admin/wordpress/config', {
        method: 'DELETE'
      })

      if (res.ok) {
        toast.success('Đã xóa cấu hình')
        setConfig(null)
        setFormData({ site_url: '', username: '', app_password: '' })
      }
    } catch (error) {
      toast.error('Xóa cấu hình thất bại')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Tích hợp WordPress</h1>
        <p className="text-slate-400 mt-2">
          Kết nối với WordPress để upload file lên Media Library
        </p>
      </div>

      {/* Status Card */}
      {config && (
        <div className={`border rounded-lg p-4 ${
          config.test_status === 'success' 
            ? 'bg-green-500/10 border-green-500/30' 
            : 'bg-red-500/10 border-red-500/30'
        }`}>
          <div className="flex items-center gap-3">
            {config.test_status === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            ) : (
              <XCircle className="h-5 w-5 text-red-400" />
            )}
            <div>
              <p className="font-medium text-white">
                {config.test_status === 'success' ? 'Đã kết nối' : 'Chưa kết nối'}
              </p>
              {config.last_tested_at && (
                <p className="text-sm text-slate-400">
                  Kiểm tra lần cuối: {new Date(config.last_tested_at).toLocaleString('vi-VN')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-[#161b22] border border-slate-800 rounded-lg p-6 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="site_url">WordPress Site URL</Label>
          <Input
            id="site_url"
            type="url"
            placeholder="https://yoursite.com"
            value={formData.site_url}
            onChange={(e) => setFormData({ ...formData, site_url: e.target.value })}
            className="bg-[#0d131a] border-slate-700"
          />
          <p className="text-xs text-slate-500">
            URL đầy đủ của WordPress site (không có dấu / ở cuối)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            type="text"
            placeholder="admin"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            className="bg-[#0d131a] border-slate-700"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="app_password">Application Password</Label>
          <Input
            id="app_password"
            type="password"
            placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
            value={formData.app_password}
            onChange={(e) => setFormData({ ...formData, app_password: e.target.value })}
            className="bg-[#0d131a] border-slate-700"
          />
          <p className="text-xs text-slate-500">
            Tạo Application Password tại: 
            <a 
              href={`${formData.site_url}/wp-admin/profile.php`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:underline ml-1"
            >
              WordPress Profile <ExternalLink className="inline h-3 w-3" />
            </a>
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-slate-800">
          <Button
            onClick={handleTest}
            disabled={testing || !formData.site_url}
            variant="outline"
            className="border-slate-700"
          >
            {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Kiểm tra kết nối
          </Button>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-cyan-500 hover:bg-cyan-600"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lưu cấu hình
          </Button>

          {config && (
            <Button
              onClick={handleDelete}
              variant="destructive"
              className="ml-auto"
            >
              Xóa cấu hình
            </Button>
          )}
        </div>
      </div>

      {/* Security Warning */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
        <p className="text-sm text-yellow-200">
          ⚠️ <strong>Lưu ý bảo mật:</strong> Application Password được mã hóa trong database. 
          Chỉ Admin mới có quyền cấu hình.
        </p>
      </div>
    </div>
  )
}
```

---

### Phase 3: Upload Component (1.5h)

#### Task 3.1: WordPress Upload Hook
**File**: `hooks/use-wordpress-upload.ts`

```typescript
import { useState } from 'react'
import { toast } from 'sonner'

interface UploadResult {
  success: boolean
  url?: string
  id?: number
  title?: string
  error?: string
}

export function useWordPressUpload() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const uploadFile = async (file: File): Promise<UploadResult> => {
    setUploading(true)
    setProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch('/api/wordpress/upload', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)
      setProgress(100)

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      toast.success('Upload thành công!')
      return data
    } catch (error: any) {
      toast.error(error.message || 'Upload thất bại')
      return { success: false, error: error.message }
    } finally {
      setUploading(false)
      setTimeout(() => setProgress(0), 1000)
    }
  }

  return { uploadFile, uploading, progress }
}
```

#### Task 3.2: Media Picker Component
**File**: `components/wordpress/media-picker.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, Loader2, CheckCircle } from 'lucide-react'
import { useWordPressUpload } from '@/hooks/use-wordpress-upload'

interface MediaPickerProps {
  onUploadSuccess: (url: string) => void
  accept?: string
  maxSize?: number // MB
}

export function MediaPicker({ 
  onUploadSuccess, 
  accept = 'image/*,application/pdf,.doc,.docx',
  maxSize = 10 
}: MediaPickerProps) {
  const { uploadFile, uploading, progress } = useWordPressUpload()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate size
    if (file.size > maxSize * 1024 * 1024) {
      alert(`File quá lớn! Tối đa ${maxSize}MB`)
      return
    }

    setSelectedFile(file)

    // Auto upload
    const result = await uploadFile(file)
    if (result.success && result.url) {
      onUploadSuccess(result.url)
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <Button
          variant="outline"
          disabled={uploading}
          className="w-full border-dashed border-slate-700 hover:border-cyan-500 transition-colors"
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang upload... {progress}%
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Chọn file để upload
            </>
          )}
        </Button>
      </div>

      {selectedFile && !uploading && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <CheckCircle className="h-4 w-4 text-green-400" />
          {selectedFile.name}
        </div>
      )}

      {uploading && (
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-cyan-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
}
```

---

### Phase 4: Integration (1h)

#### Task 4.1: Update Report Form
**File**: `components/reports/report-form.tsx`

Thay thế phần upload (dòng 212-237) bằng:

```typescript
import { MediaPicker } from '@/components/wordpress/media-picker'

// ... trong component

const [uploadedUrls, setUploadedUrls] = useState<string[]>([])

// ... thay thế dropzone bằng:

<MediaPicker
  onUploadSuccess={(url) => {
    setUploadedUrls([...uploadedUrls, url])
    toast.success('File đã được upload lên WordPress!')
  }}
/>

{/* Display uploaded files */}
{uploadedUrls.map((url, idx) => (
  <div key={idx} className="flex items-center gap-2 text-sm">
    <a href={url} target="_blank" className="text-cyan-400 hover:underline">
      {url.split('/').pop()}
    </a>
    <button onClick={() => setUploadedUrls(uploadedUrls.filter((_, i) => i !== idx))}>
      <X className="h-4 w-4" />
    </button>
  </div>
))}
```

#### Task 4.2: Update Leave Request Form
**File**: `components/leaves/leave-request-form.tsx`

Thay thế input URL (dòng 245-260) bằng:

```typescript
import { MediaPicker } from '@/components/wordpress/media-picker'

<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Đính kèm ảnh (nếu có)
  </label>
  <MediaPicker
    onUploadSuccess={(url) => setImageUrl(url)}
    accept="image/*"
    maxSize={5}
  />
  {imageUrl && (
    <div className="mt-2">
      <img src={imageUrl} alt="Preview" className="max-w-xs rounded border" />
    </div>
  )}
</div>
```

---

## ✅ Checklist

### Backend
- [ ] Tạo migration `wordpress_config`
- [ ] API: GET /api/admin/wordpress/config
- [ ] API: POST /api/admin/wordpress/config
- [ ] API: DELETE /api/admin/wordpress/config
- [ ] API: POST /api/admin/wordpress/test
- [ ] API: POST /api/wordpress/upload
- [ ] Encrypt app_password trong DB

### Frontend
- [ ] Settings page UI
- [ ] Test connection button
- [ ] Status indicator
- [ ] MediaPicker component
- [ ] useWordPressUpload hook
- [ ] Update Report Form
- [ ] Update Leave Request Form

### Testing
- [ ] Test save config
- [ ] Test connection
- [ ] Test upload file
- [ ] Test error handling (no config)
- [ ] Test permission (non-admin)

### Documentation
- [ ] Update README với hướng dẫn cấu hình WordPress
- [ ] Comment code
- [ ] Error messages tiếng Việt

---

## 🚨 Lưu ý Quan trọng

1. **Bảo mật**:
   - Encrypt `app_password` trước khi lưu DB
   - Chỉ Admin mới được cấu hình
   - Validate URL để tránh SSRF

2. **Error Handling**:
   - Nếu chưa cấu hình WordPress → Hiển thị thông báo rõ ràng
   - Nếu upload fail → Rollback và thông báo lỗi

3. **UX**:
   - Progress bar khi upload
   - Preview ảnh sau khi upload
   - Confirm trước khi xóa config

---

## 📚 Tài liệu Tham khảo

- [WordPress REST API - Media](https://developer.wordpress.org/rest-api/reference/media/)
- [WordPress Application Passwords](https://make.wordpress.org/core/2020/11/05/application-passwords-integration-guide/)

---

**Sẵn sàng triển khai!** 🚀
