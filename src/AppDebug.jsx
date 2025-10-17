import React from 'react'
import { AuthProvider, useAuth } from './auth/AuthContext'
import Dropper from './components/Dropper'

// Component that uses AuthContext
function AppWithAuth() {
  const [step, setStep] = React.useState(0)
  
  const steps = [
    "Basic App Shell",
    "AuthContext",
    "Dropper Component", 
    "CircleOfFifths Component",
    "BPMDisplay Component",
    "MidiExport Component",
    "SavePrompt Component",
    "ProjectSidebar Component"
  ]

  React.useEffect(() => {
    console.log('AppDebug loaded, step:', step)
  }, [step])

  if (step === 0) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Debug App - Step {step}: {steps[step]}</h1>
        <p>Basic React component is working!</p>
        <button onClick={() => setStep(1)}>Next: Load AuthContext</button>
      </div>
    )
  }

  if (step === 1) {
    try {
      const auth = useAuth()
      return (
        <div style={{ padding: '20px' }}>
          <h1>Debug App - Step {step}: {steps[step]}</h1>
          <p>AuthContext loaded successfully!</p>
          <p>User: {auth.user ? auth.user.email : 'Not logged in'}</p>
          <p>Loading: {auth.loading ? 'Yes' : 'No'}</p>
          <p>Error: {auth.error || 'None'}</p>
          <button onClick={() => setStep(2)}>Next: Load Dropper</button>
          <button onClick={() => setStep(0)} style={{marginLeft: '10px'}}>Back</button>
        </div>
      )
    } catch (error) {
      return (
        <div style={{ padding: '20px' }}>
          <h1>Debug App - Step {step}: {steps[step]} - ERROR</h1>
          <p style={{color: 'red'}}>AuthContext failed to load: {error.message}</p>
          <button onClick={() => setStep(0)}>Back</button>
        </div>
      )
    }
  }

  if (step === 2) {
    try {
      return (
        <div style={{ padding: '20px' }}>
          <h1>Debug App - Step {step}: {steps[step]}</h1>
          <p>Dropper component loaded!</p>
          <Dropper />
          <button onClick={() => setStep(3)}>Next: Load CircleOfFifths</button>
          <button onClick={() => setStep(1)} style={{marginLeft: '10px'}}>Back</button>
        </div>
      )
    } catch (error) {
      return (
        <div style={{ padding: '20px' }}>
          <h1>Debug App - Step {step}: {steps[step]} - ERROR</h1>
          <p style={{color: 'red'}}>Dropper failed to load: {error.message}</p>
          <button onClick={() => setStep(1)}>Back</button>
        </div>
      )
    }
  }

  // Continue for other components...
  return (
    <div style={{ padding: '20px' }}>
      <h1>Debug App - Step {step}: {steps[step]}</h1>
      <p>Step {step} not implemented yet</p>
      <button onClick={() => setStep(step - 1)}>Back</button>
    </div>
  )
}

// Main debug app with AuthProvider wrapper
export default function AppDebug() {
  return (
    <AuthProvider>
      <AppWithAuth />
    </AuthProvider>
  )
}
}