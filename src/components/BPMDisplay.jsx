import React, { useEffect, useState } from 'react'

export default function BPMDisplay({ bpm, confidence }) {
  const [pulse, setPulse] = useState(false)
  
  useEffect(() => {
    if (!bpm || bpm <= 0) return
    
    const interval = 60000 / bpm // milliseconds per beat
    const pulseInterval = setInterval(() => {
      setPulse(true)
      setTimeout(() => setPulse(false), 200) // Longer, softer pulse duration
    }, interval)
    
    return () => clearInterval(pulseInterval)
  }, [bpm])
  
  // Show placeholder if BPM detection failed or not available
  if (!bpm || bpm <= 0) {
    return (
      <div style={{ 
        textAlign: 'center',
        padding: '16px',
        border: '2px dashed var(--clr-surface-a30)',
        borderRadius: '12px',
        background: 'var(--clr-surface-a10)',
        minWidth: '150px',
        opacity: 0.6
      }}>
        <div style={{ 
          fontSize: '24px', 
          color: 'var(--clr-surface-a40)',
          marginBottom: '4px'
        }}>
          —
        </div>
        <div style={{ 
          fontSize: '14px', 
          color: 'var(--clr-light-a0)',
          marginBottom: '8px'
        }}>
          BPM
        </div>
        <div style={{ 
          fontSize: '11px', 
          color: 'var(--clr-surface-a40)'
        }}>
          Not detected
        </div>
      </div>
    )
  }
  
  const getTempoLabel = (bpm) => {
    if (bpm < 60) return 'Largo'
    if (bpm < 72) return 'Adagio'
    if (bpm < 108) return 'Andante'
    if (bpm < 120) return 'Moderato'
    if (bpm < 168) return 'Allegro'
    if (bpm < 200) return 'Presto'
    return 'Prestissimo'
  }
  
  return (
    <div style={{ 
      textAlign: 'center',
      padding: '16px',
      border: '2px solid var(--clr-surface-a30)',
      borderRadius: '12px',
      background: 'var(--clr-surface-a20)',
      minWidth: '150px'
    }}>
      <div style={{ 
        fontSize: '32px', 
        fontWeight: 'bold', 
        color: 'var(--clr-light-a0)',
        marginBottom: '4px'
      }}>
        {bpm}
      </div>
      <div style={{ 
        fontSize: '14px', 
        color: 'var(--clr-light-a0)',
        marginBottom: '8px'
      }}>
        BPM
      </div>
      <div style={{ 
        fontSize: '12px', 
        color: 'var(--clr-surface-a50)',
        marginBottom: '8px'
      }}>
        {getTempoLabel(bpm)}
      </div>
      <div style={{ 
        fontSize: '11px', 
        color: 'var(--clr-surface-a50)'
      }}>
        {(confidence * 100).toFixed(0)}% confidence
      </div>
      <div style={{
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        background: pulse ? 'var(--clr-primary-a0)' : 'var(--clr-surface-a30)',
        margin: '8px auto 0',
        transition: 'all 300ms ease-in-out',
        opacity: pulse ? 1 : 0.3,
        boxShadow: pulse ? `
          0 0 10px var(--clr-primary-a0),
          0 0 20px var(--clr-primary-a10),
          0 0 30px var(--clr-primary-a20),
          0 0 40px var(--clr-primary-a30)
        ` : 'none'
      }} />
    </div>
  )
}