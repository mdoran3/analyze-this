# Supabase Setup Instructions

## 🚀 Quick Setup Guide

### 1. Create Supabase Project
1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up/in with GitHub or email
4. Click "New Project"
5. Fill in:
   - Project name: `music-analyzer` (or your choice)
   - Database password: Generate a strong password
   - Region: Choose closest to you
6. Click "Create new project" (takes ~2 minutes)

### 2. Get Your Credentials
1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like: `https://xyz.supabase.co`)
   - **anon public key** (long string starting with `eyJ...`)

### 3. Update Environment Variables
1. Open `.env` file in your project root
2. Replace the placeholder values:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 4. Setup Database Schema
1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy and paste the contents of `database-schema.sql`
4. Click "Run" to execute the schema

### 5. Configure Authentication
1. Go to **Authentication** → **Settings**
2. Under "Site URL", add: `http://localhost:5174`
3. Under "Redirect URLs", add: `http://localhost:5174`

### 6. Test Your Setup
1. Start your development server: `npm run dev`
2. Analyze a song
3. Try to save it - you should see the save prompt
4. Create an account and save a project
5. Check your Supabase dashboard - you should see the data!

## 🔧 Troubleshooting

### Common Issues:

**"Invalid API key"**
- Double-check your `.env` file has correct values
- Make sure you copied the **anon/public** key, not the secret key
- Restart your dev server after changing `.env`

**"Database connection failed"**
- Check if your Project URL is correct
- Make sure your database schema was created successfully

**"Authentication not working"**
- Verify Site URL and Redirect URLs in Auth settings
- Check browser console for specific error messages

**"Cannot save projects"**
- Make sure you ran the database schema SQL
- Check Row Level Security policies are created

## 📊 What You Get

After setup, your app will have:
- ✅ **User Authentication** (signup/signin)
- ✅ **Project Saving** (analysis results + MIDI files)
- ✅ **Project Management** (sidebar with all your projects)
- ✅ **Data Persistence** (everything saved to cloud database)
- ✅ **File Storage** (audio uploads and MIDI exports)

## 🎯 Next Steps

Once basic functionality works:
1. **Customize the UI** - Add your own styling
2. **Add project sharing** - Generate public links
3. **Bulk operations** - Delete multiple projects
4. **Export features** - Download all project data
5. **Analytics** - Track usage patterns

## 💾 Data Structure

Your projects are stored with this structure:
```json
{
  "id": "uuid",
  "name": "My Song Analysis",
  "user_id": "uuid",
  "analysis_results": {
    "key": "C",
    "mode": "major",
    "bpm": 128,
    "keyConfidence": 0.85,
    "bpmConfidence": 0.92
  },
  "midi_exports": {},
  "created_at": "2025-10-17T...",
  "updated_at": "2025-10-17T..."
}
```

Enjoy your new music analysis app with user accounts! 🎵