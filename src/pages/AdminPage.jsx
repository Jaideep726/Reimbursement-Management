// src/pages/AdminPage.jsx — Task 03 + Task 04 + Edit/Delete
import { useState, useEffect } from 'react'
import { supabase }            from '@/lib/supabase'
import { createUser }          from '@/lib/admin'
import { useAuth }             from '@/context/AuthContext'
import { useNavigate }         from 'react-router-dom'

// ─── Role badge colours ────────────────────────────────────────────────────
const ROLE_BADGE = {
  admin:    'bg-blue-100  text-blue-700  border border-blue-200',
  manager:  'bg-green-100 text-green-700 border border-green-200',
  employee: 'bg-gray-100  text-gray-600  border border-gray-200',
}

const TABS = ['Users', 'Approval Rules', 'All Expenses']

// ─── Confirm Delete Dialog ─────────────────────────────────────────────────
function ConfirmDeleteDialog({ title, message, onConfirm, onCancel, loading }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15,23,42,0.7)' }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl bg-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <span className="text-red-600 text-lg">🗑️</span>
          </div>
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
        </div>
        <p className="text-sm text-gray-500 mb-6 pl-[52px]">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-gray-700
                       border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white
                       bg-red-600 hover:bg-red-700 disabled:bg-red-300 transition-colors"
          >
            {loading ? 'Deleting…' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Change Password Modal ─────────────────────────────────────────────────
function ChangePasswordModal({ onClose, userEmail }) {
  const [currentPwd, setCurrentPwd]   = useState('')
  const [newPwd, setNewPwd]           = useState('')
  const [confirmPwd, setConfirmPwd]   = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew]         = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)
  const [success, setSuccess]         = useState(false)

  async function handleUpdate() {
    setError(null)
    if (!currentPwd)          return setError('Enter your current password.')
    if (newPwd.length < 6)    return setError('New password must be at least 6 characters.')
    if (newPwd !== confirmPwd) return setError('New passwords do not match.')
    if (newPwd === currentPwd) return setError('New password must differ from current password.')
    setLoading(true)
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: userEmail, password: currentPwd })
      if (signInErr) throw new Error('Current password is incorrect.')
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPwd })
      if (updateErr) throw updateErr
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Failed to update password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ backgroundColor: 'rgba(15,23,42,0.65)' }}
         onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl bg-white">
        {success ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">✅</div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Password Updated</h3>
            <p className="text-sm text-gray-500 mb-5">Your password has been changed successfully.</p>
            <button onClick={onClose}
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">🔑 Change Password</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>
            <PwdField label="Current Password"     value={currentPwd}  onChange={setCurrentPwd}  show={showCurrent} onToggle={() => setShowCurrent(s => !s)} />
            <PwdField label="New Password"         value={newPwd}      onChange={setNewPwd}       show={showNew}     onToggle={() => setShowNew(s => !s)}     hint="Minimum 6 characters" />
            <PwdField label="Confirm New Password" value={confirmPwd}  onChange={setConfirmPwd}   show={showConfirm} onToggle={() => setShowConfirm(s => !s)} />
            {error && <p className="mb-3 text-xs text-red-500">{error}</p>}
            <div className="flex gap-3 justify-end mt-2">
              <button onClick={onClose} disabled={loading}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleUpdate} disabled={loading}
                className="px-5 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white transition-colors">
                {loading ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function PwdField({ label, value, onChange, show, onToggle, hint }) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2.5 pr-14 rounded-lg text-sm border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button type="button" onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

// ─── Side Drawer ───────────────────────────────────────────────────────────
function SideDrawer({ open, onClose, onChangePwd, onLogout }) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      )}
      <div className="fixed top-0 left-0 z-50 h-full flex flex-col"
           style={{
             width: '240px',
             backgroundColor: '#1e293b',
             borderRight: '1px solid #334155',
             transform: open ? 'translateX(0)' : 'translateX(-100%)',
             transition: 'transform 0.25s ease',
             boxShadow: open ? '4px 0 24px rgba(0,0,0,0.4)' : 'none',
           }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #334155' }}>
          <span className="text-sm font-semibold text-white">Menu</span>
          <button onClick={onClose} style={{ color: '#64748b', fontSize: '1.2rem', lineHeight: 1 }}>✕</button>
        </div>
        <nav className="flex flex-col p-3 gap-1 flex-1">
          <button
            onClick={() => { onChangePwd(); onClose() }}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-left transition-colors"
            style={{ color: '#cbd5e1' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#334155'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
            <span>🔑</span> Change Password
          </button>
        </nav>
        <div className="p-3" style={{ borderTop: '1px solid #334155' }}>
          <button onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors"
            style={{ color: '#fca5a5', backgroundColor: 'transparent' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#450a0a'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
            <span>🚪</span> Logout
          </button>
        </div>
      </div>
    </>
  )
}

export default function AdminPage() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab]         = useState('Users')
  const [showDrawer, setShowDrawer]       = useState(false)
  const [showChangePwd, setShowChangePwd] = useState(false)

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  return (
    <div
      className="min-h-screen px-4 py-8"
      style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#0f172a 100%)' }}
    >
      <SideDrawer
        open={showDrawer}
        onClose={() => setShowDrawer(false)}
        onChangePwd={() => setShowChangePwd(true)}
        onLogout={handleLogout}
      />

      {showChangePwd && (
        <ChangePasswordModal
          onClose={() => setShowChangePwd(false)}
          userEmail={profile?.email || ''}
        />
      )}

      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setShowDrawer(true)}
            className="flex flex-col justify-center items-center w-9 h-9 rounded-lg transition-colors"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
            aria-label="Open menu"
          >
            <span style={{ display: 'block', width: '16px', height: '2px', backgroundColor: '#cbd5e1', marginBottom: '4px', borderRadius: '1px' }} />
            <span style={{ display: 'block', width: '16px', height: '2px', backgroundColor: '#cbd5e1', marginBottom: '4px', borderRadius: '1px' }} />
            <span style={{ display: 'block', width: '16px', height: '2px', backgroundColor: '#cbd5e1', borderRadius: '1px' }} />
          </button>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        </div>

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
// APPROVAL RULES TAB
// ═════════════════════════════════════════════════════════════════════════════
function ApprovalRulesTab({ companyId }) {
  const [rules,          setRules]          = useState([])
  const [managers,       setManagers]       = useState([])
  const [loading,        setLoading]        = useState(true)
  const [showForm,       setShowForm]       = useState(false)
  const [editingRule,    setEditingRule]    = useState(null)
  const [deleteTarget,   setDeleteTarget]   = useState(null)
  const [deleteLoading,  setDeleteLoading]  = useState(false)

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
    setEditingRule(null)
    fetchRules()
  }

  const handleEditClick = async (rule) => {
    const { data: approverRows } = await supabase
      .from('rule_approvers')
      .select('approver_id, step_order, is_required')
      .eq('rule_id', rule.id)
      .order('step_order', { ascending: true })

    const enriched = (approverRows ?? []).map(row => {
      const mgr = managers.find(m => m.id === row.approver_id)
      return {
        id:             row.approver_id,
        name:           mgr?.name ?? row.approver_id,
        isAutoApprover: row.is_required,
      }
    })

    setEditingRule({ ...rule, existingApprovers: enriched })
    setShowForm(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await supabase.from('rule_approvers').delete().eq('rule_id', deleteTarget.id)
      await supabase.from('approval_rules').delete().eq('id', deleteTarget.id)
      setDeleteTarget(null)
      fetchRules()
    } catch (err) {
      console.error('Delete failed', err)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div>
      {deleteTarget && (
        <ConfirmDeleteDialog
          title="Delete Rule"
          message={`Are you sure you want to delete "${deleteTarget.name}"? This cannot be undone.`}
          loading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Approval Rules</h2>
        {!showForm && (
          <button
            onClick={() => { setEditingRule(null); setShowForm(true) }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm
                       font-medium rounded-lg transition-colors"
          >
            + Create Rule
          </button>
        )}
      </div>

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
                className="p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
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

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleEditClick(rule)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                                 font-medium text-blue-600 border border-blue-200
                                 hover:bg-blue-50 transition-colors"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(rule)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                                 font-medium text-red-500 border border-red-200
                                 hover:bg-red-50 transition-colors"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {showForm && (
        <CreateRuleForm
          companyId={companyId}
          managers={managers}
          editingRule={editingRule}
          onSaved={handleRuleCreated}
          onCancel={() => { setShowForm(false); setEditingRule(null) }}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE / EDIT RULE FORM
// ─────────────────────────────────────────────────────────────────────────────
function CreateRuleForm({ companyId, managers, editingRule, onSaved, onCancel }) {
  const isEditing = !!editingRule

  const [ruleName,          setRuleName]          = useState(editingRule?.name ?? '')
  const [description,       setDescription]       = useState(editingRule?.description ?? '')
  const [isManagerApprover, setIsManagerApprover] = useState(editingRule?.is_manager_approver ?? false)
  const [isSequential,      setIsSequential]      = useState(editingRule?.sequential ?? false)
  const [minPct,            setMinPct]            = useState(editingRule?.min_approval_pct ?? 0)
  const [approvers,         setApprovers]         = useState(editingRule?.existingApprovers ?? [])
  const [selectedManager,   setSelectedManager]   = useState('')
  const [loading,           setLoading]           = useState(false)
  const [error,             setError]             = useState('')
  const [fieldErrors,       setFieldErrors]       = useState({})

  const handleAddApprover = () => {
    if (!selectedManager) return
    if (approvers.find(a => a.id === selectedManager)) return
    const manager = managers.find(m => m.id === selectedManager)
    setApprovers(prev => [
      ...prev,
      { id: manager.id, name: manager.name, isAutoApprover: false },
    ])
    setSelectedManager('')
  }

  const handleRemoveApprover = (id) =>
    setApprovers(prev => prev.filter(a => a.id !== id))

  const handleToggleAutoApprover = (id) =>
    setApprovers(prev =>
      prev.map(a => a.id === id ? { ...a, isAutoApprover: !a.isAutoApprover } : a)
    )

  const validate = () => {
    const errs = {}
    if (!ruleName.trim())            errs.ruleName = 'Rule name is required'
    if (minPct < 0 || minPct > 100)  errs.minPct   = 'Must be between 0 and 100'
    return errs
  }

  const handleSave = async () => {
    setError('')
    const errs = validate()
    if (Object.keys(errs).length) { setFieldErrors(errs); return }
    setFieldErrors({})
    setLoading(true)
    try {
      let ruleId

      if (isEditing) {
        const { error: updateErr } = await supabase
          .from('approval_rules')
          .update({
            name:                ruleName,
            description:         description || null,
            is_manager_approver: isManagerApprover,
            sequential:          isSequential,
            min_approval_pct:    minPct,
          })
          .eq('id', editingRule.id)
        if (updateErr) throw updateErr
        ruleId = editingRule.id

        const { error: delErr } = await supabase
          .from('rule_approvers')
          .delete()
          .eq('rule_id', ruleId)
        if (delErr) throw delErr
      } else {
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
        ruleId = rule.id
      }

      if (approvers.length > 0) {
        const approverRows = approvers.map((approver, index) => ({
          rule_id:     ruleId,
          approver_id: approver.id,
          step_order:  index,
          is_required: approver.isAutoApprover,
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
      <h3 className="text-base font-bold text-gray-900">
        {isEditing ? `✏️ Edit Rule — ${editingRule.name}` : 'Create Approval Rule'}
      </h3>

      <div>
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Rule Name</label>
        <input type="text" value={ruleName}
          onChange={e => setRuleName(e.target.value)}
          placeholder="e.g. Travel Expense Rule"
          className={inputClass('ruleName')} />
        {fieldErrors.ruleName && <p className="text-red-500 text-xs mt-1">{fieldErrors.ruleName}</p>}
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
          Description
          <span className="normal-case font-normal text-gray-400 ml-1">(optional)</span>
        </label>
        <input type="text" value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="e.g. For all travel expenses above ₹5000"
          className={inputClass('description')} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50">
          <div>
            <p className="text-sm font-medium text-gray-900">Manager Approver</p>
            <p className="text-xs text-gray-500 mt-0.5">Employee's manager approves first, auto</p>
          </div>
          <button type="button" onClick={() => setIsManagerApprover(v => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                        ${isManagerApprover ? 'bg-blue-600' : 'bg-gray-200'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
                              ${isManagerApprover ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50">
          <div>
            <p className="text-sm font-medium text-gray-900">Sequential</p>
            <p className="text-xs text-gray-500 mt-0.5">Each approver waits for the previous one</p>
          </div>
          <button type="button" onClick={() => setIsSequential(v => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                        ${isSequential ? 'bg-blue-600' : 'bg-gray-200'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
                              ${isSequential ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
          Minimum Approval %
          <span className="normal-case font-normal text-gray-400 ml-1">(0 = no approval needed)</span>
        </label>
        <input
          type="text"
          inputMode="numeric"
          placeholder="Enter value 0–100"
          value={minPct}
          onChange={e => {
            const v = e.target.value
            if (v === '' || (/^\d+$/.test(v) && +v <= 100)) setMinPct(v)
          }}
          className={inputClass('minPct')}
        />
        {fieldErrors.minPct && <p className="text-red-500 text-xs mt-1">{fieldErrors.minPct}</p>}
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Approvers</label>
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

        {approvers.length === 0 ? (
          <p className="text-xs text-gray-400 py-3 text-center border border-dashed
                        border-gray-200 rounded-lg">
            No approvers added yet
          </p>
        ) : (
          <div className="space-y-2">
            {approvers.map((approver, index) => (
              <div key={approver.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs
                                 font-bold flex items-center justify-center flex-shrink-0">
                  {index + 1}
                </span>
                <span className="flex-1 text-sm font-medium text-gray-900">{approver.name}</span>
                <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={approver.isAutoApprover}
                    onChange={() => handleToggleAutoApprover(approver.id)}
                    className="w-3.5 h-3.5 rounded accent-blue-600"
                  />
                  Auto Approver
                </label>
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
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">{error}</div>
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
          {loading ? 'Saving…' : isEditing ? 'Update Rule' : 'Save Rule'}
        </button>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// USERS TAB
// ═════════════════════════════════════════════════════════════════════════════
function UsersTab({ companyId }) {
  const [users,         setUsers]        = useState([])
  const [loading,       setLoading]      = useState(true)
  const [showModal,     setShowModal]    = useState(false)
  const [editingUser,   setEditingUser]  = useState(null)
  const [deleteTarget,  setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

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

  const handleUserSaved = () => {
    setShowModal(false)
    setEditingUser(null)
    fetchUsers()
  }

  const handleEditClick = (user) => {
    setEditingUser(user)
    setShowModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await supabase.from('users').delete().eq('id', deleteTarget.id)
      setDeleteTarget(null)
      fetchUsers()
    } catch (err) {
      console.error('Delete failed', err)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div>
      {deleteTarget && (
        <ConfirmDeleteDialog
          title="Delete User"
          message={`Are you sure you want to delete "${deleteTarget.name}"? This cannot be undone.`}
          loading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
        <button
          onClick={() => { setEditingUser(null); setShowModal(true) }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm
                     font-medium rounded-lg transition-colors"
        >
          + Add User
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 py-8 text-center">Loading users…</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">No users yet. Add one to get started.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Manager</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(user => (
                <UserRow
                  key={user.id}
                  user={user}
                  allUsers={users}
                  onEdit={() => handleEditClick(user)}
                  onDelete={() => setDeleteTarget(user)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <AddUserModal
          companyId={companyId}
          managers={users.filter(u => u.role === 'manager')}
          editingUser={editingUser}
          onClose={() => { setShowModal(false); setEditingUser(null) }}
          onSaved={handleUserSaved}
        />
      )}
    </div>
  )
}

function UserRow({ user, allUsers, onEdit, onDelete }) {
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
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium
                       text-blue-600 border border-blue-200 hover:bg-blue-50 transition-colors"
          >
            ✏️ Edit
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium
                       text-red-500 border border-red-200 hover:bg-red-50 transition-colors"
          >
            🗑️ Delete
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD / EDIT USER MODAL
// ─────────────────────────────────────────────────────────────────────────────
function AddUserModal({ companyId, managers, editingUser, onClose, onSaved }) {
  const isEditing = !!editingUser

  const [name,         setName]        = useState(editingUser?.name  ?? '')
  const [email,        setEmail]       = useState(editingUser?.email ?? '')
  const [role,         setRole]        = useState(editingUser?.role  ?? 'employee')
  const [managerId,    setManagerId]   = useState(editingUser?.manager_id ?? '')
  const [loading,      setLoading]     = useState(false)
  const [error,        setError]       = useState('')
  const [fieldErrors,  setFieldErrors] = useState({})
  const [tempPassword, setTempPassword] = useState(null)

  const validate = () => {
    const errs = {}
    if (!name.trim())  errs.name  = 'Name is required'
    if (!isEditing) {
      if (!email.trim()) errs.email = 'Email is required'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
                         errs.email = 'Enter a valid email address'
    }
    if (!role) errs.role = 'Role is required'
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
      if (isEditing) {
        const { error: updateErr } = await supabase
          .from('users')
          .update({
            name,
            role,
            manager_id: role === 'employee' ? managerId : null,
          })
          .eq('id', editingUser.id)
        if (updateErr) throw updateErr
        onSaved()
      } else {
        const result = await createUser({
          name, email, role,
          managerId: role === 'employee' ? managerId : null,
          companyId,
        })
        setTempPassword(result.tempPassword)
      }
    } catch (err) {
      setError(err.message || 'Failed to save user. Please try again.')
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
      <Overlay onClose={onSaved}>
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
          <button onClick={onSaved}
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
      <h3 className="text-lg font-bold text-gray-900 mb-1">
        {isEditing ? `✏️ Edit User — ${editingUser.name}` : 'Add New User'}
      </h3>
      <p className="text-sm text-gray-500 mb-5">
        {isEditing
          ? 'Update the details below. Email cannot be changed here.'
          : 'A temporary password will be generated automatically.'}
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Full Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="Jane Smith" className={inputClass('name')} />
          {fieldErrors.name && <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Email</label>
          {isEditing ? (
            <div className="w-full px-4 py-2.5 rounded-lg text-sm border border-slate-200
                            bg-slate-100 text-gray-400 cursor-not-allowed">
              {email}
            </div>
          ) : (
            <>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="jane@company.com" className={inputClass('email')} />
              {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>}
            </>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Role</label>
          <select value={role} onChange={e => { setRole(e.target.value); setManagerId('') }}
            className={`${inputClass('role')} bg-slate-50`}>
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
          </select>
          {fieldErrors.role && <p className="text-red-500 text-xs mt-1">{fieldErrors.role}</p>}
        </div>

        {role === 'employee' && (
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Assign Manager</label>
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
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">{error}</div>
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
          {loading ? 'Saving…' : isEditing ? 'Update User' : 'Save User'}
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
