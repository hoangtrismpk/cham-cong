'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useState, useEffect } from 'react'

const RANDOM_MESSAGES = [
    "Trang này chắc quên chấm công nên hệ thống không ghi nhận rồi.",
    "Có vẻ trang này đi trễ quá 15 phút nên bị tính vắng mặt.",
    "Trang bạn tìm đang nghỉ phép không lương hôm nay.",
    "Hình như trang này chưa check-in mà đã check-out mất rồi.",
    "Trang này vừa xin nghỉ giữa ca, chưa kịp báo quản lý.",
    "Server đang rà soát công, còn trang này thì mất dấu luôn.",
    "Trang này chắc đang tăng ca ở đâu đó, chưa về hệ thống.",
    "Hệ thống không tìm thấy trang — có thể nó quên bật định vị khi chấm công.",
    "Trang này vừa bị đánh dấu “Absent” vì không phản hồi.",
    "Có vẻ trang này chưa được duyệt ca làm, nên chưa thể hiển thị.",
    "Trang này chắc check-in bằng… niềm tin nên hệ thống không ghi nhận.",
    "Có vẻ trang này đi làm nhưng quên bật WiFi nên mất tích luôn.",
    "Trang này vừa xin nghỉ phép gấp mà chưa kịp tạo đơn trên hệ thống.",
    "Server đang chấm công đầy đủ, riêng trang này thì… trốn ca.",
    "Trang bạn tìm chắc nghĩ hôm nay là Chủ nhật.",
    "Trang này vừa bị HR “ping” vì không thấy điểm danh.",
    "Hệ thống tìm mãi không thấy — chắc trang này đang họp mà quên online.",
    "Trang này đã check-out khỏi database không báo trước.",
    "Log hệ thống báo: “Trang này chưa từng tồn tại, đừng tin lời người dùng.”",
    "Trang này chắc đang làm remote nhưng quên bật VPN.",
    "404 – Trang này bị tính là nghỉ không phép.",
    "Trang này vừa bị hệ thống trừ KPI vì không phản hồi request.",
    "API gọi mãi không trả lời — chắc trang này đang đi cà phê.",
    "Database lật tung sổ công vẫn không thấy trang này đâu.",
    "Trang này chắc đang đợi duyệt ca làm từ… admin tối cao."
]

export default function NotFound() {
    const [randomMsg, setRandomMsg] = useState("")

    useEffect(() => {
        const randomIndex = Math.floor(Math.random() * RANDOM_MESSAGES.length)
        setRandomMsg(RANDOM_MESSAGES[randomIndex])
    }, [])

    return (
        <div className="h-screen w-full relative flex flex-col items-center justify-center bg-black text-slate-200 overflow-hidden font-sans">

            {/* Background Image - Full Screen */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/404.webp"
                    alt="404 Background"
                    fill
                    className="object-cover opacity-80"
                    priority
                />
                {/* Gradient overlay to ensure text readability at the bottom */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#070b14]/90" />
            </div>

            <div className="relative z-10 flex flex-col items-center w-full text-center px-6 mt-32 sm:mt-48">
                {/* 404 Text */}
                <h1 className="text-[100px] sm:text-[140px] font-bold tracking-tight text-[#38bdf8] leading-none mb-4"
                    style={{ textShadow: '0 0 30px rgba(56,189,248,0.6)' }}>
                    404
                </h1>

                {/* Main Text Section */}
                <div className="flex flex-col items-center gap-2 w-full">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-wide drop-shadow-lg text-center">
                        Hệ thống không tìm thấy trang này
                    </h2>

                    <div className="space-y-1 mt-4 min-h-[60px] flex flex-col items-center justify-center w-full px-4">
                        <p className="text-cyan-300/90 text-sm sm:text-lg font-medium drop-shadow-md italic max-w-2xl text-center leading-relaxed">
                            {randomMsg || "Đang rà soát danh sách..."}
                        </p>
                        <p className="text-slate-400 text-[13px] sm:text-[14px] max-w-md drop-shadow-sm pt-2 text-center mx-auto">
                            Đừng lo, bạn có thể quay lại trang chủ để tiếp tục làm việc.
                        </p>
                    </div>
                </div>

                {/* Action Button */}
                <div className="mt-12">
                    <Link href="/">
                        <Button className="bg-[#22d3ee] hover:bg-[#06b6d4] text-black font-bold px-10 py-6 h-auto text-base rounded-lg transition-all shadow-[0_4px_30px_rgba(34,211,238,0.5)] flex items-center gap-2 group">
                            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                            Quay lại Trang chủ
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Subtle Footer Code */}
            <div className="absolute bottom-6 text-white/20 text-[10px] font-mono tracking-[0.2em] uppercase z-10">
                ERROR CODE: CHECKIN_NOT_FOUND_404
            </div>
        </div>
    )
}
