# Server (TypeScript + Express + MongoDB)
```bash
cd server
cp .env.example .env    # set MONGO_URI, JWT_SECRET, CORS_ORIGIN=http://localhost:5173
npm install
npm run dev
```
API base: http://localhost:3000
Routes: POST /api/auth/register, POST /api/auth/login, GET /api/auth/me
