// src/pages/EmployeePage.jsx — Task 05 + Task 06
// Task 05: expense table with approval timeline (click row to expand)
// Task 06: expense submission form with receipt upload + OCR auto-fill

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { submitExpense } from '@/lib/approvalEngine'
import { parseReceiptWithOCR, fileToBase64 } from '@/lib/ocr'
import { fetchCountriesWithCurrencies } from '@/lib/currency'

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
          /* ── Success screen ─────────────────────────────────── */
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
          /* ── Form screen ────────────────────────────────────── */
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">🔑 Change Password</h3>
              <button onClick={onClose} style={{ color: '#64748b', fontSize: '1.2rem', lineHeight: 1 }}>✕</button>
            </div>

            {/* Current Password */}
            <PwdField
              label="Current Password"
              value={currentPwd}
              onChange={setCurrentPwd}
              show={showCurrent}
              onToggle={() => setShowCurrent(s => !s)}
            />

            {/* New Password */}
            <PwdField
              label="New Password"
              value={newPwd}
              onChange={setNewPwd}
              show={showNew}
              onToggle={() => setShowNew(s => !s)}
              hint="Minimum 6 characters"
            />

            {/* Confirm New Password */}
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

// Small helper: a password input row with show/hide toggle
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

// ─── Category options (matches task spec) ─────────────────────────────────────
const CATEGORIES = [
  'Food', 'Travel', 'Accommodation',
  'Office Supplies', 'Entertainment', 'Medical', 'Other',
]

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

