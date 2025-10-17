// Simple MIDI preview player using Web Audio API
class MidiPreviewPlayer {
  constructor() {
    this.audioContext = null
    this.gainNode = null
    this.currentNotes = []
    this.isInitialized = false
  }

  async initialize() {
    if (this.isInitialized) return

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
      this.gainNode = this.audioContext.createGain()
      this.gainNode.connect(this.audioContext.destination)
      this.gainNode.gain.value = 0.3 // Set volume to 30%
      this.isInitialized = true
    } catch (error) {
      console.error('Failed to initialize audio context:', error)
      throw error
    }
  }

  // Convert MIDI note number to frequency
  midiToFrequency(midiNote) {
    return 440 * Math.pow(2, (midiNote - 69) / 12)
  }

  // Play a single note
  playNote(midiNote, duration = 1.0, startTime = 0) {
    if (!this.isInitialized) return

    const frequency = this.midiToFrequency(midiNote)
    const oscillator = this.audioContext.createOscillator()
    const noteGain = this.audioContext.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime + startTime)
    
    // ADSR envelope
    noteGain.gain.setValueAtTime(0, this.audioContext.currentTime + startTime)
    noteGain.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + startTime + 0.1) // Attack
    noteGain.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + startTime + 0.2) // Decay
    noteGain.gain.setValueAtTime(0.2, this.audioContext.currentTime + startTime + duration - 0.1) // Sustain
    noteGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + startTime + duration) // Release

    oscillator.connect(noteGain)
    noteGain.connect(this.gainNode)

    oscillator.start(this.audioContext.currentTime + startTime)
    oscillator.stop(this.audioContext.currentTime + startTime + duration)

    return oscillator
  }

  // Play a chord (multiple notes simultaneously)
  playChord(midiNotes, duration = 2.0) {
    if (!this.isInitialized) return

    this.stopAll()
    
    const oscillators = midiNotes.map(note => this.playNote(note, duration))
    this.currentNotes = oscillators
    
    return oscillators
  }

  // Play a scale (notes in sequence)
  playScale(midiNotes, noteDuration = 0.5) {
    if (!this.isInitialized) return

    this.stopAll()
    
    const oscillators = midiNotes.slice(0, 8).map((note, index) => 
      this.playNote(note, noteDuration, index * noteDuration * 0.8)
    )
    this.currentNotes = oscillators
    
    return oscillators
  }

  // Play a progression (chords in sequence)
  playProgression(chords, chordDuration = 1.5) {
    if (!this.isInitialized) return

    this.stopAll()
    
    const oscillators = []
    chords.forEach((chord, chordIndex) => {
      chord.notes.forEach(note => {
        const osc = this.playNote(note, chordDuration, chordIndex * chordDuration)
        oscillators.push(osc)
      })
    })
    
    this.currentNotes = oscillators
    return oscillators
  }

  // Play arpeggiated pattern
  playArpeggio(arpeggioData, bpm = 120) {
    if (!this.isInitialized) return

    this.stopAll()
    
    const beatDuration = 60 / bpm // Duration of one beat in seconds
    const ticksPerBeat = 480 // Standard MIDI ticks per beat
    const oscillators = []
    
    // Extract notes from the arpeggio data structure
    const notes = arpeggioData.notes || arpeggioData.pattern || []
    
    if (!notes || notes.length === 0) {
      console.warn('No notes found in arpeggio data')
      return []
    }
    
    // Calculate the total duration of one pattern iteration
    let maxTime = 0
    notes.forEach(noteData => {
      if (typeof noteData === 'object' && noteData.startTime !== undefined) {
        const timeInSeconds = (noteData.startTime / ticksPerBeat) * beatDuration
        maxTime = Math.max(maxTime, timeInSeconds)
      }
    })
    
    // If we couldn't determine pattern length, estimate it
    if (maxTime === 0) {
      maxTime = notes.length * (beatDuration / 4) // Fallback: quarter note per note
    }
    
    const patternDuration = maxTime + beatDuration // Add one beat padding
    
    // Play the pattern once
    notes.forEach((noteData, index) => {
      let midiNote, startTime
      
      if (typeof noteData === 'object' && noteData.note !== undefined) {
        // Handle complex arpeggio structure with timing
        midiNote = noteData.note
        startTime = (noteData.startTime / ticksPerBeat) * beatDuration
      } else if (typeof noteData === 'number') {
        // Handle simple array of MIDI notes
        midiNote = noteData
        startTime = index * (beatDuration / 4) // Quarter note timing
      } else {
        console.warn('Invalid note data:', noteData)
        return // Skip invalid data
      }
      
      if (midiNote > 0) { // 0 = rest
        const noteDuration = beatDuration / 4 // Consistent short note duration
        const osc = this.playNote(midiNote, noteDuration, startTime)
        oscillators.push(osc)
      }
    })
    
    this.currentNotes = oscillators
    return oscillators
  }

  // Stop all currently playing notes
  stopAll() {
    this.currentNotes.forEach(oscillator => {
      try {
        oscillator.stop()
      } catch (e) {
        // Oscillator might already be stopped
      }
    })
    this.currentNotes = []
  }

  // Clean up
  dispose() {
    this.stopAll()
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close()
    }
    this.isInitialized = false
  }
}

export default MidiPreviewPlayer