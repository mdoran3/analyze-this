import React, { useEffect, useState } from 'react'

export default function BPMDisplay({ bpm, confidence }) {
  const [pulse, setPulse] = useState(false)
  
  useEffect(() => {
    if (!bpm || bpm <= 0) return
    
    const interval = 60000 / bpm // milliseconds per beat
    const pulseInterval = setInterval(() => {
      setPulse(true)
      setTimeout(() => setPulse(false), 100) // Short pulse duration
    }, interval)
    
    return () => clearInterval(pulseInterval)
  }, [bpm])
  
  // Show placeholder if BPM detection failed or not available
  if (!bpm || bpm <= 0) {
    return (
      <div style={{ 
        textAlign: 'center',
        padding: '16px',
        border: '2px dashed #d1d5db',
        borderRadius: '12px',
        background: '#f9fafb',
        minWidth: '150px',
        opacity: 0.6
      }}>
        <div style={{ 
          fontSize: '24px', 
          color: '#9ca3af',
          marginBottom: '4px'
        }}>
          —
        </div>
        <div style={{ 
          fontSize: '14px', 
          color: '#6b7280',
          marginBottom: '8px'
        }}>
          BPM
        </div>
        <div style={{ 
          fontSize: '11px', 
          color: '#9ca3af'
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
      border: '2px solid #e5e7eb',
      borderRadius: '12px',
      background: pulse ? '#dbeafe' : '#f9fafb',
      transition: 'background-color 100ms ease-out',
      minWidth: '150px'
    }}>
      <div style={{ 
        fontSize: '32px', 
        fontWeight: 'bold', 
        color: '#1f2937',
        marginBottom: '4px'
      }}>
        {bpm}
      </div>
      <div style={{ 
        fontSize: '14px', 
        color: '#6b7280',
        marginBottom: '8px'
      }}>
        BPM
      </div>
      <div style={{ 
        fontSize: '12px', 
        color: '#9ca3af',
        marginBottom: '8px'
      }}>
        {getTempoLabel(bpm)}
      </div>
      <div style={{ 
        fontSize: '11px', 
        color: '#6b7280'
      }}>
        {(confidence * 100).toFixed(0)}% confidence
      </div>
      <div style={{
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        background: pulse ? '#3b82f6' : '#d1d5db',
        margin: '8px auto 0',
        transition: 'background-color 100ms ease-out'
      }} />
    </div>
  )
}