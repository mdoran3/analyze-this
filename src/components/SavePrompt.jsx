import React, { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import AuthModal from './AuthModal'

export default function SavePrompt({ analysisResults, onClose, onSaved }) {
  const [step, setStep] = useState('prompt') // 'prompt', 'naming', 'auth'
  const [projectName, setProjectName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { user, isAuthenticated } = useAuth()

  const handleSaveClick = () => {
    // Always go to naming first, whether authenticated or not
    setStep('naming')
  }

    const handleSave = async () => {
    if (!projectName.trim()) return

    // Check if user is authenticated before saving
    if (!isAuthenticated) {
      // Store pending project data for email confirmation flow
      localStorage.setItem('pendingProject', JSON.stringify({
        name: projectName.trim(),
        analysisResults: analysisResults,
        timestamp: Date.now()
      }))
      
      setStep('auth')
      return
    }

    setSaving(true)
    setError('')

    try {
      // Dynamically import db only when needed
      const { db } = await import('../api/supabase')
      
      const { data, error } = await db.createProject(projectName.trim(), analysisResults)
      
      if (error) {
        console.error('Database error:', error)
        setError(error.message)
        return
      }

      // Success!
      onSaved(data)
      onClose()
    } catch (err) {
      console.error('Save project error:', err)
      setError('Failed to save project: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleAuthSuccess = () => {
    // Store pending project data in case user needs to confirm email
    if (projectName.trim() && analysisResults) {
      localStorage.setItem('pendingProject', JSON.stringify({
        name: projectName.trim(),
        analysisResults: analysisResults,
        timestamp: Date.now()
      }))
    }
    
    // Simply return to the naming step
    // The user can now click the save button manually
    setStep('naming')
    
    // Clear any previous errors
    setError('')
  }

  if (!analysisResults) return null

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '400px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        
        {step === 'prompt' && (
          <>
            <h2 style={{ margin: '0 0 16px 0', color: 'var(--clr-neutral-a0)' }}>
              🎵 Analysis Complete!
            </h2>
            <p style={{ color: 'var(--clr-neutral-a30)', marginBottom: '24px' }}>
              Great! We've analyzed your track and found:
            </p>
            
            <div style={{
              background: 'var(--clr-surface-tonal-a20)',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '24px',
              color: 'var(--clr-neutral-a0)'
            }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>Key:</strong> {analysisResults.key} {analysisResults.mode}
              </div>
              {analysisResults.bpm > 0 && (
                <div>
                  <strong>BPM:</strong> {analysisResults.bpm}
                </div>
              )}
            </div>

            <p style={{ color: 'var(--clr-neutral-a10)', marginBottom: '24px' }}>
              Would you like to save this analysis and generated MIDI files to your account?
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={onClose}
                className="secondary"
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Not Now
              </button>
              <button
                onClick={handleSaveClick}
                className="primary"
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Yes, Save It!
              </button>
            </div>
          </>
        )}

        {step === 'naming' && (
          <>
            <h2 style={{ margin: '0 0 16px 0', color: 'var(--clr-neutral-a0)' }}>
              Name Your Project
            </h2>
            <p style={{ color: 'var(--clr-neutral-a30)', marginBottom: '16px' }}>
              Give your musical analysis a memorable name{!isAuthenticated ? ' (you\'ll need to sign in to save)' : ' and save it to your account'}:
            </p>
            
            {!isAuthenticated && (
              <div style={{
                background: 'var(--clr-warning-a60)',
                border: '1px solid var(--clr-warning-a20)',
                color: 'var(--clr-warning-a0)',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '14px',
                marginBottom: '16px'
              }}>
                ⚠️ You'll need to sign in or create an account to save this project
              </div>
            )}

            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="e.g., My Awesome Song Analysis"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid var(--clr-surface-a30)',
                borderRadius: '6px',
                fontSize: '14px',
                marginBottom: '16px',
                boxSizing: 'border-box',
                background: 'var(--clr-surface-a0)',
                color: 'var(--clr-neutral-a0)'
              }}
              autoFocus
            />

            {error && (
              <p style={{ color: 'var(--clr-danger-a0)', fontSize: '14px', marginBottom: '16px' }}>
                {error}
              </p>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setStep('prompt')}
                disabled={saving}
                className="secondary"
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.5 : 1
                }}
              >
                Back
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !projectName.trim()}
                className="success"
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: (saving || !projectName.trim()) ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  opacity: (saving || !projectName.trim()) ? 0.5 : 1
                }}
              >
                {saving ? 'Saving...' : (isAuthenticated ? 'Create Project' : 'Continue to Sign In')}
              </button>
            </div>
          </>
        )}

        {step === 'auth' && (
          <AuthModal
            onClose={() => setStep('prompt')}
            onSuccess={handleAuthSuccess}
          />
        )}
      </div>
    </div>
  )
}