// ─── Side Drawer (hamburger menu) ─────────────────────────────────────────────
function SideDrawer({ open, onClose, onChangePwd, onLogout }) {
  return (
    <>
      {/* Backdrop — click to close */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={onClose}
        />
      )}

      {/* Drawer panel — slides in from left */}
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
        {/* Drawer header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid #334155' }}
        >
          <span className="text-sm font-semibold text-white">Menu</span>
          <button
            onClick={onClose}
            style={{ color: '#64748b', fontSize: '1.2rem', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* Menu items */}
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

        {/* Logout at the bottom */}
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

export default function EmployeePage() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  // ── Drawer + logout ───────────────────────────────────────────────────────
  const [showDrawer, setShowDrawer]         = useState(false)

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  // ── Expense list state ───────────────────────────────────────────────────
  const [expenses, setExpenses]         = useState([])
  const [loadingExpenses, setLoading]   = useState(true)
  const [fetchError, setFetchError]     = useState(null)

  // ── Timeline state: which expense row is expanded ────────────────────────
  const [selectedExpenseId, setSelectedExpenseId] = useState(null)

  // ── Change Password modal ─────────────────────────────────────────────────
  const [showChangePwd, setShowChangePwd]   = useState(false)

  // ── Task 06: form visibility ──────────────────────────────────────────────
  const [showForm, setShowForm]             = useState(false)

  // ── Task 06: receipt upload + OCR ────────────────────────────────────────
  const fileInputRef                        = useRef(null)
  const [selectedFile, setSelectedFile]     = useState(null)
  const [previewUrl, setPreviewUrl]         = useState(null)
  const [scanning, setScanning]             = useState(false)
  const [scanError, setScanError]           = useState(null)

  // ── Task 06: form fields ──────────────────────────────────────────────────
  const [amount, setAmount]                 = useState('')
  const [currency, setCurrency]             = useState('')
  const [category, setCategory]             = useState('')
  const [description, setDescription]       = useState('')
  const [date, setDate]                     = useState('')
  const [selectedRule, setSelectedRule]     = useState('')
  const [remarks, setRemarks]               = useState('')
  const [formErrors, setFormErrors]         = useState({})

  // ── Task 06: countries dropdown + approval rules ──────────────────────────
  const [countries, setCountries]           = useState([])
  const [rules, setRules]                   = useState([])

  // ── Task 06: submit state ─────────────────────────────────────────────────
  const [submitting, setSubmitting]         = useState(false)
  const [submitError, setSubmitError]       = useState(null)

  // ── Fetch all expenses for this employee on mount ────────────────────────
  useEffect(() => {
    if (!user) return
    fetchExpenses()
  }, [user])

  // ── Load countries + rules when the form is opened ───────────────────────
  useEffect(() => {
    if (!showForm) return
    fetchCountriesWithCurrencies().then(setCountries).catch(() => {})
    fetchRules()
  }, [showForm])

  async function fetchRules() {
    if (!profile?.company_id) return
    const { data } = await supabase
      .from('approval_rules')
      .select('id, name')
      .eq('company_id', profile.company_id)
    setRules(data || [])
  }

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

  // ── Receipt file selected: store file + generate preview URL ─────────────
  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setScanError(null)
  }

  // ── OCR: send image to Claude, auto-fill form fields ─────────────────────
  async function handleScanReceipt() {
    if (!selectedFile) return
    setScanning(true)
    setScanError(null)
    try {
      const base64 = await fileToBase64(selectedFile)
      const result = await parseReceiptWithOCR(base64)
      // Auto-fill whatever fields Claude could extract
      if (result.amount)                   setAmount(result.amount)
      if (result.currency)                 setCurrency(result.currency)
      if (result.category)                 setCategory(result.category || 'Other')
      if (result.description || result.merchant)
                                           setDescription(result.description || result.merchant)
      if (result.date)                     setDate(result.date)
    } catch (err) {
      setScanError(err.message || 'OCR scan failed. Fill in the fields manually.')
    } finally {
      setScanning(false)
    }
  }

  // ── Validate form before submit ───────────────────────────────────────────
  function validate() {
    const errs = {}
    if (!amount || isNaN(amount) || Number(amount) <= 0)
      errs.amount = 'Enter a valid positive amount'
    if (!currency)      errs.currency    = 'Select a currency'
    if (!category)      errs.category    = 'Select a category'
    if (!description.trim()) errs.description = 'Description is required'
    if (!date)          errs.date        = 'Select a date'
    if (!selectedRule)  errs.rule        = 'Select an approval rule'
    return errs
  }

  // ── Submit expense → call Person A's submitExpense() ─────────────────────
  async function handleSubmit() {
    setSubmitError(null)
    const errs = validate()
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return }
    setFormErrors({})
    setSubmitting(true)
    try {
      await submitExpense(
        {
          amount: parseFloat(amount),
          currency,
          category,
          description,
          date,
          ruleId: selectedRule,
          receiptFile: selectedFile || null,   // Person A uploads to Storage
        },
        user.id,
        profile.company_id,
      )
      // Success: reset form, hide it, refresh table
      resetForm()
      setShowForm(false)
      await fetchExpenses()
    } catch (err) {
      setSubmitError(err.message || 'Submission failed. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Reset all form fields ─────────────────────────────────────────────────
  function resetForm() {
    setSelectedFile(null)
    setPreviewUrl(null)
    setAmount(''); setCurrency(''); setCategory('')
    setDescription(''); setDate(''); setSelectedRule(''); setRemarks('')
    setFormErrors({}); setSubmitError(null); setScanError(null)
  }

  // ── The selected expense object (for timeline rendering) ─────────────────
  const selectedExpense = expenses.find(e => e.id === selectedExpenseId)

  return (
    // Dark background matching Admin page dark navy theme
    <div className="min-h-screen p-6" style={{ backgroundColor: '#0f172a' }}>

      {/* ── Side Drawer ──────────────────────────────────────────────────── */}
      <SideDrawer
        open={showDrawer}
        onClose={() => setShowDrawer(false)}
        onChangePwd={() => setShowChangePwd(true)}
        onLogout={handleLogout}
      />

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
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
              <h1 className="text-2xl font-bold text-white">My Expenses</h1>
              <p className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>
                Welcome back, {profile?.name || 'Employee'}
              </p>
            </div>
          </div>

          {/* Task 06 — Submit Expense button */}
          <button
            onClick={() => { setShowForm(f => !f); resetForm() }}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg
                       hover:bg-blue-700 transition-colors"
          >
            {showForm ? '✕ Cancel' : '+ Submit Expense'}
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

        {/* ── Task 06: Expense Submission Form ────────────────────────────── */}
        {showForm && (
          <div className="mt-6 rounded-xl overflow-hidden"
               style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>

            {/* Form header */}
            <div className="px-6 py-4" style={{ borderBottom: '1px solid #334155' }}>
              <h2 className="text-base font-semibold text-white">Submit New Expense</h2>
              <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                Upload a receipt and click Scan — the form auto-fills for you.
              </p>
            </div>

            <div className="p-6 space-y-6">

              {/* ── Receipt upload + preview ─────────────────────────────── */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-2"
                       style={{ color: '#94a3b8' }}>
                  Receipt Photo
                </label>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <div className="flex items-start gap-4 flex-wrap">
                  {/* Upload / Change Photo button */}
                  <button
                    onClick={() => {
                      // Reset the input value so onChange fires even if the same file is picked again
                      if (fileInputRef.current) fileInputRef.current.value = ''
                      fileInputRef.current?.click()
                    }}
                    className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors"
                    style={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #475569',
                      color: '#94a3b8',
                    }}
                  >
                    📎 {selectedFile ? 'Change Photo' : 'Upload Photo'}
                  </button>

                  {/* Scan button — only visible once a file is selected */}
                  {selectedFile && (
                    <button
                      onClick={handleScanReceipt}
                      disabled={scanning}
                      className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                      style={{
                        backgroundColor: scanning ? '#1e3a5f' : '#1d4ed8',
                        color: '#fff',
                        opacity: scanning ? 0.7 : 1,
                      }}
                    >
                      {scanning ? '⏳ Scanning…' : '✨ Scan Receipt'}
                    </button>
                  )}
                </div>

                {/* Receipt preview */}
                {previewUrl && (
                  <div className="mt-3">
                    <img
                      src={previewUrl}
                      alt="Receipt preview"
                      className="max-h-48 rounded-lg object-contain"
                      style={{ border: '1px solid #334155' }}
                    />
                  </div>
                )}

                {/* Scan error */}
                {scanError && (
                  <p className="mt-2 text-xs" style={{ color: '#f87171' }}>{scanError}</p>
                )}
              </div>

              {/* ── Form fields grid ─────────────────────────────────────── */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                {/* Amount */}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>
                    Amount <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none
                               focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: '#0f172a', border: `1px solid ${formErrors.amount ? '#ef4444' : '#334155'}` }}
                  />
                  {formErrors.amount && <p className="mt-1 text-xs" style={{ color: '#f87171' }}>{formErrors.amount}</p>}
                </div>

                {/* Currency */}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>
                    Currency <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none
                               focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: '#0f172a', border: `1px solid ${formErrors.currency ? '#ef4444' : '#334155'}` }}
                  >
                    <option value="">Select currency</option>
                    {countries.map(c => (
                      <option key={c.country} value={c.currencyCode}>
                        {c.currencyCode} — {c.country}
                      </option>
                    ))}
                  </select>
                  {formErrors.currency && <p className="mt-1 text-xs" style={{ color: '#f87171' }}>{formErrors.currency}</p>}
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>
                    Category <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none
                               focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: '#0f172a', border: `1px solid ${formErrors.category ? '#ef4444' : '#334155'}` }}
                  >
                    <option value="">Select category</option>
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {formErrors.category && <p className="mt-1 text-xs" style={{ color: '#f87171' }}>{formErrors.category}</p>}
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>
                    Date <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none
                               focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: '#0f172a', border: `1px solid ${formErrors.date ? '#ef4444' : '#334155'}`, colorScheme: 'dark' }}
                  />
                  {formErrors.date && <p className="mt-1 text-xs" style={{ color: '#f87171' }}>{formErrors.date}</p>}
                </div>

                {/* Description — full width */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>
                    Description <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="e.g. Team lunch at Café Mocha"
                    className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none
                               focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: '#0f172a', border: `1px solid ${formErrors.description ? '#ef4444' : '#334155'}` }}
                  />
                  {formErrors.description && <p className="mt-1 text-xs" style={{ color: '#f87171' }}>{formErrors.description}</p>}
                </div>

                {/* Approval Rule — full width */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>
                    Approval Rule <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <select
                    value={selectedRule}
                    onChange={e => setSelectedRule(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none
                               focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: '#0f172a', border: `1px solid ${formErrors.rule ? '#ef4444' : '#334155'}` }}
                  >
                    <option value="">Select an approval rule</option>
                    {rules.length === 0 && (
                      <option disabled>No rules yet — ask your admin to create one</option>
                    )}
                    {rules.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                  {formErrors.rule && <p className="mt-1 text-xs" style={{ color: '#f87171' }}>{formErrors.rule}</p>}
                </div>

                {/* Remarks — optional, full width */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>
                    Remarks <span className="text-xs font-normal" style={{ color: '#475569' }}>(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    placeholder="Any additional notes…"
                    className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none
                               focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}
                  />
                </div>
              </div>

              {/* ── Submit error ──────────────────────────────────────────── */}
              {submitError && (
                <div className="p-3 rounded-lg text-sm"
                     style={{ backgroundColor: '#450a0a', border: '1px solid #991b1b', color: '#fca5a5' }}>
                  {submitError}
                </div>
              )}

              {/* ── Action buttons ────────────────────────────────────────── */}
              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => { setShowForm(false); resetForm() }}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                  style={{ backgroundColor: '#1e293b', border: '1px solid #475569', color: '#94a3b8' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-medium rounded-lg transition-colors"
                  style={{
                    backgroundColor: submitting ? '#1e3a5f' : '#2563eb',
                    color: '#fff',
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? 'Submitting…' : 'Submit Expense'}
                </button>
              </div>

            </div>
          </div>
        )}
      </div>

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