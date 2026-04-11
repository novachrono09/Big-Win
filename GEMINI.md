# Big Win - WinGo Color Prediction Game

A modern, React-based web application for a color prediction betting game. Users can bet on colors, numbers, and sizes across various session intervals.

## Project Overview

*   **Purpose:** A simulation of a color prediction game where users can place bets and see real-time results.
*   **Architecture:** 
    *   **Frontend:** React 19 with TypeScript and Vite 7.
    *   **State Management:** Zustand for global game state, user balance, and session timers.
    *   **Styling:** Tailwind CSS 4 using the new `@tailwindcss/vite` plugin.
    *   **Distribution:** Configured to build into a single HTML file using `vite-plugin-singlefile`.
*   **Key Features:**
    *   Multiple game sessions: 30s, 1min, 3min, 5min, 10min.
    *   Betting options: Colors (Green, Red, Violet), Numbers (0-9), and Sizes (Big, Small).
    *   User System: Support for Login, Registration, and Guest Play.
    *   Real-time Updates: Global game tick updates timers and calculates results every second.
    *   House Logic: The game includes logic to compute results based on current bets (`computeHouseResult` in `gameStore.ts`).

## Technology Stack

*   **Framework:** [React 19](https://react.dev/)
*   **Build Tool:** [Vite 7](https://vite.dev/)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
*   **State:** [Zustand](https://zustand-demo.pmnd.rs/)
*   **Notifications:** [React Hot Toast](https://react-hot-toast.com/)

## Getting Started

### Prerequisites
*   Node.js (LTS recommended)
*   npm or yarn

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Production Build
Generates a single-file distribution in the `dist/` directory.
```bash
npm run build
```

### Preview Build
```bash
npm run preview
```

## Project Structure

*   `src/components/`: UI components (Auth, Betting, History, etc.).
*   `src/store/`: Zustand store (`gameStore.ts`) containing all game logic and state.
*   `src/utils/`: Helper functions like `cn` for Tailwind class merging.
*   `src/App.tsx`: Main application shell and routing logic.
*   `src/main.tsx`: Entry point.
*   `vite.config.ts`: Vite configuration with Tailwind and SingleFile plugins.

## Development Conventions

*   **Path Aliases:** Use `@/` to refer to the `src/` directory (configured in `tsconfig.json` and `vite.config.ts`).
*   **State Updates:** Most business logic resides in `src/store/gameStore.ts`. Avoid putting complex game logic directly in components.
*   **Styling:** Use Tailwind CSS utility classes. For complex conditional classes, use the `cn()` utility from `@/utils/cn`.
*   **Mobile First:** The UI is designed for mobile but centers and constrains itself on larger screens.
*   **Type Safety:** Ensure all new interfaces and types are added to `src/store/gameStore.ts` or a dedicated types file.
