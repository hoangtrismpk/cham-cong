import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
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

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getWorkSettings()
  return {
    title: settings?.company_name || 'Chấm Công FHB Vietnam',
    description: 'Smart Human Resource Management',
  }
}

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
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/iconapp.png" />
        <meta name="theme-color" content="#22d3ee" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
      </head>
      <body className="font-display antialiased bg-background text-foreground">
        <I18nProvider>
          <RecaptchaProvider siteKey={siteKey} enabled={enabled}>
            <FCMManager />
            {children}
          </RecaptchaProvider>
          <Toaster />
        </I18nProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/firebase-messaging-sw.js').then(function(registration) {
                    console.log('FCM ServiceWorker registration successful with scope: ', registration.scope);
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
