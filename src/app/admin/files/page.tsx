'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Folder, Copy, Trash2, Search, Image as ImageIcon, Check } from 'lucide-react'

const BUCKETS = [
  { id: 'products', name: 'Products' },
  { id: 'categories', name: 'Categories' },
  { id: 'brands', name: 'Brands' },
  { id: 'gallery', name: 'Gallery' },
  { id: 'hero', name: 'Hero Banners' },
  { id: 'testimonials', name: 'Testimonials' },
  { id: 'website-assets', name: 'Website Assets' },
]

export default function FileManagerPage() {
  const [activeBucket, setActiveBucket] = useState('products')
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadFiles()
  }, [activeBucket])

  async function loadFiles() {
    try {
      setLoading(true)
      const { data, error } = await supabase.storage.from(activeBucket).list('', {
        limit: 100,
        sortBy: { column: 'name', order: 'asc' },
      })

      if (error) throw error
      
      // Filter out folder placeholders if any (usually named '.emptyFolderPlaceholder')
      const filteredFiles = (data || []).filter(f => f.name !== '.emptyFolderPlaceholder')
      setFiles(filteredFiles)
    } catch (err: any) {
      console.error(err)
      alert(`Error loading files: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyUrl = (fileName: string) => {
    const { data: { publicUrl } } = supabase.storage
      .from(activeBucket)
      .getPublicUrl(fileName)

    navigator.clipboard.writeText(publicUrl)
    setCopiedUrl(publicUrl)
    setTimeout(() => setCopiedUrl(null), 2000)
  }

  const handleDelete = async (fileName: string) => {
    if (!confirm('Are you sure you want to delete this file? This action is permanent.')) return

    try {
      setDeletingId(fileName)
      const { error } = await supabase.storage.from(activeBucket).remove([fileName])
      if (error) throw error
      
      // Log activity
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('activity_logs').insert([{
          user_id: user.id,
          action: `Deleted file ${fileName} from bucket ${activeBucket}`,
          entity_type: 'storage',
          entity_id: null
        }])
      }

      loadFiles()
    } catch (err: any) {
      alert(`Error deleting file: ${err.message}`)
    } finally {
      setDeletingId(null)
    }
  }

  const getPublicUrl = (fileName: string) => {
    const { data: { publicUrl } } = supabase.storage
      .from(activeBucket)
      .getPublicUrl(fileName)
    return publicUrl
  }

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Centralized File Manager</h1>
          <p className="text-gray-500 mt-1">Manage and preview all images uploaded across different storage buckets.</p>
        </div>

        <div className="relative md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Bucket Selector Sidebar */}
        <div className="w-full lg:w-64 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 h-fit space-y-1">
          <div className="text-xs font-semibold uppercase text-gray-400 px-4 mb-2 tracking-wider">Buckets</div>
          {BUCKETS.map((bucket) => (
            <button
              key={bucket.id}
              onClick={() => setActiveBucket(bucket.id)}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
                activeBucket === bucket.id ? 'bg-primary text-primary-foreground' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center"><Folder className="w-4 h-4 mr-3" /> {bucket.name}</span>
            </button>
          ))}
        </div>

        {/* Files Grid */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 min-h-[500px]">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-gray-500">
              <ImageIcon className="w-12 h-12 text-gray-300 mb-3" />
              <p className="font-medium">No files found</p>
              <p className="text-sm text-gray-400 mt-1">Upload images in their respective managers to populate this bucket.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredFiles.map((file) => {
                const fileUrl = getPublicUrl(file.name)
                const isImage = file.metadata?.mimetype?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.name)

                return (
                  <div key={file.name} className="group border border-gray-100 rounded-xl overflow-hidden shadow-sm bg-gray-50 flex flex-col justify-between relative">
                    <div className="aspect-square bg-gray-200 relative overflow-hidden flex items-center justify-center">
                      {isImage ? (
                        <img src={fileUrl} alt={file.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <ImageIcon className="w-12 h-12 text-gray-400" />
                      )}
                      
                      {/* Action overlays on hover */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleCopyUrl(file.name)}
                          className="p-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                          title="Copy Public URL"
                        >
                          {copiedUrl === fileUrl ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(file.name)}
                          disabled={deletingId === file.name}
                          className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                          title="Delete File"
                        >
                          {deletingId === file.name ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-white border-t border-gray-50 space-y-1">
                      <p className="text-xs font-semibold text-gray-700 truncate" title={file.name}>
                        {file.name}
                      </p>
                      <div className="flex justify-between items-center text-[10px] text-gray-400">
                        <span>{formatSize(file.metadata?.size)}</span>
                        <span>{file.created_at ? new Date(file.created_at).toLocaleDateString() : ''}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
