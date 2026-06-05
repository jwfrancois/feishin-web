# Feishin Web - Jellyfin Music Player

A modern web-based music player that integrates with Jellyfin media server.

## Deployment to Vercel

1. **Push to GitHub:**
   - Create a new repository on GitHub
   - Push this code to your GitHub repository:
     ```bash
     git init
     git add .
     git commit -m "Initial commit"
     git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
     git push -u origin main
     ```

2. **Deploy on Vercel:**
   - Go to https://vercel.com
   - Click "Add New..." → Project
   - Import your GitHub repository
   - Configure:
     - Framework Preset: Vite
     - Build Command: `pnpm install --prefer-offline && rm -rf node_modules/.vite-temp && tsc -b && vite build`
     - Output Directory: `dist`
   - Click "Deploy"

## Local Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

## Features

- Full Jellyfin server integration
- Music, Podcasts, and Audiobooks support
- Advanced audio processing (EQ, Concert Mode, Stem Separation)
- Multiple visualizer types
- Lyrics sync
- And more!