'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, Loader2, CheckCircle, X } from 'lucide-react'
import { useWordPressUpload } from '@/hooks/use-wordpress-upload'

interface MediaPickerProps {
    onUploadSuccess: (url: string) => void
    accept?: string
    maxSize?: number // MB
    className?: string
}

/**
 * Media Picker Component
 * Allows users to upload files to WordPress Media Library
 * Shows upload progress and handles errors
 */
export function MediaPicker({
    onUploadSuccess,
    accept = 'image/*,application/pdf,.doc,.docx',
    maxSize = 10,
    className = ''
}: MediaPickerProps) {
    const { uploadFile, uploading, progress } = useWordPressUpload()
    const [selectedFile, setSelectedFile] = useState<File | null>(null)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate size
        if (file.size > maxSize * 1024 * 1024) {
            alert(`File quá lớn! Tối đa ${maxSize}MB`)
            return
        }

        setSelectedFile(file)

        // Auto upload
        const result = await uploadFile(file)
        if (result.success && result.url) {
            onUploadSuccess(result.url)
        }
    }

    return (
        <div className={`space-y-3 ${className}`}>
            <div className="relative">
                <input
                    type="file"
                    accept={accept}
                    onChange={handleFileChange}
                    disabled={uploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                />
                <Button
                    variant="outline"
                    disabled={uploading}
                    className="w-full border-dashed border-slate-700 hover:border-cyan-500 transition-colors bg-[#0d131a] text-slate-300"
                >
                    {uploading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Đang upload... {progress}%
                        </>
                    ) : (
                        <>
                            <Upload className="mr-2 h-4 w-4" />
                            Chọn file để upload
                        </>
                    )}
                </Button>
            </div>

            {selectedFile && !uploading && (
                <div className="flex items-center gap-2 text-sm text-slate-400 bg-[#161b22] border border-slate-800 rounded-lg p-3">
                    <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
                    <span className="flex-1 truncate">{selectedFile.name}</span>
                </div>
            )}

            {uploading && (
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-cyan-500 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}

            <p className="text-xs text-slate-500">
                Tối đa {maxSize}MB. Hỗ trợ: {accept.split(',').join(', ')}
            </p>
        </div>
    )
}
