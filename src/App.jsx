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
      worker.terminate()
      window.removeEventListener('projectAutoSaved', handleAutoSavedProject)
    }
  }, [])

  const handleFile = async (file) => {
    if (!ready) return
    setBusy(true)
    setError('')
    setProgress(0)
    setResult(null)
    setCurrentProject(null) // Clear current project when analyzing new file

    try {
      const float32Data = await decodeToMonoPCM(file)
      workerRef.current.postMessage({ type: MSG.ANALYZE, payload: float32Data })
    } catch (err) {
      setError('Audio decode error: ' + err.message)
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
        
        {/* Main Content - positioned higher up */}
        <div style={{ 
          flex: 1, 
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'center',
          padding: '60px 20px 40px 20px',
          position: 'relative',
          backgroundColor: 'var(--clr-surface-a0)'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '1200px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <div style={{ textAlign: 'center', marginBottom: 32, position: 'relative' }}>
              <p style={{ color: 'var(--clr-surface-a50)', margin: '0 0 16px 0', fontSize: '18px', fontWeight: '500' }}>
                Drag & drop an audio file or click below
              </p>
              <div className="mobile-grid" style={{ 
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                alignItems: 'center',
                width: '100%',
                gap: '20px'
              }}>
                {/* Left Column: Text and Chevrons */}
                <div className="mobile-hide" style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {/* Drop File Here Text */}
                  <div style={{
                    marginBottom: '20px',
                    textAlign: 'center',
                    pointerEvents: 'none'
                  }}>
                    <div style={{
                      fontFamily: '"Orbitron", "Exo 2", "Rajdhani", "Share Tech Mono", monospace',
                      fontSize: '18px',
                      fontWeight: '700',
                      letterSpacing: '3px',
                      textTransform: 'uppercase',
                      color: '#d55d20',
                      textShadow: `
                        0 0 5px #d55d20,
                        0 0 10px #d55d20,
                        0 0 15px #d55d20,
                        0 0 20px #d55d20,
                        0 2px 0 #000,
                        0 4px 6px rgba(0, 0, 0, 0.7)
                      `,
                      animation: 'neonFlicker 2.5s infinite alternate',
                      background: 'linear-gradient(45deg, transparent, rgba(213, 93, 32, 0.1), transparent)',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      backdropFilter: 'blur(2px)'
                    }}>
                      Drop File Here
                    </div>
                  </div>

                  {/* Neon Chevron Wave Arrow */}
                  <div style={{
                    width: '260px',
                    height: '60px',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    {/* Chevron 1 */}
                    <div style={{
                      width: '0',
                      height: '0',
                      borderTop: '20px solid transparent',
                      borderBottom: '20px solid transparent',
                      borderLeft: '24px solid #d55d20',
                      opacity: '0.15',
                      filter: `
                        drop-shadow(0 0 3px #d55d20)
                        drop-shadow(0 0 6px #d55d20)
                      `,
                      transform: 'scale(0.8)',
                      animation: 'chevronWave 3.5s infinite',
                      animationDelay: '0.8s'
                    }}></div>
                    
                    {/* Chevron 2 */}
                    <div style={{
                      width: '0',
                      height: '0',
                      borderTop: '20px solid transparent',
                      borderBottom: '20px solid transparent',
                      borderLeft: '24px solid #d55d20',
                      opacity: '0.15',
                      filter: `
                        drop-shadow(0 0 3px #d55d20)
                        drop-shadow(0 0 6px #d55d20)
                      `,
                      transform: 'scale(0.8)',
                      animation: 'chevronWave 3.5s infinite',
                      animationDelay: '0.95s'
                    }}></div>
                    
                    {/* Chevron 3 */}
                    <div style={{
                      width: '0',
                      height: '0',
                      borderTop: '20px solid transparent',
                      borderBottom: '20px solid transparent',
                      borderLeft: '24px solid #d55d20',
                      opacity: '0.15',
                      filter: `
                        drop-shadow(0 0 3px #d55d20)
                        drop-shadow(0 0 6px #d55d20)
                      `,
                      transform: 'scale(0.8)',
                      animation: 'chevronWave 3.5s infinite',
                      animationDelay: '1.1s'
                    }}></div>
                    
                    {/* Chevron 4 */}
                    <div style={{
                      width: '0',
                      height: '0',
                      borderTop: '20px solid transparent',
                      borderBottom: '20px solid transparent',
                      borderLeft: '24px solid #d55d20',
                      opacity: '0.15',
                      filter: `
                        drop-shadow(0 0 3px #d55d20)
                        drop-shadow(0 0 6px #d55d20)
                      `,
                      transform: 'scale(0.8)',
                      animation: 'chevronWave 3.5s infinite',
                      animationDelay: '1.25s'
                    }}></div>
                    
                    {/* Chevron 5 */}
                    <div style={{
                      width: '0',
                      height: '0',
                      borderTop: '20px solid transparent',
                      borderBottom: '20px solid transparent',
                      borderLeft: '24px solid #d55d20',
                      opacity: '0.15',
                      filter: `
                        drop-shadow(0 0 3px #d55d20)
                        drop-shadow(0 0 6px #d55d20)
                      `,
                      transform: 'scale(0.8)',
                      animation: 'chevronWave 3.5s infinite',
                      animationDelay: '1.4s'
                    }}></div>
                    
                    {/* Chevron 6 */}
                    <div style={{
                      width: '0',
                      height: '0',
                      borderTop: '20px solid transparent',
                      borderBottom: '20px solid transparent',
                      borderLeft: '24px solid #d55d20',
                      opacity: '0.15',
                      filter: `
                        drop-shadow(0 0 3px #d55d20)
                        drop-shadow(0 0 6px #d55d20)
                      `,
                      transform: 'scale(0.8)',
                      animation: 'chevronWave 3.5s infinite',
                      animationDelay: '1.55s'
                    }}></div>
                  </div>
                </div>
                
                {/* Middle Column: Logo Dropper */}
                <div style={{ 
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      display: 'inline-block',
                      borderRadius: '24px',
                      padding: '20px',
                      background: 'var(--clr-surface-a20)',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), 0 4px 12px rgba(213, 93, 32, 0.2)',
                      border: '2px solid var(--clr-surface-a30)',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}>
                      <img src="/AnalyzeThis_Final_Logo_2048.png" alt="Analyze This" style={{ 
                        height: '480px', 
                        width: 'auto', 
                        borderRadius: '16px',
                        display: 'block'
                      }} />
                    </div>
                    <div style={{ 
                      position: 'absolute', 
                      top: '0', 
                      left: '0', 
                      width: '100%', 
                      height: '100%', 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Dropper onFile={handleFile} />
                    </div>
                  </div>
                </div>
                
                {/* Right Column: Empty for balance */}
                <div></div>
              </div>
              <p style={{ color: 'var(--clr-surface-a40)', margin: '16px 0 0 0', fontSize: '14px' }}>
                Supports MP3, WAV, M4A, FLAC, AAC, OGG
              </p>
              <style>
                {`
                  @keyframes neonFlicker {
                    0%, 100% {
                      text-shadow: 
                        0 0 5px #d55d20,
                        0 0 10px #d55d20,
                        0 0 15px #d55d20,
                        0 0 20px #d55d20;
                    }
                    50% {
                      text-shadow: 
                        0 0 2px #d55d20,
                        0 0 5px #d55d20,
                        0 0 8px #d55d20,
                        0 0 12px #d55d20;
                    }
                  }
                  @keyframes neonPulse {
                    0%, 100% {
                      opacity: 1;
                      transform: rotate(-5deg) scale(1);
                    }
                    50% {
                      opacity: 0.7;
                      transform: rotate(-5deg) scale(1.1);
                    }
                  }
                  @keyframes chevronWave {
                    0%, 70%, 100% {
                      opacity: 0.15;
                      filter: 
                        drop-shadow(0 0 3px #d55d20)
                        drop-shadow(0 0 6px #d55d20);
                      transform: scale(0.8);
                    }
                    10% {
                      opacity: 0.5;
                      filter: 
                        drop-shadow(0 0 8px #d55d20)
                        drop-shadow(0 0 16px #d55d20)
                        drop-shadow(0 0 24px #d55d20);
                      transform: scale(1.1);
                    }
                    20% {
                      opacity: 1;
                      filter: 
                        drop-shadow(0 0 12px #d55d20)
                        drop-shadow(0 0 24px #d55d20)
                        drop-shadow(0 0 36px #d55d20)
                        drop-shadow(0 0 48px #d55d20);
                      transform: scale(1.3);
                    }
                    30% {
                      opacity: 0.7;
                      filter: 
                        drop-shadow(0 0 10px #d55d20)
                        drop-shadow(0 0 20px #d55d20)
                        drop-shadow(0 0 30px #d55d20);
                      transform: scale(1.15);
                    }
                    40% {
                      opacity: 0.3;
                      filter: 
                        drop-shadow(0 0 6px #d55d20)
                        drop-shadow(0 0 12px #d55d20);
                      transform: scale(0.9);
                    }
                  }
                  
                  /* Mobile responsive - hide left column on mobile */
                  @media (max-width: 768px) {
                    .mobile-grid {
                      grid-template-columns: 1fr !important;
                    }
                    .mobile-hide {
                      display: none !important;
                    }
                  }
                `}
              </style>
            </div>

            <div style={{ marginTop: 24 }}>
              {!ready && <p>Initializing audio engine…</p>}
              {busy && (
                <div style={{ marginBottom: 8 }}>
                  <p style={{ margin: '0 0 6px 0' }}>Analyzing… {progress}%</p>
                  <div style={{ height: 8, background: 'var(--clr-surface-a20)', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{
                      width: `${progress}%`,
                      height: '100%',
                      background: 'var(--clr-primary-a0)',
                      transition: 'width 120ms linear'
                    }} />
                  </div>
                </div>
              )}
              {error && <p style={{ color: 'var(--clr-danger-a10)', whiteSpace: 'pre-wrap' }}>{error}</p>}
              {result && (
                <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginTop: 8, flexWrap: 'wrap' }}>
                  <CircleOfFifths keyName={result.key} mode={result.mode} />
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <h2 style={{ margin: 0 }}>{result.key} {result.mode}</h2>
                    <p style={{ margin: '6px 0', color: 'var(--clr-surface-a50)' }}>
                      Key Confidence: {((result.keyConfidence || result.confidence || 0) * 100).toFixed(0)}%
                    </p>
                    {currentProject && (
                      <p style={{ margin: '6px 0', color: 'var(--clr-primary-a30)', fontSize: '14px' }}>
                        📁 Project: {currentProject.name}
                      </p>
                    )}
                    <p style={{ marginTop: 10, fontSize: 13, color: 'var(--clr-surface-a40)' }}>
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
        height: '100px',
        margin: 0,
        padding: '16px 24px', 
        borderBottom: '1px solid var(--clr-surface-a30)', 
        background: '#000000',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
        boxSizing: 'border-box'
      }}>
        <img src="/AnalyzeThis_Final_Logo_2048.png" alt="Analyze This" style={{ height: '80px', width: 'auto' }} />
        <div style={{ fontSize: '14px', color: 'var(--clr-surface-a50)' }}>Loading...</div>
      </header>
    )
  }

  return (
    <>
      <header style={{ 
        width: '100vw',
        height: '100px',
        margin: 0,
        padding: '16px 24px', 
        borderBottom: '1px solid var(--clr-surface-a30)', 
        background: '#000000',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
        boxSizing: 'border-box'
      }}>
        <img src="/AnalyzeThis_Final_Logo_2048.png" alt="Analyze This" style={{ height: '80px', width: 'auto' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {user ? (
            <>
              <span style={{ fontSize: '14px', color: 'var(--clr-light-a0)' }}>
                Hello, {user.user_metadata?.first_name || user.email}
              </span>
              <button
                onClick={signOut}
                className="secondary"
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Sign Out
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="primary"
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {showAuthModal && !user && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </>
  )
}