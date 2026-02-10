'use client'

import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { AdminSidebar } from "./admin-sidebar"
import { useState } from "react"
import { Button } from "./ui/button"
import { Menu } from "lucide-react"
import { useI18n } from '@/contexts/i18n-context'

interface AdminMobileNavProps {
    permissions?: string[]
    profile?: any
}

export function AdminMobileNav({ permissions, profile }: AdminMobileNavProps) {
    const { t } = useI18n()
    const [open, setOpen] = useState(false)

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden text-slate-400 hover:text-white">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Toggle Menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 bg-[#0d131a] border-r border-[#1e293b] w-72">
                <SheetTitle className="sr-only">{t.admin.adminPanel}</SheetTitle>
                <AdminSidebar
                    mobile
                    onLinkClick={() => setOpen(false)}
                    preloadedPermissions={permissions}
                    preloadedProfile={profile}
                />
            </SheetContent>
        </Sheet>
    )
}
