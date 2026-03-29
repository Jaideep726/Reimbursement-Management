// src/pages/EmployeePage.jsx — Task 05
// Employee dashboard: expense table + approval timeline
// Task 05 scope: fetch & display all expenses, click row to see timeline
// Task 06 (expense submission form) will be added in the next task

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

// ─── Status badge colours ──────────────────────────────────────────────────
// Draft=gray | Pending=yellow | Approved=green | Rejected=red
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

// Nicely formatted time  e.g.  "14:32"
function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit',
  })
}

export default function EmployeePage() {
  const { user, profile } = useAuth()

  // ── Expense list state ───────────────────────────────────────────────────
  const [expenses, setExpenses]         = useState([])
  const [loadingExpenses, setLoading]   = useState(true)
  const [fetchError, setFetchError]     = useState(null)

  // ── Timeline state: which expense row is expanded ────────────────────────
  const [selectedExpenseId, setSelectedExpenseId] = useState(null)

  // ── Fetch all expenses for this employee on mount ────────────────────────
  useEffect(() => {
    if (!user) return
    fetchExpenses()
  }, [user])

  async function fetchExpenses() {
    setLoading(true)
    setFetchError(null)
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*, approval_actions(*)')        // join approval actions
        .eq('employee_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setExpenses(data || [])
    } catch (err) {
      setFetchError(err.message || 'Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }

  // ── Toggle timeline: click same row again to collapse ────────────────────
  function handleRowClick(expenseId) {
    setSelectedExpenseId(prev => (prev === expenseId ? null : expenseId))
  }

  // ── The selected expense object (for timeline rendering) ─────────────────
  const selectedExpense = expenses.find(e => e.id === selectedExpenseId)

  return (
    // Dark background matching Admin page dark navy theme
    <div className="min-h-screen p-6" style={{ backgroundColor: '#0f172a' }}>

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">My Expenses</h1>
            <p className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>
              Welcome back, {profile?.name || 'Employee'}
            </p>
          </div>

          {/* Placeholder for Task 06 — Submit Expense button */}
          <button
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg
                       hover:bg-blue-700 transition-colors"
            disabled
            title="Coming in Task 06"
          >
            + Submit Expense
          </button>
        </div>

        {/* ── Error banner ─────────────────────────────────────────────── */}
        {fetchError && (
          <div className="mb-4 p-3 rounded-lg text-sm"
               style={{ backgroundColor: '#450a0a', border: '1px solid #991b1b', color: '#fca5a5' }}>
            {fetchError}
          </div>
        )}

        {/* ── Expense table ────────────────────────────────────────────── */}
        <div className="rounded-xl overflow-hidden"
             style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>

          {/* Table header */}
          <div className="px-6 py-4 flex items-center justify-between"
               style={{ borderBottom: '1px solid #334155' }}>
            <h2 className="text-base font-semibold text-white">Expense History</h2>
            <span className="text-xs" style={{ color: '#64748b' }}>
              {expenses.length} record{expenses.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loadingExpenses ? (
            /* ── Loading state ─────────────────────────────────────────── */
            <div className="p-8 text-center text-sm" style={{ color: '#64748b' }}>
              Loading expenses…
            </div>
          ) : expenses.length === 0 ? (
            /* ── Empty state ───────────────────────────────────────────── */
            <div className="p-12 text-center">
              <div className="text-4xl mb-3">🧾</div>
              <p className="text-sm" style={{ color: '#64748b' }}>No expenses yet.</p>
              <p className="text-xs mt-1" style={{ color: '#475569' }}>Submit your first expense to get started.</p>
            </div>
          ) : (
            /* ── Data table ────────────────────────────────────────────── */
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide"
                      style={{ backgroundColor: '#0f172a', color: '#64748b' }}>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Description</th>
                    <th className="px-6 py-3 font-medium">Category</th>
                    <th className="px-6 py-3 font-medium">Amount</th>
                    <th className="px-6 py-3 font-medium">Company Amount</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(expense => (
                    <>
                      {/* ── Expense row ────────────────────────────────── */}
                      <tr
                        key={expense.id}
                        onClick={() => handleRowClick(expense.id)}
                        className="cursor-pointer transition-colors"
                        style={{
                          borderTop: '1px solid #334155',
                          backgroundColor: selectedExpenseId === expense.id ? '#1d3557' : 'transparent',
                        }}
                        onMouseEnter={e => { if (selectedExpenseId !== expense.id) e.currentTarget.style.backgroundColor = '#263045' }}
                        onMouseLeave={e => { if (selectedExpenseId !== expense.id) e.currentTarget.style.backgroundColor = 'transparent' }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap" style={{ color: '#94a3b8' }}>
                          {fmtDate(expense.date || expense.created_at)}
                        </td>
                        <td className="px-6 py-4 font-medium max-w-xs truncate text-white">
                          {expense.description || '—'}
                        </td>
                        <td className="px-6 py-4" style={{ color: '#94a3b8' }}>
                          {expense.category || '—'}
                        </td>
                        <td className="px-6 py-4 font-medium whitespace-nowrap text-white">
                          {expense.currency} {Number(expense.amount).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap" style={{ color: '#94a3b8' }}>
                          {expense.converted_amount != null
                            ? `${profile?.currency || ''} ${Number(expense.converted_amount).toFixed(2)}`
                            : '—'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full
                                           text-xs font-medium capitalize
                                           ${STATUS_STYLES[expense.status] || STATUS_STYLES.draft}`}>
                            {expense.status || 'draft'}
                          </span>
                        </td>
                      </tr>

                      {/* ── Approval timeline (expands when row is clicked) ─ */}
                      {selectedExpenseId === expense.id && (
                        <tr key={`timeline-${expense.id}`}>
                          <td colSpan={6} className="px-6 py-4"
                              style={{ backgroundColor: '#162032', borderTop: '1px solid #1e3a5f' }}>
                            <ApprovalTimeline actions={expense.approval_actions || []} />
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Task 06 placeholder ──────────────────────────────────────────── */}
        <div className="mt-6 rounded-xl p-8 text-center text-sm"
             style={{ backgroundColor: '#1e293b', border: '1px dashed #334155', color: '#475569' }}>
          Expense submission form — coming in Task 06
        </div>
      </div>
    </div>
  )
}

// ─── Approval Timeline sub-component ─────────────────────────────────────────
// Shows a vertical dot-and-line timeline of all approval_actions for an expense.
// action.status can be: 'pending' | 'approved' | 'rejected'
function ApprovalTimeline({ actions }) {
  if (!actions || actions.length === 0) {
    return (
      <p className="text-sm italic" style={{ color: '#64748b' }}>
        No approval actions yet — awaiting review.
      </p>
    )
  }

  // Sort by step_order so the timeline is in the right sequence
  const sorted = [...actions].sort((a, b) => (a.step_order ?? 0) - (b.step_order ?? 0))

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide mb-3"
         style={{ color: '#60a5fa' }}>
        Approval Timeline
      </p>

      <ol className="relative ml-2" style={{ borderLeft: '2px solid #1e3a5f' }}>
        {sorted.map((action, idx) => {
          // Pick dot colour by status
          const dotColour =
            action.status === 'approved' ? 'bg-green-500' :
            action.status === 'rejected' ? 'bg-red-500'   :
            'bg-gray-300'                                   // pending

          const labelColour =
            action.status === 'approved' ? 'text-green-700' :
            action.status === 'rejected' ? 'text-red-600'   :
            'text-gray-500'

          return (
            <li key={action.id || idx} className="mb-4 ml-4 last:mb-0">
              {/* Dot on the timeline line */}
              <span className={`absolute -left-[9px] flex items-center justify-center
                                w-4 h-4 rounded-full border-2 border-white ${dotColour}`} />

              {/* Approver name + action */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-white">
                  {action.approver_name || `Approver #${idx + 1}`}
                </span>
                <span className={`text-xs font-semibold uppercase ${labelColour}`}>
                  {action.status || 'pending'}
                </span>
                {action.timestamp && (
                  <span className="text-xs" style={{ color: '#64748b' }}>
                    {fmtDate(action.timestamp)} {fmtTime(action.timestamp)}
                  </span>
                )}
              </div>

              {/* Comment (optional) */}
              {action.comment && (
                <p className="mt-1 text-xs italic" style={{ color: '#94a3b8' }}>
                  "{action.comment}"
                </p>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}