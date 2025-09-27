# TypeScript + Express + MongoDB Auth
## Split projects: /server (API) and /web (React + Vite)

### 1) Start the API
```bash
cd server
cp .env.example .env
# set MONGO_URI, JWT_SECRET, CORS_ORIGIN=http://localhost:5173
npm install
npm run dev
```

### 2) Start the web app
```bash
cd ../web
npm install
npm run dev
```

Open http://localhost:5173 and visit /login or /register.

To point the web to a different API URL:
- `.env`: VITE_API_BASE=http://localhost:3000
- Or set in browser console: localStorage.setItem('API_BASE','http://localhost:3000')
