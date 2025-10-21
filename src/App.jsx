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
  const [progressTask, setProgressTask] = React.useState('')
  const [showSavePrompt, setShowSavePrompt] = React.useState(false)
  const [savePromptData, setSavePromptData] = React.useState(null)
  const [currentProject, setCurrentProject] = React.useState(null)
  const [projectsRefreshTrigger, setProjectsRefreshTrigger] = React.useState(0)
  const { isAuthenticated, signOut: authSignOut } = useAuth()
  
  const workerRef = React.useRef(null)

  // Custom sign out handler that resets app state
  const handleSignOut = async () => {
    try {
      // Call the auth signOut
      await authSignOut()
      
      // Reset all app state to initial values
      setResult(null)
      setError('')
      setProgress(0)
      setShowSavePrompt(false)
      setSavePromptData(null)
      setCurrentProject(null)
      setProjectsRefreshTrigger(0)
      setBusy(false)
      
      // Clear any saved analysis data
      localStorage.removeItem('pendingProject')
      
    } catch (err) {
      setError('Failed to sign out properly')
    }
  }

  // Navigate to home page - resets app to initial state
  const handleLogoClick = () => {
    // Reset all app state to initial values (like a fresh start)
    setResult(null)
    setError('')
    setProgress(0)
    setShowSavePrompt(false)
    setSavePromptData(null)
    setCurrentProject(null)
    setBusy(false)
    
    // Clear any saved analysis data
    localStorage.removeItem('pendingProject')
    
    // Stop any ongoing worker processes
    if (workerRef.current && busy) {
      workerRef.current.terminate()
      // Reinitialize worker
      const worker = new Worker(new URL('./engine/worker.js', import.meta.url), { type: 'module' })
      workerRef.current = worker
      
      worker.onmessage = (e) => {
        const msg = e.data
        if (msg.type === MSG.READY)   { setReady(true) }
        if (msg.type === MSG.PROGRESS) { 
          const percent = msg.payload?.percent ?? 0
          setProgress(percent)
          
          // Generate task descriptions based on progress percentage
          let task = 'Starting analysis...'
          if (percent > 10) task = 'Processing audio data...'
          if (percent > 30) task = 'Analyzing frequency content...'
          if (percent > 50) task = 'Extracting musical features...'
          if (percent > 70) task = 'Preparing for final analysis...'
          if (percent > 80) task = 'Detecting musical key and tempo...'
          if (percent >= 100) task = 'Analysis complete!'
          
          setProgressTask(task)
        }
        if (msg.type === MSG.RESULT) { 
          setResult(msg.payload)
          setSavePromptData(msg.payload)
          setBusy(false)
          setProgress(100)
          setProgressTask('Analysis complete!')
          setShowSavePrompt(true)
        }
        if (msg.type === MSG.ERROR)  { setError(msg.error); setBusy(false) }
      }
      worker.onerror = (err) => {
        setError('Worker error: ' + (err.message || err.filename || 'unknown'))
        setBusy(false)
      }
    }
  }



  React.useEffect(() => {
    // CLASSIC worker (so importScripts works inside)
    const worker = new Worker(new URL('./engine/worker.js', import.meta.url))
    workerRef.current = worker

    worker.onmessage = (e) => {
      const msg = e.data
      if (msg.type === MSG.READY)   { setReady(true) }
      if (msg.type === MSG.PROGRESS) { 
        const percent = msg.payload?.percent ?? 0
        setProgress(percent)
        
        // Generate task descriptions based on progress percentage
        let task = 'Starting analysis...'
        if (percent > 10) task = 'Processing audio data...'
        if (percent > 30) task = 'Analyzing frequency content...'
        if (percent > 50) task = 'Extracting musical features...'
        if (percent > 70) task = 'Preparing for final analysis...'
        if (percent > 80) task = 'Detecting musical key and tempo...'
        if (percent >= 100) task = 'Analysis complete!'
        
        setProgressTask(task)
      }
      if (msg.type === MSG.RESULT) { 
        setResult(msg.payload)
        setSavePromptData(msg.payload) // Store separate copy for SavePrompt
        setBusy(false)
        setProgress(100)
        setProgressTask('Analysis complete!')
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
    setProgressTask('Starting analysis...')
    setResult(null)
    setSavePromptData(null)
    setCurrentProject(null) // Clear current project when analyzing new file
    setShowSavePrompt(false) // Hide any existing save prompt

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
    setSavePromptData(null)
  }

  const handleProjectSaved = (project) => {
    try {
      setCurrentProject(project)
      setShowSavePrompt(false)
      setSavePromptData(null)
      
      // Trigger refresh of projects list in sidebar
      setProjectsRefreshTrigger(prev => prev + 1)
      
      // Ensure the result state is preserved - it should already exist from the analysis
      // But if for some reason it's lost, restore it from the project
      if (project && project.analysis_results && !result) {
        setResult(project.analysis_results)
      }
    } catch (err) {
      setError('Error handling project save: ' + err.message)
    }
  }

  return (
    <>
      {/* Header with Authentication - spans full viewport width */}
      <AuthHeader onSignOut={handleSignOut} onLogoClick={handleLogoClick} />
      
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 60px)' }}>
        {/* Project Sidebar */}
        <ProjectSidebar 
          onProjectLoad={handleProjectLoad}
          currentProject={currentProject}
          refreshTrigger={projectsRefreshTrigger}
          onSignOut={handleSignOut}
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
              {!result && (
                <>
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
                        justifyContent: 'flex-end',
                        gap: '8px'
                  }}>
                    {/* Chevron 1 */}
                    <div style={{
                      width: '0',
                      height: '0',
                      borderTop: '20px solid transparent',
                      borderBottom: '20px solid transparent',
                      borderLeft: '24px solid #d55d20',
                      opacity: '0',
                      filter: `
                        drop-shadow(0 0 0px #d55d20)
                        drop-shadow(0 0 0px #d55d20)
                      `,
                      transform: 'scale(0.5)',
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
                      opacity: '0',
                      filter: `
                        drop-shadow(0 0 0px #d55d20)
                        drop-shadow(0 0 0px #d55d20)
                      `,
                      transform: 'scale(0.5)',
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
                      opacity: '0',
                      filter: `
                        drop-shadow(0 0 0px #d55d20)
                        drop-shadow(0 0 0px #d55d20)
                      `,
                      transform: 'scale(0.5)',
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
                      opacity: '0',
                      filter: `
                        drop-shadow(0 0 0px #d55d20)
                        drop-shadow(0 0 0px #d55d20)
                      `,
                      transform: 'scale(0.5)',
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
                      opacity: '0',
                      filter: `
                        drop-shadow(0 0 0px #d55d20)
                        drop-shadow(0 0 0px #d55d20)
                      `,
                      transform: 'scale(0.5)',
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
                      opacity: '0',
                      filter: `
                        drop-shadow(0 0 0px #d55d20)
                        drop-shadow(0 0 0px #d55d20)
                      `,
                      transform: 'scale(0.5)',
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
              </>
              )}
              
              {/* Results section - takes main area when analysis is complete */}
              {result && (
                <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
                  {/* Analyze Another Song button at top */}
                  <div style={{ marginBottom: '24px', textAlign: 'left' }}>
                    <button
                      onClick={() => {
                        setResult(null)
                        setSavePromptData(null)
                        setError('')
                        setProgress(0)
                        setCurrentProject(null)
                        setShowSavePrompt(false)
                      }}
                      style={{
                        background: 'linear-gradient(135deg, var(--clr-surface-a30), var(--clr-surface-a20))',
                        border: '1px solid var(--clr-primary-a0)',
                        borderRadius: '6px',
                        padding: '12px 20px',
                        cursor: 'pointer',
                        color: 'var(--clr-light-a0)',
                        fontSize: '16px',
                        fontWeight: '500',
                        letterSpacing: '0.5px',
                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
                        transition: 'all 0.3s ease',
                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-1px)'
                        e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)'
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)'
                        e.target.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.2)'
                      }}
                    >
                      Analyze Another Song
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <CircleOfFifths keyName={result.key} mode={result.mode} />
                    <div style={{ flex: 1, minWidth: '200px', textAlign: 'center' }}>
                      <h2 style={{ margin: 0, fontSize: '2.5em' }}>{result.key} {result.mode}</h2>
                      <p style={{ margin: '6px 0', color: 'var(--clr-surface-a50)', fontSize: '1.2em' }}>
                        Key Confidence: {((result.keyConfidence || result.confidence || 0) * 100).toFixed(0)}%
                      </p>
                      {currentProject && (
                        <p style={{ margin: '6px 0', color: 'var(--clr-primary-a30)', fontSize: '16px' }}>
                          📁 Project: {currentProject.name}
                        </p>
                      )}
                      <p style={{ marginTop: 10, fontSize: 14, color: 'var(--clr-surface-a40)' }}>
                        Powered by Essentia KeyExtractor & RhythmExtractor (WASM).
                      </p>
                    </div>
                    <BPMDisplay bpm={result.bpm || 0} confidence={result.bpmConfidence || 0} />
                  </div>
                  
                  <div style={{ marginTop: 24 }}>
                    <MidiExport keyName={result.key} mode={result.mode} bpm={result.bpm || 0} />
                  </div>
                </div>
              )}
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
                    0%, 5% {
                      opacity: 0;
                      filter: 
                        drop-shadow(0 0 0px #d55d20)
                        drop-shadow(0 0 0px #d55d20);
                      transform: scale(0.5);
                    }
                    10% {
                      opacity: 0.25;
                      filter: 
                        drop-shadow(0 0 4px #d55d20)
                        drop-shadow(0 0 8px #d55d20)
                        drop-shadow(0 0 12px #d55d20);
                      transform: scale(1.1);
                    }
                    20% {
                      opacity: 0.5;
                      filter: 
                        drop-shadow(0 0 6px #d55d20)
                        drop-shadow(0 0 12px #d55d20)
                        drop-shadow(0 0 18px #d55d20)
                        drop-shadow(0 0 24px #d55d20);
                      transform: scale(1.3);
                    }
                    30% {
                      opacity: 0.35;
                      filter: 
                        drop-shadow(0 0 5px #d55d20)
                        drop-shadow(0 0 10px #d55d20)
                        drop-shadow(0 0 15px #d55d20);
                      transform: scale(1.15);
                    }
                    40% {
                      opacity: 0.15;
                      filter: 
                        drop-shadow(0 0 3px #d55d20)
                        drop-shadow(0 0 6px #d55d20);
                      transform: scale(0.9);
                    }
                    50%, 100% {
                      opacity: 0;
                      filter: 
                        drop-shadow(0 0 0px #d55d20)
                        drop-shadow(0 0 0px #d55d20);
                      transform: scale(0.5);
                    }
                  }
                  
                  @keyframes bannerFadeOut {
                    0% {
                      opacity: 1;
                      transform: translate(-50%, -50%) scale(1);
                    }
                    100% {
                      opacity: 0;
                      transform: translate(-50%, -50%) scale(0.95);
                    }
                  }
                  
                  @keyframes bannerFadeIn {
                    0% {
                      opacity: 0;
                      transform: translate(-50%, -50%) scale(1.05);
                    }
                    100% {
                      opacity: 1;
                      transform: translate(-50%, -50%) scale(1);
                    }
                  }
                  
                  @keyframes lightSweepOnce {
                    0% {
                      transform: translateX(0);
                    }
                    100% {
                      transform: translateX(calc(100vw + 100px));
                    }
                  }
                  
                  @keyframes subtleGlow {
                    0%, 100% {
                      text-shadow: 
                        0 0 5px var(--clr-primary-a30),
                        0 0 10px var(--clr-primary-a30),
                        0 0 15px var(--clr-primary-a30),
                        0 2px 0 #000;
                    }
                    50% {
                      text-shadow: 
                        0 0 8px var(--clr-primary-a30),
                        0 0 16px var(--clr-primary-a30),
                        0 0 24px var(--clr-primary-a30),
                        0 2px 0 #000;
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
                <div style={{ 
                  marginBottom: 16, 
                  padding: '16px', 
                  background: 'var(--clr-surface-a10)', 
                  borderRadius: '12px',
                  border: '1px solid var(--clr-surface-a30)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '16px', 
                      fontWeight: '500',
                      color: 'var(--clr-light-a0)' 
                    }}>
                      {progressTask}
                    </p>
                    <span style={{ 
                      fontSize: '14px', 
                      fontWeight: '600',
                      color: 'var(--clr-primary-a0)',
                      fontFamily: 'monospace'
                    }}>
                      {progress}%
                    </span>
                  </div>
                  <div style={{ 
                    height: 16, 
                    background: 'var(--clr-surface-a30)', 
                    borderRadius: 8, 
                    overflow: 'hidden',
                    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)'
                  }}>
                    <div style={{
                      width: `${progress}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, var(--clr-primary-a0), var(--clr-primary-a10))',
                      transition: 'width 300ms ease-out',
                      borderRadius: '8px',
                      boxShadow: '0 0 8px rgba(213, 93, 32, 0.4)'
                    }} />
                  </div>
                </div>
              )}
              {error && <p style={{ color: 'var(--clr-danger-a10)', whiteSpace: 'pre-wrap' }}>{error}</p>}
            </div>

          </div>
        </div>
      </div>
      
      {/* Save Prompt Modal */}
      {showSavePrompt && savePromptData && (
        <SavePrompt
          analysisResults={savePromptData}
          onClose={() => {
            setShowSavePrompt(false)
            setSavePromptData(null) // Clear the data when closing
          }}
          onSaved={handleProjectSaved}
        />
      )}
    </>
  )
}

function InfoDropdown() {
  const [isExpanded, setIsExpanded] = React.useState(false)

  const playHoverSound = () => {
    try {
      const audio = new Audio('/sounds/hsb_kit2_click.wav')
      audio.volume = 0.3 // Quieter for hover effects
      audio.play().catch(err => {
        // Audio play failed - graceful fallback
      })
    } catch (err) {
      // Audio loading failed
    }
  }

  const handleMouseEnter = () => {
    // Only play sound if dropdown is currently closed
    if (!isExpanded) {
      playHoverSound()
    }
    setIsExpanded(true)
  }

  const handleMouseLeave = () => {
    setIsExpanded(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Info Bar */}
      <div 
        style={{
          background: 'linear-gradient(135deg, var(--clr-surface-a30), var(--clr-surface-a20))',
          border: '1px solid var(--clr-primary-a0)',
          borderRadius: '6px',
          padding: '8px 12px',
          cursor: 'pointer',
          color: 'var(--clr-light-a0)',
          fontSize: '14px',
          fontWeight: '500',
          letterSpacing: '0.5px',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
          transition: 'all 0.3s ease',
          transform: isExpanded ? 'translateY(-1px)' : 'translateY(0)',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)'
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        What is analyze this?
        <span style={{
          marginLeft: '6px',
          fontSize: '10px',
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.3s ease',
          display: 'inline-block'
        }}>
          ▼
        </span>
      </div>

      {/* Dropdown Content */}
      <div 
        style={{
          position: 'absolute',
          top: '100%',
          right: '0',
          width: '320px',
          background: 'var(--clr-surface-a10)',
          border: '2px solid var(--clr-primary-a20)',
          borderRadius: '8px',
          padding: isExpanded ? '16px' : '0',
          marginTop: '6px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          opacity: isExpanded ? 1 : 0,
          maxHeight: isExpanded ? '250px' : '0',
          overflow: 'hidden',
          transition: 'all 0.4s ease',
          zIndex: 1000,
          backdropFilter: 'blur(10px)'
        }}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        <div style={{
          color: 'var(--clr-light-a0)',
          fontSize: '13px',
          lineHeight: '1.5',
          textAlign: 'left'
        }}>
          <h4 style={{
            margin: '0 0 10px 0',
            color: 'var(--clr-primary-a30)',
            fontSize: '15px',
            fontWeight: '600'
          }}>
            🎵 Audio Analysis Tool
          </h4>
          <p style={{ margin: '0 0 8px 0' }}>
            <strong>Key Detection:</strong> Identifies the musical key of any audio file
          </p>
          <p style={{ margin: '0 0 8px 0' }}>
            <strong>BPM Analysis:</strong> Calculates beats per minute for tempo matching
          </p>
          <p style={{ margin: '0 0 8px 0' }}>
            <strong>MIDI Export:</strong> Generate MIDI files of chords, progressions, and arpeggiations from detected elements 
          </p>
          <p style={{ margin: '0', fontSize: '11px', color: 'var(--clr-surface-a50)' }}>
            Perfect for producers, DJs, and musicians.
          </p>
        </div>
      </div>
    </div>
  )
}

// Simple header component with authentication
function AuthHeader({ onSignOut, onLogoClick }) {
  const { user, loading, signIn, signUp, signOut } = useAuth()
  const [showAuthModal, setShowAuthModal] = React.useState(false)
  
  // Use custom signOut handler if provided, otherwise use default
  const handleSignOut = onSignOut || signOut
  const [currentTextIndex, setCurrentTextIndex] = React.useState(0)
  const [isGlitching, setIsGlitching] = React.useState(false)
  const [lightAnimationKey, setLightAnimationKey] = React.useState(0)

  const bannerTexts = [
    "analyze any sound",
    "find its key", 
    "get the BPM",
    "preview musical ideas",
    "export ideas to midi"
  ]

  React.useEffect(() => {
    // Start first cycle immediately, then repeat every 11 seconds
    const startCycle = () => {
      // After 10 seconds, start the fade transition
      setTimeout(() => {
        setIsGlitching(true)
        
        // After fade out (0.5s), change text and fade in
        setTimeout(() => {
          setCurrentTextIndex((prev) => (prev + 1) % bannerTexts.length)
          setLightAnimationKey((prev) => prev + 1)
          setIsGlitching(false)
        }, 1000)
      }, 6000) // Wait 10 seconds for light sweep to complete
    }

    // Start the first cycle immediately
    startCycle()
    
    // Then repeat every 11 seconds
    const interval = setInterval(startCycle, 6000)

    return () => clearInterval(interval)
  }, [])

  // Reset auth modal when user signs out
  React.useEffect(() => {
    if (!user) {
      setShowAuthModal(false)
    }
  }, [user])

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
        <button
          onClick={(e) => {
            // Play click sound
            try {
              const audio = new Audio('/sounds/hsb_kit2_click.wav')
              audio.volume = 0.5
              audio.play().catch(err => {
                // Silently ignore audio errors
              })
            } catch (err) {
              // Silently ignore audio errors
            }
            onLogoClick(e)
          }}
          style={{
            background: 'linear-gradient(145deg, #1a1a1a, #0d0d0d)',
            border: '2px solid var(--clr-surface-a40)',
            borderRadius: '12px',
            padding: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            boxShadow: `
              0 8px 16px rgba(0, 0, 0, 0.6),
              0 4px 8px rgba(0, 0, 0, 0.4),
              0 2px 4px rgba(0, 0, 0, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.15)
            `,
            transition: 'all 0.15s ease',
            transform: 'translateY(0px)',
            outline: 'none'
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'translateY(4px)'
            e.currentTarget.style.border = '3px solid var(--clr-surface-a50)'
            e.currentTarget.style.background = 'linear-gradient(145deg, #0d0d0d, #1a1a1a)'
            e.currentTarget.style.boxShadow = `
              0 1px 3px rgba(0, 0, 0, 0.8),
              inset 0 4px 8px rgba(0, 0, 0, 0.6),
              inset 0 2px 4px rgba(0, 0, 0, 0.4)
            `
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'translateY(0px)'
            e.currentTarget.style.border = '2px solid var(--clr-surface-a40)'
            e.currentTarget.style.background = 'linear-gradient(145deg, #1a1a1a, #0d0d0d)'
            e.currentTarget.style.boxShadow = `
              0 8px 16px rgba(0, 0, 0, 0.6),
              0 4px 8px rgba(0, 0, 0, 0.4),
              0 2px 4px rgba(0, 0, 0, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.15)
            `
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0px)'
            e.currentTarget.style.border = '2px solid var(--clr-surface-a40)'
            e.currentTarget.style.background = 'linear-gradient(145deg, #1a1a1a, #0d0d0d)'
            e.currentTarget.style.boxShadow = `
              0 8px 16px rgba(0, 0, 0, 0.6),
              0 4px 8px rgba(0, 0, 0, 0.4),
              0 2px 4px rgba(0, 0, 0, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.15)
            `
          }}
        >
          <img src="/AnalyzeThis_Final_Logo_2048.png" alt="Analyze This" style={{ height: '64px', width: 'auto' }} />
        </button>
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
        boxSizing: 'border-box',
        position: 'relative'
      }}>
        <button
          onClick={(e) => {
            // Play click sound
            try {
              const audio = new Audio('/sounds/hsb_kit2_click.wav')
              audio.volume = 0.5
              audio.play().catch(err => {
                // Silently ignore audio errors
              })
            } catch (err) {
              // Silently ignore audio errors
            }
            onLogoClick(e)
          }}
          style={{
            background: 'linear-gradient(145deg, #1a1a1a, #0d0d0d)',
            border: '2px solid var(--clr-surface-a40)',
            borderRadius: '12px',
            padding: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            boxShadow: `
              0 8px 16px rgba(0, 0, 0, 0.6),
              0 4px 8px rgba(0, 0, 0, 0.4),
              0 2px 4px rgba(0, 0, 0, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.15)
            `,
            transition: 'all 0.15s ease',
            transform: 'translateY(0px)',
            outline: 'none'
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'translateY(4px)'
            e.currentTarget.style.border = '3px solid var(--clr-surface-a50)'
            e.currentTarget.style.background = 'linear-gradient(145deg, #0d0d0d, #1a1a1a)'
            e.currentTarget.style.boxShadow = `
              0 1px 3px rgba(0, 0, 0, 0.8),
              inset 0 4px 8px rgba(0, 0, 0, 0.6),
              inset 0 2px 4px rgba(0, 0, 0, 0.4)
            `
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'translateY(0px)'
            e.currentTarget.style.border = '2px solid var(--clr-surface-a40)'
            e.currentTarget.style.background = 'linear-gradient(145deg, #1a1a1a, #0d0d0d)'
            e.currentTarget.style.boxShadow = `
              0 8px 16px rgba(0, 0, 0, 0.6),
              0 4px 8px rgba(0, 0, 0, 0.4),
              0 2px 4px rgba(0, 0, 0, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.15)
            `
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0px)'
            e.currentTarget.style.border = '2px solid var(--clr-surface-a40)'
            e.currentTarget.style.background = 'linear-gradient(145deg, #1a1a1a, #0d0d0d)'
            e.currentTarget.style.boxShadow = `
              0 8px 16px rgba(0, 0, 0, 0.6),
              0 4px 8px rgba(0, 0, 0, 0.4),
              0 2px 4px rgba(0, 0, 0, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.15)
            `
          }}
        >
          <img src="/AnalyzeThis_Final_Logo_2048.png" alt="Analyze This" style={{ height: '64px', width: 'auto' }} />
        </button>
        
        {/* Cycling Banner */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '24px',
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          fontFamily: '"Orbitron", "Exo 2", "Rajdhani", monospace',
          color: 'var(--clr-primary-a30)',
          textShadow: `
            0 0 5px var(--clr-primary-a30),
            0 0 10px var(--clr-primary-a30),
            0 0 15px var(--clr-primary-a30),
            0 2px 0 #000
          `,
          animation: isGlitching 
            ? 'bannerFadeOut 0.8s cubic-bezier(0.4, 0.0, 0.2, 1)' 
            : 'subtleGlow 3s ease-in-out infinite',
          opacity: isGlitching ? 0 : 1,
          transition: 'opacity 0.8s cubic-bezier(0.4, 0.0, 0.2, 1), transform 0.8s cubic-bezier(0.4, 0.0, 0.2, 1)'
        }}>
          {bannerTexts[currentTextIndex]}
          {/* Light sweep overlay */}
          {!isGlitching && (
            <div 
              key={`light-${lightAnimationKey}`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                overflow: 'hidden',
                pointerEvents: 'none'
              }}
            >
              <div style={{
                position: 'absolute',
                top: 0,
                left: '-50px',
                width: '50px',
                height: '100%',
                background: 'rgba(255, 255, 255, 0.25)',
                filter: 'blur(8px)',
                animation: 'lightSweepOnce 10s linear forwards',
                animationIterationCount: 1,
                pointerEvents: 'none'
              }} />
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <InfoDropdown />
          {user ? (
            <>
              <span style={{ fontSize: '14px', color: 'var(--clr-light-a0)' }}>
                Hello, {user.user_metadata?.first_name || user.email}
              </span>
              <button
                onClick={handleSignOut}
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
              onClick={() => {
                // Play click sound
                try {
                  const audio = new Audio('/sounds/hsb_kit2_click.wav')
                  audio.volume = 0.5
                  audio.play().catch(err => {
                    // Silently ignore audio errors
                  })
                } catch (err) {
                  // Silently ignore audio errors
                }
                setShowAuthModal(true)
              }}
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