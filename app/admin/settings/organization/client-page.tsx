'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateOrganizationSettings, syncWithExistingData } from '@/app/actions/organization'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus, X, Save, Loader2, Building2, Briefcase, RefreshCw, PenSquare, Check, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useI18n } from '@/contexts/i18n-context' // Import i18n hook
import { usePermissions } from '@/contexts/permission-context'

interface OrganizationSettingsClientProps {
    initialDepartments: string[]
    initialJobTitles: string[]
}

export default function OrganizationSettingsClient({
    initialDepartments,
    initialJobTitles
}: OrganizationSettingsClientProps) {
    const { t } = useI18n() // Initialize translation
    const { can } = usePermissions()
    const canManage = can('settings_organization.manage')
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [syncLoading, setSyncLoading] = useState(false)

    // State for lists
    const [departments, setDepartments] = useState<string[]>(initialDepartments || [])
    const [jobTitles, setJobTitles] = useState<string[]>(initialJobTitles || [])

    // State for inputs
    const [newDept, setNewDept] = useState('')
    const [newTitle, setNewTitle] = useState('')

    // State for editing
    const [editingDept, setEditingDept] = useState<{ index: number, value: string } | null>(null)
    const [editingTitle, setEditingTitle] = useState<{ index: number, value: string } | null>(null)

    // Handlers
    const addDepartment = () => {
        if (!newDept.trim()) return
        if (departments.includes(newDept.trim())) {
            toast.error(t.adminSettings.organization.departments.existsRef)
            return
        }
        setDepartments([...departments, newDept.trim()])
        setNewDept('')
    }

    const removeDepartment = (dept: string) => {
        setDepartments(departments.filter(d => d !== dept))
    }

    const addJobTitle = () => {
        if (!newTitle.trim()) return
        if (jobTitles.includes(newTitle.trim())) {
            toast.error(t.adminSettings.organization.jobTitles.existsRef)
            return
        }
        setJobTitles([...jobTitles, newTitle.trim()])
        setNewTitle('')
    }

    const removeJobTitle = (title: string) => {
        setJobTitles(jobTitles.filter(t => t !== title))
    }

    // Save Handlers
    const handleSave = async () => {
        setLoading(true)
        try {
            const result = await updateOrganizationSettings({
                departments,
                job_titles: jobTitles
            })

            if (result.error) {
                toast.error(t.adminSettings.organization.error + ': ' + result.error)
            } else {
                toast.success(t.adminSettings.organization.success)
                router.refresh()
            }
        } catch (error) {
            toast.error(t.adminSettings.organization.error)
        } finally {
            setLoading(false)
        }
    }

    const handleSync = async () => {
        setSyncLoading(true)
        try {
            const result = await syncWithExistingData()
            if (result.error) {
                toast.error(t.adminSettings.organization.syncDialog.error + ': ' + result.error)
            } else {
                toast.success(result.message || t.adminSettings.organization.syncDialog.success)
                router.refresh()
            }
        } catch (error) {
            toast.error(t.adminSettings.organization.syncDialog.error)
        } finally {
            setSyncLoading(false)
        }
    }

    // Edit Handlers
    const saveEditDept = () => {
        if (!editingDept) return
        const newValue = editingDept.value.trim()
        if (!newValue) return

        const newDepts = [...departments]
        newDepts[editingDept.index] = newValue
        setDepartments(newDepts)
        setEditingDept(null)
    }

    const saveEditTitle = () => {
        if (!editingTitle) return
        const newValue = editingTitle.value.trim()
        if (!newValue) return

        const newTitles = [...jobTitles]
        newTitles[editingTitle.index] = newValue
        setJobTitles(newTitles)
        setEditingTitle(null)
    }

    return (
        <div className="space-y-8 max-w-5xl mx-auto p-6 pb-24">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                    <h2 className="text-2xl font-bold tracking-tight text-white">{t.adminSettings.organization.title}</h2>
                    <p className="text-slate-400 leading-relaxed">{t.adminSettings.organization.description}</p>
                </div>
                <div className="flex items-center gap-3">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" className="border-slate-700 hover:bg-slate-800 text-slate-300" disabled={!canManage}>
                                <RefreshCw className={`w-4 h-4 mr-2 ${syncLoading ? 'animate-spin' : ''}`} />
                                {t.adminSettings.organization.syncButton}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-[#1a1f2e] border-slate-800 text-white">
                            <AlertDialogHeader>
                                <AlertDialogTitle>{t.adminSettings.organization.syncDialog.title}</AlertDialogTitle>
                                <AlertDialogDescription className="text-slate-400">
                                    {t.adminSettings.organization.syncDialog.description}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
                                    {t.adminSettings.organization.syncDialog.cancel}
                                </AlertDialogCancel>
                                <AlertDialogAction onClick={handleSync} className="bg-blue-600 hover:bg-blue-700 text-white">
                                    {t.adminSettings.organization.syncDialog.confirm}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    {canManage && (
                        <Button
                            onClick={handleSave}
                            disabled={loading || !canManage}
                            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    {t.adminSettings.organization.saving}
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    {t.adminSettings.organization.saveButton}
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* DEPARTMENTS CARD */}
                <Card className="bg-[#0d1117] border-slate-800 text-white shadow-sm flex flex-col h-full">
                    <CardHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                                <CardTitle>{t.adminSettings.organization.departments.title}</CardTitle>
                                <CardDescription className="text-slate-500 leading-snug">{t.adminSettings.organization.departments.description}</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-1 flex flex-col">
                        <div className="flex gap-2">
                            <Input
                                placeholder={t.adminSettings.organization.departments.placeholder}
                                value={newDept}
                                disabled={!canManage}
                                onChange={(e) => setNewDept(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addDepartment()}
                                className="bg-[#161b22] border-slate-700 text-white focus:ring-emerald-500/50"
                            />
                            <Button onClick={addDepartment} disabled={!canManage} variant="outline" className="border-slate-700 hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/50">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="flex-1 min-h-[300px] p-4 rounded-xl bg-[#161b22] border border-slate-800/50 flex flex-wrap content-start gap-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                            {departments.length === 0 ? (
                                <p className="text-sm text-slate-500 w-full text-center py-8 italic">{t.adminSettings.organization.departments.empty}</p>
                            ) : (
                                departments.map((dept, idx) => (
                                    editingDept?.index === idx ? (
                                        <div key={idx} className="flex items-center gap-1 bg-slate-800 rounded-md p-1 border border-emerald-500/50">
                                            <Input
                                                autoFocus
                                                value={editingDept.value}
                                                onChange={(e) => setEditingDept({ ...editingDept, value: e.target.value })}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') saveEditDept();
                                                    if (e.key === 'Escape') setEditingDept(null);
                                                }}
                                                className="h-6 text-xs bg-transparent border-none focus-visible:ring-0 p-1 w-32"
                                            />
                                            <button onClick={saveEditDept} className="text-emerald-500 hover:text-emerald-400 p-1"><Check className="w-3 h-3" /></button>
                                            <button onClick={() => setEditingDept(null)} className="text-red-400 hover:text-red-300 p-1"><XCircle className="w-3 h-3" /></button>
                                        </div>
                                    ) : (
                                        <Badge
                                            key={idx}
                                            variant="secondary"
                                            className="pl-3 pr-1 py-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20 flex items-center gap-2 transition-all group select-none"
                                            onClick={() => canManage && setEditingDept({ index: idx, value: dept })}
                                        >
                                            <span className={cn(canManage && "cursor-pointer group-hover:underline decoration-emerald-500/30 underline-offset-2")}>{dept}</span>
                                            {canManage && (
                                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setEditingDept({ index: idx, value: dept }); }}
                                                        className="p-1 rounded-full hover:bg-emerald-500/20 text-emerald-500/70 hover:text-emerald-400 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <PenSquare className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); removeDepartment(dept); }}
                                                        className="p-1 rounded-full hover:bg-red-500/20 text-red-500/70 hover:text-red-400 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            )}
                                        </Badge>
                                    )
                                ))
                            )}
                        </div>
                        <p className="text-xs text-slate-500">
                            * {t.adminSettings.organization.tips.dept}
                        </p>
                    </CardContent>
                </Card>

                {/* JOB TITLES CARD */}
                <Card className="bg-[#0d1117] border-slate-800 text-white shadow-sm flex flex-col h-full">
                    <CardHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                <Briefcase className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                                <CardTitle>{t.adminSettings.organization.jobTitles.title}</CardTitle>
                                <CardDescription className="text-slate-500 leading-snug">{t.adminSettings.organization.jobTitles.description}</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-1 flex flex-col">
                        <div className="flex gap-2">
                            <Input
                                placeholder={t.adminSettings.organization.jobTitles.placeholder}
                                value={newTitle}
                                disabled={!canManage}
                                onChange={(e) => setNewTitle(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addJobTitle()}
                                className="bg-[#161b22] border-slate-700 text-white focus:ring-blue-500/50"
                            />
                            <Button onClick={addJobTitle} disabled={!canManage} variant="outline" className="border-slate-700 hover:bg-blue-500/10 hover:text-blue-500 hover:border-blue-500/50">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="flex-1 min-h-[300px] p-4 rounded-xl bg-[#161b22] border border-slate-800/50 flex flex-wrap content-start gap-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                            {jobTitles.length === 0 ? (
                                <p className="text-sm text-slate-500 w-full text-center py-8 italic">{t.adminSettings.organization.jobTitles.empty}</p>
                            ) : (
                                jobTitles.map((title, idx) => (
                                    editingTitle?.index === idx ? (
                                        <div key={idx} className="flex items-center gap-1 bg-slate-800 rounded-md p-1 border border-blue-500/50">
                                            <Input
                                                autoFocus
                                                value={editingTitle.value}
                                                onChange={(e) => setEditingTitle({ ...editingTitle, value: e.target.value })}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') saveEditTitle();
                                                    if (e.key === 'Escape') setEditingTitle(null);
                                                }}
                                                className="h-6 text-xs bg-transparent border-none focus-visible:ring-0 p-1 w-32"
                                            />
                                            <button onClick={saveEditTitle} className="text-blue-500 hover:text-blue-400 p-1"><Check className="w-3 h-3" /></button>
                                            <button onClick={() => setEditingTitle(null)} className="text-red-400 hover:text-red-300 p-1"><XCircle className="w-3 h-3" /></button>
                                        </div>
                                    ) : (
                                        <Badge
                                            key={idx}
                                            variant="secondary"
                                            className="pl-3 pr-1 py-1 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border-blue-500/20 flex items-center gap-2 transition-all group select-none"
                                            onClick={() => canManage && setEditingTitle({ index: idx, value: title })}
                                        >
                                            <span className={cn(canManage && "cursor-pointer group-hover:underline decoration-blue-500/30 underline-offset-2")}>{title}</span>
                                            {canManage && (
                                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setEditingTitle({ index: idx, value: title }); }}
                                                        className="p-1 rounded-full hover:bg-blue-500/20 text-blue-500/70 hover:text-blue-400 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <PenSquare className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); removeJobTitle(title); }}
                                                        className="p-1 rounded-full hover:bg-red-500/20 text-red-500/70 hover:text-red-400 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            )}
                                        </Badge>
                                    )
                                ))
                            )}
                        </div>
                        <p className="text-xs text-slate-500">
                            * {t.adminSettings.organization.tips.title}
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
