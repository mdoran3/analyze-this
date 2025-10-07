/* global self */

// Local message enum (keep in worker to avoid ESM import issues here)
const MSG = { INIT:'INIT', READY:'READY', ANALYZE:'ANALYZE', RESULT:'RESULT', ERROR:'ERROR', PROGRESS:'PROGRESS' }

// Some Essentia web builds peek at document.currentScript; stub it in workers.
if (typeof document === 'undefined') {
  self.document = { currentScript: { src: '/essentia/essentia-wasm.web.js' } }
}

// Load the two web builds you copied to /public/essentia
// If you only copied the minified core, change the second path accordingly.
try {
  self.importScripts('/essentia/essentia-wasm.web.js', '/essentia/essentia.js-core.js')
} catch (e) {
  // We’ll surface this during INIT so it shows in the UI
}

let e = null  // Essentia instance

async function initEssentia() {
  if (typeof self.EssentiaWASM !== 'function') {
    throw new Error('EssentiaWASM not found. Check that /public/essentia/essentia-wasm.web.js loads.')
  }
  if (typeof self.Essentia === 'undefined') {
    throw new Error('Essentia core not found. Ensure essentia.js-core.js (or .min.js) is present and loaded.')
  }

  const Module = await self.EssentiaWASM({
    locateFile: (path) => `/essentia/${path}` // resolves "essentia-wasm.web.wasm"
  })

  const Ess = self.Essentia
  e = new Ess(Module)

  if (typeof e.KeyExtractor !== 'function') {
    throw new Error('KeyExtractor not found in Essentia build.')
  }
  // Note: RhythmExtractor availability will be checked during analysis
}

// --- Lightweight progress pre-pass, then run KeyExtractor once ---
const sleep = (ms) => new Promise(res => setTimeout(res, ms))

async function analyzeWithProgress(pcm, sampleRate) {
  // Pre-pass: cheap iteration to give the UI progress feedback
  const total = pcm.length
  const chunk = Math.max(1, Math.floor(sampleRate * 0.5)) // ~0.5s chunks
  let processed = 0
  let lastPct = -1

  // Report up to 80% during pre-pass
  while (processed < total) {
    processed = Math.min(processed + chunk, total)
    const pct = Math.floor((processed / total) * 80)
    if (pct !== lastPct) {
      self.postMessage({ type: MSG.PROGRESS, payload: { percent: pct } })
      lastPct = pct
    }
    // Yield to event loop so messages flush
    await sleep(0)
  }

  // Actual analysis — KeyExtractor and RhythmExtractor on the full buffer
  const result = analyzeAudio(pcm, sampleRate)

  // 100% once we have a result
  self.postMessage({ type: MSG.PROGRESS, payload: { percent: 100 } })

  return result
}

// --- Analysis using both KeyExtractor and RhythmExtractor ---
function analyzeAudio(pcm, sampleRate) {
  const signal = e.arrayToVector(pcm)
  
  // Key detection (always available)
  const keyResult = e.KeyExtractor(signal, sampleRate)
  const key = keyResult.key || 'C'
  const mode = keyResult.scale || 'major'
  const keyConfidence = typeof keyResult.strength === 'number' ? keyResult.strength : 0
  
  // BPM detection with fallback
  let bpm = 0
  let bpmConfidence = 0
  
  console.log('Attempting BPM detection...')
  console.log('RhythmExtractor available:', typeof e.RhythmExtractor === 'function')
  
  try {
    if (typeof e.RhythmExtractor === 'function') {
      console.log('Using RhythmExtractor...')
      const rhythmResult = e.RhythmExtractor(signal, sampleRate)
      console.log('RhythmExtractor result:', rhythmResult)
      bpm = rhythmResult.bpm || 0
      bpmConfidence = typeof rhythmResult.confidence === 'number' ? rhythmResult.confidence : 0
      console.log('Extracted BPM:', bpm, 'Confidence:', bpmConfidence)
    } else {
      console.warn('RhythmExtractor not available in this Essentia build')
    }
  } catch (error) {
    console.warn('BPM detection failed, falling back to alternative method:', error.message || error)
    
    // Fallback: Simple onset-based BPM detection
    try {
      console.log('Trying fallback BPM detection...')
      const fallbackBpm = detectBpmFallback(pcm, sampleRate)
      console.log('Fallback result:', fallbackBpm)
      bpm = fallbackBpm.bpm
      bpmConfidence = fallbackBpm.confidence
    } catch (fallbackError) {
      console.warn('Fallback BPM detection also failed:', fallbackError.message || fallbackError)
      bpm = 0
      bpmConfidence = 0
    }
  }
  
  return { 
    key, 
    mode, 
    keyConfidence,
    bpm: Math.round(bpm), 
    bpmConfidence 
  }
}

