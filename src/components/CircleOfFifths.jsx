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
      <circle cx={center} cy={center} r={radius+28} fill="#fff" stroke="#ddd" />
      {ORDER.map((k, i) => {
        const angle = i * slice - Math.PI/2
        const x = center + Math.cos(angle) * radius
        const y = center + Math.sin(angle) * radius
        const isActive = i === activeIdx
        return (
          <g key={k}>
            <text x={x} y={y} textAnchor="middle" dominantBaseline="middle"
              style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, fontWeight: isActive ? 700 : 400,
                       fill: isActive ? '#000' : '#555' }}>
              {k}
            </text>
          </g>
        )
      })}
      <text x={center} y={center-8} textAnchor="middle" style={{ fontFamily: 'system-ui', fontSize: 18, fontWeight: 700 }}>
        {keyName || '—'}
      </text>
      <text x={center} y={center+14} textAnchor="middle" style={{ fontFamily: 'system-ui', fontSize: 12, fill: '#666' }}>
        {mode ? mode.toUpperCase() : ''}
      </text>
    </svg>
  )
}