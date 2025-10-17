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

  // Actual analysis — KeyExtractor on the full buffer
  const result = analyzeWithKeyExtractor(pcm, sampleRate)

  // 100% once we have a result
  self.postMessage({ type: MSG.PROGRESS, payload: { percent: 100 } })

  return result
}

// --- Analysis using the high-level KeyExtractor (robust) ---
function analyzeWithKeyExtractor(pcm, sampleRate) {
  const signal = e.arrayToVector(pcm)
  const out = e.KeyExtractor(signal, sampleRate)
  const key   = out.key || 'C'
  const mode  = out.scale || 'major'
  const conf  = typeof out.strength === 'number' ? out.strength : 0
  
  // BPM Detection with multiple fallback methods
  let bpm = null
  let bpmConfidence = 0
  let detectionMethod = null
  
  try {
    // Method 1: Try RhythmExtractor if available
    if (typeof e.RhythmExtractor === 'function') {
      const rhythmOut = e.RhythmExtractor(signal, sampleRate)
      if (rhythmOut && rhythmOut.bpm && rhythmOut.bpm > 60 && rhythmOut.bpm < 200) {
        bpm = Math.round(rhythmOut.bpm)
        bpmConfidence = rhythmOut.confidence || 0.9
        detectionMethod = 'Essentia RhythmExtractor'
      }
    }
  } catch (essError) {
    console.warn('Essentia RhythmExtractor failed:', essError)
  }
  
  // Method 2: Autocorrelation-based BPM detection (more reliable for most music)
  if (!bpm) {
    try {
      const autoBpm = detectBPMAutocorrelation(pcm, sampleRate)
      if (autoBpm) {
        bpm = autoBpm
        bpmConfidence = 0.75
        detectionMethod = 'Autocorrelation Analysis'
      }
    } catch (autoError) {
      console.warn('Autocorrelation BPM detection failed:', autoError)
    }
  }
  
  // Method 3: Onset detection fallback
  if (!bpm) {
    try {
      const onsetBpm = detectBPMOnsets(pcm, sampleRate)
      if (onsetBpm) {
        bpm = onsetBpm
        bpmConfidence = 0.6
        detectionMethod = 'Onset Detection'
      }
    } catch (onsetError) {
      console.warn('Onset BPM detection failed:', onsetError)
    }
  }
  
  // Cross-validate with other methods if we found something
  if (bpm && bpmConfidence < 0.8) {
    try {
      const validationBpm = validateBPMWithOtherMethods(pcm, sampleRate, bpm)
      if (validationBpm && Math.abs(validationBpm - bpm) <= 3) {
        bpmConfidence = Math.min(0.9, bpmConfidence + 0.2)
      } else if (validationBpm && Math.abs(validationBpm - bpm * 2) <= 3) {
        // Detected half-time
        bpm = validationBpm
        bpmConfidence = Math.min(0.85, bpmConfidence + 0.15)
      } else if (validationBpm && Math.abs(validationBpm - bpm / 2) <= 3) {
        // Detected double-time
        bpm = validationBpm
        bpmConfidence = Math.min(0.85, bpmConfidence + 0.15)
      }
    } catch (validationError) {
      console.warn('BPM validation failed:', validationError)
    }
  }
  
  return { 
    key, 
    mode, 
    confidence: conf,
    bpm: bpm || null,
    bpmConfidence: bpmConfidence
  }
}

