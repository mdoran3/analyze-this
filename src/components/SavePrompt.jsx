import React, { useState, useEffect } from 'react'
import { useAuth } from '../auth/AuthContext'
import AuthModal from './AuthModal'
import './SavePrompt.css'

export default function SavePrompt({ analysisResults, onClose, onSaved }) {
  const [step, setStep] = useState('prompt') // 'prompt', 'naming', 'auth'
  const [projectName, setProjectName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { user, isAuthenticated } = useAuth()

  const handleSaveClick = () => {
    setStep('naming')
  }

  const handleSave = async () => {
    if (!projectName.trim()) return
    
    // Check if user is authenticated before saving
    if (!isAuthenticated) {
      // Store pending project data for after authentication
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
        setError(error.message)
        return
      }
      
      // Call onSaved if provided
      if (onSaved) {
        onSaved(data)
      }
      
      onClose()
    } catch (err) {
      setError('Failed to save project: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleAuthSuccess = () => {
    // After successful authentication, go back to naming step
    // User can then click Create Project again to save
    setStep('naming')
    setError('')
  }

  // Close the save prompt if user signs out (but only if they were previously signed in)
  // Track if user was previously authenticated to avoid closing on normal flow
  const wasAuthenticatedRef = React.useRef(false)
  React.useEffect(() => {
    if (isAuthenticated) {
      wasAuthenticatedRef.current = true
    }
  }, [isAuthenticated])

  React.useEffect(() => {
    // Only close if user was previously authenticated and then becomes unauthenticated
    // This prevents closing during normal flow for non-authenticated users
    if (!user && isAuthenticated === false && wasAuthenticatedRef.current) {
      onClose()
    }
  }, [isAuthenticated, user, onClose])

  if (!analysisResults) return null;
  
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        
        {step === 'prompt' && (
          <>
            <h2 className="modal-title">
              🎵 Analysis Complete!
            </h2>
            <p className="modal-text">
              Great! We've analyzed your track and found:
            </p>
            
            <div className="analysis-results">
              <div className="result-item">
                <strong>Key:</strong> {analysisResults.key} {analysisResults.mode}
              </div>
              {analysisResults.bpm > 0 && (
                <div className="result-item">
                  <strong>BPM:</strong> {analysisResults.bpm}
                </div>
              )}
            </div>

            <p className="modal-text">
              Would you like to save this analysis and generated MIDI files to your account?
            </p>

            <div className="modal-actions">
              <button onClick={onClose} className="btn btn-secondary">
                Not Now
              </button>
              <button 
                onClick={handleSaveClick} 
                className="btn btn-primary"
              >
                Yes, Save It!
              </button>
            </div>
          </>
        )}

        {step === 'naming' && (
          <>
            <h2 className="modal-title">
              Name Your Project
            </h2>
            <p className="modal-text">
              Give your musical analysis a memorable name{!isAuthenticated ? ' (you\'ll need to sign in to save)' : ' and save it to your account'}:
            </p>
            
            {!isAuthenticated && (
              <div className="auth-warning">
                ⚠️ You'll need to sign in or create an account to save this project
              </div>
            )}

            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="e.g., My Awesome Song Analysis"
              className="modal-input"
              autoFocus
            />

            {error && (
              <p className="error-message">
                {error}
              </p>
            )}

            <div className="modal-actions">
              <button
                onClick={() => setStep('prompt')}
                disabled={saving}
                className="btn btn-secondary"
              >
                Back
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !projectName.trim()}
                className="btn btn-success"
              >
                {saving ? 'Saving...' : (isAuthenticated ? 'Create Project' : 'Continue to Sign In')}
              </button>
            </div>
          </>
        )}

        {step === 'auth' && (
          <AuthModal
            onClose={() => setStep('naming')}
            onSuccess={handleAuthSuccess}
          />
        )}
        
      </div>
    </div>
  );
}