/**
 * AuthContext — JWT Role-Based Authentication Provider
 * Handles login, register, logout, token persistence, and role-based access.
 */
import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)
const API = 'http://localhost:8000/api/v1'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [role, setRole] = useState(localStorage.getItem('role'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      // Validate token on mount
      fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          if (res.ok) return res.json()
          throw new Error('Invalid token')
        })
        .then(data => {
          setUser(data)
          setRole(data.role)
        })
        .catch(() => {
          logout()
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password, loginRole = 'customer') => {
    const endpoint = loginRole === 'admin' ? '/auth/admin-login' : '/auth/login'
    const res = await fetch(`${API}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail || 'Login failed')
    }

    const data = await res.json()
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('role', data.role)
    localStorage.setItem('userName', data.name)
    setToken(data.access_token)
    setRole(data.role)
    setUser({ user_id: data.user_id, email, role: data.role, name: data.name })
    return data
  }

  const register = async (name, email, password, company, phone) => {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, company, phone }),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail || 'Registration failed')
    }

    const data = await res.json()
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('role', data.role)
    localStorage.setItem('userName', data.name)
    setToken(data.access_token)
    setRole(data.role)
    setUser({ user_id: data.user_id, email, role: data.role, name: data.name })
    return data
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('userName')
    setToken(null)
    setRole(null)
    setUser(null)
  }

  const authFetch = async (url, options = {}) => {
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    }
    if (options.body && !options.headers?.['Content-Type']) {
      headers['Content-Type'] = 'application/json'
    }
    return fetch(url, { ...options, headers })
  }

  return (
    <AuthContext.Provider value={{
      user,
      token,
      role,
      loading,
      isAuthenticated: !!token,
      login,
      register,
      logout,
      authFetch,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
