import React from 'react'
import Dropper from './components/Dropper'
import CircleOfFifths from './components/CircleOfFifths'
import BPMDisplay from './components/BPMDisplay'
import MidiExport from './components/MidiExport'
import SavePrompt from './components/SavePrompt'
import ProjectSidebar from './components/ProjectSidebar'
import AuthModal from './components/AuthModal'
import { decodeToMonoPCM } from './utils/audio'
import { MSG } from './engine/messages'
import { useAuth } from './auth/AuthContext'

export default function App() {
  const [ready, setReady] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [result, setResult] = React.useState(null)
  const [error, setError] = React.useState('')
  const [progress, setProgress] = React.useState(0)
  const [showSavePrompt, setShowSavePrompt] = React.useState(false)
  const [currentProject, setCurrentProject] = React.useState(null)
  const [projectsRefreshTrigger, setProjectsRefreshTrigger] = React.useState(0)
  const { isAuthenticated } = useAuth()
  
  const workerRef = React.useRef(null)

  React.useEffect(() => {
    // CLASSIC worker (so importScripts works inside)
    const worker = new Worker(new URL('./engine/worker.js', import.meta.url))
    workerRef.current = worker

    worker.onmessage = (e) => {
      const msg = e.data
      if (msg.type === MSG.READY) setReady(true)
      if (msg.type === MSG.PROGRESS) setProgress(msg.payload?.percent ?? 0)
      if (msg.type === MSG.RESULT) { 
        setResult(msg.payload)
        setBusy(false)
        setProgress(100)
        // Show save prompt after analysis completes
        setShowSavePrompt(true)
      }
      if (msg.type === MSG.ERROR)  { setError(msg.error); setBusy(false) }
    }
    worker.onerror = (err) => {
      setError('Worker error: ' + (err.message || err.filename || 'unknown'))
      setBusy(false)
    }

    worker.postMessage({ type: MSG.INIT })
    
    // Listen for auto-saved projects from email confirmation
    const handleAutoSavedProject = (event) => {
      setCurrentProject(event.detail)
      setProjectsRefreshTrigger(prev => prev + 1)
      setShowSavePrompt(false)
      
      // Show a success message
      setError('') // Clear any errors
      // You could add a success message state here if desired
    }
    
    window.addEventListener('projectAutoSaved', handleAutoSavedProject)
    
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
      window.removeEventListener('projectAutoSaved', handleAutoSavedProject)
    }
  }, [])

  const handleFile = async (file) => {
    setError('')
    setResult(null)
    setCurrentProject(null)
    setShowSavePrompt(false)
    setBusy(true)
    setProgress(0)

    try {
      const { pcm, sampleRate } = await decodeToMonoPCM(file)
      
      if (!workerRef.current) {
        setError('Audio engine not ready. Please wait a moment and try again.')
        setBusy(false)
        return
      }
      
      workerRef.current.postMessage({ type: MSG.ANALYZE, pcm, sampleRate })
    } catch (err) {
      setError('Failed to decode audio file: ' + err.message)
      setBusy(false)
    }
  }

  const handleProjectLoad = (project) => {
    setCurrentProject(project)
    setResult(project.analysis_results)
    setError('')
    setShowSavePrompt(false)
  }

  const handleProjectSaved = (project) => {
    try {
      setCurrentProject(project)
      setShowSavePrompt(false)
      
      // Trigger refresh of projects list in sidebar
      setProjectsRefreshTrigger(prev => prev + 1)
      
      // Ensure the result state is preserved - it should already exist from the analysis
      // But if for some reason it's lost, restore it from the project
      if (project && project.analysis_results && !result) {
        setResult(project.analysis_results)
      }
    } catch (err) {
      console.error('Error in handleProjectSaved:', err)
      setError('Error handling project save: ' + err.message)
    }
  }

  return (
    <>
      {/* Header with Authentication - spans full viewport width */}
      <AuthHeader />
      
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 60px)' }}>
        {/* Project Sidebar */}
        <ProjectSidebar 
          onProjectLoad={handleProjectLoad}
          currentProject={currentProject}
          refreshTrigger={projectsRefreshTrigger}
        />
        
        {/* Main Content - properly centered */}
        <div style={{ 
          flex: 1, 
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px 20px',
          position: 'relative'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '1200px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <h1 style={{ textAlign: 'center', marginBottom: 8 }}>🎵 Analyze This</h1>
            <p style={{ textAlign: 'center', color: '#666', marginBottom: 32 }}>
              Drop an audio file to analyze its musical key, tempo, and generate MIDI content
            </p>

        <Dropper onFile={handleFile} />

        <div style={{ marginTop: 24 }}>
          {!ready && <p>Initializing audio engine…</p>}
          {busy && (
            <div style={{ marginBottom: 8 }}>
              <p style={{ margin: '0 0 6px 0' }}>Analyzing… {progress}%</p>
              <div style={{ height: 8, background: '#eee', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: '#3b82f6',
                  transition: 'width 120ms linear'
                }} />
              </div>
            </div>
          )}
          {error && <p style={{ color: 'crimson', whiteSpace: 'pre-wrap' }}>{error}</p>}
          {result && (
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginTop: 8, flexWrap: 'wrap' }}>
              <CircleOfFifths keyName={result.key} mode={result.mode} />
              <div style={{ flex: 1, minWidth: '200px' }}>
                <h2 style={{ margin: 0 }}>{result.key} {result.mode}</h2>
                <p style={{ margin: '6px 0', color: '#555' }}>
                  Key Confidence: {((result.keyConfidence || result.confidence || 0) * 100).toFixed(0)}%
                </p>
                {currentProject && (
                  <p style={{ margin: '6px 0', color: '#3b82f6', fontSize: '14px' }}>
                    📁 Project: {currentProject.name}
                  </p>
                )}
                <p style={{ marginTop: 10, fontSize: 13, color: '#666' }}>
                  Powered by Essentia KeyExtractor & RhythmExtractor (WASM).
                </p>
              </div>
              <BPMDisplay bpm={result.bpm || 0} confidence={result.bpmConfidence || 0} />
            </div>
          )}
          
          {result && (
            <div style={{ marginTop: 24 }}>
              <MidiExport keyName={result.key} mode={result.mode} bpm={result.bpm || 0} />
            </div>
          )}
        </div>

          {/* Save Prompt Modal - positioned within main content area */}
          {showSavePrompt && result && (
            <SavePrompt
              analysisResults={result}
              onClose={() => setShowSavePrompt(false)}
              onSaved={handleProjectSaved}
            />
          )}
          </div>
        </div>
      </div>
    </>
  )
}

