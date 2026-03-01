'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { sendPasswordResetEmail, forceUserPasswordChange } from '@/app/actions/employees'
import { Mail, KeyRound, Loader2 } from 'lucide-react'
import { useI18n } from '@/contexts/i18n-context'

interface PasswordResetManagerProps {
    employeeId: string
    email: string
    employeeName: string
}

export function PasswordResetManager({ employeeId, email, employeeName }: PasswordResetManagerProps) {
    const { t } = useI18n()
    const pt = t.admin.edit.passwordReset

    const [sendingEmail, setSendingEmail] = useState(false)
    const [forcingPassword, setForcingPassword] = useState(false)
    const [newPassword, setNewPassword] = useState('')

    const handleSendEmail = async () => {
        if (!email) {
            toast.error(pt.emailOption.missingEmail)
            return
        }

        const confirmMessage = pt.emailOption.confirm.replace('{email}', email)
        const confirm = window.confirm(confirmMessage)
        if (!confirm) return

        setSendingEmail(true)
        try {
            const result = await sendPasswordResetEmail(email)
            if (result && 'error' in result) {
                toast.error(result.error)
            } else {
                toast.success(pt.emailOption.success.replace('{email}', email))
            }
        } catch (error: any) {
            toast.error(t.common.error + ': ' + error.message)
        } finally {
            setSendingEmail(false)
        }
    }

    const handleForcePasswordChange = async () => {
        if (!newPassword || newPassword.length < 6) {
            toast.error(pt.tempOption.invalid)
            return
        }

        const confirmMessage = pt.tempOption.confirm.replace('{password}', newPassword).replace('{name}', employeeName)
        const confirm = window.confirm(confirmMessage)
        if (!confirm) return

        setForcingPassword(true)
        try {
            const result = await forceUserPasswordChange(employeeId, newPassword)
            if (result && 'error' in result) {
                toast.error(result.error)
            } else {
                toast.success(pt.tempOption.success)
                setNewPassword('') // reset
            }
        } catch (error: any) {
            toast.error(t.common.error + ': ' + error.message)
        } finally {
            setForcingPassword(false)
        }
    }

    return (
        <Card className="bg-[#161b22] border-slate-800">
            <CardHeader>
                <CardTitle className="text-red-400">{pt.title}</CardTitle>
                <CardDescription className="text-slate-400">
                    {pt.desc}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Lựa chọn A */}
                <div className="p-4 border border-slate-700 rounded-lg bg-[#0d1117] space-y-3">
                    <div className="flex items-start justify-between">
                        <div>
                            <h4 className="font-semibold text-white">{pt.emailOption.title}</h4>
                            <p className="text-sm text-slate-400 mt-1">
                                {pt.emailOption.desc.replace('{name}', employeeName).replace('{email}', email || '...')}
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
                            {pt.emailOption.button}
                        </Button>
                    </div>
                </div>

                {/* Lựa chọn B */}
                <div className="p-4 border border-slate-700 rounded-lg bg-[#0d1117] space-y-4">
                    <div>
                        <h4 className="font-semibold text-white">{pt.tempOption.title}</h4>
                        <p className="text-sm text-slate-400 mt-1">
                            {pt.tempOption.desc}
                        </p>
                    </div>

                    <div className="flex items-end gap-3">
                        <div className="flex-1 space-y-2">
                            <Label htmlFor="temp_pwd">{pt.tempOption.label} (<span className="text-slate-400">{pt.tempOption.minLength}</span>)</Label>
                            <Input
                                id="temp_pwd"
                                type="text"
                                placeholder={pt.tempOption.placeholder}
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
                            className="bg-red-500/20 text-white hover:bg-red-500 hover:text-white border border-red-500/30 font-medium disabled:opacity-100 disabled:bg-slate-800 disabled:text-white disabled:border-transparent transition-colors"
                        >
                            {forcingPassword ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <KeyRound className="h-4 w-4 mr-2" />
                            )}
                            {pt.tempOption.button}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
