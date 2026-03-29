// src/pages/AdminPage.jsx — Task 03 + Task 04
// Task 03: Users tab — user table + Add User modal
// Task 04: Approval Rules tab — list rules + Create Rule form
//          Includes friend's schema update: is_auto_approver per approver

import { useState, useEffect } from 'react'
import { supabase }            from '@/lib/supabase'
import { createUser }          from '@/lib/admin'
import { useAuth }             from '@/context/AuthContext'

// ─── Role badge colours ────────────────────────────────────────────────────
const ROLE_BADGE = {
  admin:    'bg-blue-100  text-blue-700  border border-blue-200',
  manager:  'bg-green-100 text-green-700 border border-green-200',
  employee: 'bg-gray-100  text-gray-600  border border-gray-200',
}

const TABS = ['Users', 'Approval Rules', 'All Expenses']

export default function AdminPage() {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState('Users')

  return (
    <div
      className="min-h-screen px-4 py-8"
      style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#0f172a 100%)' }}
    >
      <div className="max-w-5xl mx-auto">

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
          {activeTab === 'Users'          && <UsersTab         companyId={profile?.company_id} />}
          {activeTab === 'Approval Rules' && <ApprovalRulesTab companyId={profile?.company_id} />}
          {activeTab === 'All Expenses'   && <PlaceholderTab   label="All Expenses — coming soon" />}
        </div>

      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// TASK 04 — APPROVAL RULES TAB
// ═════════════════════════════════════════════════════════════════════════════
function ApprovalRulesTab({ companyId }) {
  const [rules,           setRules]           = useState([])
  const [managers,        setManagers]        = useState([])
  const [loading,         setLoading]         = useState(true)
  const [showForm,        setShowForm]        = useState(false)

  const fetchRules = async () => {
    if (!companyId) return
    setLoading(true)
    const { data } = await supabase
      .from('approval_rules')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
    setRules(data ?? [])
    setLoading(false)
  }

  const fetchManagers = async () => {
    if (!companyId) return
    const { data } = await supabase
      .from('users')
      .select('id, name, role')
      .eq('company_id', companyId)
      .eq('role', 'manager')
    setManagers(data ?? [])
  }

  useEffect(() => {
    fetchRules()
    fetchManagers()
  }, [companyId])

  const handleRuleCreated = () => {
    setShowForm(false)
    fetchRules()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Approval Rules</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm
                       font-medium rounded-lg transition-colors"
          >
            + Create Rule
          </button>
        )}
      </div>

      {/* ── Existing rules list ── */}
      {!showForm && (
        loading ? (
          <p className="text-sm text-gray-500 py-8 text-center">Loading rules…</p>
        ) : rules.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">
            No rules yet. Create one to get started.
          </p>
        ) : (
          <div className="space-y-3 mb-6">
            {rules.map(rule => (
              <div key={rule.id}
                className="p-4 rounded-xl border border-gray-100 hover:bg-gray-50
                           transition-colors">
                <p className="font-medium text-gray-900 text-sm">{rule.name}</p>
                {rule.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{rule.description}</p>
                )}
                <div className="flex gap-2 mt-2 flex-wrap">
                  {rule.sequential && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100
                                     text-purple-700 border border-purple-200">
                      Sequential
                    </span>
                  )}
                  {rule.is_manager_approver && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100
                                     text-blue-700 border border-blue-200">
                      Manager first
                    </span>
                  )}
                  {rule.min_approval_pct > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-100
                                     text-yellow-700 border border-yellow-200">
                      {rule.min_approval_pct}% required
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Create Rule form ── */}
      {showForm && (
        <CreateRuleForm
          companyId={companyId}
          managers={managers}
          onSaved={handleRuleCreated}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE RULE FORM
// Saves to: approval_rules + rule_approvers (one row per approver)
// Friend's schema note: rule_approvers has is_auto_approver boolean
// if is_auto_approver = true for an approver, their approval instantly
// closes the expense regardless of other pending steps (e.g. CFO rule)
// ─────────────────────────────────────────────────────────────────────────────
function CreateRuleForm({ companyId, managers, onSaved, onCancel }) {
  const [ruleName,          setRuleName]          = useState('')
  const [description,       setDescription]       = useState('')
  const [isManagerApprover, setIsManagerApprover] = useState(false)
  const [isSequential,      setIsSequential]      = useState(false)
  const [minPct,            setMinPct]            = useState(0)
  const [approvers,         setApprovers]         = useState([])
  const [selectedManager,   setSelectedManager]   = useState('')
  const [loading,           setLoading]           = useState(false)
  const [error,             setError]             = useState('')
  const [fieldErrors,       setFieldErrors]       = useState({})

  // ── Add approver to ordered list ──────────────────────────────────────────
  const handleAddApprover = () => {
    if (!selectedManager) return
    if (approvers.find(a => a.id === selectedManager)) return   // no duplicates
    const manager = managers.find(m => m.id === selectedManager)
    setApprovers(prev => [
      ...prev,
      { id: manager.id, name: manager.name, isAutoApprover: false },
    ])
    setSelectedManager('')
  }

  const handleRemoveApprover = (id) =>
    setApprovers(prev => prev.filter(a => a.id !== id))

  // ── Toggle the Auto Approver checkbox for one approver ────────────────────
  const handleToggleAutoApprover = (id) =>
    setApprovers(prev =>
      prev.map(a => a.id === id ? { ...a, isAutoApprover: !a.isAutoApprover } : a)
    )

  const validate = () => {
    const errs = {}
    if (!ruleName.trim())         errs.ruleName = 'Rule name is required'
    if (minPct < 0 || minPct > 100) errs.minPct = 'Must be between 0 and 100'
    return errs
  }

  // ── Save rule + approvers to Supabase ─────────────────────────────────────
  const handleSave = async () => {
    setError('')
    const errs = validate()
    if (Object.keys(errs).length) { setFieldErrors(errs); return }
    setFieldErrors({})
    setLoading(true)
    try {
      // Step 1: Insert the rule row
      // NOTE: is_manager_approver is a FLAG only — it does NOT add the manager
      // to the approvers list shown here. Friend's approvalEngine.js injects
      // the employee's manager automatically when an expense is submitted.
      const { data: rule, error: ruleErr } = await supabase
        .from('approval_rules')
        .insert({
          company_id:          companyId,
          name:                ruleName,
          description:         description || null,
          is_manager_approver: isManagerApprover,
          sequential:          isSequential,
          min_approval_pct:    minPct,
        })
        .select()
        .single()

      if (ruleErr) throw ruleErr

      // Step 2: Insert one row per approver
      // is_auto_approver comes from friend's schema update to rule_approvers
      if (approvers.length > 0) {
        const approverRows = approvers.map((approver, index) => ({
          rule_id:          rule.id,
          approver_id:      approver.id,
          step_order:       index,
          is_auto_approver: approver.isAutoApprover,  // ← friend's new field
        }))
        const { error: approverErr } = await supabase
          .from('rule_approvers')
          .insert(approverRows)
        if (approverErr) throw approverErr
      }

      onSaved()
    } catch (err) {
      setError(err.message || 'Failed to save rule. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = (field) =>
    `w-full px-4 py-2.5 rounded-lg text-sm border focus:outline-none
     focus:ring-2 focus:ring-blue-500 transition-colors
     ${fieldErrors[field]
       ? 'border-red-400 bg-red-50'
       : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`

  return (
    <div className="space-y-5">
      <h3 className="text-base font-bold text-gray-900">Create Approval Rule</h3>

      {/* Rule name */}
      <div>
        <label className="block text-xs font-semibold text-gray-600
                          uppercase tracking-wide mb-1">Rule Name</label>
        <input type="text" value={ruleName}
          onChange={e => setRuleName(e.target.value)}
          placeholder="e.g. Travel Expense Rule"
          className={inputClass('ruleName')} />
        {fieldErrors.ruleName && (
          <p className="text-red-500 text-xs mt-1">{fieldErrors.ruleName}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-semibold text-gray-600
                          uppercase tracking-wide mb-1">
          Description
          <span className="normal-case font-normal text-gray-400 ml-1">(optional)</span>
        </label>
        <input type="text" value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="e.g. For all travel expenses above ₹5000"
          className={inputClass('description')} />
      </div>

      {/* Toggles */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

        {/* Manager Approver toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl
                        border border-slate-200 bg-slate-50">
          <div>
            <p className="text-sm font-medium text-gray-900">Manager Approver</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Employee's manager approves first, auto
            </p>
          </div>
          <button type="button" onClick={() => setIsManagerApprover(v => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full
                        transition-colors ${isManagerApprover ? 'bg-blue-600' : 'bg-gray-200'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white
                              shadow transition-transform
                              ${isManagerApprover ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* Sequential toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl
                        border border-slate-200 bg-slate-50">
          <div>
            <p className="text-sm font-medium text-gray-900">Sequential</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Each approver waits for the previous one
            </p>
          </div>
          <button type="button" onClick={() => setIsSequential(v => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full
                        transition-colors ${isSequential ? 'bg-blue-600' : 'bg-gray-200'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white
                              shadow transition-transform
                              ${isSequential ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      {/* Min approval % */}
      <div>
        <label className="block text-xs font-semibold text-gray-600
                          uppercase tracking-wide mb-1">
          Minimum Approval %
          <span className="normal-case font-normal text-gray-400 ml-1">
            (0 = no approval needed)
          </span>
        </label>
        <input
          type="text"
          inputMode="numeric"
          placeholder="Enter value 0–100"
          value={minPct}
          onChange={e => {
            const v = e.target.value;
            if (v === "" || (/^\d+$/.test(v) && +v <= 100)) setMinPct(v);
          }}
          className={inputClass('minPct')}
        />

        {fieldErrors.minPct && (
          <p className="text-red-500 text-xs mt-1">{fieldErrors.minPct}</p>
        )}
      </div>

      {/* Approvers list */}
      <div>
        <label className="block text-xs font-semibold text-gray-600
                          uppercase tracking-wide mb-2">Approvers</label>

        {/* Add approver row */}
        <div className="flex gap-2 mb-3">
          <select value={selectedManager}
            onChange={e => setSelectedManager(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm border border-slate-200
                       bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">— Select a manager to add —</option>
            {managers
              .filter(m => !approvers.find(a => a.id === m.id))
              .map(m => <option key={m.id} value={m.id}>{m.name}</option>)
            }
          </select>
          <button type="button" onClick={handleAddApprover} disabled={!selectedManager}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300
                       text-white text-sm font-medium rounded-lg transition-colors">
            Add
          </button>
        </div>

        {/* Ordered approvers */}
        {approvers.length === 0 ? (
          <p className="text-xs text-gray-400 py-3 text-center border border-dashed
                        border-gray-200 rounded-lg">
            No approvers added yet
          </p>
        ) : (
          <div className="space-y-2">
            {approvers.map((approver, index) => (
              <div key={approver.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-100
                           bg-gray-50">

                {/* Step number */}
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs
                                 font-bold flex items-center justify-center flex-shrink-0">
                  {index + 1}
                </span>

                {/* Name */}
                <span className="flex-1 text-sm font-medium text-gray-900">
                  {approver.name}
                </span>

                {/* Auto Approver checkbox
                    Friend's is_auto_approver field: if this person approves,
                    expense is immediately approved regardless of other steps */}
                <label className="flex items-center gap-1.5 text-xs text-gray-600
                                  cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={approver.isAutoApprover}
                    onChange={() => handleToggleAutoApprover(approver.id)}
                    className="w-3.5 h-3.5 rounded accent-blue-600"
                  />
                  Auto Approver
                </label>

                {/* Remove */}
                <button type="button" onClick={() => handleRemoveApprover(approver.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors text-xs">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm
                        rounded-lg px-4 py-3">{error}</div>
      )}

      <div className="flex gap-3 pt-2">
        <button onClick={onCancel}
          className="flex-1 py-2.5 rounded-lg text-sm font-medium text-gray-700
                     border border-gray-200 hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button onClick={handleSave} disabled={loading}
          className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white
                     bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
                     disabled:cursor-not-allowed transition-colors">
          {loading ? 'Saving…' : 'Save Rule'}
        </button>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// TASK 03 — USERS TAB (unchanged from Task 03)
// ═════════════════════════════════════════════════════════════════════════════
function UsersTab({ companyId }) {
  const [users,       setUsers]     = useState([])
  const [loading,     setLoading]   = useState(true)
  const [showModal,   setShowModal] = useState(false)

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

  const handleUserCreated = () => { setShowModal(false); fetchUsers() }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
        <button onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm
                     font-medium rounded-lg transition-colors">
          + Add User
        </button>
      </div>

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

function UserRow({ user, allUsers }) {
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

function AddUserModal({ companyId, managers, onClose, onCreated }) {
  const [name,         setName]        = useState('')
  const [email,        setEmail]       = useState('')
  const [role,         setRole]        = useState('employee')
  const [managerId,    setManagerId]   = useState('')
  const [loading,      setLoading]     = useState(false)
  const [error,        setError]       = useState('')
  const [fieldErrors,  setFieldErrors] = useState({})
  const [tempPassword, setTempPassword] = useState(null)

  const validate = () => {
    const errs = {}
    if (!name.trim())  errs.name  = 'Name is required'
    if (!email.trim()) errs.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
                       errs.email = 'Enter a valid email address'
    if (!role)         errs.role  = 'Role is required'
    if (role === 'employee' && !managerId) errs.managerId = 'Please assign a manager'
    return errs
  }

  const handleSave = async () => {
    setError('')
    const errs = validate()
    if (Object.keys(errs).length) { setFieldErrors(errs); return }
    setFieldErrors({})
    setLoading(true)
    try {
      const result = await createUser({
        name, email, role,
        managerId: role === 'employee' ? managerId : null,
        companyId,
      })
      setTempPassword(result.tempPassword)
    } catch (err) {
      setError(err.message || 'Failed to create user. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = (field) =>
    `w-full px-4 py-2.5 rounded-lg text-sm border focus:outline-none
     focus:ring-2 focus:ring-blue-500 transition-colors
     ${fieldErrors[field]
       ? 'border-red-400 bg-red-50'
       : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`

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
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl
                          px-6 py-4 mb-6 font-mono text-xl font-bold text-gray-800
                          tracking-widest select-all">
            {tempPassword}
          </div>
          <button onClick={onCreated}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white
                       bg-blue-600 hover:bg-blue-700 transition-colors">
            Done
          </button>
        </div>
      </Overlay>
    )
  }

  return (
    <Overlay onClose={onClose}>
      <h3 className="text-lg font-bold text-gray-900 mb-1">Add New User</h3>
      <p className="text-sm text-gray-500 mb-5">
        A temporary password will be generated automatically.
      </p>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600
                            uppercase tracking-wide mb-1">Full Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="Jane Smith" className={inputClass('name')} />
          {fieldErrors.name && <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>}
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600
                            uppercase tracking-wide mb-1">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="jane@company.com" className={inputClass('email')} />
          {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>}
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600
                            uppercase tracking-wide mb-1">Role</label>
          <select value={role} onChange={e => { setRole(e.target.value); setManagerId('') }}
            className={`${inputClass('role')} bg-slate-50`}>
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
          </select>
          {fieldErrors.role && <p className="text-red-500 text-xs mt-1">{fieldErrors.role}</p>}
        </div>
        {role === 'employee' && (
          <div>
            <label className="block text-xs font-semibold text-gray-600
                              uppercase tracking-wide mb-1">Assign Manager</label>
            <select value={managerId} onChange={e => setManagerId(e.target.value)}
              className={`${inputClass('managerId')} bg-slate-50`}>
              <option value="">— Select a manager —</option>
              {managers.length === 0
                ? <option disabled>No managers in company yet</option>
                : managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)
              }
            </select>
            {fieldErrors.managerId && <p className="text-red-500 text-xs mt-1">{fieldErrors.managerId}</p>}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm
                          rounded-lg px-4 py-3">{error}</div>
        )}
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={onClose}
          className="flex-1 py-2.5 rounded-lg text-sm font-medium text-gray-700
                     border border-gray-200 hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button onClick={handleSave} disabled={loading}
          className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white
                     bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
                     disabled:cursor-not-allowed transition-colors">
          {loading ? 'Creating…' : 'Save User'}
        </button>
      </div>
    </Overlay>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED
// ─────────────────────────────────────────────────────────────────────────────
function Overlay({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(15,23,42,0.6)' }} onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8"
        onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

function PlaceholderTab({ label }) {
  return <div className="py-16 text-center text-gray-400 text-sm">{label}</div>
}