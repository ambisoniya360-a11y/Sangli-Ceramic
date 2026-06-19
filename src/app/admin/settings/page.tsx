'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, Loader2, Globe, Phone, Mail, MapPin, Share2, Upload } from 'lucide-react'

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [activeTab, setActiveTab] = useState<'general' | 'contact' | 'social' | 'seo'>('general')
  const [settings, setSettings] = useState<any>({
    business_name: 'Sangali Ceramica',
    logo_url: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    social_links: { facebook: '', instagram: '', linkedin: '', twitter: '' },
    seo_title: '',
    seo_description: '',
    seo_keywords: '',
    seo_og_image: '',
  })

  const supabase = createClient()

  useEffect(() => {
    async function loadSettings() {
      try {
        const { data, error } = await supabase
          .from('website_settings')
          .select('*')
          .single()

        if (data) {
          setSettings({
            ...data,
            social_links: data.social_links || { facebook: '', instagram: '', linkedin: '', twitter: '' },
          })
        }
      } catch (err) {
        console.error(err)
      } finally {
        setFetching(false)
      }
    }
    loadSettings()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setSettings((prev: any) => ({ ...prev, [name]: value }))
  }

  const handleSocialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setSettings((prev: any) => ({
      ...prev,
      social_links: {
        ...prev.social_links,
        [name]: value,
      },
    }))
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'logo_url' | 'seo_og_image') => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setLoading(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${fieldName}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('website-assets')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('website-assets')
        .getPublicUrl(filePath)

      setSettings((prev: any) => ({ ...prev, [fieldName]: publicUrl }))
    } catch (error: any) {
      alert(`Error uploading file: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase
      .from('website_settings')
      .upsert({
        ...settings,
        updated_at: new Date().toISOString(),
      })

    setLoading(false)
    if (error) {
      alert(`Error saving settings: ${error.message}`)
    } else {
      alert('Settings saved successfully!')
      // Log activity
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('activity_logs').insert([{
          user_id: user.id,
          action: 'Updated Website Settings',
          entity_type: 'settings',
          entity_id: null
        }])
      }
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Website Settings</h1>
          <p className="text-gray-500 mt-1">Configure brand identity, contact information, social links, and global SEO.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Navigation Sidebar */}
        <div className="w-full md:w-64 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 h-fit space-y-1">
          <button
            onClick={() => setActiveTab('general')}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
              activeTab === 'general' ? 'bg-primary text-primary-foreground' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Globe className="w-4 h-4 mr-3" /> General Profile
          </button>
          <button
            onClick={() => setActiveTab('contact')}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
              activeTab === 'contact' ? 'bg-primary text-primary-foreground' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Phone className="w-4 h-4 mr-3" /> Contact & Location
          </button>
          <button
            onClick={() => setActiveTab('social')}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
              activeTab === 'social' ? 'bg-primary text-primary-foreground' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Share2 className="w-4 h-4 mr-3" /> Social Profiles
          </button>
          <button
            onClick={() => setActiveTab('seo')}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
              activeTab === 'seo' ? 'bg-primary text-primary-foreground' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Globe className="w-4 h-4 mr-3" /> SEO Management
          </button>
        </div>

        {/* Form Area */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">General Profile</h3>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Business Name</label>
                  <input
                    type="text"
                    name="business_name"
                    value={settings.business_name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Brand Logo</label>
                  <div className="flex items-center gap-4">
                    {settings.logo_url && (
                      <img src={settings.logo_url} alt="Logo" className="w-16 h-16 object-contain border border-gray-100 rounded-lg p-2" />
                    )}
                    <label className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                      <Upload className="w-5 h-5 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-600">Upload Logo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'logo_url')}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'contact' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">Contact & Location</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center"><Phone className="w-4 h-4 mr-2" /> Phone Number</label>
                    <input
                      type="text"
                      name="phone"
                      value={settings.phone || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center"><Phone className="w-4 h-4 mr-2 text-green-500" /> WhatsApp Number</label>
                    <input
                      type="text"
                      name="whatsapp"
                      value={settings.whatsapp || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center"><Mail className="w-4 h-4 mr-2" /> Email Address</label>
                    <input
                      type="email"
                      name="email"
                      value={settings.email || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center"><MapPin className="w-4 h-4 mr-2" /> Store Address</label>
                    <textarea
                      name="address"
                      value={settings.address || ''}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'social' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">Social Profiles</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Facebook URL</label>
                    <input
                      type="url"
                      name="facebook"
                      value={settings.social_links.facebook || ''}
                      onChange={handleSocialChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Instagram URL</label>
                    <input
                      type="url"
                      name="instagram"
                      value={settings.social_links.instagram || ''}
                      onChange={handleSocialChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">LinkedIn URL</label>
                    <input
                      type="url"
                      name="linkedin"
                      value={settings.social_links.linkedin || ''}
                      onChange={handleSocialChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Twitter URL</label>
                    <input
                      type="url"
                      name="twitter"
                      value={settings.social_links.twitter || ''}
                      onChange={handleSocialChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'seo' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">SEO Management</h3>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Page Title (Meta Title)</label>
                  <input
                    type="text"
                    name="seo_title"
                    value={settings.seo_title || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Meta Description</label>
                  <textarea
                    name="seo_description"
                    value={settings.seo_description || ''}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Keywords (Comma separated)</label>
                  <input
                    type="text"
                    name="seo_keywords"
                    value={settings.seo_keywords || ''}
                    onChange={handleChange}
                    placeholder="tiles, ceramics, bathroom, flooring"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Open Graph Share Image</label>
                  <div className="flex items-center gap-4">
                    {settings.seo_og_image && (
                      <img src={settings.seo_og_image} alt="OG Preview" className="w-24 h-16 object-cover border border-gray-100 rounded-lg" />
                    )}
                    <label className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                      <Upload className="w-5 h-5 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-600">Upload Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'seo_og_image')}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-6 border-t border-gray-100">
              <button
                type="submit"
                disabled={loading}
                className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-medium hover:bg-primary/90 transition-all flex items-center disabled:opacity-70 shadow-sm"
              >
                {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                Save Settings
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
