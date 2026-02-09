import { useState } from 'react'
import { toast } from 'sonner'

interface UploadResult {
    success: boolean
    url?: string
    id?: number
    title?: string
    error?: string
}

/**
 * Hook to upload files to WordPress Media Library
 * Requires WordPress integration to be configured in Admin settings
 */
export function useWordPressUpload() {
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState(0)

    const uploadFile = async (file: File): Promise<UploadResult> => {
        setUploading(true)
        setProgress(0)

        try {
            const formData = new FormData()
            formData.append('file', file)

            // Simulate progress
            const progressInterval = setInterval(() => {
                setProgress((prev) => Math.min(prev + 10, 90))
            }, 200)

            const response = await fetch('/api/wordpress/upload', {
                method: 'POST',
                body: formData
            })

            clearInterval(progressInterval)
            setProgress(100)

            const data = await response.json()

            if (!response.ok) {
                if (data.code === 'NO_CONFIG') {
                    toast.error('WordPress chưa được cấu hình. Vui lòng liên hệ Admin.')
                } else {
                    toast.error(data.error || 'Upload thất bại')
                }
                return { success: false, error: data.error }
            }

            toast.success('Upload thành công!')
            return data
        } catch (error: any) {
            toast.error(error.message || 'Upload thất bại')
            return { success: false, error: error.message }
        } finally {
            setUploading(false)
            setTimeout(() => setProgress(0), 1000)
        }
    }

    return { uploadFile, uploading, progress }
}
