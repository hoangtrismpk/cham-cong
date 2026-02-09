import { ToggleLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function FeatureTogglesSettingsPage() {
    return (
        <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30">
                    <ToggleLeft className="h-10 w-10 text-green-400" />
                </div>
                <div>
                    <h2 className="text-xl font-semibold text-white">Bật/Tắt Tính năng</h2>
                    <p className="text-slate-400 mt-2 max-w-md">
                        Quản lý các module như GPS, OT, Leave Request... sẽ có trong phiên bản tiếp theo.
                    </p>
                </div>
                <Badge variant="outline" className="text-green-400 border-green-500/50">
                    Coming in v2.0
                </Badge>
            </div>
        </div>
    )
}
