import { Bell } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function NotificationsSettingsPage() {
    return (
        <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-500/10 border border-blue-500/30">
                    <Bell className="h-10 w-10 text-blue-400" />
                </div>
                <div>
                    <h2 className="text-xl font-semibold text-white">Cấu hình Thông báo</h2>
                    <p className="text-slate-400 mt-2 max-w-md">
                        Quản lý cấu hình Email, Push Notifications và SMTP sẽ có trong phiên bản tiếp theo.
                    </p>
                </div>
                <Badge variant="outline" className="text-blue-400 border-blue-500/50">
                    Coming in v2.0
                </Badge>
            </div>
        </div>
    )
}
