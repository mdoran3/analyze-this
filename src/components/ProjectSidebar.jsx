import React, { useState, useEffect } from 'react'
import { useAuth } from '../auth/AuthContext'
import '../sidebar-responsive.css'

export default function ProjectSidebar({ onProjectLoad, currentProject, refreshTrigger, onSignOut }) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [collapsed, setCollapsed] = useState(true)
  const { user, isAuthenticated, signOut } = useAuth()
  
  // Use custom signOut handler if provided, otherwise use default
  const handleSignOut = onSignOut || signOut

  const playClickSound = (isOpening) => {
    try {
      const soundFile = isOpening 
        ? '/sounds/hsb_kit2_click.wav'      // Opening pane
        : '/sounds/TSP_CADM_Hohner_click.wav'  // Closing pane
      
      const audio = new Audio(soundFile)
      audio.volume = 0.5 // Adjust volume as needed
      audio.play().catch(err => {
        // Audio play failed - graceful fallback
      })
    } catch (err) {
      // Audio loading failed
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadProjects()
    } else {
      setProjects([])
    }
  }, [isAuthenticated])

  // Refresh projects when refreshTrigger changes
  useEffect(() => {
    if (isAuthenticated && refreshTrigger) {
      loadProjects()
    }
  }, [refreshTrigger, isAuthenticated])

  const loadProjects = async () => {
    setLoading(true)
    setError('')
    
    try {
      // Dynamically import db only when needed
      const { db } = await import('../api/supabase')
      const { data, error } = await db.getProjects()
      if (error) {
        setError('Failed to load projects')
      } else {
        setProjects(data || [])
      }
    } catch (err) {
      setError('Supabase not configured - running in demo mode')
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  const handleProjectClick = (project) => {
    onProjectLoad(project)
  }

  const handleDeleteProject = async (projectId, projectName) => {
    if (!window.confirm(`Are you sure you want to delete "${projectName}"?`)) {
      return
    }

    try {
      // Dynamically import db only when needed
      const { db } = await import('../api/supabase')
      const { error } = await db.deleteProject(projectId)
      if (error) {
        alert('Failed to delete project')
      } else {
        // Update local state
        setProjects(projects.filter(p => p.id !== projectId))
      }
    } catch (err) {
      alert('Supabase not configured - cannot delete projects')
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (!isAuthenticated) {
    return (
      <div style={{
        width: collapsed ? '60px' : '190px',
        height: '100vh',
        background: 'var(--clr-surface-a20)',
        borderRight: '1px solid var(--clr-surface-a30)',
        padding: '16px',
        boxSizing: 'border-box',
        transition: 'width 0.3s ease'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: collapsed ? 'center' : 'space-between',
          marginBottom: '16px'
        }}>
          {!collapsed && (
            <h3 style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
              Projects
            </h3>
          )}
          <button
            onClick={() => {
              playClickSound(collapsed) // collapsed = true means we're opening, false means closing
              setCollapsed(!collapsed)
            }}
            className="collapse-button"
            style={{
              background: 'linear-gradient(135deg, var(--clr-primary-a0), #ff6b35)',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              color: 'white',
              fontSize: '16px',
              padding: '8px',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2), 0 0 8px rgba(213, 93, 32, 0.3)',
              outline: '2px solid var(--clr-primary-a20)',
              outlineOffset: '2px'
            }}
          >
            <span style={{
              transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
              transition: 'transform 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: '1'
            }}>
              ››
            </span>
          </button>
        </div>
        
        {!collapsed && (
          <p style={{ color: 'var(--clr-neutral-a40)', fontSize: '12px', textAlign: 'center' }}>
            Sign in to save and manage your projects
          </p>
        )}
      </div>
    )
  }

  return (
    <div style={{
      width: collapsed ? '60px' : '190px',
      height: '100vh',
      background: 'var(--clr-surface-a20)',
      borderRight: '1px solid var(--clr-surface-a30)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.3s ease'
    }}>
      {/* Header */}
      <div style={{ 
        padding: '16px',
        borderBottom: '1px solid var(--clr-surface-a30)'
      }}>
        <div className="sidebar-header-row">
          {!collapsed && (
            <h3 className="sidebar-title">My Projects</h3>
          )}
          <button
            onClick={() => {
              playClickSound(collapsed)
              setCollapsed(!collapsed)
            }}
            className="collapse-button"
          >
            <span className="collapse-arrow" style={{
              transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)'
            }}>››</span>
          </button>
        </div>
        
        {!collapsed && user && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between'
          }}>
            <span style={{ color: 'var(--clr-neutral-a30)', fontSize: '12px' }}>
              {user.email}
            </span>
            <button
              onClick={handleSignOut}
              style={{
                background: 'none',
                border: 'none',
                color: '#6b7280',
                cursor: 'pointer',
                fontSize: '11px',
                textDecoration: 'underline'
              }}
            >
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* Projects List */}
      {!collapsed && (
        <div style={{ 
          flex: 1, 
          overflow: 'auto',
          padding: '16px'
        }}>
          {loading && (
            <p style={{ color: 'var(--clr-neutral-a30)', fontSize: '14px', textAlign: 'center' }}>
              Loading projects...
            </p>
          )}

          {error && (
            <p style={{ color: 'var(--clr-danger-a0)', fontSize: '14px', textAlign: 'center' }}>
              {error}
            </p>
          )}

          {!loading && !error && projects.length === 0 && (
            <p style={{ color: 'var(--clr-neutral-a40)', fontSize: '12px', textAlign: 'center' }}>
              No projects yet. Analyze a song to create your first project!
            </p>
          )}

          {projects.map((project) => (
            <div
              key={project.id}
              style={{
                background: currentProject?.id === project.id ? 'var(--clr-primary-a60)' : 'var(--clr-surface-a0)',
                border: '1px solid var(--clr-surface-a20)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onClick={() => handleProjectClick(project)}
              onMouseEnter={(e) => {
                if (currentProject?.id !== project.id) {
                  e.target.style.background = 'var(--clr-surface-a10)'
                }
              }}
              onMouseLeave={(e) => {
                if (currentProject?.id !== project.id) {
                  e.target.style.background = 'var(--clr-surface-a0)'
                }
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '4px'
              }}>
                <h4 style={{ 
                  margin: 0, 
                  fontSize: '14px', 
                  fontWeight: '500',
                  color: 'var(--clr-neutral-a0)',
                  lineHeight: '1.3'
                }}>
                  {project.name}
                </h4>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteProject(project.id, project.name)
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--clr-danger-a0)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    padding: '2px'
                  }}
                  title="Delete project"
                >
                  ×
                </button>
              </div>
              
              <div style={{ fontSize: '12px', color: 'var(--clr-neutral-a30)' }}>
                {project.analysis_results?.key} {project.analysis_results?.mode}
                {project.analysis_results?.bpm > 0 && (
                  <span> • {project.analysis_results.bpm} BPM</span>
                )}
              </div>
              
              <div style={{ 
                fontSize: '11px', 
                color: '#9ca3af',
                marginTop: '4px'
              }}>
                {formatDate(project.updated_at)}
              </div>
            </div>
          ))}
        </div>
      )}
      
      <style>{`
        button.collapse-button {
          /* Outline now handled in inline styles */
        }
        
        button.collapse-button:hover {
          transform: scale(1.1) rotate(5deg) !important;
          box-shadow: 
            0 4px 8px rgba(0, 0, 0, 0.3),
            0 0 12px rgba(213, 93, 32, 0.5) !important;
          outline: none !important;
        }
        
        button.collapse-button:active {
          transform: scale(0.9) !important;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2) !important;
          outline: none !important;
        }
        
        button.collapse-button:focus {
          outline: none !important;
          outline-offset: 0 !important;
        }
        
        button.collapse-button:focus-visible {
          outline: none !important;
          outline-offset: 0 !important;
        }
        
        button.collapse-button::-moz-focus-inner {
          border: 0 !important;
          outline: none !important;
        }
      `}</style>
    </div>
  )
}