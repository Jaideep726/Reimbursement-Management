// src/pages/AdminPage.jsx — Task 03
// Admin dashboard with three tabs: Users | Approval Rules | All Expenses
// Task 03 scope: fully build the "Users" tab with Add User modal
// Other tabs are placeholder stubs (filled in Task 04 onward)

import { useState, useEffect } from 'react'
import { supabase }            from '@/lib/supabase'
import { createUser }          from '@/lib/admin'
import { useAuth }             from '@/context/AuthContext'

// ─── Role badge colours ────────────────────────────────────────────────────
// Admin = blue  |  Manager = green  |  Employee = gray
const ROLE_BADGE = {
  admin:    'bg-blue-100  text-blue-700  border border-blue-200',
  manager:  'bg-green-100 text-green-700 border border-green-200',
  employee: 'bg-gray-100  text-gray-600  border border-gray-200',
}

// ─── Top-level tab list ────────────────────────────────────────────────────
const TABS = ['Users', 'Approval Rules', 'All Expenses']

export default function AdminPage() {
  const { profile } = useAuth()        // profile.company_id used throughout

  // which tab is active
  const [activeTab, setActiveTab] = useState('Users')

  return (
    <div
      className="min-h-screen px-4 py-8"
      style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#0f172a 100%)' }}
    >
      <div className="max-w-5xl mx-auto">

        {/* ── Page header ── */}
        <h1 className="text-2xl font-bold text-white mb-6">Admin Dashboard</h1>

        {/* ── Tab bar ── */}
        <div className="flex gap-1 mb-6 bg-white/10 rounded-xl p-1 w-fit">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors
                ${activeTab === tab
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-white/70 hover:text-white'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          {activeTab === 'Users'          && <UsersTab companyId={profile?.company_id} />}
          {activeTab === 'Approval Rules' && <PlaceholderTab label="Approval Rules — coming in Task 04" />}
          {activeTab === 'All Expenses'   && <PlaceholderTab label="All Expenses — coming in a later task" />}
        </div>

      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// USERS TAB
// ─────────────────────────────────────────────────────────────────────────────
function UsersTab({ companyId }) {
  const [users,       setUsers]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showModal,   setShowModal]   = useState(false)

  // Fetch every user who belongs to this company
  const fetchUsers = async () => {
    if (!companyId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('company_id', companyId)
    if (!error) setUsers(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [companyId])

  // Called by the modal after a user is successfully created
  const handleUserCreated = () => {
    setShowModal(false)
    fetchUsers()          // refresh the table
  }

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm
                     font-medium rounded-lg transition-colors"
        >
          + Add User
        </button>
      </div>

      {/* ── Users table ── */}
      {loading ? (
        <p className="text-sm text-gray-500 py-8 text-center">Loading users…</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">
          No users yet. Add one to get started.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Manager</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(user => (
                <UserRow key={user.id} user={user} allUsers={users} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Add User modal ── */}
      {showModal && (
        <AddUserModal
          companyId={companyId}
          managers={users.filter(u => u.role === 'manager')}
          onClose={() => setShowModal(false)}
          onCreated={handleUserCreated}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Single row in the users table
// ─────────────────────────────────────────────────────────────────────────────
function UserRow({ user, allUsers }) {
  // Look up the manager's name from the same users list
  const manager = allUsers.find(u => u.id === user.manager_id)

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
      <td className="px-4 py-3 text-gray-500">{user.email}</td>
      <td className="px-4 py-3">
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize
          ${ROLE_BADGE[user.role] ?? ROLE_BADGE.employee}`}>
          {user.role}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-500">
        {manager ? manager.name : <span className="text-gray-300">—</span>}
      </td>
    </tr>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD USER MODAL
// Fields: Name, Email, Role (Employee | Manager), Manager (only for Employee)
// On save: calls createUser() from @/lib/admin, shows temp password
// ─────────────────────────────────────────────────────────────────────────────
function AddUserModal({ companyId, managers, onClose, onCreated }) {
  const [name,        setName]        = useState('')
  const [email,       setEmail]       = useState('')
  const [role,        setRole]        = useState('employee')
  const [managerId,   setManagerId]   = useState('')

  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  // After success, we show the temp password so admin can copy + share it
  const [tempPassword, setTempPassword] = useState(null)

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {}
    if (!name.trim())  errs.name  = 'Name is required'
    if (!email.trim()) errs.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
                       errs.email = 'Enter a valid email address'
    if (!role)         errs.role  = 'Role is required'
    // Manager dropdown is only required when role is employee
    if (role === 'employee' && !managerId)
                       errs.managerId = 'Please assign a manager'
    return errs
  }

  // ── Save handler ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    setError('')
    const errs = validate()
    if (Object.keys(errs).length) { setFieldErrors(errs); return }
    setFieldErrors({})
    setLoading(true)
    try {
      // createUser() is written by Person A in src/lib/admin.js
      // Returns { ...profile, tempPassword }
      const result = await createUser({
        name,
        email,
        role,
        managerId: role === 'employee' ? managerId : null,
        companyId,
      })
      // Show the temp password so admin can copy and share it
      setTempPassword(result.tempPassword)
    } catch (err) {
      setError(err.message || 'Failed to create user. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Shared input style ────────────────────────────────────────────────────
  const inputClass = (field) =>
    `w-full px-4 py-2.5 rounded-lg text-sm border focus:outline-none
     focus:ring-2 focus:ring-blue-500 transition-colors
     ${fieldErrors[field]
       ? 'border-red-400 bg-red-50'
       : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`

  // ─────────────────────────────────────────────────────────────────────────
  // SUCCESS STATE: show temp password, let admin close
  // ─────────────────────────────────────────────────────────────────────────
  if (tempPassword) {
    return (
      <Overlay onClose={onCreated}>
        <div className="text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center
                          justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">User Created!</h3>
          <p className="text-sm text-gray-500 mb-4">
            Share this temporary password with <strong>{name}</strong>.<br />
            They should change it after first login.
          </p>

          {/* Temp password box — easy to copy */}
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl
                          px-6 py-4 mb-6 font-mono text-xl font-bold text-gray-800
                          tracking-widest select-all">
            {tempPassword}
          </div>

          <button
            onClick={onCreated}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white
                       bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            Done
          </button>
        </div>
      </Overlay>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DEFAULT STATE: the add user form
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Overlay onClose={onClose}>
      <h3 className="text-lg font-bold text-gray-900 mb-1">Add New User</h3>
      <p className="text-sm text-gray-500 mb-5">
        A temporary password will be generated automatically.
      </p>

      <div className="space-y-4">

        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-600
                            uppercase tracking-wide mb-1">Full Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Jane Smith"
            className={inputClass('name')}
          />
          {fieldErrors.name && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-gray-600
                            uppercase tracking-wide mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="jane@company.com"
            className={inputClass('email')}
          />
          {fieldErrors.email && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>
          )}
        </div>

        {/* Role — Employee or Manager only (Admin is created at signup) */}
        <div>
          <label className="block text-xs font-semibold text-gray-600
                            uppercase tracking-wide mb-1">Role</label>
          <select
            value={role}
            onChange={e => { setRole(e.target.value); setManagerId('') }}
            className={`${inputClass('role')} bg-slate-50`}
          >
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
          </select>
          {fieldErrors.role && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.role}</p>
          )}
        </div>

        {/* Manager dropdown — only visible when role === 'employee' */}
        {role === 'employee' && (
          <div>
            <label className="block text-xs font-semibold text-gray-600
                              uppercase tracking-wide mb-1">Assign Manager</label>
            <select
              value={managerId}
              onChange={e => setManagerId(e.target.value)}
              className={`${inputClass('managerId')} bg-slate-50`}
            >
              <option value="">— Select a manager —</option>
              {managers.length === 0 ? (
                <option disabled>No managers in company yet</option>
              ) : (
                managers.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))
              )}
            </select>
            {fieldErrors.managerId && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.managerId}</p>
            )}
          </div>
        )}

        {/* Global error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm
                          rounded-lg px-4 py-3">
            {error}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-lg text-sm font-medium text-gray-700
                     border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white
                     bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
                     disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Creating…' : 'Save User'}
        </button>
      </div>
    </Overlay>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED: modal overlay wrapper
// ─────────────────────────────────────────────────────────────────────────────
function Overlay({ children, onClose }) {
  return (
    // Semi-transparent backdrop — click outside to dismiss
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(15,23,42,0.6)' }}
      onClick={onClose}
    >
      {/* Modal card — stop propagation so clicking inside doesn't close it */}
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8"
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED: placeholder for tabs not yet built
// ─────────────────────────────────────────────────────────────────────────────
function PlaceholderTab({ label }) {
  return (
    <div className="py-16 text-center text-gray-400 text-sm">
      {label}
    </div>
  )
}