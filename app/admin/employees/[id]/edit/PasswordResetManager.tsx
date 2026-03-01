'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { sendPasswordResetEmail, forceUserPasswordChange } from '@/app/actions/employees'
import { Mail, KeyRound, Loader2 } from 'lucide-react'

interface PasswordResetManagerProps {
    employeeId: string
    email: string
    employeeName: string
}

export function PasswordResetManager({ employeeId, email, employeeName }: PasswordResetManagerProps) {
    const [sendingEmail, setSendingEmail] = useState(false)
    const [forcingPassword, setForcingPassword] = useState(false)
    const [newPassword, setNewPassword] = useState('')

    const handleSendEmail = async () => {
        if (!email) {
            toast.error('Nhân viên này chưa có email.')
            return
        }

        const confirm = window.confirm(`Bạn có chắc chắn muốn gửi email khôi phục mật khẩu đến ${email}?`)
        if (!confirm) return

        setSendingEmail(true)
        try {
            const result = await sendPasswordResetEmail(email)
            if (result && 'error' in result) {
                toast.error(result.error)
            } else {
                toast.success(`Đã gửi email khôi phục mật khẩu đến ${email}`)
            }
        } catch (error: any) {
            toast.error('Lỗi: ' + error.message)
        } finally {
            setSendingEmail(false)
        }
    }

    const handleForcePasswordChange = async () => {
        if (!newPassword || newPassword.length < 6) {
            toast.error('Mật khẩu tạm thời phải có ít nhất 6 ký tự.')
            return
        }

        const confirm = window.confirm(`Cấp mật khẩu tạm: ${newPassword} cho ${employeeName}? Họ sẽ bị buộc phải đổi mật khẩu ở lần đăng nhập tới.`)
        if (!confirm) return

        setForcingPassword(true)
        try {
            const result = await forceUserPasswordChange(employeeId, newPassword)
            if (result && 'error' in result) {
                toast.error(result.error)
            } else {
                toast.success('Đã cấp mật khẩu tạm và yêu cầu đổi mật khẩu lần tới.')
                setNewPassword('') // reset
            }
        } catch (error: any) {
            toast.error('Lỗi: ' + error.message)
        } finally {
            setForcingPassword(false)
        }
    }

    return (
        <Card className="bg-[#161b22] border-slate-800">
            <CardHeader>
                <CardTitle className="text-red-400">Quản lý Bảo mật (Mật khẩu)</CardTitle>
                <CardDescription className="text-slate-400">
                    Hỗ trợ nhân viên khôi phục hoặc cài đặt lại mật khẩu.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Lựa chọn A */}
                <div className="p-4 border border-slate-700 rounded-lg bg-[#0d1117] space-y-3">
                    <div className="flex items-start justify-between">
                        <div>
                            <h4 className="font-semibold text-white">Gửi Email Khôi phục (Khuyên dùng)</h4>
                            <p className="text-sm text-slate-400 mt-1">
                                An toàn và bảo mật nhất. Hệ thống sẽ gửi một đường dẫn để {employeeName} tự đặt mật khẩu mới qua email {email || '(Chưa có)'}.
                            </p>
                        </div>
                        <Button
                            type="button"
                            onClick={handleSendEmail}
                            disabled={sendingEmail || !email}
                            variant="outline"
                            className="bg-slate-800 border-slate-700 hover:bg-slate-700"
                        >
                            {sendingEmail ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Mail className="h-4 w-4 mr-2" />
                            )}
                            Gửi Link Reset
                        </Button>
                    </div>
                </div>

                {/* Lựa chọn B */}
                <div className="p-4 border border-slate-700 rounded-lg bg-[#0d1117] space-y-4">
                    <div>
                        <h4 className="font-semibold text-white">Cấp Mật khẩu Tạm thời (Dự phòng)</h4>
                        <p className="text-sm text-slate-400 mt-1">
                            Sử dụng khi nhân viên mất quyền truy cập email. Bạn tự đặt một mật khẩu, nhân viên sẽ bị buộc phải đổi mật khẩu lại ở lần đăng nhập tiếp theo.
                        </p>
                    </div>

                    <div className="flex items-end gap-3">
                        <div className="flex-1 space-y-2">
                            <Label htmlFor="temp_pwd">Mật khẩu tạm thời (<span className="text-slate-400">Tối thiểu 6 ký tự</span>)</Label>
                            <Input
                                id="temp_pwd"
                                type="text"
                                placeholder="Nhập mật khẩu tạm cho nhân viên..."
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="bg-[#161b22] border-slate-700 font-mono"
                            />
                        </div>
                        <Button
                            type="button"
                            onClick={handleForcePasswordChange}
                            disabled={forcingPassword || !newPassword}
                            variant="destructive"
                            className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20"
                        >
                            {forcingPassword ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <KeyRound className="h-4 w-4 mr-2" />
                            )}
                            Cấp Mật khẩu
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
