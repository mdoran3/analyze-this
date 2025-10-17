// MIDI utilities for generating chords and scales based on detected key

// Note names to MIDI numbers (C4 = 60)
const NOTE_TO_MIDI = {
  'C': 60, 'C#': 61, 'Db': 61, 'D': 62, 'D#': 63, 'Eb': 63,
  'E': 64, 'F': 65, 'F#': 66, 'Gb': 66, 'G': 67, 'G#': 68, 'Ab': 68,
  'A': 69, 'A#': 70, 'Bb': 70, 'B': 71
}

// Major scale intervals (semitones from root)
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11]
// Natural minor scale intervals
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10]

// Roman numeral chord progressions
const MAJOR_CHORD_PROGRESSIONS = {
  'I': [0, 2, 4],      // Major
  'ii': [1, 3, 5],     // minor
  'iii': [2, 4, 6],    // minor
  'IV': [3, 5, 0],     // Major
  'V': [4, 6, 1],      // Major
  'vi': [5, 0, 2],     // minor
  'vii°': [6, 1, 3]    // diminished
}

const MINOR_CHORD_PROGRESSIONS = {
  'i': [0, 2, 4],      // minor
  'ii°': [1, 3, 5],    // diminished
  'III': [2, 4, 6],    // Major
  'iv': [3, 5, 0],     // minor
  'v': [4, 6, 1],      // minor (or V major)
  'VI': [5, 0, 2],     // Major
  'VII': [6, 1, 3]     // Major
}

/**
 * Get MIDI note number for a given note name and octave
 */
function getMidiNote(noteName, octave = 4) {
  const baseNote = NOTE_TO_MIDI[noteName]
  if (baseNote === undefined) return null
  return baseNote + (octave - 4) * 12
}

/**
 * Generate scale notes in MIDI format
 */
export function generateScale(keyName, mode = 'major', octaves = 2) {
  const rootNote = getMidiNote(keyName, 4)
  if (rootNote === null) return []
  
  const scaleIntervals = mode === 'major' ? MAJOR_SCALE : MINOR_SCALE
  const scale = []
  
  for (let octave = 0; octave < octaves; octave++) {
    for (const interval of scaleIntervals) {
      scale.push(rootNote + interval + (octave * 12))
    }
  }
  
  return scale
}

/**
 * Generate chord progressions in the given key
 */
export function generateChordProgression(keyName, mode = 'major') {
  const rootNote = getMidiNote(keyName, 4)
  if (rootNote === null) return []
  
  const scaleIntervals = mode === 'major' ? MAJOR_SCALE : MINOR_SCALE
  const chordProgressions = mode === 'major' ? MAJOR_CHORD_PROGRESSIONS : MINOR_CHORD_PROGRESSIONS
  
  const chords = []
  
  for (const [romanNumeral, chordIntervals] of Object.entries(chordProgressions)) {
    const chord = {
      name: romanNumeral,
      notes: chordIntervals.map(scaleIndex => 
        rootNote + scaleIntervals[scaleIndex % scaleIntervals.length] + 
        Math.floor(scaleIndex / scaleIntervals.length) * 12
      )
    }
    chords.push(chord)
  }
  
  return chords
}

/**
 * Generate common chord progressions
 */
export function generateCommonProgressions(keyName, mode = 'major') {
  const chords = generateChordProgression(keyName, mode)
  
  if (mode === 'major') {
    return {
      'I-V-vi-IV': [chords[0], chords[4], chords[5], chords[3]], // Very common pop progression
      'I-vi-IV-V': [chords[0], chords[5], chords[3], chords[4]], // Classic progression
      'vi-IV-I-V': [chords[5], chords[3], chords[0], chords[4]], // Relative minor start
      'I-IV-V-I': [chords[0], chords[3], chords[4], chords[0]]   // Basic cadence
    }
  } else {
    return {
      'i-VII-VI-VII': [chords[0], chords[6], chords[5], chords[6]], // Common minor progression
      'i-iv-V-i': [chords[0], chords[3], chords[4], chords[0]],     // Minor cadence
      'i-VI-VII-i': [chords[0], chords[5], chords[6], chords[0]],   // Another common one
      'i-v-iv-i': [chords[0], chords[4], chords[3], chords[0]]      // Minor variant
    }
  }
}

/**
 * Create a simple MIDI file data structure
 * This creates a basic Type 0 MIDI file with one track
 */
