import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value)
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) => {
                        response.cookies.set(name, value, options)
                    })
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Protect routes
    // Only redirect if user is NOT logged in and trying to access protected routes
    const pathname = request.nextUrl.pathname
    const isProtectedRoute = pathname === '/' ||
        pathname.startsWith('/admin') ||
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/schedule') ||
        pathname.startsWith('/timesheets') ||
        pathname.startsWith('/reports') ||
        pathname.startsWith('/settings');

    if (!user && isProtectedRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        // Only add ?next= when redirecting from a non-root page
        // (root "/" is the default post-login destination anyway)
        if (pathname !== '/') {
            url.searchParams.set('next', pathname)
        }
        return NextResponse.redirect(url)
    }

    // Add Security Headers
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)')
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
    // Basic CSP - adjust as needed based on used third-party scripts
    // Added wss://*.supabase.co for Realtime subscriptions
    // Added identitytoolkit.googleapis.com for Firebase Auth (if used)
    response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.google.com https://www.gstatic.com https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.google.com https://www.googletagmanager.com; frame-src 'self' https://www.google.com https://recaptcha.google.com;")

    return response
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