// --- Fallback BPM detection using multiple methods ---
function detectBpmFallback(pcm, sampleRate) {
  try {
    console.log('Available Essentia functions:', Object.keys(e).filter(key => typeof e[key] === 'function').sort())
    
    // Method 1: Try BeatTracker algorithms
    const beatTrackers = [
      'BeatTrackerDegara',
      'BeatTrackerMultiFeature', 
      'RhythmExtractor2013',
      'PercivalBpmEstimator',
      'BeatsLoudness'
    ]
    
    for (const tracker of beatTrackers) {
      if (typeof e[tracker] === 'function') {
        console.log(`Trying ${tracker}...`)
        try {
          const signal = e.arrayToVector(pcm)
          const result = e[tracker](signal, sampleRate)
          console.log(`${tracker} result:`, result)
          
          if (result && typeof result === 'object') {
            if (result.bpm && result.bpm > 60 && result.bpm < 200) {
              return { bpm: result.bpm, confidence: 0.7 }
            }
            if (result.beats && result.beats.length > 1) {
              const bpm = calculateBpmFromBeats(result.beats)
              if (bpm > 60 && bpm < 200) {
                return { bpm, confidence: 0.6 }
              }
            }
          } else if (typeof result === 'number' && result > 60 && result < 200) {
            return { bpm: result, confidence: 0.6 }
          }
        } catch (err) {
          console.warn(`${tracker} failed:`, err.message)
        }
      }
    }
    
    // Method 2: Try onset detection
    if (typeof e.OnsetDetection === 'function') {
      console.log('Trying OnsetDetection...')
      try {
        const signal = e.arrayToVector(pcm)
        const onsets = e.OnsetDetection(signal, sampleRate)
        console.log('OnsetDetection result:', onsets)
        
        if (onsets && onsets.length > 1) {
          const bpm = calculateBpmFromOnsets(onsets, sampleRate)
          if (bpm > 60 && bpm < 200) {
            return { bpm, confidence: 0.5 }
          }
        }
      } catch (err) {
        console.warn('OnsetDetection failed:', err.message)
      }
    }
    
    // Method 3: Simple autocorrelation-based detection
    console.log('Trying simple autocorrelation...')
    const bpm = simpleAutocorrelationBpm(pcm, sampleRate)
    if (bpm > 60 && bpm < 200) {
      return { bpm, confidence: 0.4 }
    }
    
    console.log('All fallback methods failed or returned invalid BPM')
    return { bpm: 0, confidence: 0 }
    
  } catch (error) {
    console.warn('All fallback BPM methods failed:', error.message || error)
    return { bpm: 0, confidence: 0 }
  }
}

// Helper function to calculate BPM from beat times
function calculateBpmFromBeats(beats) {
  if (!beats || beats.length < 2) return 0
  
  const intervals = []
  for (let i = 1; i < beats.length; i++) {
    intervals.push(beats[i] - beats[i-1])
  }
  
  if (intervals.length === 0) return 0
  
  // Calculate median interval to avoid outliers
  intervals.sort((a, b) => a - b)
  const medianInterval = intervals[Math.floor(intervals.length / 2)]
  
  return 60 / medianInterval
}

// Helper function to calculate BPM from onset times
function calculateBpmFromOnsets(onsets, sampleRate) {
  if (!onsets || onsets.length < 2) return 0
  
  // Convert sample indices to time
  const onsetTimes = onsets.map(onset => onset / sampleRate)
  return calculateBpmFromBeats(onsetTimes)
}

// Simple autocorrelation-based BPM detection
function simpleAutocorrelationBpm(pcm, sampleRate) {
  try {
    // Downsample for efficiency
    const downsample = 4
    const step = Math.floor(pcm.length / downsample)
    const downsampled = []
    
    for (let i = 0; i < pcm.length; i += step) {
      downsampled.push(pcm[i])
    }
    
    const newSampleRate = sampleRate / step
    
    // Find tempo between 60-200 BPM
    let maxCorr = 0
    let bestBpm = 0
    
    for (let bpm = 60; bpm <= 200; bpm += 2) {
      const samplesPerBeat = Math.floor(newSampleRate * 60 / bpm)
      if (samplesPerBeat >= downsampled.length / 4) continue
      
      let correlation = 0
      let count = 0
      
      for (let i = 0; i < downsampled.length - samplesPerBeat; i++) {
        correlation += downsampled[i] * downsampled[i + samplesPerBeat]
        count++
      }
      
      if (count > 0) {
        correlation /= count
        if (correlation > maxCorr) {
          maxCorr = correlation
          bestBpm = bpm
        }
      }
    }
    
    return bestBpm
  } catch (error) {
    console.warn('Simple autocorrelation failed:', error.message)
    return 0
  }
}

// --- Legacy function for backward compatibility ---
function analyzeWithKeyExtractor(pcm, sampleRate) {
  const signal = e.arrayToVector(pcm)
  const out = e.KeyExtractor(signal, sampleRate)
  const key   = out.key || 'C'
  const mode  = out.scale || 'major'
  const conf  = typeof out.strength === 'number' ? out.strength : 0
  return { key, mode, confidence: conf }
}

// --- Worker message loop ---
self.onmessage = async (evt) => {
  const msg = evt.data
  try {
    if (msg.type === MSG.INIT) {
      try {
        await initEssentia()
        self.postMessage({ type: MSG.READY })
      } catch (err) {
        self.postMessage({ type: MSG.ERROR, error: String(err && err.message || err) })
      }
      return
    }

    if (msg.type === MSG.ANALYZE) {
      if (!e) throw new Error('Essentia not initialized')
      const { sampleRate, pcm } = msg
      try {
        const payload = await analyzeWithProgress(pcm, sampleRate)
        self.postMessage({ type: MSG.RESULT, payload })
      } catch (inner) {
        self.postMessage({ type: MSG.ERROR, error: 'Analysis failed: ' + String(inner && inner.message || inner) })
      }
      return
    }
  } catch (err) {
    self.postMessage({ type: MSG.ERROR, error: String(err && err.message || err) })
  }
}