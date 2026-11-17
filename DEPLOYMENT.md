# 🚀 HelpConnect - Production Deployment & Security Guide

This guide provides step-by-step instructions to deploy the **HelpConnect NGO Donation & Help Management Platform** securely to production.

---

## 🔒 Security & Secrets Management Best Practices

1. **Never Commit Secrets**:
   - Never commit `.env` or `.env.*` files containing credentials to Git.
   - All `.env` files are ignored by default in `.gitignore` and `.dockerignore`.
   - Provide public references using `.env.example` templates.
2. **Frontend Isolation**:
   - The React frontend bundle is public. Only variables prefixed with `VITE_` are exposed.
   - **Never** add database passwords, JWT secrets, Cloudinary API secrets, or SMTP credentials to `frontend/.env`.
3. **Server Startup Validation**:
   - The backend validates all critical variables (`MONGO_URI`, `JWT_SECRET`, `PORT`, `REDIS_URL`) at startup and halts immediately if required production values or security thresholds (minimum 32-character JWT secret) are not met.
4. **Credential Rotation**:
   - If any credentials were ever committed or shared in public archives, rotate them immediately following the **Credential Rotation Checklist** below.

---

## 🗄️ Step 1: Database Setup (MongoDB Atlas Replica Set)

1. Sign up for a free or dedicated cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create an Atlas Cluster (Replica Set enabled by default).
3. Under **Database Access**:
   - Create a dedicated database user (e.g. `helpconnect_app`).
   - Assign `readWrite` role to the `helpconnect` database.
   - Generate a strong random password.
4. Under **Network Access**:
   - Whitelist your server's static IP or restrict to VPC peering.
   - For cloud platforms with dynamic IPs (e.g. Render, Railway), configure IP `0.0.0.0/0` with strong authentication.
5. Copy your connection URI:
   ```text
   mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/helpconnect?retryWrites=true&w=majority
   ```

---

## ☁️ Option A: Deploy Frontend + Backend Together (Recommended for Render)

### Deploying on [Render.com](https://render.com)

1. Push your repository to GitHub / GitLab.
2. Sign in to **Render** and click **New +** -> **Blueprint**.
3. Connect your repository (`render.yaml` is auto-detected).
4. Fill in your environment variables in the Render Dashboard:
   - `MONGO_URI`: Your MongoDB Atlas Connection String.
   - `JWT_SECRET`: Generate a secure random string (at least 32 characters, e.g. via `openssl rand -hex 32`).
   - `CLIENT_URL`: Your production frontend URL (or leave empty if using unified deployment).
   - `REDIS_URL`: (Recommended) Redis connection URL for distributed rate limiting.
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: (Optional) Media assets.
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL`: (Optional) Notifications.
5. Click **Apply**. Render will automatically build the React frontend, link it to Express backend, and launch your live URL!

---

## 🌐 Option B: Decoupled Deployment (Backend on Render/Fly.io + Frontend on Vercel)

### 1. Backend Deployment (Render / Fly.io / Railway)
- **Build Command:** `npm install --prefix backend`
- **Start Command:** `npm start --prefix backend`
- **Required Environment Variables:**
  - `NODE_ENV=production`
  - `PORT=5000`
  - `MONGO_URI=mongodb+srv://...`
  - `JWT_SECRET=your_production_jwt_secret_min_32_chars`
  - `CLIENT_URL=https://your-frontend.vercel.app`
  - `TRUST_PROXY=1`

### 2. Frontend Deployment ([Vercel](https://vercel.com))
- Import your repository into Vercel.
- **Root Directory:** `frontend`
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Environment Variables:**
  - `VITE_API_URL`: `https://your-backend-api.onrender.com/api`
  - `VITE_SOCKET_URL`: `https://your-backend-api.onrender.com`
  - `VITE_GOOGLE_CLIENT_ID`: Your Google OAuth Client ID

---

## 🐳 Option C: Docker Container Deployment

Build and run using the production multi-stage Dockerfile:

```bash
# Build the production Docker image (secrets are excluded by .dockerignore)
docker build -t helpconnect:latest .

# Run the container with injected environment secrets
docker run -d -p 5000:5000 \
  -e MONGO_URI="mongodb+srv://app_user:strong_password@cluster0.mongodb.net/helpconnect" \
  -e JWT_SECRET="your_production_jwt_secret_min_32_chars" \
  -e NODE_ENV="production" \
  -e SERVE_FRONTEND="true" \
  -e CLIENT_URL="https://your-domain.com" \
  helpconnect:latest
```

---

## 🔄 Credential Rotation Checklist

If test or historical credentials were ever present in shared environments or local archives, execute these immediate rotations:

| Service | Risk | Action Required |
| :--- | :--- | :--- |
| **MongoDB Atlas** | Full database access | Rotate user password under Atlas -> Database Access. Revoke old users. |
| **JWT Secret** | Token forgery across all roles | Generate new secret with `openssl rand -hex 32` and update platform env vars. |
| **Cloudinary** | Media tampering / unauthorized upload | Regenerate API Secret in Cloudinary Dashboard -> Access Keys. |
| **Initial Admin** | Administrative privilege takeover | Run `node backend/create-admin.js` with new credentials or change password in Admin UI. |

---

## 📊 Post-Deployment Verification Checklist

1. **Health Check**:
   Visit `https://your-domain.com/api/health` — should respond with `{"status": "OK"}`.
2. **CORS Verification**:
   Verify that only allowed origins (`CLIENT_URL` / `FRONTEND_URL`) receive CORS headers.
3. **Rate Limiting**:
   Verify that repeated rapid requests to `/api/auth/login` return HTTP 429.
4. **WebSocket Connection**:
   Verify that real-time Socket.IO connects with valid JWT bearer authentication.
