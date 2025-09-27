# Web (React + Vite + TS)
Routes:
- `/login` (default `/` routes here)
- `/register`

## Run
```bash
cd web
npm install
npm run dev
```

The app expects API at `http://localhost:3000`. Change with env or localStorage:
- Env: create `.env` and set `VITE_API_BASE=http://localhost:3000`
- Or in browser console: `localStorage.setItem('API_BASE', 'http://localhost:3000')`

## Features
- Simple email/password validation
- Toast notifications (success/error)
- Stores JWT in localStorage on login
