import React, { createContext, useContext, useEffect, useState } from 'react'
import { auth } from '../api/supabase'

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

  useEffect(() => {
    // Handle auth initialization and URL-based session detection
    const initializeAuth = async () => {
      try {
        // Let Supabase handle URL detection automatically first
        const { data: { session }, error } = await auth.getSession()
        
        if (error) {
          console.warn('Auth session check failed:', error.message)
        }
        
        // Set user from session if available
        if (session?.user) {
          setUser(session.user)
        } else {
          // If no session, try to get current user
          const { data: { user } } = await auth.getCurrentUser()
          setUser(user)
        }
        
        setLoading(false)
      } catch (error) {
        console.warn('Auth initialization failed (Supabase not configured):', error.message)
        setUser(null)
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes with error handling
    try {
      const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
        
        // Handle successful sign-in (including email confirmation)
        if (event === 'SIGNED_IN' && session?.user) {
          // Check for pending project data
          const pendingProjectData = localStorage.getItem('pendingProject')
          if (pendingProjectData) {
            try {
              const { name, analysisResults, timestamp } = JSON.parse(pendingProjectData)
              
              // Only use if less than 1 hour old
              if (Date.now() - timestamp < 3600000) {
                // Wait a bit for auth to fully settle
                setTimeout(async () => {
                  try {
                    const { db } = await import('../api/supabase')
                    const { data, error } = await db.createProject(name, analysisResults)
                    
                    if (error) {
                      console.error('Failed to auto-save pending project:', error)
                    } else {
                      // Trigger a custom event to notify the app
                      window.dispatchEvent(new CustomEvent('projectAutoSaved', { detail: data }))
                    }
                  } catch (err) {
                    console.error('Error auto-saving project:', err)
                  }
                }, 1000)
              }
              
              // Clean up stored data
              localStorage.removeItem('pendingProject')
            } catch (err) {
              console.error('Error processing pending project:', err)
              localStorage.removeItem('pendingProject')
            }
          }
        }
      })

      return () => subscription.unsubscribe()
    } catch (error) {
      console.warn('Auth state change listener failed (Supabase not configured):', error.message)
      setLoading(false)
    }
  }, [])

  const signUp = async (email, password, profileData = {}) => {
    setLoading(true)
    try {
      const { data, error } = await auth.signUp(email, password, profileData)
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email, password) => {
    setLoading(true)
    try {
      const { data, error } = await auth.signIn(email, password)
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      const { error } = await auth.signOut()
      if (error) throw error
      return { error: null }
    } catch (error) {
      return { error }
    } finally {
      setLoading(false)
    }
  }

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}