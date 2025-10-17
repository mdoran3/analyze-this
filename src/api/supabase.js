import { createClient } from '@supabase/supabase-js'

// Supabase configuration
// These will be replaced with your actual Supabase project credentials
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

// Check if Supabase is properly configured
const isSupabaseConfigured = supabaseUrl !== 'https://placeholder.supabase.co' && supabaseAnonKey !== 'placeholder-key'

// Create Supabase client (or null if not configured)
export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
}) : null

// Auth helpers
export const auth = {
  signUp: async (email, password, profileData = {}) => {
    if (!supabase) throw new Error('Supabase not configured. Please set up your environment variables.')
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: profileData.firstName || '',
          username: profileData.username || ''
        }
      }
    })
    return { data, error }
  },

  signIn: async (email, password) => {
    if (!supabase) throw new Error('Supabase not configured. Please set up your environment variables.')
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },

  signOut: async () => {
    if (!supabase) throw new Error('Supabase not configured. Please set up your environment variables.')
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  getCurrentUser: () => {
    if (!supabase) return Promise.resolve({ data: { user: null } })
    return supabase.auth.getUser()
  },

  getSession: () => {
    if (!supabase) return Promise.resolve({ data: { session: null } })
    return supabase.auth.getSession()
  },

  setSession: (accessToken, refreshToken) => {
    if (!supabase) return Promise.resolve({ data: { user: null }, error: new Error('Supabase not configured') })
    return supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
  },

  onAuthStateChange: (callback) => {
    if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } }
    return supabase.auth.onAuthStateChange(callback)
  }
}

// Database helpers
export const db = {
  // Projects
  createProject: async (name, analysisResults) => {
    if (!supabase) throw new Error('Supabase not configured. Please set up your environment variables.')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('projects')
      .insert([
        {
          name,
          user_id: user.id,
          analysis_results: analysisResults,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single()

    return { data, error }
  },

  getProjects: async () => {
    if (!supabase) return { data: [], error: null }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: [], error: null }

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    return { data, error }
  },

  updateProject: async (projectId, updates) => {
    if (!supabase) throw new Error('Supabase not configured. Please set up your environment variables.')
    const { data, error } = await supabase
      .from('projects')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select()
      .single()

    return { data, error }
  },

  deleteProject: async (projectId) => {
    if (!supabase) throw new Error('Supabase not configured. Please set up your environment variables.')
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)

    return { error }
  },

  // MIDI file storage
  uploadMidiFile: async (file, projectId, fileName) => {
    if (!supabase) throw new Error('Supabase not configured. Please set up your environment variables.')
    const filePath = `midi/${projectId}/${fileName}`
    
    const { data, error } = await supabase.storage
      .from('project-files')
      .upload(filePath, file)

    if (error) return { data: null, error }

    // Get public URL
    const { data: publicURL } = supabase.storage
      .from('project-files')
      .getPublicUrl(filePath)

    return { data: { ...data, publicUrl: publicURL.publicUrl }, error: null }
  },

  // Audio file storage
  uploadAudioFile: async (file, projectId) => {
    if (!supabase) throw new Error('Supabase not configured. Please set up your environment variables.')
    const fileExt = file.name.split('.').pop()
    const fileName = `audio_${Date.now()}.${fileExt}`
    const filePath = `audio/${projectId}/${fileName}`
    
    const { data, error } = await supabase.storage
      .from('project-files')
      .upload(filePath, file)

    if (error) return { data: null, error }

    // Get public URL
    const { data: publicURL } = supabase.storage
      .from('project-files')
      .getPublicUrl(filePath)

    return { data: { ...data, publicUrl: publicURL.publicUrl }, error: null }
  }
}