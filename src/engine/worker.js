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