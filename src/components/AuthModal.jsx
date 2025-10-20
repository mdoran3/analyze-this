import React, { useState } from 'react'
import { useAuth } from '../auth/AuthContext'

export default function AuthModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState('signin') // 'signin' or 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn, signUp } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Basic validation for both modes
    if (!email || !password) {
      setError('Please fill in all fields')
      setLoading(false)
      return
    }

    // Additional validation only for signup
    if (mode === 'signup') {
      if (!firstName?.trim()) {
        setError('Please fill in your first name')
        setLoading(false)
        return
      }
      
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        setLoading(false)
        return
      }
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      let result
      if (mode === 'signin') {
        result = await signIn(email, password)
      } else {
        result = await signUp(email, password, { firstName })
      }

      if (result.error) {
        setError(result.error.message)
      } else {
        // Success!
        if (mode === 'signup') {
          setError('') // Clear any errors
          // For signup, we might need to show email confirmation message
          if (result.data?.user && !result.data.session) {
            setError('Please check your email for a confirmation link before continuing.')
            return
          }
        }
        onSuccess()
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'var(--clr-surface-a10)',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '400px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          border: '1px solid var(--clr-surface-a30)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 16px 0', color: 'var(--clr-light-a0)' }}>
          {mode === 'signin' ? '🔐 Sign In' : '✨ Create Account'}
        </h2>
        
        <p style={{ color: 'var(--clr-surface-a50)', marginBottom: '24px' }}>
          {mode === 'signin' 
            ? 'Sign in to save your musical analysis'
            : 'Create an account to save and manage your projects'
          }
        </p>

      <form onSubmit={handleSubmit}>
        {mode === 'signup' && (
          <>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '6px', 
                color: 'var(--clr-light-a0)',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid var(--clr-surface-a30)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  background: 'var(--clr-surface-a20)',
                  color: 'var(--clr-light-a0)'
                }}
                placeholder="Your first name"
                required
              />
            </div>
          </>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '6px', 
            color: 'var(--clr-light-a0)',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid var(--clr-surface-a30)',
              borderRadius: '6px',
              fontSize: '14px',
              boxSizing: 'border-box',
              background: 'var(--clr-surface-a20)',
              color: 'var(--clr-light-a0)'
            }}
            required
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '6px', 
            color: 'var(--clr-light-a0)',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid var(--clr-surface-a30)',
              borderRadius: '6px',
              fontSize: '14px',
              boxSizing: 'border-box',
              background: 'var(--clr-surface-a20)',
              color: 'var(--clr-light-a0)'
            }}
            required
          />
        </div>

        {mode === 'signup' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '6px', 
              color: 'var(--clr-light-a0)',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid var(--clr-surface-a30)',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box',
                background: 'var(--clr-surface-a20)',
                color: 'var(--clr-light-a0)'
              }}
              required
            />
          </div>
        )}

        {error && (
          <div style={{
            background: 'var(--clr-danger-a20)',
            border: '1px solid var(--clr-danger-a10)',
            color: 'var(--clr-danger-a0)',
            padding: '12px',
            borderRadius: '6px',
            fontSize: '14px',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            background: 'var(--clr-primary-a0)',
            color: 'var(--clr-light-a0)',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1,
            marginBottom: '16px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.target.style.background = 'var(--clr-primary-a10)'
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.target.style.background = 'var(--clr-primary-a0)'
            }
          }}
        >
          {loading ? 'Please wait...' : (mode === 'signin' ? 'Sign In' : 'Create Account')}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <button
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            setError('')
            setEmail('')
            setPassword('')
            setConfirmPassword('')
            setFirstName('')
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--clr-primary-a30)',
            cursor: 'pointer',
            fontSize: '14px',
            textDecoration: 'underline'
          }}
        >
          {mode === 'signin' 
            ? "Don't have an account? Sign up" 
            : "Already have an account? Sign in"
          }
        </button>
      </div>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--clr-surface-a50)',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}