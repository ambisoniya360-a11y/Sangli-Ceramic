'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Download, Trash2, Eye, Search, Loader2 } from 'lucide-react'

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadLeads()
  }, [])

  async function loadLeads() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('inquiries')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) setLeads(data)
    } catch (err: any) {
      alert(`Error loading leads: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this inquiry?')) return
    try {
      setActionLoadingId(id)
      const { error } = await supabase
        .from('inquiries')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      // Log activity
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('activity_logs').insert([{
          user_id: user.id,
          action: 'Deleted Customer Lead',
          entity_type: 'inquiry',
          entity_id: id
        }])
      }

      loadLeads()
    } catch (err: any) {
      alert(`Error deleting inquiry: ${err.message}`)
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleExportCSV = () => {
    if (leads.length === 0) return
    const headers = ['Date', 'Name', 'Mobile', 'Email', 'Product', 'Message', 'Status']
    const rows = leads.map(lead => [
      new Date(lead.created_at).toLocaleDateString(),
      lead.name,
      lead.mobile,
      lead.email || '',
      lead.product_name || '',
      lead.message || '',
      lead.status
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n')
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          lead.mobile.includes(searchQuery) ||
                          (lead.email && lead.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (lead.product_name && lead.product_name.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesStatus = statusFilter === 'All' || lead.status.toLowerCase() === statusFilter.toLowerCase()
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CRM Leads & Inquiries</h1>
          <p className="text-gray-500 mt-1">Track and manage client requests and product inquiries.</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="bg-gray-100 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-200 flex items-center transition-colors shadow-sm self-start"
        >
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, contact, product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {(['All', 'New', 'Contacted', 'Interested', 'Follow Up', 'Converted', 'Closed'] as const).map(tab => (
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
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Product Interested</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.length > 0 ? (
                  filteredLeads.map((lead: any) => (
                    <tr key={lead.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{lead.name}</div>
                        <div className="text-xs text-gray-500 line-clamp-1 max-w-xs">{lead.message}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div>{lead.mobile}</div>
                        <div className="text-gray-500 text-xs">{lead.email || '—'}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-medium">
                        {lead.product_name || 'General Inquiry'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          lead.status === 'new' ? 'bg-blue-100 text-blue-800' : 
                          lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' : 
                          lead.status === 'interested' ? 'bg-purple-100 text-purple-800' : 
                          lead.status === 'follow up' ? 'bg-orange-100 text-orange-800' : 
                          lead.status === 'converted' ? 'bg-green-150 bg-green-100 text-green-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/admin/leads/${lead.id}`}
                            className="p-2 text-primary hover:bg-primary/5 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" /> View Details
                          </Link>
                          <button
                            onClick={() => handleDelete(lead.id)}
                            disabled={actionLoadingId === lead.id}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                      No inquiries or leads found.
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