// Simple header component with authentication
function AuthHeader() {
  const { user, loading, signIn, signUp, signOut } = useAuth()
  const [showAuthModal, setShowAuthModal] = React.useState(false)

  if (loading) {
    return (
      <header style={{ 
        width: '100vw',
        height: '60px',
        margin: 0,
        padding: '12px 24px', 
        borderBottom: '1px solid #e5e7eb', 
        background: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        boxSizing: 'border-box'
      }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>🎵 Analyze This</h2>
        <div style={{ fontSize: '14px', color: '#6b7280' }}>Loading...</div>
      </header>
    )
  }

  return (
    <>
      <header style={{ 
        width: '100vw',
        height: '60px',
        margin: 0,
        padding: '12px 24px', 
        borderBottom: '1px solid #e5e7eb', 
        background: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        boxSizing: 'border-box'
      }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>🎵 Analyze This</h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {user ? (
            <>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>
                Welcome, {user.user_metadata?.first_name || user.email}
              </span>
              <button
                onClick={() => signOut()}
                style={{
                  padding: '8px 16px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowAuthModal(true)}
                style={{
                  padding: '8px 20px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
                }}
              >
                Sign In
              </button>
            </>
          )}
        </div>
      </header>
      
      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => setShowAuthModal(false)}
        />
      )}
    </>
  )
}