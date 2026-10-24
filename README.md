# 🛡️ EHVA CyberLab — Web Security Attack & Defense Hub

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![Express](https://img.shields.io/badge/Express-4.x-lightgrey.svg)](https://expressjs.com/)
[![Target: OWASP Juice Shop](https://img.shields.io/badge/Target-OWASP%20Juice%20Shop-orange.svg)](https://owasp.org/www-project-juice-shop/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An interactive, educational web security training dashboard and attack/defense evaluation suite designed for vulnerability assessment, penetration testing demonstrations, and defensive mitigation verification.

---

## 🌟 Overview & Key Modules

EHVA CyberLab provides hands-on demonstrations of real-world web vulnerabilities and their industry-standard remediations, targeting both live and simulated [OWASP Juice Shop](https://owasp.org/www-project-juice-shop/) environments:

| # | Vulnerability Module | Attack Vector | Defensive Countermeasure |
|---|---|---|---|
| **1** | **XSS (Cross-Site Scripting)** | Injects reflected `<script>` and `onerror` payloads into search API | Sanitization using `sanitize-html` and context-aware escaping |
| **2** | **SQL Injection (Auth Bypass)** | Exploits `' OR 1=1--` tautologies to bypass credential checks | Secure parameterized SQL queries and prepared statements |
| **3** | **IDOR (Direct Object References)** | Requests unauthorized customer baskets and records by numeric ID | Attribute-Based Access Control (ABAC) and session ownership checks |
| **4** | **Path Traversal (LFI)** | Transits directories using `../../` tokens to read system files | Canonical path verification with `path.resolve` against allowed root |
| **5** | **Command Injection (RCE)** | Appends shell metacharacters (`; whoami`, `&& id`) to ping utility | Safe parameterization (`execFile`) and strict regex input whitelisting |
| **6** | **CSRF (Cross-Site Request Forgery)** | Simulates forged state-changing requests without origin validation | Cryptographically secure single-use CSRF tokens (`X-CSRF-Token`) |
| **7** | **Weak Auth & Rate Limiting** | Launches high-speed dictionary brute-force attacks | Secure bcrypt hashing and rate limiting (`express-rate-limit`, 5/min) |
| **8** | **Missing Security Headers** | Identifies absent defense headers allowing clickjacking / sniffing | Comprehensive protection via `helmet` (CSP, HSTS, X-Frame-Options) |
| **9** | **Recon & Port Scanner** | Performs targeted non-intrusive port auditing | TCP SYN/Connect scanning constrained strictly to isolated target |

---

## 🔒 Isolation & Safety Architecture

- **Private Network Isolation**: In Docker mode, Juice Shop and the dashboard run inside an isolated Docker bridge network (`labnet`).
- **No External Exposure**: Juice Shop publishes **no ports to the public internet** or local LAN.
- **Strict Target Locking**: The network scanner utility is hard-coded strictly to internal target addresses (`127.0.0.1` / container DNS) to prevent unauthorized host scanning.
- **Embedded Sandbox Mode**: If Docker is not running, the dashboard automatically boots an internal simulated Juice Shop target on `http://localhost:3000`, making the lab 100% functional out of the box on any system.

---

## 🚀 Quick Start Guide

### Option 1: One-Click Windows Launcher (Easiest)
Simply double-click:
```bat
run.bat
```
*This script automatically checks for Node.js, installs dependencies if needed, boots the background target server, starts the dashboard on `http://localhost:8080`, and opens your default browser.*

---

### Option 2: Running with Node.js Directly
```bash
# 1. Install dependencies
npm run install:dashboard

# 2. Start the server
npm start
```
Open **[http://localhost:8080](http://localhost:8080)** in your browser.

---

### Option 3: Docker & Docker Compose
```bash
# Build and run containers
docker compose up --build
```
Access the dashboard at **[http://localhost:8080](http://localhost:8080)**.

---

## ☁️ Cloud Deployment (Render / Railway / Cloud VM)

This project is pre-configured for one-click deployment on cloud platforms:

### Deploy to Render
1. Push this repository to your GitHub account.
2. Sign in to [Render.com](https://render.com) and click **New > Blueprint** (or **New > Web Service**).
3. Connect your GitHub repository.
4. Render will automatically detect [`render.yaml`](render.yaml) and configure:
   - **Build Command:** `npm install --prefix dashboard`
   - **Start Command:** `npm start --prefix dashboard`
5. Click **Create** — your lab is live with a free HTTPS URL!

---

## 📁 Repository Structure

```
.
├── .github/
│   └── workflows/
│       └── ci.yml               # Automated GitHub Actions CI test
├── dashboard/
│   ├── Dockerfile               # Node.js + Nmap container definition
│   ├── package.json             # Backend dependencies & scripts
│   ├── server.js                # Express hub, API router, and static server
│   ├── logger.js                # Persistent audit logger (JSON/CSV exports)
│   ├── juice-target.js          # Built-in simulated OWASP target engine
│   ├── routes/                  # Modular vulnerability & defense routes
│   │   ├── cmdi.js
│   │   ├── csrf.js
│   │   ├── headers.js
│   │   ├── idor.js
│   │   ├── report.js
│   │   ├── scanner.js
│   │   ├── sqli.js
│   │   ├── traversal.js
│   │   ├── weakauth.js
│   │   └── xss.js
│   └── public/                  # Modern responsive frontend dashboard
│       ├── index.html           # Lab interface, Spotlight visualizer, metrics
│       ├── style.css            # Dark/light theme design system
│       └── app.js               # Reactive state controller & exploit runner
├── docker-compose.yml           # Isolated multi-container deployment
├── render.yaml                  # 1-click cloud deployment manifest
├── package.json                 # Top-level workspace orchestration
├── run.bat                      # One-click Windows desktop launcher
├── .gitignore                   # Excludes node_modules, temp logs, and OS caches
└── README.md                    # Project documentation & usage manual
```

---

## 📊 Audit Logging & Export

Every attack and defensive simulation is recorded in real time. You can view the complete telemetry log in the **Report** tab of the dashboard and export the findings at any time to:
- **JSON**: For automated ingestion or reporting pipelines.
- **CSV**: For spreadsheet analysis, academic submission, or compliance checklists.

---

## 📜 License

This project is licensed under the [MIT License](LICENSE) — free to use for academic, demonstration, and security training purposes.
