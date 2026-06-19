'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Save, ArrowLeft, Loader2, Upload, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import Link from 'next/link'

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id: productId } = use(params)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [categories, setCategories] = useState<any[]>([])
  const [brands, setBrands] = useState<any[]>([])
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    short_description: '',
    price: '',
    category_id: '',
    brand_id: '',
    status: 'Published',
    featured: false
  })

  const [images, setImages] = useState<any[]>([]) // array of { url: string, name: string, order: number, id?: string }

  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      try {
        const [{ data: cats }, { data: brds }, { data: prod }, { data: imgs }] = await Promise.all([
          supabase.from('categories').select('id, name'),
          supabase.from('brands').select('id, name'),
          supabase.from('products').select('*').eq('id', productId).single(),
          supabase.from('product_images').select('*').eq('product_id', productId).order('display_order', { ascending: true })
        ])

        if (cats) setCategories(cats)
        if (brds) setBrands(brds)
        if (prod) {
          setFormData({
            name: prod.name,
            slug: prod.slug,
            description: prod.description || '',
            short_description: prod.short_description || '',
            price: prod.price !== null ? prod.price.toString() : '',
            category_id: prod.category_id || '',
            brand_id: prod.brand_id || '',
            status: prod.status || 'Published',
            featured: prod.featured || false
          })
        }
        if (imgs) {
          setImages(imgs.map(img => ({
            id: img.id,
            url: img.image_url,
            name: img.image_name,
            order: img.display_order
          })))
        }
      } catch (err) {
        console.error(err)
      } finally {
        setFetching(false)
      }
    }
    loadData()
  }, [productId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value

    setFormData(prev => ({ ...prev, [name]: val }))
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setLoading(true)
    const uploadedImages = [...images]

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        const fileExt = file.name.split('.').pop()
        const fileName = `prod-${Date.now()}-${i}.${fileExt}`
        const filePath = `${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('products')
          .getPublicUrl(filePath)

        uploadedImages.push({
          url: publicUrl,
          name: file.name,
          order: uploadedImages.length
        })
      } catch (err: any) {
        alert(`Error uploading ${file.name}: ${err.message}`)
      }
    }

    setImages(uploadedImages)
    setLoading(false)
  }

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, idx) => idx !== index).map((img, idx) => ({ ...img, order: idx })))
  }

  const handleMoveImage = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === images.length - 1) return

    const newIndex = direction === 'up' ? index - 1 : index + 1
    const newImages = [...images]
    const temp = newImages[index]
    newImages[index] = newImages[newIndex]
    newImages[newIndex] = temp

    setImages(newImages.map((img, idx) => ({ ...img, order: idx })))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const primaryImage = images.length > 0 ? images[0].url : null

    // Update product record
    const payload = {
      name: formData.name,
      slug: formData.slug,
      description: formData.description || null,
      short_description: formData.short_description || null,
      price: formData.price ? parseFloat(formData.price) : null,
      category_id: formData.category_id || null,
      brand_id: formData.brand_id || null,
      status: formData.status,
      featured: formData.featured,
      image: primaryImage,
      updated_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('products')
      .update(payload)
      .eq('id', productId)

    if (error) {
      alert(`Error updating product: ${error.message}`)
      setLoading(false)
      return
    }

    // Sync product images by deleting old ones and re-inserting
    await supabase
      .from('product_images')
      .delete()
      .eq('product_id', productId)

    if (images.length > 0) {
      const imageRecords = images.map(img => ({
        product_id: productId,
        image_url: img.url,
        image_name: img.name,
        display_order: img.order
      }))

      await supabase.from('product_images').insert(imageRecords)
    }

    // Log activity
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('activity_logs').insert([{
        user_id: user.id,
        action: `Edited Product: ${formData.name}`,
        entity_type: 'product',
        entity_id: productId
      }])
    }

    setLoading(false)
    router.push('/admin/products')
    router.refresh()
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
      <div className="flex items-center gap-4">
        <Link href="/admin/products" className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
          <p className="text-gray-500 mt-1">Modify details for this catalog item.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Product Name</label>
            <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Slug</label>
            <input required type="text" name="slug" value={formData.slug} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Category</label>
            <select name="category_id" value={formData.category_id} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white">
              <option value="">Select Category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Brand</label>
            <select name="brand_id" value={formData.brand_id} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white">
              <option value="">Select Brand</option>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Price (₹)</label>
            <input type="number" name="price" value={formData.price} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white">
              <option value="Published">Published</option>
              <option value="Draft">Draft</option>
              <option value="Archived">Archived</option>
            </select>
          </div>

          <div className="flex items-center gap-3 pt-4 md:col-span-2">
            <input
              type="checkbox"
              name="featured"
              id="featured"
              checked={formData.featured}
              onChange={handleChange}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label htmlFor="featured" className="text-sm font-medium text-gray-700 cursor-pointer">
              Featured Product (Show on homepage)
            </label>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Short Description</label>
            <textarea name="short_description" value={formData.short_description} onChange={handleChange} rows={2} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"></textarea>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Full Description</label>
            <textarea name="description" value={formData.description} onChange={handleChange} rows={5} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"></textarea>
          </div>

          {/* Image Upload Component */}
          <div className="space-y-4 md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Product Images (Multi-image Upload & Sort)</label>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-8 cursor-pointer hover:bg-gray-50 transition-colors">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-500 font-medium">Click to select files or Drag & Drop</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>

            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                {images.map((image, idx) => (
                  <div key={idx} className="group border border-gray-100 rounded-xl overflow-hidden shadow-sm bg-gray-50 relative aspect-square flex flex-col justify-between">
                    <img src={image.url} alt={image.name} className="w-full h-3/4 object-cover" />
                    <div className="p-2 bg-white flex justify-between items-center h-1/4 border-t border-gray-150">
                      <span className="text-[10px] text-gray-400 truncate max-w-[60%]">{image.name}</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveImage(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveImage(idx, 'down')}
                          disabled={idx === images.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="p-1 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t border-gray-100">
          <button 
            type="submit" 
            disabled={loading}
            className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-medium hover:bg-primary/90 transition-all flex items-center disabled:opacity-70 shadow-sm"
          >
            {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  )
}
