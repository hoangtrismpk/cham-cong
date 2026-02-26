/**
 * Email Service - Centralized email sending via Resend API
 * Fetches config + template from DB, renders variables, sends email
 * 
 * Usage:
 *   import { EmailService } from '@/lib/email-service'
 *   await EmailService.send('leave-approved', 'user@example.com', { user_name: 'John', ... })
 */

import { createAdminClient } from '@/utils/supabase/admin'

interface ResendConfig {
    api_key: string
    from_email: string
    from_name: string
    reply_to?: string
    is_configured: boolean
}

interface EmailTemplate {
    id: string
    slug: string
    subject: string
    content: string
    is_active: boolean
}

interface SendResult {
    success: boolean
    messageId?: string
    error?: string
}

export class EmailService {
    /**
     * Send an email using a template slug
     * @param templateSlug - The slug of the email template (e.g., 'leave-approved')
     * @param to - Recipient email address (or array of addresses)
     * @param variables - Key-value pairs to replace {{placeholders}} in the template
     */
    static async send(
        templateSlug: string,
        to: string | string[],
        variables: Record<string, string> = {}
    ): Promise<SendResult> {
        try {
            const supabase = createAdminClient()

            // 1. Get Resend config
            const { data: config, error: cfgErr } = await supabase
                .from('resend_config')
                .select('api_key, from_email, from_name, reply_to, is_configured')
                .limit(1)
                .single()

            if (cfgErr || !config?.is_configured || !config?.api_key) {
                console.warn(`[EmailService] Resend not configured, skipping email: ${templateSlug}`)
                return { success: false, error: 'Resend API not configured' }
            }

            // 2. Get email template
            const { data: template, error: tplErr } = await supabase
                .from('email_templates')
                .select('id, slug, subject, content, is_active')
                .eq('slug', templateSlug)
                .single()

            if (tplErr || !template) {
                console.warn(`[EmailService] Template "${templateSlug}" not found, skipping`)
                return { success: false, error: `Template "${templateSlug}" not found` }
            }

            if (!template.is_active) {
                console.info(`[EmailService] Template "${templateSlug}" is disabled, skipping`)
                return { success: false, error: `Template "${templateSlug}" is disabled` }
            }

            // 3. Inject common variables
            const allVars: Record<string, string> = {
                company_name: config.from_name || 'FHB Vietnam',
                support_email: config.from_email,
                login_url: process.env.NEXT_PUBLIC_APP_URL || 'https://chamcong.fhbvietnam.com',
                action_url: process.env.NEXT_PUBLIC_APP_URL || 'https://chamcong.fhbvietnam.com',
                ...variables,
            }

            // Fallbacks & Aliases for legacy templates
            allVars.email = allVars.user_email || variables.email || ''
            allVars.name = allVars.user_name || variables.name || ''
            allVars.login_link = allVars.login_url
            allVars.action_link = allVars.action_url

            // 4. Render template
            let htmlContent = template.content
            let subjectText = template.subject

            Object.entries(allVars).forEach(([key, value]) => {
                htmlContent = htmlContent.replaceAll(`{{${key}}}`, value)
                subjectText = subjectText.replaceAll(`{{${key}}}`, value)
            })

            // 5. Send via Resend API
            const recipients = Array.isArray(to) ? to : [to]

            const resendRes = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.api_key}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: `${config.from_name} <${config.from_email}>`,
                    to: recipients,
                    reply_to: config.reply_to || undefined,
                    subject: subjectText,
                    html: htmlContent,
                }),
            })

            if (!resendRes.ok) {
                const errBody = await resendRes.json().catch(() => ({}))
                console.error(`[EmailService] Resend error for "${templateSlug}":`, errBody)
                return { success: false, error: errBody.message || resendRes.statusText }
            }

            const resendData = await resendRes.json()
            console.info(`[EmailService] ✅ Email sent: "${templateSlug}" → ${recipients.join(', ')} (ID: ${resendData.id})`)

            return { success: true, messageId: resendData.id }
        } catch (err: any) {
            console.error(`[EmailService] Fatal error sending "${templateSlug}":`, err)
            return { success: false, error: err.message }
        }
    }

    /**
     * Async: Send email returning a Promise
     * Use this when you don't want email sending to fail silently if the runtime kills the process early.
     */
    static async sendAsync(
        templateSlug: string,
        to: string | string[],
        variables: Record<string, string> = {}
    ): Promise<void> {
        try {
            await this.send(templateSlug, to, variables);
        } catch (err) {
            console.error(`[EmailService] Async send failed for "${templateSlug}":`, err)
        }
    }
}
