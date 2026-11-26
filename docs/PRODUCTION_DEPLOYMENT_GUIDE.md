# StrayAid — Production Deployment Guide

This guide details how StrayAid is configured across **Vercel** (Frontend), **Render** (Backend), and **Supabase** (Database & Storage).

---

## 1. Vercel (Frontend Client)

### Project Configuration
- **Repository**: `kshshrma/StrayAid`
- **Framework Preset**: `Vite`
- **Root Directory**: `client`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### Environment Variables
Configure these under **Settings -> Environment Variables** in Vercel:

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Render backend public URL (no trailing slash) | `https://your-service.onrender.com` |
| `VITE_SOCKET_URL` | Render backend public URL for Socket.IO | `https://your-service.onrender.com` |
| `VITE_SUPABASE_URL` | Supabase project API URL | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase public anon key | `eyJhbGciOi...` |

> **IMPORTANT**: Whenever you update environment variables in Vercel, you must go to **Deployments -> ... -> Redeploy** (without cache) for Vite to bake them into the compiled JavaScript bundle.

---

## 2. Render (Backend Web Service)

### Service Settings
- **Type**: Web Service
- **Root Directory**: `server`
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start` (runs `tsx src/index.ts`)

### Environment Variables
Configure these under **Environment** in Render:

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase Project URL |
| `SUPABASE_ANON_KEY` | Your Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `GEMINI_API_KEY` | Google Gemini API key for animal classification |
| `PORT` | Set automatically by Render (default 5000) |

> **NOTE on Free Tier**: Render's free tier sleeps after 15 minutes of inactivity. When a request arrives, it takes ~30-50 seconds to spin up. StrayAid's frontend includes automatic fallback handling so emergency reports are never lost while the backend wakes up.

---

## 3. Supabase (Database, Auth, Storage)

### Row Level Security (RLS)
Execute the script located in `docs/SUPABASE_RLS_POLICIES.sql` in the **Supabase SQL Editor** to grant appropriate SELECT/INSERT permissions and prevent HTTP 403 Forbidden errors.

### Auth Redirects
In **Authentication -> URL Configuration**:
- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: `https://your-app.vercel.app/**`
