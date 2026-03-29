// src/pages/ManagerPage.jsx — Task 07
// Manager approval queue: see pending expenses, approve or reject with a comment.
// Real-time subscription updates the queue automatically (no manual refresh needed).

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { processApproval } from '@/lib/approvalEngine'

// ─── Change Password Modal (self-contained, no shared component) ──────────────
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
    if (!currentPwd)                          return setError('Enter your current password.')
    if (newPwd.length < 6)                    return setError('New password must be at least 6 characters.')
    if (newPwd !== confirmPwd)                return setError('New passwords do not match.')
    if (newPwd === currentPwd)                return setError('New password must differ from current password.')

    setLoading(true)
    try {
      // Step 1: verify current password by re-signing in
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPwd,
      })
      if (signInErr) throw new Error('Current password is incorrect.')

      // Step 2: update to new password
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-sm rounded-xl p-6 shadow-2xl"
        style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
      >
        {success ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">✅</div>
            <h3 className="text-lg font-bold text-white mb-1">Password Updated</h3>
            <p className="text-sm mb-5" style={{ color: '#94a3b8' }}>
              Your password has been changed successfully.
            </p>
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-semibold rounded-lg"
              style={{ backgroundColor: '#2563eb', color: '#fff' }}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">🔑 Change Password</h3>
              <button onClick={onClose} style={{ color: '#64748b', fontSize: '1.2rem', lineHeight: 1 }}>✕</button>
            </div>

            <PwdField
              label="Current Password"
              value={currentPwd}
              onChange={setCurrentPwd}
              show={showCurrent}
              onToggle={() => setShowCurrent(s => !s)}
            />
            <PwdField
              label="New Password"
              value={newPwd}
              onChange={setNewPwd}
              show={showNew}
              onToggle={() => setShowNew(s => !s)}
              hint="Minimum 6 characters"
            />
            <PwdField
              label="Confirm New Password"
              value={confirmPwd}
              onChange={setConfirmPwd}
              show={showConfirm}
              onToggle={() => setShowConfirm(s => !s)}
            />

            {error && (
              <p className="mb-3 text-xs" style={{ color: '#f87171' }}>{error}</p>
            )}

            <div className="flex gap-3 justify-end mt-2">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium rounded-lg"
                style={{ backgroundColor: '#0f172a', border: '1px solid #475569', color: '#94a3b8' }}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={loading}
                className="px-5 py-2 text-sm font-semibold rounded-lg"
                style={{ backgroundColor: loading ? '#334155' : '#2563eb', color: '#fff', opacity: loading ? 0.7 : 1 }}
              >
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
      <label className="block text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 pr-10 rounded-lg text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
          style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
          style={{ color: '#64748b' }}
        >
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      {hint && <p className="mt-0.5 text-xs" style={{ color: '#475569' }}>{hint}</p>}
    </div>
  )
}

// ─── Status badge colours (same as EmployeePage — consistency) ────────────────
const STATUS_STYLES = {
  draft:    'bg-gray-100    text-gray-600',
  pending:  'bg-yellow-100  text-yellow-700',
  approved: 'bg-green-100   text-green-700',
  rejected: 'bg-red-100     text-red-600',
}

