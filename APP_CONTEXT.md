# Big Win - Full Application Technical Dossier

## 1. High-Level Overview
**App Name:** Big Win (also referred to as Big WinGo)
**Category:** High-frequency color prediction betting platform.
**Target Platform:** Mobile-first Web (Optimized for 60FPS on low-end Android devices).
**Core Stack:** 
- **Frontend:** React 19, Vite 7, TypeScript.
- **Routing:** React Router DOM v7 (Multi-Page Architecture).
- **Styling:** Tailwind CSS 4 (using @tailwindcss/vite).
- **State:** Zustand (Global game engine, timers, and UI state).
- **Animations:** Framer Motion (GPU-accelerated transitions with AnimatePresence).
- **Backend:** Supabase (PostgreSQL, Auth, Realtime, RPCs).

---

## 2. Multi-Page Architecture (Performance)
The app has been migrated from a "Laggy Tab" system to a **proper Routing system**. 
- **Routes:** `/wingo`, `/all-games`, `/activity`, `/promotion`, `/account`, `/admin`.
- **Performance:** Browsers now unmount hidden pages, freeing up RAM/CPU on low-end mobile devices.
- **Animations:** Uses `AnimatePresence` for smooth slide-up/fade transitions between pages.

---

## 3. The Game Engine (The Logic)
The app runs multiple concurrent game sessions (30s, 1m, 3m, 5m, 10m).
- **House Logic:** Mathematically selects the outcome (0-9) that results in the **absolute lowest total payout** to ensure house profit.
- **Low Traffic Protection:** If total bets are below a threshold (e.g. ₹1500), the house picks the lowest payout outcome that has **at least one user bet**, allowing early users to win and build trust.
- **Tick Engine:** Heartbeat runs via `requestAnimationFrame` in `gameStore.ts`.

---

## 4. Financial Architecture (The 3-Tier Wallet)
The app uses a segmented wallet system stored in the `profiles` table:
1. **`deposit_balance`**: Funds added via UPI.
2. **`winnings_balance`**: Profit from games (**The only withdrawable balance**).
3. **`bonus_balance`**: "Extra Play Credits" (Joining bonus, Loss bonus, Referrals).

### Deduction Hierarchy (Real Money First):
When a bet is placed, funds are deducted in this strict order:
**Deposit Balance -> Winnings Balance -> Bonus Balance.**
*Rationale: Bonus acts as a safety net used only when real cash is exhausted.*

### Winnings Logic:
- **100% Withdrawable:** All winnings from any bet type are credited directly to the `winnings_balance`.
- **Winnings Sync:** The `tick()` loop calls `update_user_balance` RPC and immediately syncs the result to the local UI state.

---

## 5. Automated Bonus Systems
- **Joining Bonus:** Configurable fixed amount + optional % of first deposit (e.g. 100%). Unlocked automatically upon first approved deposit.
- **Loss Bonus:** Automated "Cashback." If a user has a net loss in a round, XX% (default 10%) is instantly credited to `bonus_balance`.
- **Referral Bonus:** Earnings based on referred user deposits and game losses.

---

## 6. Database Schema & Security
### Key Tables:
- `profiles`: 3-tier balances, admin status, referral data.
- `bets`: Tracks `deposit_used`, `bonus_used`, and `winnings_used` for every bet.
- `games`: Authoritative history of every round result.
- `app_settings`: Global toggles (Low Traffic, Bonus %, UPI IDs).
- `support_tickets`: Real-time WhatsApp-style chat system.

### Security:
- **Zero Client-Side Math:** All balance updates happen via secure PostgreSQL RPC functions (`update_user_balance`, `admin_process_deposit`, etc.).
- **RLS:** Users can only access their own financial and profile data.

---

## 7. Development History & Fixes
- **Vercel Routing:** Added `vercel.json` rewrite rules to prevent 404s on sub-routes.
- **ReferenceErrors:** Fixed `promoSettings` initialization in `WalletModal.tsx`.
- **Sync Issues:** Implemented authoritative DB fetching with exponential backoff for game results.
- **Nullish Coalescing:** Replaced `||` with `??` in settings to allow bonus amounts of exactly `0`.
