import React, { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    try {
      // Try to import and use Supabase
      import('../api/supabase').then(({ auth }) => {
        return auth.getCurrentUser()
      }).then(({ data }) => {
        setUser(data?.user || null)
        setLoading(false)
      }).catch((error) => {
        setError('Supabase not configured - running in demo mode')
        setUser(null)
        setLoading(false)
      })
    } catch (error) {
      setError('Supabase not configured - running in demo mode')
      setUser(null)
      setLoading(false)
    }
  }, [])

  const signUp = async (email, password) => {
    try {
      const { auth } = await import('../api/supabase')
      return await auth.signUp(email, password)
    } catch (error) {
      return { data: null, error: { message: 'Supabase not configured' } }
    }
  }

  const signIn = async (email, password) => {
    try {
      const { auth } = await import('../api/supabase')
      return await auth.signIn(email, password)
    } catch (error) {
      return { data: null, error: { message: 'Supabase not configured' } }
    }
  }

  const signOut = async () => {
    try {
      const { auth } = await import('../api/supabase')
      const result = await auth.signOut()
      setUser(null)
      return result
    } catch (error) {
      setUser(null)
      return { error: { message: 'Supabase not configured' } }
    }
  }

  const value = {
    user,
    loading,
    error,
    signUp,
    signIn,
    signOut
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}