// Nicely formatted date  e.g.  "29 Mar 2026"
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ─── Side Drawer (hamburger menu) ─────────────────────────────────────────────
function SideDrawer({ open, onClose, onChangePwd, onLogout }) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={onClose}
        />
      )}
      <div
        className="fixed top-0 left-0 z-50 h-full flex flex-col"
        style={{
          width: '240px',
          backgroundColor: '#1e293b',
          borderRight: '1px solid #334155',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
          boxShadow: open ? '4px 0 24px rgba(0,0,0,0.4)' : 'none',
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid #334155' }}
        >
          <span className="text-sm font-semibold text-white">Menu</span>
          <button onClick={onClose} style={{ color: '#64748b', fontSize: '1.2rem', lineHeight: 1 }}>✕</button>
        </div>

        <nav className="flex flex-col p-3 gap-1 flex-1">
          <button
            onClick={() => { onChangePwd(); onClose() }}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-left transition-colors"
            style={{ color: '#cbd5e1' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#334155'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <span>🔑</span> Change Password
          </button>
        </nav>

        <div className="p-3" style={{ borderTop: '1px solid #334155' }}>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors"
            style={{ color: '#fca5a5', backgroundColor: 'transparent' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#450a0a'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <span>🚪</span> Logout
          </button>
        </div>
      </div>
    </>
  )
}

export default function ManagerPage() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  // ── Drawer + logout ───────────────────────────────────────────────────────
  const [showDrawer, setShowDrawer]         = useState(false)

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  // ── Pending actions list ─────────────────────────────────────────────────
  const [pendingActions, setPendingActions] = useState([])
  const [loading, setLoading]               = useState(true)
  const [fetchError, setFetchError]         = useState(null)

  // ── Change Password modal ─────────────────────────────────────────────────
  const [showChangePwd, setShowChangePwd]   = useState(false)

  // ── Modal state ──────────────────────────────────────────────────────────
  // action = 'approved' | 'rejected' | null (closed)
  const [modal, setModal] = useState({
    open:      false,
    action:    null,       // 'approved' or 'rejected'
    expenseId: null,
    comment:   '',
    processing: false,
    error:     null,
  })

  // ── Fetch pending actions on mount ───────────────────────────────────────
  useEffect(() => {
    if (!user) return
    fetchPending()
    // ── Real-time subscription (Person A sets up the channel) ──────────────
    // Listens for INSERT/UPDATE on approval_actions for this manager so the
    // queue refreshes automatically when a new expense is assigned.
    const channel = supabase
      .channel('manager-queue')
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  'approval_actions',
          filter: `approver_id=eq.${user.id}`,
        },
        () => fetchPending()   // re-fetch whenever anything changes
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

  // ── Fetch all approval_actions where I am the approver and status=pending ─
  async function fetchPending() {
    setLoading(true)
    setFetchError(null)
    try {
      const { data, error } = await supabase
        .from('approval_actions')
        .select('*, expenses(*, users(name))')   // join expense + submitter name
        .eq('approver_id', user.id)
        .eq('status', 'pending')

      if (error) throw error
      setPendingActions(data || [])
    } catch (err) {
      setFetchError(err.message || 'Failed to load queue')
    } finally {
      setLoading(false)
    }
  }

  // ── Open approve/reject modal ─────────────────────────────────────────────
  function openModal(action, expenseId) {
    setModal({ open: true, action, expenseId, comment: '', processing: false, error: null })
  }

  function closeModal() {
    setModal({ open: false, action: null, expenseId: null, comment: '', processing: false, error: null })
  }

  // ── Confirm: call Person A's processApproval() ───────────────────────────
  async function handleConfirm() {
    setModal(m => ({ ...m, processing: true, error: null }))
    try {
      await processApproval(
        modal.expenseId,   // expense being acted on
        user.id,           // current manager's ID
        modal.action,      // 'approved' or 'rejected'
        modal.comment,     // optional comment string
      )
      closeModal()
      await fetchPending()  // remove this expense from the queue
    } catch (err) {
      setModal(m => ({ ...m, processing: false, error: err.message || 'Action failed. Try again.' }))
    }
  }

  // ── Derived: expense object from the selected action ─────────────────────
  const expense = modal.expenseId
    ? pendingActions.find(a => a.expenses?.id === modal.expenseId)?.expenses
    : null

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#0f172a' }}>
      <div className="max-w-5xl mx-auto">

        {/* ── Side Drawer ────────────────────────────────────────────────── */}
        <SideDrawer
          open={showDrawer}
          onClose={() => setShowDrawer(false)}
          onChangePwd={() => setShowChangePwd(true)}
          onLogout={handleLogout}
        />

        {/* ── Page header ──────────────────────────────────────────────── */}
        <div className="mb-6 flex items-center gap-3">
          {/* Hamburger */}
          <button
            onClick={() => setShowDrawer(true)}
            className="flex flex-col justify-center items-center w-9 h-9 rounded-lg transition-colors"
            style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
            aria-label="Open menu"
          >
            <span style={{ display: 'block', width: '16px', height: '2px', backgroundColor: '#94a3b8', marginBottom: '4px', borderRadius: '1px' }} />
            <span style={{ display: 'block', width: '16px', height: '2px', backgroundColor: '#94a3b8', marginBottom: '4px', borderRadius: '1px' }} />
            <span style={{ display: 'block', width: '16px', height: '2px', backgroundColor: '#94a3b8', borderRadius: '1px' }} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Approvals to Review</h1>
            <p className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>
              Welcome back, {profile?.name || 'Manager'} — {pendingActions.length} pending
            </p>
          </div>
        </div>

        {/* ── Error banner ─────────────────────────────────────────────── */}
        {fetchError && (
          <div className="mb-4 p-3 rounded-lg text-sm"
               style={{ backgroundColor: '#450a0a', border: '1px solid #991b1b', color: '#fca5a5' }}>
            {fetchError}
          </div>
        )}

        {/* ── Approval queue card ───────────────────────────────────────── */}
        <div className="rounded-xl overflow-hidden"
             style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>

          {/* Card header */}
          <div className="px-6 py-4 flex items-center justify-between"
               style={{ borderBottom: '1px solid #334155' }}>
            <h2 className="text-base font-semibold text-white">Pending Expenses</h2>
            <span className="text-xs" style={{ color: '#64748b' }}>
              Updates in real-time
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm" style={{ color: '#64748b' }}>
              Loading queue…
            </div>
          ) : pendingActions.length === 0 ? (
            /* ── Empty state ─────────────────────────────────────────── */
            <div className="p-14 text-center">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-sm font-medium text-white">All caught up!</p>
              <p className="text-xs mt-1" style={{ color: '#475569' }}>
                No expenses waiting for your approval.
              </p>
            </div>
          ) : (
            /* ── Queue table ─────────────────────────────────────────── */
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide"
                      style={{ backgroundColor: '#0f172a', color: '#64748b' }}>
                    <th className="px-6 py-3 font-medium">Employee</th>
                    <th className="px-6 py-3 font-medium">Category</th>
                    <th className="px-6 py-3 font-medium">Amount</th>
                    <th className="px-6 py-3 font-medium">Date Submitted</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingActions.map((action) => {
                    const exp = action.expenses || {}
                    const employeeName = exp.users?.name || 'Unknown'

                    return (
                      <tr
                        key={action.id}
                        style={{ borderTop: '1px solid #334155' }}
                      >
                        {/* Employee name */}
                        <td className="px-6 py-4 font-medium text-white">
                          {employeeName}
                        </td>

                        {/* Category */}
                        <td className="px-6 py-4" style={{ color: '#94a3b8' }}>
                          {exp.category || '—'}
                        </td>

                        {/* Converted amount (company currency) */}
                        <td className="px-6 py-4 font-medium text-white whitespace-nowrap">
                          {exp.converted_amount != null
                            ? `${profile?.currency || ''} ${Number(exp.converted_amount).toFixed(2)}`
                            : exp.amount
                              ? `${exp.currency} ${Number(exp.amount).toFixed(2)}`
                              : '—'}
                        </td>

                        {/* Date submitted */}
                        <td className="px-6 py-4 whitespace-nowrap" style={{ color: '#94a3b8' }}>
                          {fmtDate(exp.created_at)}
                        </td>

                        {/* Status badge */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full
                                           text-xs font-medium capitalize
                                           ${STATUS_STYLES[exp.status] || STATUS_STYLES.pending}`}>
                            {exp.status || 'pending'}
                          </span>
                        </td>

                        {/* Approve / Reject buttons */}
                        <td className="px-6 py-4">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => openModal('approved', exp.id)}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors"
                              style={{ backgroundColor: '#14532d', color: '#86efac', border: '1px solid #166534' }}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#166534'}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#14532d'}
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => openModal('rejected', exp.id)}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors"
                              style={{ backgroundColor: '#450a0a', color: '#fca5a5', border: '1px solid #991b1b' }}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#7f1d1d'}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#450a0a'}
                            >
                              ✕ Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Approve / Reject modal ────────────────────────────────────────── */}
      {modal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div
            className="w-full max-w-md rounded-xl p-6 shadow-2xl"
            style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
          >
            {/* Modal header */}
            <h3 className="text-lg font-bold text-white mb-1">
              {modal.action === 'approved' ? '✓ Approve Expense' : '✕ Reject Expense'}
            </h3>

            {/* Expense summary */}
            {expense && (
              <p className="text-sm mb-4" style={{ color: '#94a3b8' }}>
                {expense.users?.name || 'Employee'} —{' '}
                {expense.category} —{' '}
                {expense.currency} {Number(expense.amount).toFixed(2)}
              </p>
            )}

            {/* Comment field */}
            <label className="block text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>
              Comment{' '}
              <span style={{ color: '#475569' }}>
                {modal.action === 'rejected' ? '(recommended)' : '(optional)'}
              </span>
            </label>
            <textarea
              rows={3}
              value={modal.comment}
              onChange={e => setModal(m => ({ ...m, comment: e.target.value }))}
              placeholder={
                modal.action === 'rejected'
                  ? 'Explain why the expense is rejected…'
                  : 'Add a note (optional)…'
              }
              className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none resize-none
                         focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}
            />

            {/* Modal error */}
            {modal.error && (
              <p className="mt-2 text-xs" style={{ color: '#f87171' }}>{modal.error}</p>
            )}

            {/* Modal action buttons */}
            <div className="flex gap-3 mt-4 justify-end">
              <button
                onClick={closeModal}
                disabled={modal.processing}
                className="px-4 py-2 text-sm font-medium rounded-lg"
                style={{ backgroundColor: '#0f172a', border: '1px solid #475569', color: '#94a3b8' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={modal.processing}
                className="px-5 py-2 text-sm font-semibold rounded-lg transition-colors"
                style={{
                  backgroundColor: modal.processing
                    ? '#334155'
                    : modal.action === 'approved' ? '#16a34a' : '#dc2626',
                  color: '#fff',
                  opacity: modal.processing ? 0.7 : 1,
                }}
              >
                {modal.processing
                  ? 'Processing…'
                  : modal.action === 'approved' ? 'Confirm Approve' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Change Password modal ─────────────────────────────────────────── */}
      {showChangePwd && (
        <ChangePasswordModal
          onClose={() => setShowChangePwd(false)}
          userEmail={profile?.email || user?.email || ''}
        />
      )}
    </div>
  )
}