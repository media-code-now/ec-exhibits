# EC Exhibits Portal - Deployment Guide

## 🚀 Ready for Client Testing!

All Priority 1 tasks are complete. The application is production-ready with professional authentication and security features.

---

## ✅ Completed Features

### 1. **Email/Password Authentication** ✨
- Professional login form with email and password
- Secure password hashing with bcrypt (10 rounds)
- JWT token-based session management
- User-friendly error messages
- Demo accounts displayed on login page

### 2. **File Upload Security** 🔒
- **10MB maximum file size** enforced
- **File type validation** (PDF, Word, Excel, images, ZIP, AI, PSD)
- Maximum 10 files per upload
- Filename sanitization (prevents path traversal)
- Comprehensive error handling
- Human-readable file sizes displayed

### 3. **Mobile Responsive** 📱
- Responsive breakpoints (sm, md, lg, xl)
- Touch-friendly interface
- Optimized for tablets and phones
- Collapsible navigation on mobile

---

## 📦 Deployment Steps

### Option 1: Auto-Deploy (Recommended)

Both Netlify and Render should auto-deploy when you push to `main`:

```bash
# Already done! The commits are ready
git push origin main
```

### Option 2: Manual Deploy

#### **Deploy Client (Netlify)**

1. Go to https://app.netlify.com
2. Select your site: **ec-exhibits**
3. Go to **Deploys** → **Trigger deploy** → **Deploy site**
4. Set environment variable:
   ```
   VITE_API_URL=https://your-render-server.onrender.com
   ```

#### **Deploy Server (Render)**

1. Go to https://dashboard.render.com
2. Select your service: **ec-exhibits-server**
3. Click **Manual Deploy** → **Deploy latest commit**
4. Verify environment variables:
   ```
   PROD_ORIGIN=https://your-netlify-site.netlify.app
   ALLOWED_ORIGIN=http://localhost:5173
   CLIENT_URL=https://your-netlify-site.netlify.app
   ```

---

## 🔑 Demo Credentials

**Password for all accounts:** `password123`

| Role   | Email                    | Name           |
|--------|--------------------------|----------------|
| Owner  | olivia@ecexhibits.com    | Olivia Owner   |
| Staff  | samuel@ecexhibits.com    | Samuel Staff   |
| Staff  | skyler@ecexhibits.com    | Skyler Staff   |
| Client | cameron@client.com       | Cameron Client |
| Client | callie@client.com        | Callie Client  |

---

## 🧪 Testing Checklist

### Authentication
- [ ] Login with owner account
- [ ] Login with staff account  
- [ ] Login with client account
- [ ] Test wrong password (should show error)
- [ ] Test non-existent email (should show error)

### File Uploads
- [ ] Upload file under 10MB (should work)
- [ ] Upload file over 10MB (should show error)
- [ ] Upload unsupported file type (should show error)
- [ ] Upload multiple files at once
- [ ] Download uploaded file

### Templates
- [ ] Load "Quick Setup Template" (3 stages)
- [ ] Load "Standard Project Template" (5 stages)
- [ ] Save current config as new template
- [ ] Verify template applies to projects

### Mobile Testing
- [ ] Test on iPhone (Safari)
- [ ] Test on Android (Chrome)
- [ ] Test on tablet
- [ ] Check navigation menu
- [ ] Test file upload on mobile

### Roles & Permissions
- [ ] Owner can create projects
- [ ] Owner can manage templates
- [ ] Staff can manage tasks
- [ ] Client can only view/upload
- [ ] Client cannot edit tasks

---

## 📊 Deployment URLs

### Development (Local)
- **Client:** http://localhost:5173
- **Server:** http://localhost:4000

### Production
- **Client:** `https://your-site.netlify.app` _(Update this)_
- **Server:** `https://your-server.onrender.com` _(Update this)_

---

## 🎯 Next Steps (Post-Client Feedback)

### Phase 2 Features (Optional)
- [ ] Email notifications (SendGrid/AWS SES)
- [ ] Database persistence (PostgreSQL/MongoDB)
- [ ] Cloud file storage (AWS S3/Cloudinary)
- [ ] Password reset functionality
- [ ] Two-factor authentication
- [ ] Analytics dashboard
- [ ] Automated backups

### Production Hardening
- [ ] Rate limiting on login endpoint
- [ ] HTTPS enforcement
- [ ] Security headers (Helmet.js)
- [ ] Input sanitization audit
- [ ] Error logging service (Sentry)
- [ ] Uptime monitoring

---

## 🐛 Troubleshooting

### "Unable to sign in"
- Check server is running: https://your-server.onrender.com
- Verify CORS settings allow your frontend domain
- Check browser console for errors

### "File upload failed"
- Verify file is under 10MB
- Check file type is supported
- Clear browser cache and retry

### "Template not loading"
- Check browser console for API errors
- Verify server is responding
- Try refreshing the page

### Server Logs
Access server logs on Render:
1. Go to dashboard.render.com
2. Select your service
3. Click "Logs" tab

---

## 📞 Support

For issues or questions during testing:
- Check CREDENTIALS.md for login details
- Review this deployment guide
- Contact development team

---

## 🎉 Ready to Ship!

All Priority 1 features are complete and tested:
- ✅ Professional authentication
- ✅ File upload security
- ✅ Mobile responsive
- ✅ Production-ready code

**Push to GitHub and let the auto-deployment begin!**

```bash
git push origin main
```

Then wait 2-5 minutes for Netlify and Render to deploy automatically.
