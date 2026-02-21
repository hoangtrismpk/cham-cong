import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FileQuestion } from 'lucide-react'

export default function NotFound() {
    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-background text-foreground space-y-6 p-4 text-center">
            <div className="bg-slate-900/50 p-6 rounded-full ring-1 ring-white/10 shadow-2xl">
                <FileQuestion className="w-16 h-16 text-slate-500" />
            </div>
            <div className="space-y-2">
                <h1 className="text-4xl font-black tracking-tighter text-white">404</h1>
                <h2 className="text-xl font-bold text-slate-400">Không tìm thấy trang</h2>
                <p className="text-slate-500 max-w-[400px]">
                    Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
                </p>
            </div>
            <Link href="/">
                <Button variant="outline" className="border-slate-700 hover:bg-white/5 hover:text-white">
                    Về trang chủ
                </Button>
            </Link>
        </div>
    )
}
