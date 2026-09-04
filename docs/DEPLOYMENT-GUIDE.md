# OmniWorkspace: Complete Free Release & Deployment Guide

This guide covers:
1. **Creating an Official GitHub Release with Automated Windows Binaries (.exe)**
2. **Deploying the Web App Online 100% Free (Render.com, Koyeb, Docker)**
3. **Exposing Your Local Workspace to the Web via Cloudflare Tunnels (100% Free, Zero Port Forwarding)**

---

## Part 1: How to Release on GitHub (with Automated Windows .exe)

OmniWorkspace includes automated GitHub Actions workflows (`.github/workflows/release.yml` and `ci.yml`). When you tag a release version, GitHub's cloud runners will automatically build the Windows `.exe` installer.

### Method A: Using Git CLI (Fastest)

Run these two commands in your terminal:
```bash
# 1. Create a release tag
git tag -a v1.0.0 -m "Release v1.0.0: OmniWorkspace Universal AI Platform"

# 2. Push tag to GitHub
git push origin v1.0.0
```

### Method B: Using GitHub CLI (`gh`)
```bash
gh release create v1.0.0 \
  --title "OmniWorkspace v1.0.0 - Production Release" \
  --notes "Universal AI Workspace featuring 8 specialized agents, BYOK encrypted vault, DAG workflow engine, SQL studio, and Electron desktop shell." \
  --target main
```

### What Happens Automatically:
1. GitHub Actions detects the `v1.0.0` tag.
2. An automated Windows cloud runner (`windows-latest`) spins up.
3. It compiles the frontend, backend, and Electron processes.
4. It packages:
   - `OmniWorkspace Setup 1.0.0.exe` (NSIS Installer)
   - `OmniWorkspace 1.0.0.exe` (Standalone Portable)
5. The binaries will appear under your repository's **Releases** tab:
   `https://github.com/Priyanshu845438/OmniWorkspace/releases`

---

## Part 2: Deploying the Web Version Online (100% Totally Free)

Because OmniWorkspace has a dynamic Node.js backend (`node:sqlite`, process execution, and REST API), static-only hosts like GitHub Pages cannot run the API server. However, you can host the fullstack application online **100% free** using any of the following platforms.

---

### Option 1: Render.com (Recommended — Easiest & 100% Free)

Render provides 750 free hours/month with free SSL and custom domains.

1. **Sign Up / Log In**:
   - Go to [https://render.com](https://render.com) and log in with your GitHub account.
2. **Create New Web Service**:
   - Click **New +** ➔ **Web Service**.
   - Select your repository: `Priyanshu845438/OmniWorkspace`.
3. **Configure the Service**:
   - **Name**: `omni-workspace` (or any name you prefer).
   - **Region**: Choose the closest region (e.g., Oregon, Frankfurt, Singapore).
   - **Branch**: `main`.
   - **Runtime**: `Node`.
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: **Free** ($0/month).
4. **Environment Variables**:
   Add the following under **Environment Variables**:
   - `NODE_ENV` = `production`
   - `PORT` = `10000` (Render defaults to 10000)
5. **Deploy**:
   - Click **Create Web Service**.
   - Render will build and deploy your app to a live URL: `https://omni-workspace.onrender.com`.

---

### Option 2: Koyeb (100% Free Docker Hosting)

Koyeb offers a free Eco micro instance with 512MB RAM, no credit card required, and supports our `Dockerfile`.

1. Go to [https://app.koyeb.com](https://app.koyeb.com) and sign up with GitHub.
2. Click **Create App** ➔ **GitHub**.
3. Select `Priyanshu845438/OmniWorkspace`.
4. Choose **Dockerfile** as the build method (it will automatically use the repository's [Dockerfile](file:///Users/acadify/Documents/AI%20Workspace/Dockerfile)).
5. Set port to `3001`.
6. Click **Deploy**. Your app will be live at `https://<your-app>.koyeb.app`.

---

### Option 3: Cloudflare Tunnels (100% Free, Unlimited, Run from Your Own Machine)

If you prefer running OmniWorkspace on your computer (giving it access to your local files, Git, terminal, and local Ollama) but want to access it securely from **any phone, tablet, or laptop worldwide**:

1. **Install Cloudflare `cloudflared`**:
   - On macOS: `brew install cloudflared`
   - On Windows: `winget install --id Cloudflare.cloudflared`
   - On Linux: `sudo apt-get install cloudflared`
2. **Start OmniWorkspace locally**:
   ```bash
   npm start
   ```
   *(Running on http://localhost:3001)*
3. **Create a Free Instant Tunnel**:
   ```bash
   cloudflared tunnel --url http://localhost:3001
   ```
4. Cloudflare will give you a free, public HTTPS URL (e.g., `https://random-words.trycloudflare.com`).
   - Zero open ports
   - End-to-end HTTPS encrypted
   - Works from any network in the world.

---

## Part 3: Deploying the Static Preview on GitHub Pages (Optional)

If you only want to showcase the frontend UI on GitHub Pages (`https://priyanshu845438.github.io/OmniWorkspace/`):

1. **Install gh-pages**:
   ```bash
   npm install -D gh-pages
   ```
2. **Add deploy script to `package.json`**:
   ```json
   "predeploy": "npm run build:client",
   "deploy": "gh-pages -d dist-client"
   ```
3. **Deploy**:
   ```bash
   npm run deploy
   ```
*(Note: Full AI orchestration, local file editing, and terminal tools require the backend server, so Render or Cloudflare Tunnel is recommended for live interactive usage).*

---

## Summary Checklist

| Target | Cost | What Runs | Command / Action |
| :--- | :--- | :--- | :--- |
| **GitHub Release (.exe)** | Free | Windows installer & portable binary | `git tag v1.0.0 && git push origin v1.0.0` |
| **Render.com Cloud** | Free | Full web app & API online | Connect repo to Render ➔ `npm start` |
| **Koyeb Cloud** | Free | Containerized Docker deployment | Connect repo to Koyeb ➔ Select Dockerfile |
| **Cloudflare Tunnel** | Free | Local machine with global public HTTPS | `cloudflared tunnel --url http://localhost:3001` |
