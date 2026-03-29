// src/pages/ManagerPage.jsx — Task 07
// Manager approval queue: see pending expenses, approve or reject with a comment.
// Real-time subscription updates the queue automatically (no manual refresh needed).

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { processApproval } from '@/lib/approvalEngine'

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

export default function ManagerPage() {
  const { user, profile } = useAuth()

  // ── Pending actions list ─────────────────────────────────────────────────
  const [pendingActions, setPendingActions] = useState([])
  const [loading, setLoading]               = useState(true)
  const [fetchError, setFetchError]         = useState(null)

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

        {/* ── Page header ──────────────────────────────────────────────── */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Approvals to Review</h1>
          <p className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>
            Welcome back, {profile?.name || 'Manager'} — {pendingActions.length} pending
          </p>
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
    </div>
  )
}