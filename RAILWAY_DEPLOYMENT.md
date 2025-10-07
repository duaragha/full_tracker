# Railway Deployment Guide

This guide will walk you through deploying the Full Tracker app to Railway with PostgreSQL database.

## Prerequisites

1. A Railway account (sign up at https://railway.app)
2. GitHub account (for connecting repository)
3. Your RAWG API key

## Deployment Steps

### 1. Prepare Your Repository

Make sure all changes are committed and pushed to GitHub:

```bash
cd /home/ragha/dev/projects/full_tracker
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

### 2. Create Railway Project

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Authorize Railway to access your GitHub
5. Select the `full_tracker` repository

### 3. Add PostgreSQL Database

1. In your Railway project, click "New Service"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically provision a PostgreSQL database
4. The `DATABASE_URL` will be automatically added to your environment variables

### 4. Configure Environment Variables

In your Railway project settings, add the following environment variables:

1. Click on your web service
2. Go to "Variables" tab
3. Add these variables:

```
NEXT_PUBLIC_RAWG_API_KEY=153cd02d204046b0aaf564689ad1301a
DATABASE_URL=[automatically provided by Railway PostgreSQL]
```

**Note:** The `DATABASE_URL` should already be present if you added PostgreSQL. Don't overwrite it.

### 5. Configure Build Settings (Optional)

Railway should auto-detect Next.js. If needed, verify:

- **Build Command:** `npm run build`
- **Start Command:** `npm start`
- **Install Command:** `npm install`

### 6. Deploy

1. Railway will automatically deploy when you push to GitHub
2. Wait for the build to complete (2-5 minutes)
3. Once deployed, Railway will provide you with a public URL

### 7. Database Migration (For PostgreSQL Implementation)

**Currently**, the app uses localStorage (client-side). To use PostgreSQL:

You'll need to implement database migrations and API routes. This is prepared but not yet implemented.

For now, the app will deploy successfully with localStorage and all features will work.

## Future Database Implementation

To migrate from localStorage to PostgreSQL, you would need to:

1. Create database schema/migrations
2. Create API routes in `app/api/`:
   - `/api/games` - CRUD for games
   - `/api/books` - CRUD for books
3. Update store files to call API instead of localStorage
4. Run migrations on Railway database

## Current Deployment Status

✅ **Working Features:**
- Next.js app deploys successfully
- localStorage for data persistence (client-side)
- RAWG API for game search
- Open Library API for book search
- All UI components and functionality

⚠️ **Data Storage:**
- Currently using localStorage (data stored in user's browser)
- Data persists per browser/device
- To share data across devices, PostgreSQL implementation needed

## Deployment URL

After deployment, Railway will provide a URL like:
```
https://full-tracker-production.up.railway.app
```

Your app will be live at this URL!

## Updating the App

To deploy updates:

```bash
git add .
git commit -m "Your update message"
git push origin main
```

Railway will automatically redeploy on every push to main.

## Troubleshooting

### Build Fails
- Check Railway build logs
- Verify `package.json` has all dependencies
- Ensure Node version compatibility

### Environment Variables Not Working
- Make sure they start with `NEXT_PUBLIC_` for client-side access
- Redeploy after adding new variables

### Database Connection Issues
- Verify `DATABASE_URL` is set correctly
- Check PostgreSQL service is running
- Ensure database migrations have run

## Support

For Railway-specific issues, check:
- Railway Documentation: https://docs.railway.app
- Railway Discord: https://discord.gg/railway

For app-specific issues, refer to the main README.md
