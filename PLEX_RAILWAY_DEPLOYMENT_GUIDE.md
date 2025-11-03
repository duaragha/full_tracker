# Plex Webhook Deployment Guide - Railway

## 🔄 Local Dev vs Production

### Local Development (Current Setup)
**Uses**: ngrok tunnel
- ngrok creates a temporary public URL (e.g., `https://abc123.ngrok.io`)
- Points to your localhost:3000
- Plex webhooks go through ngrok → your local machine
- **Purpose**: Test webhooks while developing

### Production (Railway)
**Uses**: Railway's public URL
- Railway gives you a permanent URL (e.g., `https://your-app.railway.app`)
- No ngrok needed!
- Plex webhooks go directly to Railway → your deployed app
- **Purpose**: Production use

---

## 📋 Deployment Checklist

### Step 1: Deploy to Railway

1. **Push your code** (including the Plex webhook fix):
   ```bash
   git add lib/services/plex-webhook-service.ts
   git commit -m "Fix Plex webhook duplicate detection bug"
   git push
   ```

2. **Railway will automatically deploy** your changes

3. **Get your Railway URL**:
   - Go to your Railway dashboard
   - Find your app's public URL (e.g., `https://full-tracker-production.up.railway.app`)

### Step 2: Configure Environment Variables on Railway

In Railway dashboard → Environment Variables, ensure these are set:

```env
# Database (should already be set)
DATABASE_URL=<Railway automatically sets this>

# API Keys
NEXT_PUBLIC_RAWG_API_KEY=153cd02d204046b0aaf564689ad1301a
NEXT_PUBLIC_TMDB_API_KEY=98e6dfd40c55480146fa393e2aad48fe

# Tuya Smart Plug
TUYA_CLIENT_ID=jhwjmgcs4rejx84mvefg
TUYA_CLIENT_SECRET=98ff8cd0c5d84429a6de48dc68c0d795
TUYA_DEVICE_ID=eb0b16b0d95170efc6cz4h
TUYA_DATA_CENTER=us

# Plex
ENCRYPTION_KEY=5dcc7d742cfd671796bee02a0fcaa0fb2c077e7655cf80c0a76ced8335d61a95

# ⚠️ IMPORTANT: Update this with your Railway URL
PUBLIC_WEBHOOK_URL=https://your-app.railway.app

# PIN
INVENTORY_PIN=0324
```

### Step 3: Update Plex Webhook Configuration

**Option A: Via Plex Web UI** (Recommended)
1. Go to https://app.plex.tv/desktop
2. Settings → Account → Webhooks
3. Click "Add Webhook"
4. Enter your webhook URL:
   ```
   https://your-app.railway.app/api/plex/webhook?secret=d6ca3cf15659f98b23df109b3642d816ee19c3287548e24350fd7e32fc30b0c0
   ```
5. Save

**Option B: Via Your App Settings** (If implemented)
1. Go to your app: `https://your-app.railway.app/settings/plex`
2. The webhook URL should show your Railway URL
3. Copy it and add it to Plex webhooks

### Step 4: Get Your Webhook Secret

Your webhook secret is stored in the database. Retrieve it:

```bash
# Local query to get your secret
psql "$DATABASE_URL" -c "SELECT webhook_secret FROM plex_config WHERE user_id = 1;"
```

The secret should be:
```
d6ca3cf15659f98b23df109b3642d816ee19c3287548e24350fd7e32fc30b0c0
```

### Step 5: Test the Webhook

1. **Watch an episode** on Plex
2. **Check Railway logs**:
   - Railway dashboard → Deployments → View logs
   - Look for: `[Plex Webhook] Processed: { status: 'success' }`

3. **Verify in your app**:
   - Go to your TV Shows page
   - Episode should be marked as watched ✓

---

## 🔧 How ngrok Fits In

### For Local Development

**When to use ngrok**:
- Testing Plex webhooks locally
- Developing new webhook features
- Debugging webhook issues