export function createMidiFile(notes, tempo = 120, duration = 480) {
  // MIDI file header
  const header = [
    0x4D, 0x54, 0x68, 0x64, // "MThd"
    0x00, 0x00, 0x00, 0x06, // Header length (6 bytes)
    0x00, 0x00,             // Type 0 (single track)
    0x00, 0x01,             // Number of tracks (1)
    0x01, 0xE0              // Ticks per quarter note (480)
  ]
  
  // Track events
  const events = []
  
  // Tempo event (120 BPM)
  const microsecondsPerBeat = Math.floor(60000000 / tempo)
  events.push(
    0x00,       // Delta time
    0xFF, 0x51, 0x03, // Tempo meta event
    (microsecondsPerBeat >> 16) & 0xFF,
    (microsecondsPerBeat >> 8) & 0xFF,
    microsecondsPerBeat & 0xFF
  )
  
  // Note events
  notes.forEach((note, index) => {
    const deltaTime = index === 0 ? 0 : duration
    
    // Note on
    events.push(
      ...variableLengthQuantity(deltaTime),
      0x90, note, 0x60 // Note on, velocity 96
    )
    
    // Note off
    events.push(
      ...variableLengthQuantity(duration),
      0x80, note, 0x40 // Note off, velocity 64
    )
  })
  
  // End of track
  events.push(0x00, 0xFF, 0x2F, 0x00)
  
  // Track header
  const trackHeader = [
    0x4D, 0x54, 0x72, 0x6B, // "MTrk"
    (events.length >> 24) & 0xFF,
    (events.length >> 16) & 0xFF,
    (events.length >> 8) & 0xFF,
    events.length & 0xFF
  ]
  
  return new Uint8Array([...header, ...trackHeader, ...events])
}

/**
 * Convert number to variable length quantity (MIDI format)
 */
function variableLengthQuantity(value) {
  const result = []
  result.unshift(value & 0x7F)
  
  while (value > 0x7F) {
    value >>= 7
    result.unshift((value & 0x7F) | 0x80)
  }
  
  return result
}

/**
 * Download MIDI file
 */