// Autocorrelation-based BPM detection
function detectBPMAutocorrelation(pcm, sampleRate) {
  const windowSize = Math.floor(sampleRate * 6) // 6 second windows for better accuracy
  const hopSize = Math.floor(windowSize / 4) // More overlap
  let bestBpm = null
  let maxCorrelation = 0
  
  // Analyze multiple windows and find consensus
  const bpmCandidates = []
  
  for (let i = 0; i < pcm.length - windowSize; i += hopSize) {
    const window = pcm.slice(i, i + windowSize)
    
    // High-pass filter to emphasize beat frequencies
    const filtered = highPassFilter(window, sampleRate, 20) // Remove sub-bass
    
    // Calculate onset strength function
    const frameSize = 2048
    const onsetStrength = []
    
    for (let j = 0; j < filtered.length - frameSize; j += frameSize / 4) {
      const frame = filtered.slice(j, j + frameSize)
      
      // Calculate spectral centroid as onset indicator
      let weightedSum = 0
      let magnitudeSum = 0
      
      for (let k = 1; k < frame.length / 2; k++) {
        const magnitude = Math.abs(frame[k])
        weightedSum += k * magnitude
        magnitudeSum += magnitude
      }
      
      const centroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0
      onsetStrength.push(centroid)
    }
    
    // Autocorrelation on onset strength
    const windowBpm = findBestBPMFromOnsets(onsetStrength, sampleRate / (frameSize / 4))
    if (windowBpm) {
      bpmCandidates.push(windowBpm)
    }
  }
  
  // Find most consistent BPM across windows
  if (bpmCandidates.length === 0) return null
  
  // Cluster similar BPMs
  const clusters = clusterBPMs(bpmCandidates)
  const bestCluster = clusters.reduce((best, cluster) => 
    cluster.length > best.length ? cluster : best
  )
  
  if (bestCluster.length >= Math.max(2, bpmCandidates.length * 0.3)) {
    return Math.round(bestCluster.reduce((sum, bpm) => sum + bpm, 0) / bestCluster.length)
  }
  
  return null
}

// Simple high-pass filter
function highPassFilter(signal, sampleRate, cutoff) {
  const rc = 1.0 / (cutoff * 2 * Math.PI)
  const dt = 1.0 / sampleRate
  const alpha = rc / (rc + dt)
  
  const filtered = new Array(signal.length)
  filtered[0] = signal[0]
  
  for (let i = 1; i < signal.length; i++) {
    filtered[i] = alpha * (filtered[i-1] + signal[i] - signal[i-1])
  }
  
  return filtered
}

// Find BPM from onset strength using autocorrelation
function findBestBPMFromOnsets(onsets, effectiveSampleRate) {
  if (onsets.length < 32) return null
  
  let bestBpm = null
  let maxCorrelation = 0
  
  // Test BPM range more thoroughly
  for (let bpm = 60; bpm <= 200; bpm += 0.5) {
    const samplesPerBeat = (60 / bpm) * effectiveSampleRate
    
    if (samplesPerBeat < 2 || samplesPerBeat >= onsets.length / 3) continue
    
    let correlation = 0
    let count = 0
    
    // Test multiple beat periods
    for (let lag = Math.floor(samplesPerBeat); lag <= Math.floor(samplesPerBeat * 4); lag += Math.floor(samplesPerBeat)) {
      if (lag >= onsets.length) break
      
      for (let i = 0; i < onsets.length - lag; i++) {
        correlation += onsets[i] * onsets[i + lag]
        count++
      }
    }
    
    if (count > 0) {
      correlation /= count
      
      if (correlation > maxCorrelation) {
        maxCorrelation = correlation
        bestBpm = bpm
      }
    }
  }
  
  return maxCorrelation > 0.05 ? bestBpm : null
}

// Cross-validate BPM using a simpler energy-based method
function validateBPMWithOtherMethods(pcm, sampleRate, candidateBpm) {
  const windowSize = Math.floor(sampleRate * 8) // 8 second window
  if (pcm.length < windowSize) return null
  
  const window = pcm.slice(0, windowSize)
  
  // Calculate RMS energy in small frames
  const frameSize = 1024
  const energies = []
  
  for (let i = 0; i < window.length - frameSize; i += frameSize / 4) {
    const frame = window.slice(i, i + frameSize)
    const rms = Math.sqrt(frame.reduce((sum, x) => sum + x * x, 0) / frame.length)
    energies.push(rms)
  }
  
  // Test candidate BPM and nearby values
  const testBpms = [
    candidateBpm - 2, candidateBpm - 1, candidateBpm, 
    candidateBpm + 1, candidateBpm + 2,
    candidateBpm / 2, candidateBpm * 2 // Test half/double time
  ].filter(bpm => bpm >= 60 && bpm <= 200)
  
  let bestBpm = null
  let bestScore = 0
  
  for (const testBpm of testBpms) {
    const beatsPerSecond = testBpm / 60
    const framesPerBeat = (sampleRate / (frameSize / 4)) / beatsPerSecond
    
    if (framesPerBeat < 2 || framesPerBeat >= energies.length / 4) continue
    
    // Calculate periodicity score
    let score = 0
    let count = 0
    
    for (let i = 0; i < energies.length - framesPerBeat; i++) {
      for (let beat = 1; beat <= 4; beat++) {
        const beatIndex = i + Math.floor(framesPerBeat * beat)
        if (beatIndex < energies.length) {
          score += energies[i] * energies[beatIndex]
          count++
        }
      }
    }
    
    if (count > 0) {
      score /= count
      if (score > bestScore) {
        bestScore = score
        bestBpm = testBpm
      }
    }
  }
  
  return bestScore > 0.01 ? Math.round(bestBpm) : null
}