**Setup**:
```bash
# Terminal 1: Start your dev server
npm run dev

# Terminal 2: Start ngrok
ngrok http 3000

# Copy the ngrok URL (e.g., https://abc123.ngrok.io)
# Add it to Plex webhooks:
https://abc123.ngrok.io/api/plex/webhook?secret=YOUR_SECRET
```

### For Production (Railway)

**ngrok is NOT needed!**
- Railway provides a permanent public URL
- Plex sends webhooks directly to Railway
- Much more reliable than ngrok (no timeouts, no tunnel disconnects)

---

## 🌐 URL Comparison

### Local Development
```
Plex → ngrok tunnel → localhost:3000
      (temporary)      (your machine)

Example URL:
https://abc123.ngrok.io/api/plex/webhook?secret=YOUR_SECRET
```

### Production (Railway)
```
Plex → Railway → Your deployed app
      (permanent) (cloud)

Example URL:
https://your-app.railway.app/api/plex/webhook?secret=YOUR_SECRET
```

---

## 🎯 Complete Webhook URLs

### Local (with ngrok)
```
https://YOUR-NGROK-URL.ngrok.io/api/plex/webhook?secret=d6ca3cf15659f98b23df109b3642d816ee19c3287548e24350fd7e32fc30b0c0
```

### Production (Railway)
```
https://your-app.railway.app/api/plex/webhook?secret=d6ca3cf15659f98b23df109b3642d816ee19c3287548e24350fd7e32fc30b0c0
```

⚠️ **Important**: Replace `your-app.railway.app` with your actual Railway URL

---

## 🐛 Troubleshooting

### Webhooks Not Working on Railway

1. **Check Railway logs**:
   ```
   Railway Dashboard → Deployments → Logs
   Look for: [Plex Webhook] or errors
   ```

2. **Verify webhook URL in Plex**:
   - Should be your Railway URL, not localhost or ngrok
   - Should include the secret parameter
   - Should be `https://` not `http://`

3. **Test the webhook endpoint**:
   ```bash
   curl https://your-app.railway.app/api/plex/webhook?secret=YOUR_SECRET \
     -X POST \
     -H "Content-Type: multipart/form-data" \
     -F 'payload={"event":"test"}'
   ```

4. **Check database connection**:
   ```bash
   # In Railway logs, look for database connection errors
   # Make sure DATABASE_URL is set correctly
   ```

### Switching Between Local and Production

You can have **both** webhooks configured in Plex:
- Local (ngrok): For development
- Production (Railway): For actual use

Just add both URLs as separate webhooks in Plex settings!

---

## ✅ Final Checklist

Before going live:

- [ ] Code deployed to Railway with webhook fix
- [ ] `PUBLIC_WEBHOOK_URL` env var set to Railway URL
- [ ] All other env vars configured on Railway
- [ ] Webhook URL added to Plex (with correct secret)
- [ ] Test by watching an episode
- [ ] Verify episode marked as watched in your app
- [ ] Check Railway logs for any errors
- [ ] Remove/disable ngrok webhook from Plex (optional)

---

## 📊 Monitoring

### Check Webhook Logs

Via Railway logs:
```
[Plex Webhook] Processed: { status: 'success', action: 'marked_watched' }
```

Via database query:
```sql
SELECT event_type, plex_title, plex_season, plex_episode,
       status, action_taken, created_at
FROM plex_webhook_logs
ORDER BY created_at DESC
LIMIT 20;
```

### Success Indicators

✅ **Working correctly**:
- `status: 'success', action: 'marked_watched'`
- Episodes show as watched in your app
- Railway logs show no errors

❌ **Issues**:
- `status: 'failed'` or `status: 'duplicate'` (when shouldn't be)
- Episodes not updating
- 401/403 errors in logs (check secret)
- 500 errors (check database connection)

---

## 🚀 Summary

1. **Local Dev**: Use ngrok for testing
2. **Production**: Use Railway URL (no ngrok needed)
3. **Update**: Configure Railway URL in Plex webhooks
4. **Monitor**: Check Railway logs and database

Your Plex integration will work seamlessly on Railway! 🎉
