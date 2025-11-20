# Render.com Deployment Setup

## ⚠️ Critical: Add Persistent Disk FIRST

Render.com uses **ephemeral storage** by default - your data will be lost on every restart without a persistent disk!

## Step-by-Step Setup

### 1. Create Web Service

1. Go to [Render.com Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository: `media-code-now/ec-exhibits`
4. Configure:
   - **Name**: `ec-exhibits-server` (or your choice)
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (or Starter $7/month)

### 2. Add Environment Variables

Click **"Environment"** tab and add:

```bash
NODE_ENV=production
PORT=4000
```

**Optional** - If you DON'T want to add persistent disk:
```bash
DATA_STORAGE_DISABLED=true
```
(This disables persistence - data only in memory, lost on restart)

### 3. **CRITICAL: Add Persistent Disk**

⚠️ **Without this, you'll get `ENOENT` errors and lose all data!**

1. Click **"Disks"** tab (left sidebar)
2. Click **"Add Disk"**
3. Configure:
   - **Name**: `data-storage`
   - **Mount Path**: `/opt/render/project/src/server/data`
   - **Size**: Start with **1GB** (free tier) or more
4. Click **"Create Disk"**
5. Service will automatically redeploy

### 4. Deploy

1. Click **"Manual Deploy"** → **"Deploy latest commit"**
2. Wait for build to complete (~2-3 minutes)
3. Check logs for:
   ```
   [INFO] Created data directory: /opt/render/project/src/server/data
   [INFO] Data persistence module loaded
   ```

### 5. Verify Deployment

1. Click on your service URL (e.g., `https://ec-exhibits-server.onrender.com`)
2. Should see: `{"message":"EC Exhibits API Server"}`
3. Check logs - should see NO `ENOENT` errors
4. Create a test project via API or client
5. Restart service - data should persist

## Troubleshooting

### Still Getting ENOENT Errors?

**Check:**
1. ✅ Is persistent disk added?
2. ✅ Is mount path exactly: `/opt/render/project/src/server/data`?
3. ✅ Did service redeploy after adding disk?
4. ✅ Check "Disks" tab shows disk as "Mounted"

### Disk Not Mounting?

1. Delete the disk
2. Wait 1 minute
3. Add it again with exact mount path
4. Trigger manual deploy

### Data Still Lost on Restart?

**Without Persistent Disk:**
- Data lives only in memory
- Lost on every deploy/restart
- Set `DATA_STORAGE_DISABLED=true` to silence errors

**With Persistent Disk:**
- Data survives restarts and deploys
- Automatically backed up by Render
- No `ENOENT` errors

## Costs

### Free Tier
- ✅ 750 hours/month (enough for 24/7)
- ✅ 512 MB RAM
- ✅ 0.1 CPU
- ✅ **1 GB persistent disk included**
- ⚠️ Service spins down after 15 minutes of inactivity
- ⚠️ Cold starts take ~30 seconds

### Starter ($7/month)
- ✅ Always on (no spin down)
- ✅ 512 MB RAM
- ✅ 0.5 CPU
- ✅ Faster performance
- ✅ Persistent disk included

### Professional ($25/month)
- ✅ Always on
- ✅ 2 GB RAM
- ✅ 1 CPU
- ✅ Priority support

## Client Deployment (Netlify)

The React client should be deployed separately on Netlify:

1. Go to [Netlify](https://netlify.com)
2. Connect repository: `media-code-now/ec-exhibits`
3. Configure:
   - **Base directory**: `client`
   - **Build command**: `npm run build`
   - **Publish directory**: `client/dist`
4. Add environment variable:
   ```bash
   VITE_API_URL=https://your-render-service.onrender.com
   ```
5. Deploy

## Monitoring

### Check Logs
1. Go to Render dashboard
2. Click your service
3. Click "Logs" tab
4. Look for:
   - `[INFO]` messages showing data loading
   - `[ERROR]` messages if something fails
   - No `ENOENT` errors after disk is added

### Check Disk Usage
1. Go to "Disks" tab
2. See usage graph
3. Expand disk if needed (will charge for additional GB)

## Backup Strategy

### Automatic (Render)
- Render automatically backs up persistent disks
- Snapshots taken regularly
- Can restore from Render dashboard

### Manual (Recommended)
1. Add endpoint to download data:
   ```javascript
   // In server/index.js
   app.get('/api/backup', (req, res) => {
     // Require admin authentication
     const backup = {
       projects: [...projects.values()],
       users: users,
       // ... other data
     };
     res.json(backup);
   });
   ```
2. Periodically download and save locally
3. Store in version control or cloud storage

## Summary

✅ **With Persistent Disk:**
- Data survives restarts
- Data survives deployments
- No `ENOENT` errors
- Perfect for production

❌ **Without Persistent Disk:**
- All data lost on restart
- `ENOENT` errors in logs
- Only suitable for demo/testing
- Must set `DATA_STORAGE_DISABLED=true`

## Next Steps

After deployment:
1. ✅ Verify persistent disk is mounted
2. ✅ Test creating a project
3. ✅ Manually restart service
4. ✅ Verify project still exists
5. ✅ Update client's `VITE_API_URL` to your Render URL
6. ✅ Deploy client to Netlify
7. ✅ Test full workflow end-to-end
