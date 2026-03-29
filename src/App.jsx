import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import LoginPage from '@/pages/LoginPage'
import SignupPage from '@/pages/SignupPage'
import AdminPage from '@/pages/AdminPage'
import EmployeePage from '@/pages/EmployeePage'
import ManagerPage from '@/pages/ManagerPage'

function RoleRouter() {
  const { user, role, loading } = useAuth()

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>
  if (!user) return <Navigate to="/login" />

  if (role === 'admin') return <Navigate to="/admin" />
  if (role === 'manager') return <Navigate to="/manager" />
  if (role === 'employee') return <Navigate to="/employee" />

  return <Navigate to="/login" />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/admin/*" element={<AdminPage />} />
          <Route path="/employee/*" element={<EmployeePage />} />
          <Route path="/manager/*" element={<ManagerPage />} />
          <Route path="*" element={<RoleRouter />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
