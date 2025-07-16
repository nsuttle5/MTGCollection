# MTG Collection Manager Deployment Guide

## Quick Deployment Options

### Option 1: GitHub Pages (Recommended)

1. **Create GitHub Repository:**

   - Go to GitHub.com
   - Click "New Repository"
   - Name it "MTGCollection" or similar
   - Make it public
   - Don't initialize with README (you already have one)

2. **Upload Your Files:**

   ```bash
   cd "C:\Users\Nicolas\Documents\Github\MTGCollection"
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOURUSERNAME/MTGCollection.git
   git push -u origin main
   ```

3. **Enable GitHub Pages:**

   - Go to repository Settings
   - Scroll to "Pages" section
   - Source: "Deploy from a branch"
   - Branch: "main"
   - Folder: "/ (root)"
   - Click Save

4. **Your site will be live at:**
   `https://YOURUSERNAME.github.io/MTGCollection`

### Option 2: Netlify (Easiest)

1. Go to [netlify.com](https://netlify.com)
2. Sign up/login
3. Click "Add new site" → "Deploy manually"
4. Drag your entire project folder to the deploy area
5. Site goes live instantly with a random URL
6. You can customize the URL in site settings

### Option 3: Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "New Project"
4. Import your GitHub repository
5. Click "Deploy"

## Important Notes

- Your app uses localStorage, so each user's data stays on their device
- The authentication is client-side only (suitable for personal use)
- All files are static HTML/CSS/JS, so any static host will work
- Make sure `index.html` is your main entry point

## Custom Domain (Optional)

After deploying, you can add a custom domain:

- GitHub Pages: Add CNAME file with your domain
- Netlify: Go to Domain settings
- Vercel: Go to Domain settings

## File Structure Check

Make sure you have these files in your root directory:

- ✅ index.html (entry point)
- ✅ auth.html
- ✅ main.html
- ✅ auth.js
- ✅ script.js
- ✅ auth.css
- ✅ styles.css
- ✅ README.md

Your project is ready to deploy! 🚀
