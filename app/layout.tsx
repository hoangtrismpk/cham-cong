import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import 'material-symbols/outlined.css'
import { I18nProvider } from '@/contexts/i18n-context'
import { Toaster } from "@/components/ui/sonner"
import { RecaptchaProvider } from '@/components/recaptcha-provider'
import { FCMManager } from '@/components/fcm-manager'
import { getWorkSettings, getSecuritySettings } from '@/app/actions/settings'


const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getWorkSettings()
  const title = settings?.company_name || 'Chấm Công FHB Vietnam'
  const description = 'Hệ thống Quản lý Nhân sự thông minh và Chấm công tự động'

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://chamcong.fhbvietnam.com'),
    title: {
      default: title,
      template: `%s | ${title}`,
    },
    description: description,
    keywords: ['chấm công', 'quản lý nhân sự', 'nhân sự', 'HR system', 'attendance', 'FHB Vietnam'],
    authors: [{ name: 'FHB Vietnam' }],
    openGraph: {
      type: 'website',
      locale: 'vi_VN',
      url: '/',
      title: title,
      description: description,
      siteName: title,
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
    },
    robots: {
      index: true,
      follow: true,
    }
  }
}

import { LoadingProvider } from '@/contexts/loading-context'

import { NotificationProvider } from '@/contexts/notification-context'

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const securitySettings = await getSecuritySettings()
  const enabled = securitySettings.recaptcha_enabled
  const siteKey = enabled ? securitySettings.recaptcha_site_key : undefined

  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} dark`} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json?v=3" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/iconapp.png" />
        <link rel="apple-touch-startup-image" href="/splash_image.png" />
        <meta name="theme-color" content="#0a0f14" />
        {/* Pre-emptive handler: runs BEFORE Next.js registers its own unhandledrejection listener */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('unhandledrejection', function(event) {
                var reason = event.reason;
                var msg = (reason && reason.message) ? reason.message : String(reason || '');
                if (msg === 'Timeout' || msg === 'TimeoutError' || msg.indexOf('Timeout') !== -1) {
                  event.preventDefault();
                  event.stopImmediatePropagation();
                  console.warn('[Suppressed] Unhandled rejection:', msg);
                }
              });
            `,
          }}
        />
      </head>
      <body className="font-display antialiased bg-background text-foreground" suppressHydrationWarning>
        <I18nProvider>
          <LoadingProvider>
            <RecaptchaProvider siteKey={siteKey} enabled={enabled}>
              <NotificationProvider>
                <FCMManager />

                {/* JSON-LD Schema Markup */}
                <script
                  type="application/ld+json"
                  dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                      "@context": "https://schema.org",
                      "@type": "SoftwareApplication",
                      "name": "Hệ thống Quản lý Nhân sự",
                      "applicationCategory": "BusinessApplication",
                      "operatingSystem": "All",
                      "provider": {
                        "@type": "Organization",
                        "name": "FHB Vietnam",
                        "url": "https://fhbvietnam.com"
                      }
                    })
                  }}
                />

                {children}
              </NotificationProvider>
            </RecaptchaProvider>
            <Toaster />
          </LoadingProvider>
        </I18nProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                  }, function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
