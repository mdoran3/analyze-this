import React from 'react'
import Dropper from './components/Dropper'
import CircleOfFifths from './components/CircleOfFifths'
import BPMDisplay from './components/BPMDisplay'
import MidiExport from './components/MidiExport'
import { decodeToMonoPCM } from './utils/audio'
import { MSG } from './engine/messages'

let worker

export default function App() {
  const [ready, setReady] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [result, setResult] = React.useState(null)
  const [error, setError] = React.useState('')
  const [progress, setProgress] = React.useState(0)

  React.useEffect(() => {
    // CLASSIC worker (so importScripts works inside)
    worker = new Worker(new URL('./engine/worker.js', import.meta.url))

    worker.onmessage = (e) => {
      const msg = e.data
      if (msg.type === MSG.READY) setReady(true)
      if (msg.type === MSG.PROGRESS) setProgress(msg.payload?.percent ?? 0)
      if (msg.type === MSG.RESULT) { setResult(msg.payload); setBusy(false); setProgress(100) }
      if (msg.type === MSG.ERROR)  { setError(msg.error); setBusy(false) }
    }
    worker.onerror = (err) => {
      setError('Worker error: ' + (err.message || err.filename || 'unknown'))
      setBusy(false)
    }

    worker.postMessage({ type: MSG.INIT })
    return () => worker && worker.terminate()
  }, [])

  async function handleFile(file) {
    setError('')
    setResult(null)
    setProgress(0)
    if (!ready) { setError('Audio engine is still initializing—try again in a moment.'); return }
    setBusy(true)
    try {
      const { pcm, sampleRate } = await decodeToMonoPCM(file)
      worker.postMessage({ type: MSG.ANALYZE, sampleRate, pcm }, [pcm.buffer])
    } catch (e) {
      setError(String(e))
      setBusy(false)
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '40px auto', padding: '0 20px', fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
      <h1 style={{ marginBottom: 8 }} title="Analyze This">
        Analyze This 
        {/* <span role="img" aria-label="middle finger">🖕</span> */}
      </h1>
      <h2>🎵 Instant Key Detection for Musicians & Producers 🎵</h2>
      <p style={{ marginTop: 0, color: '#555' }}>Drop a song to estimate its musical key — in your browser.</p>

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
                Key Confidence: {(result.keyConfidence * 100).toFixed(0)}%
              </p>
              <p style={{ marginTop: 10, fontSize: 13, color: '#666' }}>
                Powered by Essentia KeyExtractor & RhythmExtractor (WASM).
              </p>
            </div>
            <BPMDisplay bpm={result.bpm} confidence={result.bpmConfidence} />
          </div>
        )}
        
        {result && (
          <div style={{ marginTop: 24 }}>
            <MidiExport keyName={result.key} mode={result.mode} bpm={result.bpm} />
          </div>
        )}
      </div>
    </div>
  )
}