# FitFlow AI

> "Your Workout. Your Rhythm. Your Coach."

A mobile interval-workout app with a hands-free guided workout player — voice
cues, countdown beeps, vibration, and a screen readable from 6 feet away.

---

## Monorepo structure

```
fitflow-ai/
  backend/   — Node.js + Express + Prisma + PostgreSQL
  mobile/    — React Native + Expo (managed workflow)
  docs/      — Architecture notes & phase write-ups
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ |
| npm | 9+ |
| PostgreSQL | 14+ (running locally or via Docker) |
| Expo CLI | `npm install -g expo-cli` |
| Expo Go app | On your iOS / Android device (optional) |

---

## Backend setup

```bash
cd backend

# 1. Install dependencies
npm install

# 2. Copy env and fill in your Postgres credentials
cp .env.example .env
# Edit .env — set DATABASE_URL

# 3. Push schema to DB and generate Prisma client
npx prisma migrate dev --name init
npx prisma generate

# 4. Seed the 5 sample workouts
npm run db:seed

# 5. Start dev server (hot-reload)
npm run dev
```

Health check: `GET http://localhost:3001/api/health` → `{"status":"ok"}`

---

## Mobile setup

```bash
cd mobile

# 1. Install dependencies
npm install

# 2. Copy env (optional — only needed for physical device)
cp .env.example .env
# Edit .env — set EXPO_PUBLIC_API_URL to your machine's LAN IP
# e.g. EXPO_PUBLIC_API_URL=http://192.168.1.42:3001

# 3. Start Expo
npx expo start
```

- Press **i** for iOS simulator
- Press **a** for Android emulator
- Scan QR code with Expo Go on a real device

> On Android emulator, set `EXPO_PUBLIC_API_URL=http://10.0.2.2:3001`

---

## Phase status

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Monorepo scaffold, health check, nav shell | ✅ Done |
| 1 | Core Prisma schema + seed workouts | ✅ Done |
| 2 | Workout player (timer engine, voice, haptics) | 🔜 Next |
| 3 | Quick Timer + Custom Builder | ⬜ Pending |
| 4 | Home, Library, Progress screens | ⬜ Pending |
| 5 | Auth & Roles | ⬜ Pending |
| 6 | AI Coach (LLM workout gen) | ⬜ Pending |
| 7 | Senior & Pregnancy modes | ⬜ Pending |
| 8 | Trainer dashboard | ⬜ Pending |
| 9 | Admin & Subscriptions | ⬜ Pending |
