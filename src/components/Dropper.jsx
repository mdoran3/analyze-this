import React from 'react'
import { useDropzone } from 'react-dropzone'

export default function Dropper({ onFile }) {
  const onDrop = React.useCallback((acceptedFiles) => {
    if (acceptedFiles?.length) onFile(acceptedFiles[0])
  }, [onFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'audio/*': ['.mp3', '.wav', '.m4a', '.flac', '.aac', '.ogg'] },
    multiple: false,
    onDrop
  })

  return (
    <div
      {...getRootProps()}
      style={{
        border: '2px dashed #888', borderRadius: 12, padding: 24,
        textAlign: 'center', cursor: 'pointer', background: isDragActive ? '#f0f6ff' : '#fafafa'
      }}
    >
      <input {...getInputProps()} />
      {isDragActive ? (
        <p>Drop the audio file here…</p>
      ) : (
        <p>Drag & drop an audio file here, or click to browse</p>
      )}
      <small>MP3, WAV, M4A, FLAC, AAC, OGG</small>
    </div>
  )
}