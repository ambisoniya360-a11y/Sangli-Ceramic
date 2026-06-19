'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, Trash2, Shield, Loader2, UserPlus, AlertTriangle } from 'lucide-react'

export default function UserManagementPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  
  const [formData, setFormData] = useState({
    email: '',
    password: '', // only needed for new users
    name: '',
    role: 'Staff',
  })
  const [editingId, setEditingId] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    checkRoleAndLoadUsers()
  }, [])

  async function checkRoleAndLoadUsers() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile && profile.role === 'Super Admin') {
        setIsSuperAdmin(true)
        loadUsers()
      } else {
        setIsSuperAdmin(false)
        setFetching(false)
      }
    } catch (err) {
      console.error(err)
      setFetching(false)
    }
  }

  async function loadUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) setUsers(data)
    } catch (err: any) {
      alert(`Error loading users: ${err.message}`)
    } finally {
      setFetching(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (editingId) {
        // Edit User details (only update role and name in public.users)
        const { error } = await supabase
          .from('users')
          .update({
            name: formData.name,
            role: formData.role
          })
          .eq('id', editingId)

        if (error) throw error
        
        // Log activity
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('activity_logs').insert([{
            user_id: user.id,
            action: `Updated details for user: ${formData.name}`,
            entity_type: 'user',
            entity_id: editingId
          }])
        }

        alert('User details updated successfully!')
      } else {
        // Add User
        // Since client-side standard sign-up creates a user, in a real SaaS dashboard you either:
        // 1. Use a Supabase Edge function or custom backend route (admin Auth API) to invite/create users.
        // 2. Or, sign up the user via standard signUp (requires temporarily signing them up or creating profiles).
        // Let's create the profile directly by calling standard supabase auth signUp (which creates auth.users + trigger creates public.users).
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              name: formData.name,
              role: formData.role
            }
          }
        })

        if (signUpError) throw signUpError

        // Log activity
        const { data: { user } } = await supabase.auth.getUser()
        if (user && data.user) {
          await supabase.from('activity_logs').insert([{
            user_id: user.id,
            action: `Registered new user: ${formData.name} (${formData.role})`,
            entity_type: 'user',
            entity_id: data.user.id
          }])
        }

        alert('New user registered successfully! They can now log in.')
      }

      setFormData({ email: '', password: '', name: '', role: 'Staff' })
      setEditingId(null)
      loadUsers()
    } catch (err: any) {
      alert(`Error saving user: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (u: any) => {
    setEditingId(u.id)
    setFormData({
      email: u.email,
      password: '',
      name: u.name,
      role: u.role
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    setLoading(true)
    try {
      // Delete user profile from public.users (triggers/RLS cascade can be handled)
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Log activity
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('activity_logs').insert([{
          user_id: user.id,
          action: `Deleted user profile id: ${id}`,
          entity_type: 'user',
          entity_id: id
        }])
      }

      loadUsers()
    } catch (err: any) {
      alert(`Error deleting user: ${err.message}`)
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

  if (!isSuperAdmin) {
    return (
      <div className="max-w-md mx-auto mt-16 p-8 bg-white rounded-2xl border border-gray-150 shadow-sm text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-gray-900 font-sans">Access Denied</h2>
        <p className="text-gray-500 text-sm">
          Only Super Admins can manage team members, invite new users, or assign system roles.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 mt-1">Add, edit, or delete admin accounts and allocate access roles.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor Form */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit space-y-6">
          <h3 className="text-lg font-bold text-gray-900">{editingId ? 'Edit User Details' : 'Add Team Member'}</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Full Name</label>
              <input
                required
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Email Address</label>
              <input
                required
                disabled={!!editingId}
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60"
              />
            </div>

            {!editingId && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <input
                  required
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">System Role</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
              >
                <option value="Staff">Staff</option>
                <option value="Admin">Admin</option>
                <option value="Super Admin">Super Admin</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-medium hover:bg-primary/90 transition-all flex items-center justify-center disabled:opacity-70 shadow-sm"
              >
                {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <UserPlus className="w-5 h-5 mr-2" />}
                {editingId ? 'Save Changes' : 'Register User'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null)
                    setFormData({ email: '', password: '', name: '', role: 'Staff' })
                  }}
                  className="px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Users list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 font-sans">Active Users & Accounts</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                  <tr>
                    <th className="px-6 py-3">User</th>
                    <th className="px-6 py-3">Role</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{u.name}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-fit ${
                          u.role === 'Super Admin' ? 'bg-red-100 text-red-800' :
                          u.role === 'Admin' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          <Shield className="w-3 h-3" /> {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(u)}
                            className="text-sm font-semibold text-gray-600 hover:text-primary"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