export function downloadMidiFile(midiData, filename = 'generated.mid') {
  const blob = new Blob([midiData], { type: 'audio/midi' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

/**
 * Generate arpeggiated groove patterns
 */
export function generateArpeggiatedGrooves(keyName, mode = 'major', bpm = 120) {
  const rootNote = getMidiNote(keyName, 4)
  if (rootNote === null) return []
  
  const scaleIntervals = mode === 'major' ? MAJOR_SCALE : MINOR_SCALE
  const scale = scaleIntervals.map(interval => rootNote + interval)
  
  // Generate different arpeggio patterns
  const patterns = {
    'Basic Triad Up': {
      pattern: [0, 2, 4, 2], // Root, 3rd, 5th, 3rd
      timing: [0, 240, 480, 720], // 16th note timing
      description: 'Simple ascending triad arpeggio'
    },
    'Basic Triad Down': {
      pattern: [4, 2, 0, 2], // 5th, 3rd, Root, 3rd
      timing: [0, 240, 480, 720],
      description: 'Simple descending triad arpeggio'
    },
    'Seventh Up': {
      pattern: [0, 2, 4, 6], // Root, 3rd, 5th, 7th
      timing: [0, 240, 480, 720],
      description: 'Ascending seventh chord arpeggio'
    },
    'Scale Run': {
      pattern: [0, 1, 2, 3, 4, 5, 6, 7], // Full scale
      timing: [0, 120, 240, 360, 480, 600, 720, 840], // 32nd notes
      description: 'Fast scale run'
    },
    'Alberti Bass': {
      pattern: [0, 4, 2, 4], // Root, 5th, 3rd, 5th
      timing: [0, 240, 480, 720],
      description: 'Classical Alberti bass pattern'
    },
    'Broken Chord': {
      pattern: [0, 2, 4, 0, 2, 4, 0, 4], // Extended broken chord
      timing: [0, 240, 480, 720, 960, 1200, 1440, 1680],
      description: 'Extended broken chord pattern'
    },
    'Ambient Cascade': {
      pattern: [0, 2, 4, 6, 4, 2], // Up and down with 7th
      timing: [0, 480, 960, 1440, 1920, 2400],
      description: 'Slow, ambient cascade'
    },
    'Jazz Walking': {
      pattern: [0, 2, 4, 1, 3, 5, 6, 4], // Jazz-style walking pattern
      timing: [0, 240, 480, 720, 960, 1200, 1440, 1680],
      description: 'Jazz walking bass style'
    }
  }
  
  const grooves = []
  
  for (const [name, config] of Object.entries(patterns)) {
    // Create pattern in multiple octaves and different chord positions
    const variations = [
      { name: `${name} (Root Position)`, baseChord: [0, 2, 4, 6], octave: 0 },
      { name: `${name} (First Inversion)`, baseChord: [2, 4, 0, 2], octave: 1 },
      { name: `${name} (Higher Octave)`, baseChord: [0, 2, 4, 6], octave: 1 }
    ]
    
    variations.forEach(variation => {
      const notes = []
      const events = []
      
      // Repeat pattern 4 times for a complete groove
      for (let repeat = 0; repeat < 4; repeat++) {
        config.pattern.forEach((scaleIndex, patternIndex) => {
          const actualIndex = Math.min(scaleIndex, scale.length - 1)
          const note = scale[actualIndex] + (variation.octave * 12)
          const startTime = repeat * 1920 + config.timing[patternIndex] // 1920 = 2 beats in ticks
          
          notes.push({ note, startTime, duration: 180 }) // Short notes for arpeggio feel
        })
      }
      
      grooves.push({
        name: variation.name,
        description: config.description,
        notes: notes,
        midiData: createArpeggioMidiFile(notes, bpm) // Use detected BPM
      })
    })
  }
  
  return grooves
}

/**
 * Create MIDI file specifically for arpeggiated patterns
 */
function createArpeggioMidiFile(noteEvents, tempo = 120) {
  // MIDI file header
  const header = [
    0x4D, 0x54, 0x68, 0x64, // "MThd"
    0x00, 0x00, 0x00, 0x06, // Header length (6 bytes)
    0x00, 0x00,             // Type 0 (single track)
    0x00, 0x01,             // Number of tracks (1)
    0x01, 0xE0              // Ticks per quarter note (480)
  ]
  
  // Track events
  const events = []
  
  // Tempo event
  const microsecondsPerBeat = Math.floor(60000000 / tempo)
  events.push(
    0x00,       // Delta time
    0xFF, 0x51, 0x03, // Tempo meta event
    (microsecondsPerBeat >> 16) & 0xFF,
    (microsecondsPerBeat >> 8) & 0xFF,
    microsecondsPerBeat & 0xFF
  )
  
  // Sort events by start time
  const sortedEvents = noteEvents
    .flatMap(noteEvent => [
      { type: 'noteOn', time: noteEvent.startTime, note: noteEvent.note },
      { type: 'noteOff', time: noteEvent.startTime + noteEvent.duration, note: noteEvent.note }
    ])
    .sort((a, b) => a.time - b.time)
  
  let currentTime = 0
  
  sortedEvents.forEach(event => {
    const deltaTime = event.time - currentTime
    currentTime = event.time
    
    if (event.type === 'noteOn') {
      events.push(
        ...variableLengthQuantity(deltaTime),
        0x90, event.note, 0x50 // Note on, velocity 80 (softer for arpeggios)
      )
    } else {
      events.push(
        ...variableLengthQuantity(deltaTime),
        0x80, event.note, 0x40 // Note off, velocity 64
      )
    }
  })
  
  // End of track
  events.push(0x00, 0xFF, 0x2F, 0x00)
  
  // Track header
  const trackHeader = [
    0x4D, 0x54, 0x72, 0x6B, // "MTrk"
    (events.length >> 24) & 0xFF,
    (events.length >> 16) & 0xFF,
    (events.length >> 8) & 0xFF,
    events.length & 0xFF
  ]
  
  return new Uint8Array([...header, ...trackHeader, ...events])
}
export function generateMidiForKey(keyName, mode = 'major', bpm = 120) {
  const scale = generateScale(keyName, mode, 2)
  const chords = generateChordProgression(keyName, mode)
  const progressions = generateCommonProgressions(keyName, mode)
  const arpeggios = generateArpeggiatedGrooves(keyName, mode, bpm)
  
  // Use detected BPM or default to 120 if not available
  const actualBpm = bpm && bpm > 60 && bpm < 200 ? bpm : 120
  
  return {
    scale: {
      notes: scale,
      midiData: createMidiFile(scale, actualBpm)
    },
    chords: chords.map(chord => ({
      ...chord,
      midiData: createMidiFile(chord.notes, actualBpm, 960) // Longer duration for chords
    })),
    progressions: Object.entries(progressions).map(([name, progression]) => ({
      name,
      chords: progression,
      midiData: createMidiFile(
        progression.flatMap(chord => chord.notes),
        actualBpm,
        1920 // Even longer for progressions
      )
    })),
    arpeggios,
    bpm: actualBpm // Include the BPM used for reference
  }
}