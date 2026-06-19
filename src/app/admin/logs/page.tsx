'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ShieldAlert, History } from 'lucide-react'

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadLogs()
  }, [])

  async function loadLogs() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          id, action, entity_type, created_at,
          users (name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      if (data) setLogs(data)
    } catch (err: any) {
      alert(`Error loading logs: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Activity Logs</h1>
          <p className="text-gray-500 mt-1">Track modifications, uploads, and critical actions across the CMS.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6">
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            No system actions recorded yet.
          </div>
        ) : (
          <div className="relative border-l border-gray-200 ml-4 pl-6 space-y-6">
            {logs.map((log) => (
              <div key={log.id} className="relative">
                <div className="absolute w-3 h-3 bg-primary rounded-full -left-[31px] top-1.5 border-2 border-white shadow-sm" />
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{log.action}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Performed on: <span className="font-medium text-gray-700">{log.entity_type}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-600 font-semibold">{log.users?.name || 'System Operator'}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
