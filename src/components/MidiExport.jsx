import React, { useState } from 'react'
import { generateMidiForKey, downloadMidiFile } from '../utils/midi'

export default function MidiExport({ keyName, mode, bpm }) {
  const [expanded, setExpanded] = useState(false)
  const [midiData, setMidiData] = useState(null)
  
  React.useEffect(() => {
    if (keyName && mode) {
      const data = generateMidiForKey(keyName, mode, bpm)
      setMidiData(data)
    }
  }, [keyName, mode, bpm])
  
  if (!midiData) return null
  
  const handleDownload = (midiFileData, filename) => {
    downloadMidiFile(midiFileData, filename)
  }
  
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  
  const midiToNoteName = (midiNote) => {
    const octave = Math.floor(midiNote / 12) - 1
    const noteIndex = midiNote % 12
    return `${noteNames[noteIndex]}${octave}`
  }
  
  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '16px',
      background: '#f9fafb',
      minWidth: '300px'
    }}>
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          cursor: 'pointer'
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <h3 style={{ margin: 0, color: '#374151' }}>
          🎹 MIDI Export {midiData?.bpm && `(${midiData.bpm} BPM)`}
        </h3>
        <span style={{ color: '#6b7280' }}>{expanded ? '▼' : '▶'}</span>
      </div>
      
      {expanded && (
        <div style={{ marginTop: '16px' }}>
          {/* Scale */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#4b5563' }}>
              Scale: {keyName} {mode}
            </h4>
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '4px', 
              marginBottom: '8px',
              fontSize: '12px',
              color: '#6b7280'
            }}>
              {midiData.scale.notes.slice(0, 8).map((note, index) => (
                <span key={index} style={{
                  background: '#e5e7eb',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>
                  {midiToNoteName(note)}
                </span>
              ))}
            </div>
            <button
              onClick={() => handleDownload(midiData.scale.midiData, `${keyName}_${mode}_scale.mid`)}
              style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Download Scale MIDI
            </button>
          </div>
          
          {/* Chords */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#4b5563' }}>Chords</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
              {midiData.chords.map((chord, index) => (
                <div key={index} style={{
                  background: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  padding: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '14px' }}>
                    {chord.name}
                  </div>
                  <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '6px' }}>
                    {chord.notes.map(note => midiToNoteName(note)).join('-')}
                  </div>
                  <button
                    onClick={() => handleDownload(chord.midiData, `${keyName}_${mode}_${chord.name.replace(/[°#]/g, '')}.mid`)}
                    style={{
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '10px'
                    }}
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          {/* Common Progressions */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#4b5563' }}>Common Progressions</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {midiData.progressions.map((progression, index) => (
                <div key={index} style={{
                  background: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  padding: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                      {progression.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {progression.chords.map(chord => chord.name).join(' - ')}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(progression.midiData, `${keyName}_${mode}_${progression.name.replace(/[^a-zA-Z0-9]/g, '_')}.mid`)}
                    style={{
                      background: '#8b5cf6',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          {/* Arpeggiated Grooves */}
          <div>
            <h4 style={{ margin: '0 0 8px 0', color: '#4b5563' }}>🎼 Arpeggiated Grooves</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '300px', overflowY: 'auto' }}>
              {midiData.arpeggios && midiData.arpeggios.map((arpeggio, index) => (
                <div key={index} style={{
                  background: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  padding: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '2px', fontSize: '13px' }}>
                      {arpeggio.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>
                      {arpeggio.description}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(arpeggio.midiData, `${keyName}_${mode}_${arpeggio.name.replace(/[^a-zA-Z0-9]/g, '_')}.mid`)}
                    style={{
                      background: '#f59e0b',
                      color: 'white',
                      border: 'none',
                      padding: '5px 10px',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '11px'
                    }}
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}