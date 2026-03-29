// src/pages/LoginPage.jsx — Task 01 (updated)
// Fixes applied:
//   1. Show/hide password toggle (eye icon)
//   2. Role-based redirect after successful login (admin/manager/employee)

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

// ─── Simple eye / eye-off SVG icons (no extra library needed) ─────────────
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none"
       viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M2.458 12C3.732 7.943 7.523 5 12 5
         c4.477 0 8.268 2.943 9.542 7
         -1.274 4.057-5.065 7-9.542 7
         -4.477 0-8.268-2.943-9.542-7z" />
  </svg>
)

const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none"
       viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M13.875 18.825A10.05 10.05 0 0112 19
         c-4.477 0-8.268-2.943-9.542-7
         a9.97 9.97 0 012.255-3.592
         M6.938 6.938A9.969 9.969 0 0112 5
         c4.477 0 8.268 2.943 9.542 7
         a9.97 9.97 0 01-1.333 2.694
         M6.938 6.938L3 3m3.938 3.938l4.124 4.124
         M17.063 17.063l3.937 3.937
         m-3.937-3.937l-4.124-4.124" />
  </svg>
)

export default function LoginPage() {
  const { signIn }    = useAuth()
  const navigate      = useNavigate()

  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [showPwd,     setShowPwd]     = useState(false)   // ← toggle state
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {}
    if (!email.trim())    errs.email    = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
                          errs.email    = 'Enter a valid email address'
    if (!password.trim()) errs.password = 'Password is required'
    return errs
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const errs = validate()
    if (Object.keys(errs).length) { setFieldErrors(errs); return }
    setFieldErrors({})
    setLoading(true)
    try {
      // Step 1: sign in via AuthContext
      const returnedProfile = await signIn({ email, password })

      // Step 2: determine role — prefer what signIn() returned, but if it
      // didn't return a profile (AuthContext doesn't return it in some
      // implementations) fetch the role directly from Supabase ourselves.
      let role = returnedProfile?.role

      if (!role) {
        // Supabase session is now active — get the current user and look up role
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) {
          const { data: profileRow } = await supabase
            .from('users')
            .select('role')
            .eq('id', authUser.id)
            .single()
          role = profileRow?.role
        }
      }

      // Step 3: navigate to the right page based on role
      switch (role) {
        case 'admin':    navigate('/admin');    break
        case 'manager':  navigate('/manager');  break
        case 'employee': navigate('/employee'); break
        default:         navigate('/admin');    break   // safe fallback
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)' }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">

        {/* App name */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Reimbursement Manager</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              className={`w-full px-4 py-2.5 border rounded-lg text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500
                ${fieldErrors.email
                  ? 'border-red-400 bg-red-50'
                  : 'border-gray-300'}`}
            />
            {fieldErrors.email && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>
            )}
          </div>

          {/* Password with show/hide toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            {/* Wrapper gives the eye button a place to sit inside the input */}
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full px-4 py-2.5 pr-10 border rounded-lg text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                  ${fieldErrors.password
                    ? 'border-red-400 bg-red-50'
                    : 'border-gray-300'}`}
              />
              {/* Eye toggle button — positioned inside the input on the right */}
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute inset-y-0 right-3 flex items-center
                           text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}             // don't steal focus from the form flow
                aria-label={showPwd ? 'Hide password' : 'Show password'}
              >
                {showPwd ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>
            )}
          </div>

          {/* Global error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm
                            rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
                       text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
          >
            {loading ? 'Signing in…' : 'Login'}
          </button>
        </form>

        {/* Signup link */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-blue-600 hover:underline font-medium">
            Sign up
          </Link>
        </p>

      </div>
    </div>
  )
}