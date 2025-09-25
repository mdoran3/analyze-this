// // Decode an audio File to mono Float32Array + sampleRate using Web Audio API
// export async function decodeToMonoPCM(file) {
//   const arrayBuf = await file.arrayBuffer()
//   const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 })
//   const audioBuf = await audioCtx.decodeAudioData(arrayBuf)
//   const { numberOfChannels, length, sampleRate } = audioBuf

//   // Downmix to mono
//   const tmp = new Float32Array(length)
//   const ch0 = new Float32Array(length)
//   audioBuf.copyFromChannel(ch0, 0)
//   for (let i = 0; i < length; i++) tmp[i] = ch0[i]

//   if (numberOfChannels > 1) {
//     for (let ch = 1; ch < numberOfChannels; ch++) {
//       const c = new Float32Array(length)
//       audioBuf.copyFromChannel(c, ch)
//       for (let i = 0; i < length; i++) tmp[i] += c[i]
//     }
//     for (let i = 0; i < length; i++) tmp[i] /= numberOfChannels
//   }

//   // Limit analysis window for speed
//   const MAX_SECONDS = 30 // you can raise to 60/90 later
//   const maxLen = Math.min(tmp.length, Math.floor(MAX_SECONDS * sampleRate))
//   return { pcm: tmp.slice(0, maxLen), sampleRate }
// }

// Decode an audio File to mono Float32Array + sampleRate using Web Audio API
export async function decodeToMonoPCM(file) {
  const arrayBuf = await file.arrayBuffer()
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 })
  const audioBuf = await audioCtx.decodeAudioData(arrayBuf)
  const { numberOfChannels, length, sampleRate } = audioBuf

  // Downmix to mono
  const tmp = new Float32Array(length)
  const ch0 = new Float32Array(length)
  audioBuf.copyFromChannel(ch0, 0)
  for (let i = 0; i < length; i++) tmp[i] = ch0[i]

  if (numberOfChannels > 1) {
    for (let ch = 1; ch < numberOfChannels; ch++) {
      const c = new Float32Array(length)
      audioBuf.copyFromChannel(c, ch)
      for (let i = 0; i < length; i++) tmp[i] += c[i]
    }
    for (let i = 0; i < length; i++) tmp[i] /= numberOfChannels
  }

  // Limit analysis window for speed
  const MAX_SECONDS = 30 // raise to 60/90 later if desired
  const maxLen = Math.min(tmp.length, Math.floor(MAX_SECONDS * sampleRate))
  return { pcm: tmp.slice(0, maxLen), sampleRate }
}