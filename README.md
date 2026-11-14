# Braille Reader

A mobile-first PWA for scanning Braille, converting it to readable text, and reading it aloud.

## Stack

- Frontend: React + Vite + TypeScript
- Backend: NestJS
- PWA support: service worker + manifest
- Deployment: Cloudflare Pages for frontend, Render for backend

## Project structure

- `frontend/` - React mobile app
- `backend/` - NestJS API

## Local development

### Frontend

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0
```

Frontend runs at:
- http://localhost:5173

### Backend

```bash
cd backend
npm install
npm run start:dev
```

Backend runs at:
- http://localhost:3001

## API endpoints

- `GET /api/health`
- `POST /api/scan`
- `POST /api/tts`

## Production deployment

### Frontend (Cloudflare Pages)

Set root directory to:
- `frontend`

Build command:
- `npm install && npm run build`

Output directory:
- `dist`

Environment variable:
- `VITE_API_URL=https://your-backend-url`

### Backend (Render)

Set root directory to:
- `backend`

Build command:
- `npm install && npm run build`

Start command:
- `npm run start:prod`

Environment variable:
- `PORT=3001`

## Notes

- The frontend uses a mobile-first design for phone usage.
- The app is installable as a PWA.
- Speech output uses browser speech synthesis in the frontend and the backend exposes speech-ready API endpoints.
