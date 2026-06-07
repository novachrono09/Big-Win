# 🎰 66 Lottery - High-Fidelity WinGo Color Prediction Platform Clone

An ultra-responsive, mobile-first clone of the popular WinGo color prediction lottery game. This application replicates the authentic gaming experience with real-time betting intervals, comprehensive history tracking, trend charting, and user account simulations.

Developed with modern frontend architecture, this client-centric platform delivers a seamless experience that compiles into a portable single-file deployment.

---

## 🚀 Key Features

*   **⚡ Multiple Session Intervals**: Play at your own pace with five distinct synchronized session timers: **30 Seconds**, **1 Minute**, **3 Minutes**, **5 Minutes**, and **10 Minutes**.
*   **🎯 Rich Betting Options**: Place bets across several combinations:
    *   **Colors**: Green (2x payout), Red (2x payout), Violet (4.5x payout).
    *   **Numbers**: Direct number prediction from 0-9 (9x payout).
    *   **Sizes**: Big (5-9, 2x payout) and Small (0-4, 2x payout).
*   **📈 Dynamic Game History & Charts**:
    *   **Game History**: Interactive logs showing period ID, number, big/small result, and associated colors.
    *   **Trend Charting**: Visual grid systems showing color streaks and number distributions over the last 50 rounds.
    *   **My History**: Detailed record of user bets, odds multipliers, transaction amounts, and outcomes.
*   **👥 User Authentication & Balance Simulation**:
    *   Register instant new accounts with a starting balance of **₹10,000**.
    *   Login via simulated credential matches or play immediately with a one-click guest pass.
*   **🔔 Real-Time Feedback**:
    *   Vibrant, animated win/loss toast alerts.
    *   Pop-up results announcement card triggering immediately at the completion of a round.
*   **📦 Single-File Bundling**: Configured to compile assets into a single static HTML file for easy offline distribution, embedding, or hosting on static CDNs.

---

## 🛠️ Technical Stack

*   **Framework**: [React 19](https://react.dev/)
*   **Build Tool**: [Vite 7](https://vite.dev/)
*   **Programming Language**: [TypeScript](https://www.typescriptlang.org/)
*   **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) with `@tailwindcss/vite` configuration
*   **State Management**: [Zustand](https://zustand-demo.pmnd.rs/) for global game states and timers
*   **Notifications**: Custom styled Toast system matching the native application layout

---

## 📁 Project Structure

```bash
big-win/
├── index.html                  # Root template
├── package.json                # Project dependencies and run scripts
├── tsconfig.json               # TypeScript compiler rules
├── vite.config.ts              # Vite configuration with tailwindcss and viteSingleFile plugins
└── src/
    ├── main.tsx                # App entrypoint
    ├── App.tsx                 # Main layout coordinator & session manager
    ├── index.css               # Base Tailwind CSS styles and custom utility overrides
    ├── components/             # Reusable UI component modules
    │   ├── AuthPage.tsx        # Login/Register interface & guest credentials
    │   ├── BettingPanel.tsx    # Bet selection, multiplier buttons, and amount submission
    │   ├── CountdownPanel.tsx  # Game periods, live timers, and interactive rules
    │   ├── CurrentBets.tsx     # Overview of pending bets placed in the current session
    │   ├── GameHistory.tsx     # Tabbed panel for Game History, Trend Charts, & User History
    │   ├── Header.tsx          # Display user profile, wallet balance, and controls
    │   ├── ResultAnnouncement.tsx # Overlay modal displaying the last round's win/loss result
    │   ├── SessionTabs.tsx     # Top navigation selector for game duration categories
    │   └── ToastContainer.tsx  # Animated visual notifications controller
    ├── store/
    │   └── gameStore.ts        # Central state, countdown triggers, and payout calculator
    └── utils/
        └── cn.ts               # Tailwind class merging utility helper
```

---

## ⚙️ Architecture & Logic Flow

### 1. Synchronized Game Loop
The application runs a centralized tick loop driven by a single system clock. When the application mounts in [App.tsx](file:///data/data/com.termux/files/home/big-win/src/App.tsx), [startGameTick](file:///data/data/com.termux/files/home/big-win/src/store/gameStore.ts#L472) initiates a global `setInterval` that fires every second.
The store's [tick](file:///data/data/com.termux/files/home/big-win/src/store/gameStore.ts#L382) method decrements all active timers simultaneously.

### 2. Multi-Interval Sessions
Timers operate independently in [useGameStore](file:///data/data/com.termux/files/home/big-win/src/store/gameStore.ts#L251) using the [SessionType](file:///data/data/com.termux/files/home/big-win/src/store/gameStore.ts#L5) configuration:
*   **30s** (`30s` duration)
*   **1min** (`60s` duration)
*   **3min** (`180s` duration)
*   **5min** (`300s` duration)
*   **10min** (`600s` duration)

Bets are accepted up until **5 seconds** remaining in each period, after which the interface locks for processing.

### 3. Payout Calculation Rules
When a round finishes, results are determined based on WinGo lottery rules:
*   **Number Payouts**: Choosing a single digit (0-9) awards **9x** the bet amount.
*   **Color Payouts**: 
    *   Red (2, 4, 6, 8) and Green (1, 3, 7, 9) award **2x** the bet amount.
    *   Violet awards **4.5x** the bet amount if the result contains violet (0 or 5).
    *   If a mixed result occurs (0 is Red+Violet; 5 is Green+Violet), betting on the base colors (Red/Green) pays out half or full according to game configurations.
*   **Size Payouts**: Small (0-4) and Big (5-9) award **2x** the bet amount.

---

## 🛠️ Installation & Setup

### Prerequisites
*   [Node.js](https://nodejs.org/) (LTS recommended)
*   `npm` or `yarn`

### Setup Instructions

1.  **Clone & Install Dependencies**:
    ```bash
    cd big-win
    npm install
    ```

2.  **Run Development Server**:
    Launch the local server with hot module replacement:
    ```bash
    npm run dev
    ```
    Access the application at `http://localhost:5173`.

3.  **Build Production Single File**:
    Compile the code into a unified, self-contained HTML file in the `dist/` directory:
    ```bash
    npm run build
    ```
    *(The output bundle contains all CSS and JS inline inside a single `index.html` file using `vite-plugin-singlefile`.)*

4.  **Preview Production Bundle**:
    Serve the production build locally:
    ```bash
    npm run preview
    ```

---

## 🔑 Demo Access Credentials

To test the betting interface and flow, you can use these pre-registered users in [gameStore.ts](file:///data/data/com.termux/files/home/big-win/src/store/gameStore.ts#L256):

| User Type | Username | Password | Starting Balance |
| :--- | :--- | :--- | :--- |
| **Demo User** | `Demo` | `demo123` | **₹50,000** |
| **Guest User** | `Guest` | *(leave blank)* | **₹10,000** |

*Alternatively, click **"Login as Guest"** or register a completely new username with zero validations required to instantly start betting.*

---

## 🎛️ Key Code References

*   **Game State & Actions**: [gameStore.ts](file:///data/data/com.termux/files/home/big-win/src/store/gameStore.ts)
*   **Bet Placement Logic**: [placeBet](file:///data/data/com.termux/files/home/big-win/src/store/gameStore.ts#L310)
*   **User UI Frame**: [App.tsx](file:///data/data/com.termux/files/home/big-win/src/App.tsx)
*   **Interactive Panel**: [BettingPanel.tsx](file:///data/data/com.termux/files/home/big-win/src/components/BettingPanel.tsx)
