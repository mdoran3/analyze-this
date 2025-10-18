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

  const [isHovered, setIsHovered] = React.useState(false)

  return (
    <div
      {...getRootProps()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        border: `3px dashed ${isDragActive ? 'var(--clr-primary-a0)' : 'transparent'}`, 
        borderRadius: '24px', 
        padding: 32,
        textAlign: 'center', 
        cursor: 'pointer', 
        background: isDragActive ? 'rgba(213, 93, 32, 0.15)' : isHovered ? 'rgba(213, 93, 32, 0.05)' : 'transparent',
        transition: 'all 0.3s ease',
        boxShadow: isDragActive ? '0 12px 32px rgba(213, 93, 32, 0.4), inset 0 4px 8px rgba(213, 93, 32, 0.2)' : 
                   isHovered ? '0 8px 24px rgba(0, 0, 0, 0.8), 0 4px 12px rgba(213, 93, 32, 0.3)' : 'none',
        transform: isHovered && !isDragActive ? 'translateY(-2px) scale(1.02)' : isDragActive ? 'scale(0.98)' : 'scale(1)',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <input {...getInputProps()} />
      {isDragActive ? (
        <div style={{
          background: 'rgba(213, 93, 32, 0.2)',
          border: '3px dashed var(--clr-primary-a0)',
          borderRadius: '24px',
          padding: '24px 32px',
          boxShadow: '0 8px 24px rgba(213, 93, 32, 0.5)',
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
          <p style={{ color: 'var(--clr-primary-a0)', fontWeight: 600, fontSize: '18px', margin: 0 }}>
            Drop it right here!
          </p>
        </div>
      ) : null}
    </div>
  )
}