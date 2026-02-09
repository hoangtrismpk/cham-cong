-- Thêm cột theo dõi trạng thái phản hồi cho Admin
ALTER TABLE public.work_reports 
ADD COLUMN IF NOT EXISTS is_resubmitted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_viewed BOOLEAN DEFAULT true;

-- Tạo index để query nhanh hơn
CREATE INDEX IF NOT EXISTS idx_work_reports_admin_viewed ON public.work_reports(admin_viewed);
CREATE INDEX IF NOT EXISTS idx_work_reports_resubmitted ON public.work_reports(is_resubmitted);
