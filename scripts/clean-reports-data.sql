-- =====================================================
-- CLEAN REPORTS DATA
-- Created: 2026-02-07
-- Purpose: Delete all work reports data for testing
-- =====================================================

-- Delete all report views first (foreign key constraint)
DELETE FROM report_views;

-- Delete all work reports
DELETE FROM work_reports;

-- Reset sequences (if any)
-- ALTER SEQUENCE work_reports_id_seq RESTART WITH 1;

-- Verify deletion
SELECT COUNT(*) as total_reports FROM work_reports;
SELECT COUNT(*) as total_views FROM report_views;

-- =====================================================
-- DONE! All reports data has been cleaned.
-- =====================================================
