import React from 'react'
import { AuthProvider, useAuth } from './auth/AuthContextSafe'

// Import all components at the top
const loadComponents = async () => {
  try {
    const [
      DropperModule,
      CircleOfFifthsModule,
      BPMDisplayModule,
      MidiExportModule,
      SavePromptModule,
      ProjectSidebarModule,
      audioModule,
      messagesModule
    ] = await Promise.all([
      import('./components/Dropper'),
      import('./components/CircleOfFifths'),
      import('./components/BPMDisplay'),
      import('./components/MidiExport'),
      import('./components/SavePrompt'),
      import('./components/ProjectSidebar'),
      import('./utils/audio'),
      import('./engine/messages')
    ])
    
    return {
      Dropper: DropperModule.default,
      CircleOfFifths: CircleOfFifthsModule.default,
      BPMDisplay: BPMDisplayModule.default,
      MidiExport: MidiExportModule.default,
      SavePrompt: SavePromptModule.default,
      ProjectSidebar: ProjectSidebarModule.default,
      decodeToMonoPCM: audioModule.decodeToMonoPCM,
      MSG: messagesModule.MSG
    }
  } catch (error) {
    console.error('Failed to load components:', error)
    throw error
  }
}

// Step-by-step component testing
function FullAppDebug() {
  const [step, setStep] = React.useState(0)
  const [components, setComponents] = React.useState(null)
  const [loadError, setLoadError] = React.useState(null)
  
  const steps = [
    "AuthContext Only",
    "Load Dropper",
    "Load CircleOfFifths", 
    "Load BPMDisplay",
    "Load MidiExport",
    "Load SavePrompt",
    "Load ProjectSidebar",
    "Load Utils",
    "Full App"
  ]

  React.useEffect(() => {
    if (step > 0 && !components && !loadError) {
      loadComponents()
        .then(setComponents)
        .catch(setLoadError)
    }
  }, [step, components, loadError])

  if (step === 0) {
    const auth = useAuth()
    return (
      <div style={{ padding: '20px' }}>
        <h1>Step 0: AuthContext Only ✅</h1>
        <p>User: {auth.user ? auth.user.email : 'Not logged in'}</p>
        <p>Loading: {auth.loading ? 'Yes' : 'No'}</p>
        <p>Error: {auth.error || 'None'}</p>
        <button onClick={() => setStep(1)}>Next: Load Components</button>
      </div>
    )
  }

  if (loadError) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Component Loading Error ❌</h1>
        <p style={{color: 'red'}}>Failed to load components: {loadError.message}</p>
        <pre style={{background: '#f5f5f5', padding: '10px', fontSize: '12px'}}>
          {loadError.stack}
        </pre>
        <button onClick={() => setStep(0)}>Back to AuthContext</button>
      </div>
    )
  }

  if (!components) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Loading Components...</h1>
        <p>Please wait while components are loaded...</p>
      </div>
    )
  }

  const { Dropper, CircleOfFifths, BPMDisplay, MidiExport, SavePrompt, ProjectSidebar, decodeToMonoPCM, MSG } = components

  if (step === 1) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Step 1: Dropper Component ✅</h1>
        <Dropper onFileSelect={() => console.log('File selected')} />
        <div style={{ marginTop: '20px' }}>
          <button onClick={() => setStep(2)}>Next: CircleOfFifths</button>
          <button onClick={() => setStep(0)} style={{marginLeft: '10px'}}>Back</button>
        </div>
      </div>
    )
  }

  if (step === 2) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Step 2: CircleOfFifths Component ✅</h1>
        <CircleOfFifths detectedKey="C major" />
        <div style={{ marginTop: '20px' }}>
          <button onClick={() => setStep(3)}>Next: BPMDisplay</button>
          <button onClick={() => setStep(1)} style={{marginLeft: '10px'}}>Back</button>
        </div>
      </div>
    )
  }

  // Continue with other steps...
  return (
    <div style={{ padding: '20px' }}>
      <h1>Step {step}: {steps[step] || 'Unknown'}</h1>
      <p>Step {step} not fully implemented yet</p>
      <button onClick={() => setStep(Math.max(0, step - 1))}>Back</button>
    </div>
  )
}

export default function AppFullDebug() {
  return (
    <AuthProvider>
      <FullAppDebug />
    </AuthProvider>
  )
}