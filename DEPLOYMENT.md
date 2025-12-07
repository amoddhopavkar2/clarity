# Clarity Todo - Deployment Guide

This guide walks you through deploying Clarity Todo with:
- **Frontend**: Netlify
- **Backend**: Railway
- **Database + Auth**: Supabase

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [Git](https://git-scm.com/)
- Accounts on:
  - [Supabase](https://supabase.com/) (free tier available)
  - [Railway](https://railway.app/) (free tier with $5 credit)
  - [Netlify](https://netlify.com/) (free tier available)
  - [Google Cloud Console](https://console.cloud.google.com/) (for OAuth)

---

## Step 1: Supabase Setup

### 1.1 Create a Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Click "New Project"
3. Fill in:
   - **Name**: `clarity-todo`
   - **Database Password**: (save this securely)
   - **Region**: Choose closest to your users
4. Click "Create new project" and wait for setup

### 1.2 Create Database Tables

1. Go to **SQL Editor** in the Supabase dashboard
2. Copy the contents of `supabase-schema.sql` from this repo
3. Paste and click "Run"
4. Verify the `tasks` table appears in **Table Editor**

### 1.3 Configure Google OAuth

#### In Google Cloud Console:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Navigate to **APIs & Services > OAuth consent screen**
   - Choose "External" user type
   - Fill in app name, support email
   - Add scopes: `email`, `profile`, `openid`
   - Add test users (for development)
4. Go to **APIs & Services > Credentials**
5. Click **Create Credentials > OAuth client ID**
6. Select "Web application"
7. Add **Authorized redirect URIs**:
   ```
   https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback
   ```
   (Replace `YOUR_SUPABASE_PROJECT` with your actual project reference)
8. Copy the **Client ID** and **Client Secret**

#### In Supabase:

1. Go to **Authentication > Providers**
2. Find **Google** and enable it
3. Paste your **Client ID** and **Client Secret**
4. Save

### 1.4 Configure Auth Settings

1. Go to **Authentication > URL Configuration**
2. Set **Site URL** to your Netlify URL (we'll update this after deploying):
   ```
   https://your-app.netlify.app
   ```
3. Add **Redirect URLs**:
   ```
   https://your-app.netlify.app
   http://localhost:5173
   ```

### 1.5 Get Your API Keys

1. Go to **Settings > API**
2. Copy these values (you'll need them later):
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbG...`
   - **service_role key**: `eyJhbG...` (keep this secret!)

---

## Step 2: Railway Backend Deployment

### 2.1 Prepare the Server

1. Make sure the `server/` directory has all required files
2. Push your code to a Git repository (GitHub, GitLab, etc.)

### 2.2 Deploy to Railway

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **New Project > Deploy from GitHub repo**
3. Select your repository
4. Railway will detect the project structure

### 2.3 Configure Root Directory

1. In the Railway project settings:
2. Set **Root Directory** to: `server`
3. This tells Railway to only deploy the server folder

### 2.4 Add Environment Variables

In Railway project settings, add these variables:

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service_role key |
| `CLIENT_URL` | `https://your-app.netlify.app` (update after Netlify deploy) |
| `PORT` | `3001` |
| `NODE_ENV` | `production` |

### 2.5 Get Your Railway URL

1. Go to **Settings > Domains**
2. Generate a domain or add custom domain
3. Copy the URL (e.g., `https://clarity-api.up.railway.app`)

---

## Step 3: Netlify Frontend Deployment

### 3.1 Deploy to Netlify

1. Go to [Netlify Dashboard](https://app.netlify.com/)
2. Click **Add new site > Import an existing project**
3. Connect your Git repository
4. Configure build settings:
   - **Base directory**: `client`
   - **Build command**: `npm run build`
   - **Publish directory**: `client/dist`

### 3.2 Add Environment Variables

In Netlify: **Site settings > Build & deploy > Environment**

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your anon public key |
| `VITE_API_URL` | Your Railway URL (e.g., `https://clarity-api.up.railway.app`) |

### 3.3 Trigger Redeploy

1. After adding environment variables, trigger a new deploy
2. Go to **Deploys > Trigger deploy > Deploy site**

### 3.4 Get Your Netlify URL

1. Copy your site URL (e.g., `https://clarity-todo.netlify.app`)
2. You can add a custom domain in **Domain settings**

---

## Step 4: Final Configuration

### 4.1 Update URLs

Now that you have all URLs, update them:

**In Railway (Backend):**
- Update `CLIENT_URL` to your actual Netlify URL

**In Supabase:**
1. Go to **Authentication > URL Configuration**
2. Update **Site URL** to your Netlify URL
3. Make sure your Netlify URL is in **Redirect URLs**

**In Google Cloud Console:**
1. Go to your OAuth 2.0 credentials
2. Add your Netlify URL to **Authorized JavaScript origins**
3. Add your Netlify URL to **Authorized redirect URIs** (if using pop-up flow)

---

## Step 5: Test Your Deployment

1. Open your Netlify URL in a browser
2. Click "Continue with Google"
3. Sign in with your Google account
4. Create, edit, and delete tasks
5. Sign out and sign back in - tasks should persist
6. Try from a different device - tasks should sync

---

## Local Development

### Setup

```bash
# Install all dependencies
npm run install:all

# Create environment files
cp client/.env.example client/.env
cp server/.env.example server/.env
```

### Configure `.env` files

**client/.env:**
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3001
```

**server/.env:**
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CLIENT_URL=http://localhost:5173
PORT=3001
NODE_ENV=development
```

### Run Development Servers

```bash
# Run both client and server
npm run dev

# Or run separately:
npm run dev:client  # Frontend at http://localhost:5173
npm run dev:server  # Backend at http://localhost:3001
```

---

## Environment Variables Reference

### Client (Frontend)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://abc123.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key | `eyJhbG...` |
| `VITE_API_URL` | Backend API URL | `https://api.example.com` |

### Server (Backend)

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL | `https://abc123.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (secret) | `eyJhbG...` |
| `CLIENT_URL` | Frontend URL for CORS | `https://app.example.com` |
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment mode | `production` |

---

## Troubleshooting

### "Failed to sign in" Error

1. Check Google OAuth credentials in Supabase
2. Verify redirect URLs in Google Cloud Console
3. Ensure Site URL is set correctly in Supabase Auth settings

### CORS Errors

1. Verify `CLIENT_URL` in Railway matches your Netlify URL exactly
2. Check that the URL doesn't have a trailing slash
3. Redeploy backend after changing `CLIENT_URL`

### Tasks Not Loading

1. Check browser console for API errors
2. Verify `VITE_API_URL` points to your Railway backend
3. Ensure Railway backend is running (check health endpoint: `/health`)

### Database Errors

1. Verify `SUPABASE_SERVICE_ROLE_KEY` is correct (not the anon key)
2. Check that the database schema was applied correctly
3. Look at Supabase logs for detailed error messages

---

## Security Notes

- **Never** expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code
- The anon key is safe to use in frontend - it's meant to be public
- All database operations are protected by Row Level Security (RLS)
- Users can only access their own tasks

---

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│    Netlify      │────▶│    Railway      │────▶│   Supabase      │
│   (Frontend)    │     │   (Backend)     │     │   (Database)    │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                                               │
        │                                               │
        └───────────── Auth Flow ───────────────────────┘
                    (Supabase Auth)
```

- **Frontend (Netlify)**: Serves the static site, handles Google OAuth via Supabase
- **Backend (Railway)**: Express API that validates JWT tokens and manages tasks
- **Database (Supabase)**: PostgreSQL database with RLS for data security
