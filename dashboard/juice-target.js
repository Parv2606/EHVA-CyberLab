const express = require("express");
const http = require("http");

function startJuiceTarget(port = 3000) {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Deliberately omit security headers (X-Frame-Options, CSP, HSTS) to replicate Juice Shop's lab state
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
  });

  const PRODUCTS = [
    { id: 1, name: "Apple Juice (1000ml)", price: 1.99, description: "The classic apple juice with 100% pure juice content.", icon: "🍎" },
    { id: 2, name: "Apple Pomace", price: 0.89, description: "Finest apple pomace for baking and flavoring.", icon: "🍏" },
    { id: 3, name: "Banana Juice (1000ml)", price: 1.99, description: "Monkeys love it, you will too!", icon: "🍌" },
    { id: 4, name: "Carrot Juice (1000ml)", price: 2.99, description: "Rich in beta-carotene for healthy eyes.", icon: "🥕" },
    { id: 5, name: "Eggfruit Juice (500ml)", price: 8.99, description: "Exotic and rich custard-like flavor.", icon: "🥚" },
    { id: 6, name: "Fruit Press", price: 89.99, description: "Heavy duty manual fruit press for fresh extraction.", icon: "⚙️" },
    { id: 7, name: "Green Smoothie", price: 1.99, description: "Spinach, kale, and apple blend for vitality.", icon: "🥬" },
    { id: 8, name: "Lemon Juice (500ml)", price: 2.99, description: "Sour and zesty fresh lemon extract.", icon: "🍋" },
    { id: 9, name: "Melon Bike (Orange)", price: 2999.00, description: "The most luxurious melon-themed cruiser.", icon: "🚲" },
    { id: 10, name: "OWASP Juice Shop CTF Girlie-Shirt", price: 22.49, description: "Official 100% organic cotton hacker tee.", icon: "👕" },
    { id: 11, name: "Orange Juice (1000ml)", price: 2.99, description: "Freshly squeezed sunshine.", icon: "🍊" },
    { id: 12, name: "Strawberry Juice (500ml)", price: 3.99, description: "Sweet field-grown berry bliss.", icon: "🍓" },
  ];

  // Juice Shop Product Search API (vulnerable to XSS reflection)
  app.get("/rest/products/search", (req, res) => {
    const q = req.query.q || "";
    const filtered = PRODUCTS.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));
    const results = filtered.map(p => ({
      ...p,
      description: `${p.description} (Matching search: ${q})` // Reflects payload unescaped
    }));

    res.json({
      status: "success",
      data: results.length > 0 ? results : [
        { id: 99, name: "Search Result", description: `No standard items found matching: ${q}`, price: 0 }
      ]
    });
  });

  // Juice Shop User Login API (vulnerable to SQLi auth-bypass & weak auth credential flooding)
  app.post("/rest/user/login", (req, res) => {
    const { email, password } = req.body || {};
    const emailStr = String(email || "");

    // SQL Injection bypass check: ' OR 1=1--
    const isSqli = emailStr.includes("'") || emailStr.includes("OR 1=1") || emailStr.includes("--") || emailStr.includes("/*");

    if (isSqli) {
      return res.status(200).json({
        authentication: {
          token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AanVpY2Utc2gub3AiLCJyb2xlIjoiYWRtaW4ifQ.JuiceShopExploitedSession",
          bid: 1,
          umail: "admin@juice-sh.op"
        }
      });
    }

    if (emailStr === "admin@juice-sh.op" && password === "admin123") {
      return res.status(200).json({
        authentication: {
          token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AanVpY2Utc2gub3AifQ.ValidAdminToken",
          bid: 1,
          umail: "admin@juice-sh.op"
        }
      });
    }

    // Default: failed login (no rate-limit header or lockout by default)
    return res.status(401).json({ error: "Invalid email or password." });
  });

  // Juice Shop Basket API (Vulnerable to IDOR: any user can read any basket)
  app.get("/rest/basket/:id", (req, res) => {
    const id = parseInt(req.params.id, 10);
    const mockBaskets = {
      1: {
        id: 1,
        owner: "admin@juice-sh.op",
        items: [
          { name: "OWASP Juice Shop CTF Girlie-Shirt", price: 22.49, quantity: 2 },
          { name: "Super Secret Master Token Keycard", price: 999.0, quantity: 1 }
        ],
        total: 1043.98,
        shipping: "OWASP Geneva HQ",
        payment: "Mastercard **** 8821"
      },
      2: {
        id: 2,
        owner: "victim@juice-sh.op",
        items: [
          { name: "Apple Juice (1000ml)", price: 1.99, quantity: 4 },
          { name: "Strawberry Juice (500ml)", price: 3.99, quantity: 2 }
        ],
        total: 15.94,
        shipping: "Victim Residence, Sydney",
        payment: "Visa **** 4111"
      }
    };

    const basket = mockBaskets[id] || {
      id,
      owner: `customer${id}@juice-sh.op`,
      items: [{ name: "Generic Juice", price: 2.99, quantity: 1 }],
      total: 2.99,
      shipping: "Private Address",
      payment: "Card **** 1234"
    };

    res.json({ status: "success", data: basket });
  });

  // Juice Shop FTP / static file download endpoint (vulnerable to path traversal)
  app.get("/ftp/:file", (req, res) => {
    const file = req.params.file || "";
    if (file.includes("eastere.gg")) {
      return res.type("text/plain").send("🎉 CONGRATULATIONS! JuiceShop{Tr4v3rs4l_M4st3r_2026}");
    }
    if (file.includes("legal.md")) {
      return res.type("text/markdown").send("# Legal Notice\nOWASP Juice Shop is licensed under Apache 2.0.");
    }
    if (file.includes("package.json") || file.includes("..")) {
      return res.type("application/json").send(JSON.stringify({
        name: "juice-shop-target",
        version: "16.0.0",
        vulnerability: "Directory Traversal / Arbitrary File Read",
        secretApiKey: "JUICE_SECRET_KEY_9921_LEAKED"
      }, null, 2));
    }
    res.type("text/plain").send(`Contents of simulated document: ${file}`);
  });

  // Juice Shop System Diagnostic Tool (vulnerable to OS Command Injection via shell metacharacters)
  app.post("/rest/diagnostic", (req, res) => {
    const { host } = req.body || {};
    const targetHost = String(host || "127.0.0.1; whoami").trim();
    const shellMetaRegex = /[;&|`$<>]/;
    const isInjected = shellMetaRegex.test(targetHost);

    let output = "";
    let injectedCommand = "";

    if (isInjected) {
      const parts = targetHost.split(/[;&|]/).map(s => s.trim()).filter(Boolean);
      injectedCommand = parts.slice(1).join(" ") || "whoami";
      output = [
        `PING 127.0.0.1 (127.0.0.1): 56 data bytes`,
        `64 bytes from 127.0.0.1: icmp_seq=0 ttl=64 time=0.045 ms`,
        `--- 127.0.0.1 ping statistics ---`,
        `1 packets transmitted, 1 packets received, 0.0% packet loss`,
        ``,
        `[SYSTEM SHELL EXECUTING INJECTED COMMAND: "${injectedCommand}"]`,
        injectedCommand.includes("whoami")
          ? `node-app-runner (uid=1000 gid=1000 groups=1000,27(sudo))`
          : injectedCommand.includes("id")
          ? `uid=1000(juice-admin) gid=1000(juice-admin) groups=1000(juice-admin)`
          : injectedCommand.includes("dir") || injectedCommand.includes("ls")
          ? `Dockerfile  docker-compose.yml  package.json  server.js  routes/  public/`
          : `Command "${injectedCommand}" executed successfully: [exit code 0]`
      ].join("\n");
    } else {
      output = [
        `PING ${targetHost} (${targetHost}): 56 data bytes`,
        `64 bytes from ${targetHost}: icmp_seq=0 ttl=64 time=0.038 ms`,
        `--- ${targetHost} ping statistics ---`,
        `1 packets transmitted, 1 packets received, 0.0% packet loss`
      ].join("\n");
    }

    res.json({
      status: "success",
      host: targetHost,
      injected: isInjected,
      injectedCommand: isInjected ? injectedCommand : null,
      output
    });
  });

  // Attack notification endpoint to synchronize attacks with localhost:3000
  let lastTargetAttack = null;
  app.post("/rest/attack-notify", (req, res) => {
    lastTargetAttack = {
      ...req.body,
      timestamp: Date.now()
    };
    res.json({ status: "acknowledged", attack: lastTargetAttack });
  });

  app.get("/rest/attack-notify/last", (req, res) => {
    res.json(lastTargetAttack || { none: true });
  });

  // Target Home Web App (renders interactive Juice Shop UI for live iframe)
  app.get("/", (req, res) => {
    const productsHtml = PRODUCTS.map(p =>
      '<div class="product-card">' +
        '<div class="card-icon">' + p.icon + '</div>' +
        '<div class="card-title">' + p.name + '</div>' +
        '<div class="card-desc">' + p.description + '</div>' +
        '<div class="card-footer">' +
          '<span class="card-price">' + p.price.toFixed(2) + ' ¤</span>' +
          '<button class="btn-buy" onclick="alert(\'Added ' + p.name.replace(/'/g, "\\'") + ' to basket\')">Add</button>' +
        '</div>' +
      '</div>'
    ).join("");

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OWASP Juice Shop • Vulnerable Target (localhost:3000)</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #2a2b2e; color: #eceff1; }
    header { background: #3f51b5; color: white; padding: 12px 20px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 8px rgba(0,0,0,0.4); position: sticky; top: 0; z-index: 100; }
    .brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 1.15rem; }
    .search-bar { flex: 1; max-width: 440px; margin: 0 20px; position: relative; }
    .search-bar input { width: 100%; padding: 8px 14px; border-radius: 4px; border: 2px solid transparent; outline: none; background: #ffffff; color: #333; font-size: 0.9rem; transition: border-color 0.2s, box-shadow 0.2s; }
    .search-bar input.exploit-active { border-color: #ef4444; box-shadow: 0 0 12px rgba(239, 68, 68, 0.7); animation: border-pulse 1s infinite alternate; }
    @keyframes border-pulse { 0% { box-shadow: 0 0 6px #ef4444; } 100% { box-shadow: 0 0 18px #ff0055; } }
    .nav-actions { display: flex; gap: 14px; align-items: center; }
    .nav-btn { background: transparent; border: none; color: white; cursor: pointer; font-size: 0.9rem; padding: 6px 10px; border-radius: 4px; display: flex; align-items: center; gap: 4px; }
    .nav-btn:hover { background: rgba(255,255,255,0.15); }
    .banner { background: #ff9800; color: #212121; text-align: center; padding: 8px; font-size: 0.82rem; font-weight: 600; }
    .exploit-banner-live { background: linear-gradient(90deg, #b91c1c, #991b1b, #7f1d1d); color: white; padding: 10px 16px; font-size: 0.85rem; font-weight: 700; display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #ef4444; animation: slide-down 0.3s ease-out; box-shadow: 0 4px 14px rgba(220,38,38,0.4); }
    @keyframes slide-down { from { transform: translateY(-100%); } to { transform: translateY(0); } }
    .container { max-width: 1100px; margin: 24px auto; padding: 0 16px; }
    .search-reflection-box { background: rgba(239,68,68,0.15); border: 2px solid #ef4444; padding: 14px 18px; border-radius: 6px; margin-bottom: 20px; color: #fecaca; animation: breach-shake 0.5s ease; }
    @keyframes breach-shake { 10%, 90% { transform: translate3d(-2px, 0, 0); } 20%, 80% { transform: translate3d(4px, 0, 0); } 30%, 50%, 70% { transform: translate3d(-5px, 0, 0); } 40%, 60% { transform: translate3d(5px, 0, 0); } }
    .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 18px; }
    .product-card { background: #37474f; border-radius: 8px; overflow: hidden; padding: 16px; display: flex; flex-direction: column; justify-content: space-between; border: 1px solid #455a64; transition: transform 0.15s; }
    .product-card:hover { transform: translateY(-2px); border-color: #64b5f6; }
    .card-icon { font-size: 2.5rem; text-align: center; margin-bottom: 10px; }
    .card-title { font-size: 1rem; font-weight: 600; margin-bottom: 6px; color: #ffffff; }
    .card-desc { font-size: 0.8rem; color: #b0bec5; margin-bottom: 12px; flex: 1; }
    .card-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
    .card-price { font-weight: 700; color: #81c784; }
    .btn-buy { background: #ff5722; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 0.8rem; }
    .btn-buy:hover { background: #f4511e; }
    .login-modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.7); align-items: center; justify-content: center; z-index: 200; }
    .login-modal.active { display: flex; }
    .login-box { background: #37474f; padding: 24px; border-radius: 8px; width: 340px; box-shadow: 0 8px 24px rgba(0,0,0,0.6); }
    .login-box h3 { margin-bottom: 16px; color: white; font-size: 1.2rem; }
    .login-box input { width: 100%; padding: 10px; margin-bottom: 12px; border-radius: 4px; border: 1px solid #546e7a; background: #263238; color: white; }
    .login-box button { width: 100%; padding: 10px; background: #3f51b5; color: white; border: none; border-radius: 4px; font-weight: 600; cursor: pointer; margin-top: 4px; }
    .login-msg { margin-top: 10px; font-size: 0.82rem; padding: 8px; border-radius: 4px; display: none; }
    .login-msg.error { background: rgba(244,67,54,0.2); color: #ef5350; border: 1px solid #ef5350; display: block; }
    .login-msg.success { background: rgba(76,175,80,0.2); color: #81c784; border: 1px solid #81c784; display: block; }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <span>🍹</span> OWASP Juice Shop
    </div>
    <div class="search-bar">
      <input type="text" id="target-search-field" placeholder="Search products..." onkeydown="if(event.key==='Enter') executeSearch(this.value)">
    </div>
    <div class="nav-actions">
      <button class="nav-btn" onclick="openDiagnosticModal()" id="btn-diagnostic-target">🔧 Diagnostics</button>
      <button class="nav-btn" onclick="openLoginModal()" id="btn-login-target">👤 <span id="user-display">Account</span></button>
      <button class="nav-btn">🛒 Basket (<span id="basket-count-badge">0</span>)</button>
    </div>
  </header>

  <div id="exploit-notification-bar" class="exploit-banner-live" style="display:none;">
    <div>
      <span id="exploit-badge-icon">💥</span>
      <span id="exploit-banner-title">LIVE ATTACK REFLECTION:</span>
      <span id="exploit-banner-desc" style="font-weight:400;margin-left:6px;">Payload successfully evaluated in target.</span>
    </div>
    <button onclick="this.parentElement.style.display='none'" style="background:none;border:none;color:white;cursor:pointer;font-weight:700;">✕</button>
  </div>

  <div class="banner">
    ⚠️ OWASP Juice Shop — Deliberately vulnerable training application running at http://localhost:3000.
  </div>

  <div class="container">
    <div id="search-reflection-area" class="search-reflection-box" style="display: none;"></div>

    <h2 style="margin-bottom: 16px; font-size: 1.2rem; color: #cfd8dc;">All Products</h2>
    <div class="products-grid" id="products-grid">
      ${productsHtml}
    </div>
  </div>

  <div class="login-modal" id="login-modal" onclick="if(event.target===this) this.classList.remove('active')">
    <div class="login-box">
      <h3>Login</h3>
      <input type="text" id="login-email" placeholder="Email" value="' OR 1=1--">
      <input type="password" id="login-pass" placeholder="Password" value="anything">
      <button onclick="doLogin()">Log in</button>
      <div id="login-feedback" class="login-msg"></div>
    </div>
  </div>

  <div class="login-modal" id="diagnostic-modal" onclick="if(event.target===this) this.classList.remove('active')">
    <div class="login-box" style="width: 520px; max-width: 95%;">
      <h3>🔧 Network Diagnostic Tool</h3>
      <p style="font-size:0.8rem;color:#b0bec5;margin-bottom:12px;">Ping diagnostic utility for connectivity testing.</p>
      <input type="text" id="diag-host-input" placeholder="Host / IP (e.g. 127.0.0.1)" value="127.0.0.1; whoami">
      <button onclick="runDiagnostic(document.getElementById('diag-host-input').value)">Execute Ping</button>
      <div id="diag-feedback" class="login-msg" style="display:none; font-family:monospace; white-space:pre-wrap; max-height:200px; overflow-y:auto; margin-top:12px; font-size:0.78rem;"></div>
    </div>
  </div>

  <script>
    function showLiveExploitBanner(title, desc, icon = "💥") {
      const bar = document.getElementById("exploit-notification-bar");
      if (!bar) return;
      document.getElementById("exploit-badge-icon").textContent = icon;
      document.getElementById("exploit-banner-title").textContent = title;
      document.getElementById("exploit-banner-desc").textContent = desc;
      bar.style.display = "flex";
    }

    function executeSearch(query) {
      const area = document.getElementById('search-reflection-area');
      const searchInput = document.getElementById('target-search-field');
      if (!query) {
        area.style.display = 'none';
        searchInput.classList.remove('exploit-active');
        return;
      }
      area.style.display = 'block';
      searchInput.classList.add('exploit-active');

      const isXss = query.includes('<') || query.includes('onerror') || query.includes('script') || query.includes('javascript:');
      if (isXss) {
        showLiveExploitBanner("DOM XSS REFLECTED!", "Search query was passed directly to innerHTML unescaped. Script executed in DOM!", "💥");
      }

      // Classic Juice Shop innerHTML vulnerability
      area.innerHTML = 'Showing search results for: <strong>' + query + '</strong>' + 
        (isXss ? ' <span style="background:#dc2626;color:white;padding:2px 6px;border-radius:3px;font-size:0.75rem;margin-left:8px;">💥 EXPLOIT EXECUTED</span>' : '');

      // Execute script tags if injected
      const scripts = area.getElementsByTagName('script');
      for (let s of scripts) {
        try { eval(s.innerText); } catch(e) {}
      }
    }

    // Check URL params for search query or exploit on load
    const params = new URLSearchParams(window.location.search);
    const qParam = params.get('q');
    if (qParam) {
      document.getElementById('target-search-field').value = qParam;
      executeSearch(qParam);
    }

    const exploitParam = params.get('exploit');
    if (exploitParam === 'sqli') {
      openLoginModal();
      document.getElementById('login-email').value = "' OR 1=1--";
      setTimeout(doLogin, 600);
    } else if (exploitParam === 'cmdi') {
      openDiagnosticModal();
      runDiagnostic("127.0.0.1; whoami");
    }

    // Listen for postMessage from parent dashboard window
    window.addEventListener("message", (event) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "EXECUTE_ATTACK_ANIMATION") {
        if (data.module === "xss") {
          const input = document.getElementById('target-search-field');
          const payload = (data.payload && data.payload.payload) || data.payload || "<img src=x onerror=alert('XSS')>";
          input.value = typeof payload === "string" ? payload : (payload.payload || "<img src=x onerror=alert('XSS')>");
          executeSearch(input.value);
        } else if (data.module === "sqli") {
          openLoginModal();
          const emailVal = (data.payload && data.payload.email) || data.email || "' OR 1=1--";
          document.getElementById('login-email').value = emailVal;
          setTimeout(doLogin, 500);
        } else if (data.module === "cmdi") {
          const hostVal = (data.payload && data.payload.host) || data.host || "127.0.0.1; whoami";
          openDiagnosticModal();
          const hostInput = document.getElementById("diag-host-input");
          if (hostInput) hostInput.value = hostVal;
          runDiagnostic(hostVal);
        } else if (data.module === "weakauth") {
          openLoginModal();
          const targetEmail = (data.payload && data.payload.email) || data.email || "admin@juice-sh.op";
          const attempts = parseInt((data.payload && data.payload.attempts) || data.attempts) || 8;
          const emailInput = document.getElementById("login-email");
          const passInput = document.getElementById("login-pass");
          const feedback = document.getElementById("login-feedback");
          if (emailInput) emailInput.value = targetEmail;
          showLiveExploitBanner("BRUTE FORCE CREDENTIAL SPRAY!", "Rapid login attempts targeting " + targetEmail + " without rate-limiting!", "⚡");
          let i = 0;
          const timer = setInterval(() => {
            i++;
            if (emailInput) emailInput.value = targetEmail;
            if (passInput) passInput.value = "wrongpass" + i;
            if (feedback) {
              feedback.className = "login-msg error";
              feedback.textContent = "Attempt " + i + "/" + attempts + " on " + targetEmail + ": 401 Unauthorized (No delay enforced)";
            }
            if (i >= attempts) {
              clearInterval(timer);
            }
          }, 120);
        }
      }
    });

    function openLoginModal() {
      document.getElementById('login-modal').classList.add('active');
    }

    function openDiagnosticModal() {
      document.getElementById('diagnostic-modal').classList.add('active');
    }

    async function runDiagnostic(host) {
      const feedback = document.getElementById('diag-feedback');
      if (!feedback) return;
      feedback.style.display = 'block';
      feedback.className = 'login-msg';
      feedback.textContent = 'Executing network diagnostic ping...';
      try {
        const res = await fetch('/rest/diagnostic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ host })
        });
        const data = await res.json();
        feedback.textContent = data.output;
        if (data.injected) {
          feedback.className = 'login-msg error';
          showLiveExploitBanner("OS COMMAND INJECTION EXPLOITED!", "Shell command chained via ';' executed with system privileges: " + (data.injectedCommand || host), "💻");
        } else {
          feedback.className = 'login-msg success';
        }
      } catch (err) {
        feedback.className = 'login-msg error';
        feedback.textContent = 'Diagnostic error: ' + err.message;
      }
    }

    async function doLogin() {
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-pass').value;
      const feedback = document.getElementById('login-feedback');
      try {
        const res = await fetch('/rest/user/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok && data.authentication) {
          feedback.className = 'login-msg success';
          feedback.textContent = 'Authenticated! Token: ' + data.authentication.token.slice(0, 24) + '...';
          document.getElementById('user-display').textContent = data.authentication.umail + " 👑";
          showLiveExploitBanner("SQL INJECTION BYPASSED AUTHENTICATION!", "Logged in as Administrator via query alteration ' OR 1=1--", "🔓");
          setTimeout(() => document.getElementById('login-modal').classList.remove('active'), 1400);
        } else {
          feedback.className = 'login-msg error';
          feedback.textContent = data.error || 'Invalid credentials.';
        }
      } catch (err) {
        feedback.className = 'login-msg error';
        feedback.textContent = 'Network error: ' + err.message;
      }
    }
  </script>
</body>
</html>`);
  });

  const server = app.listen(port, () => {
    console.log(`[JuiceTarget] Simulated Juice Shop target running on http://localhost:${port}`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.log(`[JuiceTarget] Port ${port} is already active (external target or container present).`);
    } else {
      console.error(`[JuiceTarget] Error starting server:`, err.message);
    }
  });

  return server;
}

module.exports = { startJuiceTarget };
