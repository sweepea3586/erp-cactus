'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Upload, X, Loader2, ImageIcon } from 'lucide-react'
import { toast } from 'sonner'

export function ImageUpload({ value, onChange, bucket = 'product-images', folder = '', label = 'Görsel Yükle' }) {
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef(null)
  const supabase = createClient()

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Lütfen bir resim dosyası seçin')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dosya 5MB\'tan büyük olamaz')
      return
    }
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `${folder ? folder + '/' : ''}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error } = await supabase.storage.from(bucket).upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName)
      onChange(publicUrl)
      toast.success('Yüklendi')
    } catch (err) {
      console.error(err)
      toast.error('Yükleme hatası: ' + err.message)
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <input ref={fileInput} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      {value ? (
        <div className="relative inline-block">
          <img src={value} alt="" className="h-32 w-32 object-cover rounded-lg border border-slate-200" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          className="h-32 w-32 rounded-lg border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-emerald-600 transition-colors"
        >
          {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImageIcon className="h-6 w-6" />}
          <span className="text-xs">{uploading ? 'Yükleniyor...' : label}</span>
        </button>
      )}
      {value && (
        <Button type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()} disabled={uploading}>
          <Upload className="h-3 w-3 mr-1" /> Değiştir
        </Button>
      )}
    </div>
  )
}
