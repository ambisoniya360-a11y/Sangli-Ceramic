'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, Loader2, Upload, Trash2, Star, MessageSquare } from 'lucide-react'

export default function TestimonialManagementPage() {
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [testimonials, setTestimonials] = useState<any[]>([])
  
  const [formData, setFormData] = useState({
    customer_name: '',
    review: '',
    rating: 5,
    image: '',
  })
  
  const [editingId, setEditingId] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadTestimonials()
  }, [])

  async function loadTestimonials() {
    try {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) setTestimonials(data)
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
      const fileName = `customer-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('testimonials')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('testimonials')
        .getPublicUrl(filePath)

      setFormData(prev => ({ ...prev, image: publicUrl }))
    } catch (error: any) {
      alert(`Error uploading image: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: name === 'rating' ? parseInt(value) : value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    let error;
    if (editingId) {
      const { error: updateError } = await supabase
        .from('testimonials')
        .update(formData)
        .eq('id', editingId)
      error = updateError
    } else {
      const { error: insertError } = await supabase
        .from('testimonials')
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
          action: editingId ? 'Updated Testimonial' : 'Created Testimonial',
          entity_type: 'testimonial',
          entity_id: editingId || null
        }])
      }

      setFormData({
        customer_name: '',
        review: '',
        rating: 5,
        image: '',
      })
      setEditingId(null)
      loadTestimonials()
    }
  }

  const handleEdit = (t: any) => {
    setEditingId(t.id)
    setFormData({
      customer_name: t.customer_name,
      review: t.review,
      rating: t.rating || 5,
      image: t.image || '',
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this testimonial?')) return
    setLoading(true)
    const { error } = await supabase
      .from('testimonials')
      .delete()
      .eq('id', id)
    
    setLoading(false)
    if (error) {
      alert(`Error deleting testimonial: ${error.message}`)
    } else {
      // Log activity
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('activity_logs').insert([{
          user_id: user.id,
          action: 'Deleted Testimonial',
          entity_type: 'testimonial',
          entity_id: id
        }])
      }
      loadTestimonials()
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Testimonials</h1>
          <p className="text-gray-500 mt-1">Manage customer reviews and ratings shown on the website.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form panel */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit space-y-6">
          <h3 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Testimonial' : 'Add Testimonial'}</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Customer Image</label>
              <div className="flex items-center gap-4">
                {formData.image ? (
                  <div className="relative group rounded-full overflow-hidden border border-gray-200 w-16 h-16">
                    <img src={formData.image} alt="Customer Avatar" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity text-xs"
                    >
                      Delete
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-full w-16 h-16 cursor-pointer hover:bg-gray-50 transition-colors">
                    <Upload className="w-5 h-5 text-gray-400" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                )}
                <span className="text-xs text-gray-500">Upload profile image (optional)</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Customer Name</label>
              <input
                required
                type="text"
                name="customer_name"
                value={formData.customer_name}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Rating (Stars)</label>
              <select
                name="rating"
                value={formData.rating}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value={5}>5 Stars (Excellent)</option>
                <option value={4}>4 Stars (Good)</option>
                <option value={3}>3 Stars (Average)</option>
                <option value={2}>2 Stars (Poor)</option>
                <option value={1}>1 Star (Very Poor)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Customer Review</label>
              <textarea
                required
                name="review"
                value={formData.review}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-medium hover:bg-primary/90 transition-all flex items-center justify-center disabled:opacity-70 shadow-sm"
              >
                {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                {editingId ? 'Update Review' : 'Add Review'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null)
                    setFormData({ customer_name: '', review: '', rating: 5, image: '' })
                  }}
                  className="px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* List panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Customer Reviews</h3>
            {fetching ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : testimonials.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                No customer reviews added yet.
              </div>
            ) : (
              <div className="space-y-4">
                {testimonials.map((t) => (
                  <div key={t.id} className="border border-gray-100 p-6 rounded-2xl shadow-sm bg-gray-50 flex items-start gap-4">
                    {t.image ? (
                      <img src={t.image} alt={t.customer_name} className="w-12 h-12 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                        {t.customer_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-gray-900">{t.customer_name}</h4>
                          <div className="flex gap-0.5 mt-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`w-4 h-4 ${i < t.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(t)}
                            className="text-sm font-medium text-gray-600 hover:text-primary"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="text-sm font-medium text-red-500 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm italic">"{t.review}"</p>
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
