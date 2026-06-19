'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit, Trash2, Copy, Eye, EyeOff, Archive, Loader2, Search } from 'lucide-react'

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | 'Published' | 'Draft' | 'Archived'>('All')

  const supabase = createClient()

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, price, slug, status, featured,
          categories (name),
          brands (name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) setProducts(data)
    } catch (err: any) {
      alert(`Error loading products: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (id: string, newStatus: 'Published' | 'Draft' | 'Archived') => {
    try {
      setActionLoadingId(id)
      const { error } = await supabase
        .from('products')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      // Log activity
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('activity_logs').insert([{
          user_id: user.id,
          action: `Changed status of product to ${newStatus}`,
          entity_type: 'product',
          entity_id: id
        }])
      }

      loadProducts()
    } catch (err: any) {
      alert(`Error updating product status: ${err.message}`)
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleDuplicate = async (product: any) => {
    try {
      setActionLoadingId(product.id)
      
      // Fetch full product details including images
      const { data: fullProduct, error: fetchErr } = await supabase
        .from('products')
        .select('*')
        .eq('id', product.id)
        .single()

      if (fetchErr) throw fetchErr

      // Duplicate product record
      const duplicatedSlug = `${fullProduct.slug}-copy-${Date.now()}`
      const duplicatedName = `${fullProduct.name} (Copy)`

      const { data: newProd, error: insertErr } = await supabase
        .from('products')
        .insert([{
          name: duplicatedName,
          slug: duplicatedSlug,
          description: fullProduct.description,
          short_description: fullProduct.short_description,
          price: fullProduct.price,
          category_id: fullProduct.category_id,
          brand_id: fullProduct.brand_id,
          featured: false,
          image: fullProduct.image,
          status: 'Draft'
        }])
        .select()
        .single()

      if (insertErr) throw insertErr

      // Duplicate product images if present
      const { data: images } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', product.id)

      if (images && images.length > 0) {
        const imageInserts = images.map(img => ({
          product_id: newProd.id,
          image_url: img.image_url,
          image_name: img.image_name,
          display_order: img.display_order
        }))
        await supabase.from('product_images').insert(imageInserts)
      }

      // Log activity
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('activity_logs').insert([{
          user_id: user.id,
          action: 'Duplicated Product',
          entity_type: 'product',
          entity_id: newProd.id
        }])
      }

      alert('Product duplicated as Draft!')
      loadProducts()
    } catch (err: any) {
      alert(`Error duplicating product: ${err.message}`)
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product? All details and images will be permanently removed.')) return
    try {
      setActionLoadingId(id)
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Log activity
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('activity_logs').insert([{
          user_id: user.id,
          action: 'Deleted Product',
          entity_type: 'product',
          entity_id: id
        }])
      }

      loadProducts()
    } catch (err: any) {
      alert(`Error deleting product: ${err.message}`)
    } finally {
      setActionLoadingId(null)
    }
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          product.slug.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'All' || product.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products Catalog</h1>
          <p className="text-gray-500 mt-1">Add, edit, duplicate, and configure catalog items.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link 
            href="/admin/products/new"
            className="bg-primary text-primary-foreground px-5 py-3 rounded-xl text-sm font-medium hover:bg-primary/90 flex items-center transition-all shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Link>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search products by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {(['All', 'Published', 'Draft', 'Archived'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                statusFilter === tab 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Brand</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product: any) => (
                    <tr key={product.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{product.name}</div>
                        <div className="text-[10px] text-gray-400 truncate max-w-xs">{product.slug}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{product.categories?.name || 'Unassigned'}</td>
                      <td className="px-6 py-4 text-gray-500">{product.brands?.name || 'Unassigned'}</td>
                      <td className="px-6 py-4 text-gray-500">
                        {product.price ? `₹${product.price}` : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          product.status === 'Published' ? 'bg-green-55 bg-green-100 text-green-800' :
                          product.status === 'Draft' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {product.status || 'Published'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 items-center">
                          {product.status !== 'Published' ? (
                            <button
                              onClick={() => handleStatusChange(product.id, 'Published')}
                              disabled={actionLoadingId === product.id}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Publish Product"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStatusChange(product.id, 'Draft')}
                              disabled={actionLoadingId === product.id}
                              className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                              title="Set to Draft"
                            >
                              <EyeOff className="w-4 h-4" />
                            </button>
                          )}
                          {product.status !== 'Archived' && (
                            <button
                              onClick={() => handleStatusChange(product.id, 'Archived')}
                              disabled={actionLoadingId === product.id}
                              className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                              title="Archive Product"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDuplicate(product)}
                            disabled={actionLoadingId === product.id}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Duplicate Product"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <Link
                            href={`/admin/products/${product.id}/edit`}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Product"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(product.id)}
                            disabled={actionLoadingId === product.id}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
