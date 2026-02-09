import { headers } from 'next/headers'
import { getWorkSettings, getSecuritySettings } from '@/app/actions/settings'
import { RecaptchaDiagnostics } from '@/components/recaptcha-diagnostics'
import { Shield, Wifi, Globe, Server } from 'lucide-react'

export default async function DebugIpPage() {
    const headerList = await headers()
    const forwardedFor = headerList.get('x-forwarded-for')
    const realIp = headerList.get('x-real-ip')
    const userIp = forwardedFor ? forwardedFor.split(',')[0].trim() : (realIp || 'unknown')

    // Get Settings
    const settings = await getWorkSettings()
    const security = await getSecuritySettings()

    // Calculate Valid IPs
    // Nếu Admin đã cấu hình IP Wifi thì ưu tiên dùng IP đó, ngược lại dùng danh sách mặc định
    const dynamicIps = settings.company_wifi_ip
        ? settings.company_wifi_ip.split(',').map((ip: string) => ip.trim())
        : []

    // Nếu có IP động thì chỉ hiển thị IP động, nếu không thì để trống hoặc dùng danh sách mặc định rất ngắn
    const validIps = dynamicIps.length > 0 ? dynamicIps : ['14.161.22.181']

    const isIpValid = validIps.includes(userIp)

    return (
        <div className="p-4 md:p-10 font-sans text-sm max-w-4xl mx-auto bg-[#0a0f14] text-slate-300 min-h-screen">
            <h1 className="text-3xl font-bold mb-8 text-white border-b border-slate-800 pb-4 flex items-center gap-3">
                <Server className="text-blue-500" /> System Diagnostics
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* 1. IP DIAGNOSTICS */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-lg font-semibold text-white">
                        <Wifi className="text-green-400 h-5 w-5" />
                        <h2>Network & IP</h2>
                    </div>

                    <div className="bg-[#121922] p-5 rounded-xl border border-slate-800 space-y-4">
                        <div className="space-y-1">
                            <p className="text-slate-500 text-xs uppercase tracking-wider font-bold">Detected Your IP</p>
                            <p className="text-2xl font-mono font-bold text-yellow-400">{userIp}</p>
                        </div>

                        <div className={`p-3 rounded-lg border flex items-center gap-3 ${isIpValid ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                            <div className="text-xl">{isIpValid ? '✅' : '❌'}</div>
                            <div className="text-xs uppercase font-bold">{isIpValid ? 'IP Matched' : 'IP Blocked'}</div>
                        </div>

                        <div className="pt-4 border-t border-slate-800 space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Admin Wifi Setting:</span>
                                <span className="text-blue-400 font-mono">{settings.company_wifi_ip || '(Empty)'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">All Allowed IPs:</span>
                                <span className="text-slate-400 text-[10px] break-all text-right max-w-[150px]">{validIps.join(', ')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Require Both GPS & Wifi:</span>
                                <span className={settings.require_gps_and_wifi ? "text-red-400 font-bold" : "text-green-400"}>
                                    {settings.require_gps_and_wifi ? 'YES' : 'NO'}
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. RECAPTCHA DIAGNOSTICS */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-lg font-semibold text-white">
                        <Shield className="text-blue-400 h-5 w-5" />
                        <h2>reCAPTCHA v3</h2>
                    </div>

                    <div className="bg-[#121922] p-5 rounded-xl border border-slate-800 space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-slate-500 text-xs uppercase tracking-wider font-bold">Status</p>
                            <Badge status={security.recaptcha_enabled} />
                        </div>

                        <div className="space-y-1">
                            <p className="text-slate-500 text-[10px]">Site Key in use:</p>
                            <code className="block bg-black/40 p-2 rounded text-[10px] text-blue-300 break-all font-mono">
                                {security.recaptcha_site_key || 'Not configured'}
                            </code>
                        </div>

                        <RecaptchaDiagnostics
                            siteKey={security.recaptcha_site_key}
                            enabled={security.recaptcha_enabled}
                        />
                    </div>
                </section>

                {/* 3. REQUEST HEADERS */}
                <section className="md:col-span-2 space-y-4">
                    <div className="flex items-center gap-2 text-lg font-semibold text-white">
                        <Globe className="text-purple-400 h-5 w-5" />
                        <h2>Raw Request Headers</h2>
                    </div>
                    <pre className="text-[10px] bg-black/60 p-5 rounded-xl border border-slate-800 h-48 overflow-auto text-slate-500 font-mono leading-relaxed">
                        {Array.from(headerList.entries()).map(([key, value]) => `${key.padEnd(20)} : ${value}`).join('\n')}
                    </pre>
                </section>
            </div>

            <footer className="mt-12 text-center text-slate-600 text-xs border-t border-slate-800 pt-6">
                Diagnostics generated at {new Date().toLocaleString('vi-VN')}
            </footer>
        </div>
    )
}

function Badge({ status }: { status: boolean }) {
    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${status ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
            {status ? 'Enabled' : 'Disabled'}
        </span>
    )
}
