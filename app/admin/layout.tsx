import { AdminSidebar } from '@/components/admin-sidebar'

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-screen bg-[#0a0f14] font-display text-slate-200">
            <AdminSidebar />
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <main className="flex-1 overflow-y-auto bg-[#0a0f14] custom-scrollbar">
                    {children}
                </main>
            </div>
        </div>
    )
}
