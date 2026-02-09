-- Create work_reports table
CREATE TABLE IF NOT EXISTS public.work_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT,
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    report_type TEXT NOT NULL CHECK (report_type IN ('daily', 'weekly', 'monthly', 'makeup')),
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed')),
    attachments JSONB DEFAULT '[]'::jsonb, -- Array of {name, url, type, size}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for work_reports
ALTER TABLE public.work_reports ENABLE ROW LEVEL SECURITY;

-- Create report_views table for tracking views
CREATE TABLE IF NOT EXISTS public.report_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_id UUID NOT NULL REFERENCES public.work_reports(id) ON DELETE CASCADE,
    viewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_report_viewer UNIQUE (report_id, viewer_id)
);

-- Enable RLS for report_views
ALTER TABLE public.report_views ENABLE ROW LEVEL SECURITY;

-- Policies for work_reports

-- Users can view their own reports
CREATE POLICY "Users can view own reports" ON public.work_reports
    FOR SELECT USING (auth.uid() = user_id);

-- Admins and Managers can view all reports (adjust based on specific roles logic if needed later)
-- Assuming 'check_if_admin()' exists or using role checks directly.
-- Using a simple role check for now based on public.profiles or auth.jwt() claims if available, 
-- but given existing patterns, let's use the 'profiles' table join or a helper function if standardized.
-- Let's stick to a safe approach: Users with role 'admin', 'manager', 'hr_manager' can view all.

CREATE POLICY "Admins/Managers can view all reports" ON public.work_reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager', 'hr_manager')
        )
    );

-- Users can insert their own reports
CREATE POLICY "Users can insert own reports" ON public.work_reports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own reports (e.g. within same day or until reviewed?) 
-- For now, let's allow update if status is 'submitted'
CREATE POLICY "Users can update own submitted reports" ON public.work_reports
    FOR UPDATE USING (auth.uid() = user_id AND status = 'submitted');

-- Admins/Managers can update status (e.g. to 'reviewed')
CREATE POLICY "Admins/Managers can update reports" ON public.work_reports
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager', 'hr_manager')
        )
    );

-- Policies for report_views

-- Users can view who viewed their reports
CREATE POLICY "Users can view report views for own reports" ON public.report_views
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.work_reports
            WHERE id = report_views.report_id AND user_id = auth.uid()
        )
    );

-- Admins/Managers can view all views
CREATE POLICY "Admins/Managers can view all report views" ON public.report_views
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager', 'hr_manager')
        )
    );

-- Admins/Managers can insert views (when they view a report)
CREATE POLICY "Admins/Managers can insert report views" ON public.report_views
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager', 'hr_manager')
        )
    );
    
-- Allow Admins/Managers to update their own view timestamp (upsert logic often used)
CREATE POLICY "Admins/Managers can update own views" ON public.report_views
    FOR UPDATE USING (
        viewer_id = auth.uid()
    );

-- Triggers for updated_at
CREATE TRIGGER update_work_reports_updated_at
    BEFORE UPDATE ON public.work_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
