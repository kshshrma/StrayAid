# StrayAid — Animal Emergency Operating System (AEOS) Summary

This document summarizes the complete implementation of StrayAid's core rescue architecture. Both frontend and backend systems build cleanly and are fully pushed to GitHub.

---

## 1. Core Architecture & Routing

### Backend Server (`/server`)
* **Framework**: Node.js, Express, TypeScript (ESM)
* **Start script**: `npm run dev`
* **API Endpoints**:
  * `POST /api/ai/analyze`: Triggers Gemini triage and automatic Guardian matching.
  * `GET /api/rescue/assignments`: Fetches assignments for the logged-in Guardian.
  * `PATCH /api/rescue/assignments/:id`: Accepts or rejects assignments (accepting updates status to `accepted`, `enroute`, `rescued`, or `completed`).
  * `GET /api/admin/guardians/unverified`: Lists unverified Guardians for NGO verification.
  * `PATCH /api/admin/guardians/:id/verify`: Set `is_verified = true` for a Guardian.
  * `GET /api/admin/guardians/available`: Lists active online Guardians.
  * `POST /api/admin/dispatch/override`: Manually override dispatches.
  * `PATCH /api/admin/reports/:reportId/status`: Manually transition report statuses.

### Frontend Client (`/client`)
* **Framework**: React, TypeScript, Vite, Tailwind CSS
* **Build script**: `npm run build`
* **Routes**:
  * `/`: Home Dashboard
  * `/map`: Live Rescue Map (displaying browser coordinates, active Guardians, and routing Polylines)
  * `/guardian`: Guardian Profile Status & Assignments
  * `/admin`: Admin & NGO Verification Dashboard
  * `/reports/:id`: Rescue Details & Admin Override Controls

---

## 2. Advanced Systems Built

### A. Gemini Triage & Smart Dispatch Engine
* Gemini automatically analyses reported incidents, categorizing severity (Low, High, Critical) and priority.
* Evaluates candidate Guardians in a 20 km radius utilizing multi-factor formulas:
  * **Distance**: $\max(0, 100 - \text{distance} \times 5)$
  * **Experience**: $\min(\text{total\_rescues} \times 5, 100)$ (maxed at 20 rescues)
  * **Availability**: $\max(0, 100 - \text{hoursSinceActive} \times 5)$
  * **Fairness**: $\max(0, 100 - \text{recentAssignments24h} \times 25)$ (prevents load-heavy bottlenecks)
* Weights are dynamically scaled per severity to favor experience during critical emergencies and fairness during minor incidents.

### B. Sweeper Poller Expirations
* A background interval sweep worker running in `server/src/index.ts` checks database assignments every 15 seconds.
* Automatically transitions pending assignments past their expiration window to `expired` and triggers fallback dispatches to next-ranked candidates.

### C. Offline Emergency Queue (IndexedDB)
* Utilizes a client-side IndexedDB database (`StrayAidOffline`) to cache animal reports (image blobs, original capture coordinates, and timestamps) locally when connection is lost.
* Listens to `'online'` events to automatically upload queued cases and clear the local storage.

### D. Real-Time Notification Banner
* Listens to Postgres triggers on the `rescue_assignments` table in real-time.
* Renders an interactive glassmorphic alert banner at the top of the viewport when a Guardian receives an emergency request.
