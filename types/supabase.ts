export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      attendance_logs: {
        Row: {
          check_in_location: unknown
          check_in_note: string | null
          check_in_time: string | null
          check_out_location: unknown
          check_out_note: string | null
          check_out_time: string | null
          created_at: string
          id: string
          late_minutes: number | null
          overtime_hours: number | null
          status: string | null
          user_id: string
          work_date: string
        }
        Insert: {
          check_in_location?: unknown
          check_in_note?: string | null
          check_in_time?: string | null
          check_out_location?: unknown
          check_out_note?: string | null
          check_out_time?: string | null
          created_at?: string
          id?: string
          late_minutes?: number | null
          overtime_hours?: number | null
          status?: string | null
          user_id: string
          work_date?: string
        }
        Update: {
          check_in_location?: unknown
          check_in_note?: string | null
          check_in_time?: string | null
          check_out_location?: unknown
          check_out_note?: string | null
          check_out_time?: string | null
          created_at?: string
          id?: string
          late_minutes?: number | null
          overtime_hours?: number | null
          status?: string | null
          user_id?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          description: string | null
          error_message: string | null
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          resource_id: string | null
          resource_type: string
          status: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
          user_role: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          description?: string | null
          error_message?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type: string
          status?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
          user_role?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          error_message?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string
          status?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      available_permissions: {
        Row: {
          action: string
          category: string
          display_name: string
          id: string
          resource: string
        }
        Insert: {
          action: string
          category: string
          display_name: string
          id: string
          resource: string
        }
        Update: {
          action?: string
          category?: string
          display_name?: string
          id?: string
          resource?: string
        }
        Relationships: []
      }
      change_requests: {
        Row: {
          admin_note: string | null
          created_at: string
          id: string
          payload: Json | null
          priority: string | null
          reason: string | null
          status: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          priority?: string | null
          reason?: string | null
          status?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          priority?: string | null
          reason?: string | null
          status?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_requests_user_id_fkey_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_schedule_config: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string | null
          description: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          config_key: string
          config_value: Json
          created_at?: string | null
          description?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      daily_work_summary: {
        Row: {
          actual_working_hours: number | null
          calculated_at: string | null
          clock_in_time: string | null
          clock_out_time: string | null
          clocked_hours: number | null
          employee_id: string
          employment_type: string | null
          has_full_day_leave: boolean | null
          id: string
          leave_details: Json | null
          needs_recalculation: boolean | null
          payable_hours: number | null
          scheduled_end_time: string | null
          scheduled_hours: number | null
          scheduled_start_time: string | null
          total_leave_hours: number | null
          work_date: string
        }
        Insert: {
          actual_working_hours?: number | null
          calculated_at?: string | null
          clock_in_time?: string | null
          clock_out_time?: string | null
          clocked_hours?: number | null
          employee_id: string
          employment_type?: string | null
          has_full_day_leave?: boolean | null
          id?: string
          leave_details?: Json | null
          needs_recalculation?: boolean | null
          payable_hours?: number | null
          scheduled_end_time?: string | null
          scheduled_hours?: number | null
          scheduled_start_time?: string | null
          total_leave_hours?: number | null
          work_date: string
        }
        Update: {
          actual_working_hours?: number | null
          calculated_at?: string | null
          clock_in_time?: string | null
          clock_out_time?: string | null
          clocked_hours?: number | null
          employee_id?: string
          employment_type?: string | null
          has_full_day_leave?: boolean | null
          id?: string
          leave_details?: Json | null
          needs_recalculation?: boolean | null
          payable_hours?: number | null
          scheduled_end_time?: string | null
          scheduled_hours?: number | null
          scheduled_start_time?: string | null
          total_leave_hours?: number | null
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_work_summary_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          category: string
          content: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          subject: string
          updated_at: string
          updated_by: string
          variables: string[]
        }
        Insert: {
          category?: string
          content?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          subject?: string
          updated_at?: string
          updated_by?: string
          variables?: string[]
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          subject?: string
          updated_at?: string
          updated_by?: string
          variables?: string[]
        }
        Relationships: []
      }
      employee_default_schedules: {
        Row: {
          allow_overtime: boolean | null
          created_at: string | null
          custom_end_time: string | null
          custom_start_time: string | null
          day_of_week: number
          employee_id: string
          id: string
          is_template: boolean | null
          shift_type: string
          updated_at: string | null
        }
        Insert: {
          allow_overtime?: boolean | null
          created_at?: string | null
          custom_end_time?: string | null
          custom_start_time?: string | null
          day_of_week: number
          employee_id: string
          id?: string
          is_template?: boolean | null
          shift_type: string
          updated_at?: string | null
        }
        Update: {
          allow_overtime?: boolean | null
          created_at?: string | null
          custom_end_time?: string | null
          custom_start_time?: string | null
          day_of_week?: number
          employee_id?: string
          id?: string
          is_template?: boolean | null
          shift_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_default_schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fcm_tokens: {
        Row: {
          created_at: string | null
          device_type: string | null
          id: string
          last_used_at: string | null
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_type?: string | null
          id?: string
          last_used_at?: string | null
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_type?: string | null
          id?: string
          last_used_at?: string | null
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      known_devices: {
        Row: {
          created_at: string | null
          device_name: string
          fingerprint: string
          id: string
          ip_address: string | null
          last_seen: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_name?: string
          fingerprint: string
          id?: string
          ip_address?: string | null
          last_seen?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_name?: string
          fingerprint?: string
          id?: string
          ip_address?: string | null
          last_seen?: string | null
          user_id?: string
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          admin_note: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          duration_hours: number | null
          employee_id: string | null
          end_time: string | null
          id: string
          image_url: string | null
          leave_date: string
          leave_type: string
          priority: string | null
          reason: string | null
          rejection_reason: string | null
          start_time: string | null
          status: string | null
          total_hours: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          duration_hours?: number | null
          employee_id?: string | null
          end_time?: string | null
          id?: string
          image_url?: string | null
          leave_date: string
          leave_type: string
          priority?: string | null
          reason?: string | null
          rejection_reason?: string | null
          start_time?: string | null
          status?: string | null
          total_hours?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_note?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          duration_hours?: number | null
          employee_id?: string | null
          end_time?: string | null
          id?: string
          image_url?: string | null
          leave_date?: string
          leave_type?: string
          priority?: string | null
          reason?: string | null
          rejection_reason?: string | null
          start_time?: string | null
          status?: string | null
          total_hours?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_user_id_fkey_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_campaigns: {
        Row: {
          created_at: string
          created_by: string | null
          failure_count: number | null
          id: string
          link: string | null
          message: string
          metadata: Json | null
          scheduled_at: string | null
          status: string
          success_count: number | null
          target_type: string
          target_value: Json | null
          title: string
          total_recipients: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          failure_count?: number | null
          id?: string
          link?: string | null
          message: string
          metadata?: Json | null
          scheduled_at?: string | null
          status?: string
          success_count?: number | null
          target_type: string
          target_value?: Json | null
          title: string
          total_recipients?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          failure_count?: number | null
          id?: string
          link?: string | null
          message?: string
          metadata?: Json | null
          scheduled_at?: string | null
          status?: string
          success_count?: number | null
          target_type?: string
          target_value?: Json | null
          title?: string
          total_recipients?: number | null
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          campaign_id: string | null
          clicked_at: string | null
          id: string
          notification_type: string
          sent_at: string | null
          shift_id: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          clicked_at?: string | null
          id?: string
          notification_type: string
          sent_at?: string | null
          shift_id?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          clicked_at?: string | null
          id?: string
          notification_type?: string
          sent_at?: string | null
          shift_id?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "notification_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "work_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          campaign_id: string | null
          clicked_at: string | null
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string | null
          report_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          clicked_at?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          report_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          clicked_at?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          report_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "notification_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "work_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      overtime_requests: {
        Row: {
          actual_hours: number | null
          admin_note: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          id: string
          planned_hours: number
          reason: string | null
          request_date: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          actual_hours?: number | null
          admin_note?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          planned_hours?: number
          reason?: string | null
          request_date: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          actual_hours?: number | null
          admin_note?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          planned_hours?: number
          reason?: string | null
          request_date?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "overtime_requests_user_id_fkey_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          auto_checkin_enabled: boolean | null
          auto_checkout_enabled: boolean | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          clock_in_remind_minutes: number | null
          clock_out_remind_minutes: number | null
          clock_out_remind_mode: string | null
          created_at: string
          department: string | null
          dob: string | null
          email: string | null
          emergency_contact: Json | null
          employee_code: string | null
          employment_type: string | null
          first_name: string | null
          full_name: string | null
          gender: string | null
          id: string
          job_title: string | null
          last_name: string | null
          manager_id: string | null
          numeric_id: number
          phone: string | null
          push_enabled: boolean | null
          require_password_change: boolean | null
          role: string | null
          role_id: string | null
          skills: string[] | null
          start_date: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          auto_checkin_enabled?: boolean | null
          auto_checkout_enabled?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          clock_in_remind_minutes?: number | null
          clock_out_remind_minutes?: number | null
          clock_out_remind_mode?: string | null
          created_at?: string
          department?: string | null
          dob?: string | null
          email?: string | null
          emergency_contact?: Json | null
          employee_code?: string | null
          employment_type?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          job_title?: string | null
          last_name?: string | null
          manager_id?: string | null
          numeric_id?: number
          phone?: string | null
          push_enabled?: boolean | null
          require_password_change?: boolean | null
          role?: string | null
          role_id?: string | null
          skills?: string[] | null
          start_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          auto_checkin_enabled?: boolean | null
          auto_checkout_enabled?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          clock_in_remind_minutes?: number | null
          clock_out_remind_minutes?: number | null
          clock_out_remind_mode?: string | null
          created_at?: string
          department?: string | null
          dob?: string | null
          email?: string | null
          emergency_contact?: Json | null
          employee_code?: string | null
          employment_type?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          job_title?: string | null
          last_name?: string | null
          manager_id?: string | null
          numeric_id?: number
          phone?: string | null
          push_enabled?: boolean | null
          require_password_change?: boolean | null
          role?: string | null
          role_id?: string | null
          skills?: string[] | null
          start_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      report_views: {
        Row: {
          id: string
          report_id: string
          viewed_at: string | null
          viewer_id: string
        }
        Insert: {
          id?: string
          report_id: string
          viewed_at?: string | null
          viewer_id: string
        }
        Update: {
          id?: string
          report_id?: string
          viewed_at?: string | null
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_views_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "work_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      resend_config: {
        Row: {
          api_key: string
          created_at: string
          from_email: string
          from_name: string
          id: string
          is_configured: boolean
          last_tested_at: string | null
          reply_to: string | null
          test_status: string | null
          updated_at: string
        }
        Insert: {
          api_key?: string
          created_at?: string
          from_email?: string
          from_name?: string
          id?: string
          is_configured?: boolean
          last_tested_at?: string | null
          reply_to?: string | null
          test_status?: string | null
          updated_at?: string
        }
        Update: {
          api_key?: string
          created_at?: string
          from_email?: string
          from_name?: string
          id?: string
          is_configured?: boolean
          last_tested_at?: string | null
          reply_to?: string | null
          test_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          is_system_role: boolean | null
          name: string
          permissions: string[]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_system_role?: boolean | null
          name: string
          permissions?: string[]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_system_role?: boolean | null
          name?: string
          permissions?: string[]
          updated_at?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string | null
          id: string
          setting_key: string
          setting_value: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          setting_key: string
          setting_value: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          category: string
          description: string | null
          key: string
          subcategory: string | null
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          category: string
          description?: string | null
          key: string
          subcategory?: string | null
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          category?: string
          description?: string | null
          key?: string
          subcategory?: string | null
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wordpress_config: {
        Row: {
          app_password: string
          created_at: string | null
          id: string
          is_active: boolean | null
          last_tested_at: string | null
          site_url: string
          test_status: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          app_password: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_tested_at?: string | null
          site_url: string
          test_status?: string | null
          updated_at?: string | null
          username: string
        }
        Update: {
          app_password?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_tested_at?: string | null
          site_url?: string
          test_status?: string | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      work_reports: {
        Row: {
          admin_viewed: boolean | null
          attachments: Json | null
          content: string | null
          created_at: string | null
          id: string
          is_resubmitted: boolean | null
          next_day_plan: string | null
          next_month_plan: string | null
          next_plan: string | null
          next_week_plan: string | null
          report_date: string
          report_type: string
          reviewer_note: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_viewed?: boolean | null
          attachments?: Json | null
          content?: string | null
          created_at?: string | null
          id?: string
          is_resubmitted?: boolean | null
          next_day_plan?: string | null
          next_month_plan?: string | null
          next_plan?: string | null
          next_week_plan?: string | null
          report_date?: string
          report_type: string
          reviewer_note?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_viewed?: boolean | null
          attachments?: Json | null
          content?: string | null
          created_at?: string | null
          id?: string
          is_resubmitted?: boolean | null
          next_day_plan?: string | null
          next_month_plan?: string | null
          next_plan?: string | null
          next_week_plan?: string | null
          report_date?: string
          report_type?: string
          reviewer_note?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      work_schedules: {
        Row: {
          allow_overtime: boolean | null
          created_at: string
          end_time: string | null
          id: string
          location: string | null
          members_count: number | null
          shift_type: string
          start_time: string | null
          status: string | null
          title: string | null
          user_id: string
          work_date: string
        }
        Insert: {
          allow_overtime?: boolean | null
          created_at?: string
          end_time?: string | null
          id?: string
          location?: string | null
          members_count?: number | null
          shift_type: string
          start_time?: string | null
          status?: string | null
          title?: string | null
          user_id: string
          work_date: string
        }
        Update: {
          allow_overtime?: boolean | null
          created_at?: string
          end_time?: string | null
          id?: string
          location?: string | null
          members_count?: number | null
          shift_type?: string
          start_time?: string | null
          status?: string | null
          title?: string | null
          user_id?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_schedules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_leave_duration:
        | {
            Args: {
              p_end_time: string
              p_leave_type: string
              p_scheduled_hours: number
              p_start_time: string
            }
            Returns: number
          }
        | {
            Args: {
              p_break_end?: string
              p_break_start?: string
              p_end_time: string
              p_start_time: string
            }
            Returns: number
          }
      check_if_admin: { Args: never; Returns: boolean }
      check_user_permission: {
        Args: { required_permission: string; user_id: string }
        Returns: boolean
      }
      cleanup_old_audit_logs: { Args: never; Returns: undefined }
      create_audit_log:
        | {
            Args: {
              p_action: string
              p_description?: string
              p_error_message?: string
              p_new_values?: Json
              p_old_values?: Json
              p_resource_id: string
              p_resource_type: string
              p_status?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_action: string
              p_description?: string
              p_ip_address?: string
              p_new_values?: Json
              p_old_values?: Json
              p_resource_id?: string
              p_resource_type: string
              p_user_agent?: string
              p_user_id: string
            }
            Returns: string
          }
      has_permission: { Args: { required_perm: string }; Returns: boolean }
      is_manager_of: { Args: { target_user_id: string }; Returns: boolean }
      register_fcm_token: {
        Args: { p_device_type: string; p_token: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
