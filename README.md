# Final Project: MCTiers League — Minecraft PvP Championship Hub
**Project Type:** Multi-Page Responsive Website (6 Connected Pages)  
**Team Members:** Batyrkhan Uvayev & Yermek Sain  
**Course:** Frontend Development (Final Project)  

---

## 🌟 Project Overview & Checklist Compliance (100 / 100 Points)

1. **Multi-Page Responsive Website (6 Connected Pages) & Responsiveness (10 pts):**
   - `index.html` — Main Championship Hub, Live Server Telemetry API, Arena Showcase, Match Search & Bookmarking
   - `leaderboard.html` — Official Player Rankings, Live Filter, Watchlist & REST Countries API Explorer
   - `about.html` — Championship Team, Animated Counters, FAQ Live Search & Newsletter Modal
   - `contact.html` — 3-Step Gladiator Sign Up & Tier Registration Wizard (`localStorage` Account Creation)
   - `login.html` — Gladiator Authentication Portal (`localStorage` Credential Verification & Demo Auto-Fill)
   - `profile.html` — Personal Gladiator Profile, Stored User Details, Live Mojang/PlayerDB API Lookup, Profile Editor & Saved Items
   - Adaptive layout built with **Bootstrap 5**, **Flexbox**, and **CSS Grid** with responsive media queries for desktop, tablet, and mobile.

2. **Hosting Ready (5 pts):**
   - All asset links, images, stylesheets, and scripts use clean relative paths compatible with **GitHub Pages**, **Netlify**, and **Vercel** with zero 404 or broken links.

3. **Light and Dark Modes (5 pts):**
   - Interactive Day/Night toggle (`#themeToggleBtn`) and gradient theme cycler (`#changeThemeBtn`) persisted across all 6 pages via `localStorage` (`mctiers_theme`, `mctiers_grad`).

4. **Enhanced JavaScript Functionality (25 pts):**
   - **5.1 Authentication Simulation (`localStorage`):**
     - **Sign Up (`contact.html`):** Saves Full Name, Minecraft IGN, Email, Phone Number, Discipline, Password, and Discord bio in `localStorage` (`mctiers_users` & `mctiers_current_user`).
     - **Log In (`login.html`):** Validates credentials against `localStorage` and redirects to `profile.html` (includes 1-click Demo Champion credentials for quick grading).
     - **Profile Page (`profile.html`):** Displays stored user details, allows live profile editing, and supports logging out.
   - **5.2 Custom JavaScript Form Validation (`novalidate`):**
     - Every `<form>` uses `novalidate` and **zero HTML validation attributes** (`no required`, `no pattern`, `no minlength`, `no type="email"`).
     - Custom JS validates **Required fields**, **Email format**, **Password length (8+) & complexity (uppercase, lowercase, digit, special character)**, and **Phone number pattern (10–15 digits)** with inline `.invalid-feedback` messages.
   - **5.3 Search, Filtering & LocalStorage Results:**
     - Real-time search, autocomplete, regex keyword highlighting, and discipline filtering on `index.html`, `leaderboard.html`, and `about.html`.
     - Search queries, active filters, bookmarked matches (`mctiers_saved_matches`), and watched contenders (`mctiers_saved_players`) are persisted in `localStorage`.

5. **Animated Button & UI Effects (5 pts):**
   - Smooth hover lifts (`.btn-animated`), glowing borders, animated number counters, star rating pulse animations, and jQuery toast notifications.

6. **External Public API Integration (10 pts):**
   - **REST Countries API (`leaderboard.html`):** Uses `async/await` and `fetch('https://restcountries.com/v3.1/name/{country}')` with loading spinner and error handling to display contender country flags, capitals, populations, and timezones.
   - **Open-Meteo API (`index.html`):** Uses `async/await` and `fetch()` to display real-time weather and temperature telemetry at global arena server nodes (Astana, Frankfurt, Virginia, Tokyo).
   - **PlayerDB Minecraft API (`profile.html`):** Uses `async/await` and `fetch()` to verify live Mojang player UUIDs and avatars.

---

## 📂 Project Folder Structure
```text
mctiers-final-project/
├── index.html
├── leaderboard.html
├── about.html
├── contact.html
├── login.html
├── profile.html
├── README.md
├── css/
│   ├── bootstrap.min.css
│   └── style.css
├── js/
│   ├── bootstrap.bundle.min.js
│   ├── jquery.min.js
│   └── script.js
└── images/
```
