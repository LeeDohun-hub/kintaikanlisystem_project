import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import WorkInput from './pages/employee/WorkInput'
import WorkHistory from './pages/employee/WorkHistory'
import Dashboard from './pages/admin/Dashboard'
import WorkView from './pages/admin/WorkView'
import Statistics from './pages/admin/Statistics'
import Layout from './components/Layout'
import LoadingSpinner from './components/LoadingSpinner'

function PrivateRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && user.role !== 'ADMIN') return <Navigate to="/work-input" replace />
  return children
}

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner />

  const defaultPath = user ? (user.role === 'ADMIN' ? '/dashboard' : '/work-input') : '/login'

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={defaultPath} replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to={defaultPath} replace /> : <Register />} />
      <Route path="/" element={<Navigate to={defaultPath} replace />} />

      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route path="work-input" element={<WorkInput />} />
        <Route path="work-history" element={<WorkHistory />} />
        <Route path="dashboard" element={<PrivateRoute adminOnly><Dashboard /></PrivateRoute>} />
        <Route path="work-view" element={<PrivateRoute adminOnly><WorkView /></PrivateRoute>} />
        <Route path="statistics" element={<PrivateRoute adminOnly><Statistics /></PrivateRoute>} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
