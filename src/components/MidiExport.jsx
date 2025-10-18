import React, { useState } from 'react'
import { generateMidiForKey, downloadMidiFile } from '../utils/midi'
import MidiPreviewPlayer from '../utils/midiPlayer'

export default function MidiExport({ keyName, mode, bpm }) {
  const [expanded, setExpanded] = useState(false)
  const [midiData, setMidiData] = useState(null)
  const [player, setPlayer] = useState(null)
  const [playing, setPlaying] = useState(null) // Track what's currently playing
  
  React.useEffect(() => {
    if (keyName && mode) {
      const data = generateMidiForKey(keyName, mode, bpm)
      setMidiData(data)
    }
  }, [keyName, mode, bpm])

  React.useEffect(() => {
    // Initialize player when component mounts
    const midiPlayer = new MidiPreviewPlayer()
    setPlayer(midiPlayer)

    return () => {
      // Cleanup when component unmounts
      if (midiPlayer) {
        midiPlayer.dispose()
      }
    }
  }, [])

  const handlePlay = async (type, data, id) => {
    if (!player) return

    try {
      // Stop any currently playing audio
      player.stopAll()
      
      // Initialize audio context if needed (requires user interaction)
      if (!player.isInitialized) {
        await player.initialize()
      }

      setPlaying(id)

      switch (type) {
        case 'scale':
          await player.playScale(data.notes)
          break
        case 'chord':
          await player.playChord(data.notes)
          break
        case 'progression':
          await player.playProgression(data.chords)
          break
        case 'arpeggio':
          await player.playArpeggio(data, bpm || 120)
          break
        default:
          break
      }

      // Auto-stop playing indicator after a reasonable time
      setTimeout(() => {
        setPlaying(null)
      }, type === 'scale' ? 4000 : type === 'progression' ? 6000 : type === 'arpeggio' ? 6000 : 2500)

    } catch (error) {
      console.error('Failed to play preview:', error)
      setPlaying(null)
    }
  }

  const handleStop = () => {
    if (player) {
      player.stopAll()
    }
    setPlaying(null)
  }
  
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
      border: '1px solid var(--clr-surface-a20)',
      borderRadius: '8px',
      padding: '16px',
      background: 'var(--clr-surface-tonal-a20)',
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
                <h3 style={{ margin: 0, color: 'var(--clr-neutral-a0)' }}>
          � MIDI Export ({keyName} {mode})
        </h3>
        <span style={{ color: 'var(--clr-neutral-a30)' }}>{expanded ? '▼' : '▶'}</span>
      </div>
      
      {expanded && (
        <div style={{ marginTop: '16px' }}>
          {/* Scale */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#4b5563' }}>
              Scale: {keyName} {mode}
            </h4>
            <p style={{ 
              margin: '0 0 12px 0', 
              fontSize: '13px', 
              color: '#6b7280',
              lineHeight: '1.4'
            }}>
              The complete {mode} scale in {keyName}, spanning two octaves. Perfect for melodic composition, 
              improvisation practice, and understanding the tonal foundation of your track.
            </p>
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
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={() => handlePlay('scale', midiData.scale, 'scale')}
                disabled={playing === 'scale'}
                style={{
                  background: playing === 'scale' ? '#ef4444' : '#10b981',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {playing === 'scale' ? '⏸️' : '▶️'} 
                {playing === 'scale' ? 'Playing...' : 'Preview'}
              </button>
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
                Download MIDI
              </button>
            </div>
          </div>
          
          {/* Chords */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#4b5563' }}>Chords</h4>
            <p style={{ 
              margin: '0 0 12px 0', 
              fontSize: '13px', 
              color: '#6b7280',
              lineHeight: '1.4'
            }}>
              Essential triads and seventh chords built from the {keyName} {mode} scale. 
              Each chord is perfectly voiced and ready to use in your DAW for harmonic progressions and accompaniment.
            </p>
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
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => handlePlay('chord', chord, `chord-${index}`)}
                      disabled={playing === `chord-${index}`}
                      style={{
                        background: playing === `chord-${index}` ? '#ef4444' : '#10b981',
                        color: 'white',
                        border: 'none',
                        padding: '3px 6px',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '9px'
                      }}
                    >
                      {playing === `chord-${index}` ? '⏸️' : '▶️'}
                    </button>
                    <button
                      onClick={() => handleDownload(chord.midiData, `${keyName}_${mode}_${chord.name.replace(/[°#]/g, '')}.mid`)}
                      style={{
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        padding: '3px 6px',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '9px'
                      }}
                    >
                      ⬇️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Common Progressions */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#4b5563' }}>Common Progressions</h4>
            <p style={{ 
              margin: '0 0 12px 0', 
              fontSize: '13px', 
              color: '#6b7280',
              lineHeight: '1.4'
            }}>
              Popular chord progressions in {keyName} {mode}, including classics like vi-IV-I-V and ii-V-I. 
              These sequences are tempo-matched to your track's {midiData?.bpm || 'detected'} BPM and ready for instant inspiration.
              Perfect for songwriting, remixing, or creating harmonic backing tracks.
            </p>
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
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => handlePlay('progression', progression, `progression-${index}`)}
                      disabled={playing === `progression-${index}`}
                      style={{
                        background: playing === `progression-${index}` ? '#ef4444' : '#10b981',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      {playing === `progression-${index}` ? '⏸️ Playing' : '▶️ Preview'}
                    </button>
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
                </div>
              ))}
            </div>
          </div>
          
          {/* Arpeggiated Grooves */}
          <div>
            <h4 style={{ margin: '0 0 8px 0', color: '#4b5563' }}>🎼 Arpeggiated Grooves</h4>
            <p style={{ 
              margin: '0 0 12px 0', 
              fontSize: '13px', 
              color: '#6b7280',
              lineHeight: '1.4'
            }}>
              Rhythmic arpeggiated patterns synchronized to your track's {midiData?.bpm || 'detected'} BPM. 
              These groove templates include ascending, descending, and complex patterns perfect for electronic music, 
              ambient textures, or adding melodic movement to your compositions. Each pattern is designed to loop seamlessly.
            </p>
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
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => handlePlay('arpeggio', arpeggio, `arpeggio-${index}`)}
                      disabled={playing === `arpeggio-${index}`}
                      style={{
                        background: playing === `arpeggio-${index}` ? '#ef4444' : '#10b981',
                        color: 'white',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '10px'
                      }}
                    >
                      {playing === `arpeggio-${index}` ? '⏸️' : '▶️'}
                    </button>
                    <button
                      onClick={() => handleDownload(arpeggio.midiData, `${keyName}_${mode}_${arpeggio.name.replace(/[^a-zA-Z0-9]/g, '_')}.mid`)}
                      style={{
                        background: '#f59e0b',
                        color: 'white',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '10px'
                      }}
                    >
                      ⬇️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}