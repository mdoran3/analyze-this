import React, { useState, useEffect } from 'react'
import { useAuth } from '../auth/AuthContext'

export default function ProjectSidebar({ onProjectLoad, currentProject, refreshTrigger }) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const { user, isAuthenticated, signOut } = useAuth()

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
        console.error('Load projects error:', error)
      } else {
        setProjects(data || [])
      }
    } catch (err) {
      setError('Supabase not configured - running in demo mode')
      setProjects([])
      console.error('Load projects error:', err)
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
        console.error('Delete project error:', error)
      } else {
        setProjects(projects.filter(p => p.id !== projectId))
      }
    } catch (err) {
      alert('Supabase not configured - cannot delete projects')
      console.error('Delete project error:', err)
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
        width: collapsed ? '50px' : '280px',
        height: '100vh',
        background: '#f9fafb',
        borderRight: '1px solid #e5e7eb',
        padding: '16px',
        boxSizing: 'border-box',
        transition: 'width 0.3s ease'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          {!collapsed && (
            <h3 style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
              Projects
            </h3>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6b7280',
              fontSize: '16px'
            }}
          >
            {collapsed ? '▶' : '◀'}
          </button>
        </div>
        
        {!collapsed && (
          <p style={{ color: '#9ca3af', fontSize: '12px', textAlign: 'center' }}>
            Sign in to save and manage your projects
          </p>
        )}
      </div>
    )
  }

  return (
    <div style={{
      width: collapsed ? '50px' : '280px',
      height: '100vh',
      background: '#f9fafb',
      borderRight: '1px solid #e5e7eb',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.3s ease'
    }}>
      {/* Header */}
      <div style={{ 
        padding: '16px',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: collapsed ? 0 : '12px'
        }}>
          {!collapsed && (
            <h3 style={{ margin: 0, color: '#374151', fontSize: '16px' }}>
              My Projects
            </h3>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6b7280',
              fontSize: '16px'
            }}
          >
            {collapsed ? '▶' : '◀'}
          </button>
        </div>
        
        {!collapsed && user && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between'
          }}>
            <span style={{ color: '#6b7280', fontSize: '12px' }}>
              {user.email}
            </span>
            <button
              onClick={signOut}
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
            <p style={{ color: '#6b7280', fontSize: '14px', textAlign: 'center' }}>
              Loading projects...
            </p>
          )}

          {error && (
            <p style={{ color: '#ef4444', fontSize: '14px', textAlign: 'center' }}>
              {error}
            </p>
          )}

          {!loading && !error && projects.length === 0 && (
            <p style={{ color: '#9ca3af', fontSize: '12px', textAlign: 'center' }}>
              No projects yet. Analyze a song to create your first project!
            </p>
          )}

          {projects.map((project) => (
            <div
              key={project.id}
              style={{
                background: currentProject?.id === project.id ? '#dbeafe' : 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onClick={() => handleProjectClick(project)}
              onMouseEnter={(e) => {
                if (currentProject?.id !== project.id) {
                  e.target.style.background = '#f3f4f6'
                }
              }}
              onMouseLeave={(e) => {
                if (currentProject?.id !== project.id) {
                  e.target.style.background = 'white'
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
                  color: '#374151',
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
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: '12px',
                    padding: '2px'
                  }}
                  title="Delete project"
                >
                  ×
                </button>
              </div>
              
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
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
    </div>
  )
}

// Add this function to your existing App.jsx to refresh projects list when a new project is saved
export const refreshProjects = (setProjects) => {
  db.getProjects().then(({ data }) => {
    if (data) setProjects(data)
  })
}