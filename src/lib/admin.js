import { supabase } from './supabase'

export const createUser = async ({ name, email, role, managerId, companyId }) => {
  const tempPassword = 'Temp@' + Math.random().toString(36).slice(2, 8)

  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email,
    password: tempPassword,
    options: { emailRedirectTo: window.location.origin }
  })
  if (authErr) throw authErr

  const { data: profile, error } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      company_id: companyId,
      name,
      email,
      role,
      manager_id: role === 'employee' ? managerId : null
    })
    .select()
    .single()
  if (error) throw error

  return { ...profile, tempPassword }
}