// Cluster similar BPM values
function clusterBPMs(bpms) {
  const tolerance = 3 // BPM tolerance for clustering
  const clusters = []
  
  for (const bpm of bpms) {
    let addedToCluster = false
    
    for (const cluster of clusters) {
      const clusterMean = cluster.reduce((sum, b) => sum + b, 0) / cluster.length
      if (Math.abs(bpm - clusterMean) <= tolerance) {
        cluster.push(bpm)
        addedToCluster = true
        break
      }
    }
    
    if (!addedToCluster) {
      clusters.push([bpm])
    }
  }
  
  return clusters
}

// Onset-based BPM detection
function detectBPMOnsets(pcm, sampleRate) {
  const frameSize = 2048
  const hopSize = frameSize / 4
  const onsets = []
  
  // Improved onset detection using spectral flux with adaptive threshold
  let prevSpectrum = new Array(frameSize / 2).fill(0)
  const fluxHistory = []
  
  for (let i = 0; i < pcm.length - frameSize; i += hopSize) {
    const frame = pcm.slice(i, i + frameSize)
    
    // Apply window function (Hann window)
    for (let j = 0; j < frameSize; j++) {
      frame[j] *= 0.5 * (1 - Math.cos(2 * Math.PI * j / (frameSize - 1)))
    }
    
    // FFT approximation using DFT
    const spectrum = new Array(frameSize / 2).fill(0)
    for (let k = 0; k < frameSize / 2; k++) {
      let real = 0, imag = 0
      for (let n = 0; n < frameSize; n++) {
        const angle = 2 * Math.PI * k * n / frameSize
        real += frame[n] * Math.cos(angle)
        imag += frame[n] * Math.sin(angle)
      }
      spectrum[k] = Math.sqrt(real * real + imag * imag)
    }
    
    // Calculate spectral flux (positive changes only)
    let flux = 0
    for (let k = 1; k < spectrum.length; k++) { // Skip DC component
      const diff = spectrum[k] - prevSpectrum[k]
      if (diff > 0) flux += diff
    }
    
    fluxHistory.push(flux)
    
    // Adaptive threshold: median of recent flux values
    if (fluxHistory.length > 10) {
      const recentFlux = fluxHistory.slice(-10).sort((a, b) => a - b)
      const threshold = recentFlux[Math.floor(recentFlux.length / 2)] * 1.5
      
      if (flux > threshold && flux > 0.1) {
        onsets.push(i / sampleRate)
      }
    }
    
    prevSpectrum = spectrum
  }
  
  // Analyze inter-onset intervals with better statistical analysis
  if (onsets.length < 8) return null
  
  const intervals = []
  for (let i = 1; i < onsets.length; i++) {
    const interval = onsets[i] - onsets[i-1]
    if (interval >= 0.25 && interval <= 2.0) { // 30-240 BPM range
      intervals.push(interval)
    }
  }
  
  if (intervals.length < 4) return null
  
  // Convert intervals to BPM and find clusters
  const bpmCandidates = intervals.map(interval => 60 / interval)
  const validBpms = bpmCandidates.filter(bpm => bpm >= 60 && bpm <= 200)
  
  if (validBpms.length < 4) return null
  
  // Also check for half-time and double-time patterns
  const allBpms = [...validBpms]
  validBpms.forEach(bpm => {
    if (bpm <= 100) allBpms.push(bpm * 2) // Check double-time
    if (bpm >= 120) allBpms.push(bpm / 2) // Check half-time
  })
  
  // Find the most consistent BPM using histogram approach
  const bpmClusters = clusterBPMs(allBpms.filter(bpm => bpm >= 60 && bpm <= 200))
  const bestCluster = bpmClusters.reduce((best, cluster) => 
    cluster.length > best.length ? cluster : best
  )
  
  if (bestCluster.length >= Math.max(3, validBpms.length * 0.25)) {
    const avgBpm = bestCluster.reduce((sum, bpm) => sum + bpm, 0) / bestCluster.length
    return Math.round(avgBpm)
  }
  
  return null
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