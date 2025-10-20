import React from 'react'

const ORDER = ['C','G','D','A','E','B','F#','C#','G#','D#','A#','F']

export default function CircleOfFifths({ keyName, mode }) {
  const size = 240
  const center = size/2
  const radius = 90
  const slice = (2 * Math.PI) / ORDER.length
  const activeIdx = ORDER.indexOf(keyName)

  return (
    <svg width={size} height={size} role="img" aria-label="Circle of Fifths">
      <circle cx={center} cy={center} r={radius+28} fill="var(--clr-surface-a20)" stroke="var(--clr-surface-a30)" strokeWidth="2" />
      {ORDER.map((k, i) => {
        const angle = i * slice - Math.PI/2
        const x = center + Math.cos(angle) * radius
        const y = center + Math.sin(angle) * radius
        const isActive = i === activeIdx
        return (
          <g key={k}>
            <circle cx={x} cy={y} r={isActive ? 20 : 16} 
              fill={isActive ? 'var(--clr-primary-a0)' : 'var(--clr-surface-a30)'} 
              stroke={isActive ? 'var(--clr-primary-a30)' : 'var(--clr-surface-a40)'} 
              strokeWidth={isActive ? 2 : 1} 
            />
            <text x={x} y={y} textAnchor="middle" dominantBaseline="middle"
              style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14, fontWeight: isActive ? 700 : 500,
                       fill: isActive ? 'var(--clr-light-a0)' : 'var(--clr-light-a0)' }}>
              {k}
            </text>
          </g>
        )
      })}
      <text x={center} y={center-8} textAnchor="middle" style={{ fontFamily: 'Inter, system-ui', fontSize: 20, fontWeight: 700, fill: 'var(--clr-light-a0)' }}>
        {keyName || '—'}
      </text>
      <text x={center} y={center+14} textAnchor="middle" style={{ fontFamily: 'Inter, system-ui', fontSize: 12, fill: 'var(--clr-primary-a30)' }}>
        {mode ? mode.toUpperCase() : ''}
      </text>
    </svg>
  )
}