import Link from 'next/link'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function UnauthorizedPage() {
    return (
        <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center">
                {/* Icon */}
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-red-500/10 rounded-full border-2 border-red-500/20">
                        <ShieldAlert className="h-16 w-16 text-red-400" />
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold text-white mb-3">
                    Không có quyền truy cập
                </h1>

                {/* Description */}
                <p className="text-slate-400 mb-8">
                    Bạn không có quyền truy cập vào trang này. Vui lòng liên hệ quản trị viên để được cấp quyền hoặc quay lại trang chủ.
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                        asChild
                        variant="outline"
                        className="border-slate-700 bg-slate-800 hover:bg-slate-700"
                    >
                        <Link href="/">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Về trang chủ
                        </Link>
                    </Button>
                    <Button
                        asChild
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        <Link href="/admin">
                            Về Dashboard
                        </Link>
                    </Button>
                </div>

                {/* Help Text */}
                <p className="text-xs text-slate-500 mt-8">
                    Mã lỗi: <span className="font-mono">403 - Forbidden</span>
                </p>
            </div>
        </div>
    )
}
