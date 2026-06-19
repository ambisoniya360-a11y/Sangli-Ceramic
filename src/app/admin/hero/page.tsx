'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, Loader2, Upload, Trash2, Plus, Image as ImageIcon } from 'lucide-react'

export default function HeroManagementPage() {
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [banners, setBanners] = useState<any[]>([])
  
  const [formData, setFormData] = useState({
    image_url: '',
    heading: '',
    subheading: '',
    button_text: 'Explore Products',
    button_link: '/products',
  })
  
  const [editingId, setEditingId] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadBanners()
  }, [])

  async function loadBanners() {
    try {
      const { data, error } = await supabase
        .from('hero_banners')
        .select('*')
        .order('created_at', { ascending: true })
      if (data) setBanners(data)
    } catch (err) {
      console.error(err)
    } finally {
      setFetching(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setLoading(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `banner-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('hero')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('hero')
        .getPublicUrl(filePath)

      setFormData(prev => ({ ...prev, image_url: publicUrl }))
    } catch (error: any) {
      alert(`Error uploading image: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.image_url) {
      alert('Please upload a banner image first!')
      return
    }

    setLoading(true)

    let error;
    if (editingId) {
      const { error: updateError } = await supabase
        .from('hero_banners')
        .update(formData)
        .eq('id', editingId)
      error = updateError
    } else {
      const { error: insertError } = await supabase
        .from('hero_banners')
        .insert([formData])
      error = insertError
    }

    setLoading(false)
    if (error) {
      alert(`Error: ${error.message}`)
    } else {
      // Log activity
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('activity_logs').insert([{
          user_id: user.id,
          action: editingId ? 'Updated Hero Banner' : 'Created Hero Banner',
          entity_type: 'hero',
          entity_id: editingId || null
        }])
      }

      setFormData({
        image_url: '',
        heading: '',
        subheading: '',
        button_text: 'Explore Products',
        button_link: '/products',
      })
      setEditingId(null)
      loadBanners()
    }
  }

  const handleEdit = (banner: any) => {
    setEditingId(banner.id)
    setFormData({
      image_url: banner.image_url,
      heading: banner.heading || '',
      subheading: banner.subheading || '',
      button_text: banner.button_text || 'Explore Products',
      button_link: banner.button_link || '/products',
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this banner?')) return
    setLoading(true)
    const { error } = await supabase
      .from('hero_banners')
      .delete()
      .eq('id', id)
    
    setLoading(false)
    if (error) {
      alert(`Error deleting banner: ${error.message}`)
    } else {
      // Log activity
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('activity_logs').insert([{
          user_id: user.id,
          action: 'Deleted Hero Banner',
          entity_type: 'hero',
          entity_id: id
        }])
      }
      loadBanners()
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hero Banner Management</h1>
          <p className="text-gray-500 mt-1">Manage slides, headings, and CTA links for the homepage slider.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor Form */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit space-y-6">
          <h3 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Banner Slide' : 'Add Banner Slide'}</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Banner Image</label>
              <div className="flex flex-col gap-3">
                {formData.image_url ? (
                  <div className="relative group rounded-xl overflow-hidden border border-gray-200 aspect-[16/9] bg-gray-150">
                    <img src={formData.image_url} alt="Banner" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-8 cursor-pointer hover:bg-gray-50 transition-colors">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500 font-medium">Upload Banner Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Heading Title</label>
              <input
                type="text"
                name="heading"
                value={formData.heading}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Subheading Description</label>
              <input
                type="text"
                name="subheading"
                value={formData.subheading}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Button Text</label>
                <input
                  type="text"
                  name="button_text"
                  value={formData.button_text}
                  onChange={handleChange}
                  className="w-full px-3 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Button Link</label>
                <input
                  type="text"
                  name="button_link"
                  value={formData.button_link}
                  onChange={handleChange}
                  className="w-full px-3 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-medium hover:bg-primary/90 transition-all flex items-center justify-center disabled:opacity-70 shadow-sm"
              >
                {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                {editingId ? 'Update Slide' : 'Create Slide'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null)
                    setFormData({ image_url: '', heading: '', subheading: '', button_text: 'Explore Products', button_link: '/products' })
                  }}
                  className="px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Banners List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Active Hero Banner Slides</h3>
            {fetching ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : banners.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                No hero banners configured yet. Add one from the sidebar.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {banners.map((banner) => (
                  <div key={banner.id} className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm bg-gray-50 group relative">
                    <div className="aspect-[16/9] w-full relative">
                      <img src={banner.image_url} alt="Slide Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-4 text-white">
                        <h4 className="font-bold text-sm line-clamp-1">{banner.heading || 'No title'}</h4>
                        <p className="text-xs text-gray-200 line-clamp-1 mt-0.5">{banner.subheading || 'No subtitle'}</p>
                      </div>
                    </div>
                    <div className="p-4 flex justify-between items-center bg-white border-t border-gray-100">
                      <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md">
                        {banner.button_text}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(banner)}
                          className="p-2 text-gray-600 hover:text-primary hover:bg-gray-50 rounded-lg transition-all"
                          title="Edit Banner"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(banner.id)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete Banner"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
