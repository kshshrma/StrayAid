# StrayAid — Complete Project Handoff

## 1. Project Identity
* **Project Name**: StrayAid
* **Concept**: Animal Emergency Operating System (AEOS)
* **Core Mission**: Any person should be able to help an injured, lost, or vulnerable animal in under 10 seconds, even if they have no rescue experience.
* **Flow**: Report → AI Triage → Smart Dispatch → Guardian → Rescue → Completion

## 2. Current Technology Stack
* **Frontend**: React + TypeScript + Vite + Tailwind CSS + React Router + Supabase Client + Framer Motion (planned/used)
  * Location: `client/`
* **Backend**: Node.js + Express + TypeScript + tsx
  * Location: `server/`
* **Database / Backend Services**: Supabase (PostgreSQL, Auth, Storage)
* **AI**: Google Gemini (`@google/genai` library, model: `gemini-3.6-flash`)

## 3. Current Project Structure
```text
StrayAid/
│
├── client/
│   ├── src/
│   │   ├── features/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── types/
│   │   └── lib/
│   │
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   │
│   └── package.json
│
└── docs/
```

## 4. Current Milestone: CORE MVP BACKEND + FOUNDATION
The core report triage, image analysis via Gemini 3.6 Flash, profile systems, and manually initiated rescue assignments are working. 
The next big milestone is designing and implementing a **fair Smart Dispatch Engine** that:
1. Filters eligible Guardians based on distance and availability.
2. Incorporates a multi-factor score:
   - **Distance** (45%)
   - **Fairness** (25%) - prevent rich-get-richer cold start.
   - **Availability** (15%)
   - **Experience** (15%)
3. Supports severity-based tuning (adjusting weights based on Low, Medium, High, Critical).
4. Automates dispatching (assigning to the top-ranked Guardian, handling acceptance timeouts, and falling back).

Refer to the user request for details on the scoring algorithms, fairness logic, and complete rescue lifecycle requirements.
