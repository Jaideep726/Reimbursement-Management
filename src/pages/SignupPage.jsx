import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { fetchCountriesWithCurrencies } from '@/lib/currency'

const PASSWORD_RULES = [
  { label: 'At least 8 characters',       test: p => p.length >= 8 },
  { label: 'One uppercase letter (A–Z)',   test: p => /[A-Z]/.test(p) },
  { label: 'One special character (!@#…)', test: p => /[^a-zA-Z0-9]/.test(p) },
]

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

export default function SignupPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [country,  setCountry]  = useState('')
  const [currency, setCurrency] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)

  const [countries,        setCountries]        = useState([])
  const [loadingCountries, setLoadingCountries] = useState(true)
  const [passwordFocused,  setPasswordFocused]  = useState(false)
  const [loading,          setLoading]          = useState(false)
  const [error,            setError]            = useState('')
  const [fieldErrors,      setFieldErrors]      = useState({})

  useEffect(() => {
    fetchCountriesWithCurrencies()
      .then(data => { setCountries(data); setLoadingCountries(false) })
      .catch(() => setLoadingCountries(false))
  }, [])

  const handleCountryChange = (e) => {
    const code  = e.target.value
    setCountry(code)
    const match = countries.find(c => c.country === code)
    setCurrency(match ? match.currencyCode : '')
  }

  const validate = () => {
    const errs = {}
    if (!name.trim())  errs.name    = 'Name is required'
    if (!email.trim()) errs.email   = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
                       errs.email   = 'Enter a valid email address'
    if (!password)     errs.password = 'Password is required'
    else if (!PASSWORD_RULES.every(r => r.test(password)))
                       errs.password = 'Password does not meet all requirements'
    if (!country)      errs.country  = 'Please select a country'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const errs = validate()
    if (Object.keys(errs).length) { setFieldErrors(errs); return }
    setFieldErrors({})
    setLoading(true)
    try {
      await signUp({ name, email, password, country, currency })
      navigate('/')
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputBase = `w-full px-4 py-2.5 rounded-lg text-sm border
    focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors`
  const inputClass = (field) =>
    `${inputBase} ${fieldErrors[field]
      ? 'border-red-400 bg-red-50 text-gray-900'
      : 'border-slate-200 bg-slate-50 text-gray-900 hover:border-slate-300'}`

  return (
    <div className="min-h-screen flex"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)' }}>

      <div className="hidden lg:flex lg:w-5/12 flex-col justify-between p-14">
        <div>
          <h1 style={{
            fontFamily: "'Arial Black', 'Impact', sans-serif",
            fontSize: '2.6rem', fontWeight: 900, lineHeight: 1.1,
            letterSpacing: '0.04em', textTransform: 'uppercase',
            color: 'white', marginBottom: '1rem',
          }}>
            SET UP YOUR<br />COMPANY IN<br />
            <span style={{ color: '#60a5fa' }}>UNDER 2 MIN.</span>
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.7 }}>
            Multi-level approvals, receipt scanning, and real-time currency
            conversion — all in one place.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {['OCR receipt scanning', 'Sequential approval workflows', 'Auto currency conversion'].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                background: 'rgba(59,130,246,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="10" height="10" fill="none" viewBox="0 0 24 24"
                  stroke="#60a5fa" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span style={{ color: '#cbd5e1', fontSize: '0.875rem' }}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">

          <h2 className="text-xl font-bold text-gray-900 mb-1">Create your account</h2>
          <p className="text-sm text-gray-500 mb-6">You'll be the Admin of your company.</p>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">

            <div>
              <label className="block text-xs font-semibold text-gray-600
                                uppercase tracking-wide mb-1">Full Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Jane Smith" className={inputClass('name')} />
              {fieldErrors.name && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600
                                uppercase tracking-wide mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com" className={inputClass('email')} />
              {fieldErrors.email && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600
                                uppercase tracking-wide mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  placeholder="Min. 8 characters"
                  className={`${inputClass('password')} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute inset-y-0 right-3 flex items-center
                             text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                >
                  {showPwd ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>
              )}

              {passwordFocused && password.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {PASSWORD_RULES.map(rule => {
                    const met = rule.test(password)
                    return (
                      <li key={rule.label}
                        className={`flex items-center gap-2 text-xs font-medium
                          transition-colors ${met ? 'text-green-600' : 'text-yellow-600'}`}>
                        <span>{met ? '✓' : '·'}</span>
                        {rule.label}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600
                                  uppercase tracking-wide mb-1">Country</label>
                <select value={country} onChange={handleCountryChange}
                  disabled={loadingCountries}
                  className={`${inputClass('country')} bg-slate-50`}>
                  <option value="">{loadingCountries ? 'Loading…' : 'Select country'}</option>
                  {countries.map(c => (
                    <option key={c.country} value={c.country}>{c.country}</option>
                  ))}
                </select>
                {fieldErrors.country && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.country}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600
                                  uppercase tracking-wide mb-1">Currency</label>
                <input type="text" value={currency} readOnly placeholder="Auto"
                  className="w-full px-4 py-2.5 rounded-lg text-sm border border-slate-200
                    bg-slate-100 text-gray-500 cursor-not-allowed text-center font-semibold" />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm
                              rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading || loadingCountries}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white
                bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
                disabled:cursor-not-allowed transition-colors mt-2">
              {loading ? 'Creating account…' : 'Create Account →'}
            </button>

          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:underline font-semibold">
              Sign in
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}
