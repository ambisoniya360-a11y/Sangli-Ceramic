'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Loader2, Save, Calendar, Phone, Mail, Link as LinkIcon, MessageSquare, Clipboard } from 'lucide-react'
import Link from 'next/link'

export default function LeadDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id: leadId } = use(params)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [lead, setLead] = useState<any>(null)
  const [notes, setNotes] = useState<any[]>([])
  const [newNote, setNewNote] = useState('')
  const [status, setStatus] = useState('new')

  const supabase = createClient()

  useEffect(() => {
    loadLeadDetails()
  }, [leadId])

  async function loadLeadDetails() {
    try {
      setFetching(true)
      const { data: leadData, error: leadErr } = await supabase
        .from('inquiries')
        .select('*')
        .eq('id', leadId)
        .single()

      if (leadErr) throw leadErr
      setLead(leadData)
      setStatus(leadData.status)

      const { data: notesData, error: notesErr } = await supabase
        .from('lead_notes')
        .select(`
          id, note, created_at,
          users (name)
        `)
        .eq('inquiry_id', leadId)
        .order('created_at', { ascending: false })

      if (notesErr) throw notesErr
      setNotes(notesData || [])
    } catch (err: any) {
      alert(`Error loading lead: ${err.message}`)
    } finally {
      setFetching(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      setLoading(true)
      const { error } = await supabase
        .from('inquiries')
        .update({ status: newStatus })
        .eq('id', leadId)

      if (error) throw error
      setStatus(newStatus)
      
      // Log activity
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('activity_logs').insert([{
          user_id: user.id,
          action: `Changed lead status to ${newStatus}`,
          entity_type: 'inquiry',
          entity_id: leadId
        }])
      }

      loadLeadDetails()
    } catch (err: any) {
      alert(`Error updating status: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim()) return

    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error('No authenticated user found')

      const { error } = await supabase
        .from('lead_notes')
        .insert([{
          inquiry_id: leadId,
          note: newNote,
          created_by: user.id
        }])

      if (error) throw error
      
      // Log activity
      await supabase.from('activity_logs').insert([{
        user_id: user.id,
        action: 'Added follow-up note on lead',
        entity_type: 'inquiry',
        entity_id: leadId
      }])

      setNewNote('')
      loadLeadDetails()
    } catch (err: any) {
      alert(`Error adding note: ${err.message}`)
    } finally {
      setLoading(false)
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
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/leads" className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lead Details</h1>
          <p className="text-gray-500 mt-1">Review contact information and log follow-up notes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Card: Customer Information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{lead.name}</h2>
                <div className="flex items-center text-sm text-gray-500 mt-1">
                  <Calendar className="w-4 h-4 mr-2" />
                  Received: {new Date(lead.created_at).toLocaleString()}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-500">Status:</span>
                <select
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="interested">Interested</option>
                  <option value="follow up">Follow Up</option>
                  <option value="converted">Converted</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                <Phone className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-400 font-medium">Mobile Number</div>
                  <div className="font-semibold text-gray-900 mt-0.5">{lead.mobile}</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                <Mail className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-400 font-medium">Email Address</div>
                  <div className="font-semibold text-gray-900 mt-0.5">{lead.email || 'No email provided'}</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl md:col-span-2">
                <Clipboard className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-400 font-medium">Product Interested</div>
                  <div className="font-semibold text-gray-900 mt-0.5">{lead.product_name || 'General Inquiry'}</div>
                </div>
              </div>

              {lead.page_url && (
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl md:col-span-2">
                  <LinkIcon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-gray-400 font-medium">Inquiry Page Source</div>
                    <a href={lead.page_url} target="_blank" rel="noreferrer" className="text-primary hover:underline font-semibold block mt-0.5 text-sm truncate">
                      {lead.page_url}
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700">Customer Message</h3>
              <div className="bg-gray-50 p-6 rounded-xl text-gray-700 text-sm whitespace-pre-wrap leading-relaxed border border-gray-100">
                {lead.message || 'No message provided.'}
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: CRM notes */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-primary" /> Follow-Up Notes
            </h3>

            {/* Note Editor */}
            <form onSubmit={handleAddNote} className="space-y-3">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Log follow-up note (e.g. Called customer, scheduled showroom visit...)"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
              <button
                type="submit"
                disabled={loading || !newNote.trim()}
                className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-all flex items-center justify-center disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Add Note
              </button>
            </form>

            {/* Notes Timeline */}
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
              {notes.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-400">
                  No notes recorded yet.
                </div>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="border-l-2 border-primary/20 pl-4 py-1 relative space-y-1">
                    <div className="absolute w-2 h-2 rounded-full bg-primary -left-[5px] top-2" />
                    <p className="text-xs text-gray-600 leading-relaxed font-medium">{note.note}</p>
                    <div className="flex justify-between items-center text-[10px] text-gray-400">
                      <span>By {note.users?.name || 'Staff Member'}</span>
                      <span>{new Date(note.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
