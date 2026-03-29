import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const signingUp = useRef(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        if (!signingUp.current) fetchProfile(session.user.id)
      } else {
        setRole(null)
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*, companies(*)')
      .eq('id', userId)
      .single()

    if (!error && data) {
      setProfile(data)
      setRole(data.role)
    }
    setLoading(false)
  }

  async function signUp({ name, email, password, country, currency }) {
    signingUp.current = true
    try {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) throw error

      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({ name: `${name}'s Company`, country, currency_code: currency })
        .select()
        .single()
      if (companyError) throw companyError

      const { error: userError } = await supabase
        .from('users')
        .insert({ id: data.user.id, company_id: company.id, name, email, role: 'admin' })
      if (userError) throw userError

      await fetchProfile(data.user.id)
      return data
    } finally {
      signingUp.current = false
    }
  }

  async function signIn({ email, password }) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, role, profile, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)