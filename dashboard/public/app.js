// ==========================================================================
// EHVA CyberLab • Client-Side Application Controller
// ==========================================================================

const JUICE_PRODUCTS = [
  { id: 1, name: "Apple Juice (1000ml)", price: "1.99 ¤", icon: "🍎" },
  { id: 2, name: "Apple Pomace", price: "0.89 ¤", icon: "🍏" },
  { id: 3, name: "Banana Juice (1000ml)", price: "1.99 ¤", icon: "🍌" },
  { id: 4, name: "Carrot Juice (1000ml)", price: "2.99 ¤", icon: "🥕" },
  { id: 5, name: "Eggfruit Juice (500ml)", price: "8.99 ¤", icon: "🥚" },
  { id: 6, name: "Fruit Press", price: "89.99 ¤", icon: "⚙️" },
  { id: 7, name: "Green Smoothie", price: "1.99 ¤", icon: "🥬" },
  { id: 8, name: "Lemon Juice (500ml)", price: "2.99 ¤", icon: "🍋" },
  { id: 9, name: "Melon Bike (Orange)", price: "2999.00 ¤", icon: "🚲" },
  { id: 10, name: "OWASP Juice Shop CTF Girlie-Shirt", price: "22.49 ¤", icon: "👕" },
  { id: 11, name: "Orange Juice (1000ml)", price: "2.99 ¤", icon: "🍊" },
  { id: 12, name: "Strawberry Juice (500ml)", price: "3.99 ¤", icon: "🍓" },
];

// --- Application State ---
let activeModule = "xss";
let lastAttackModule = "xss";
let lastAttackParams = {};
let autoPreviewEnabled = false;
let autoAnimateEnabled = localStorage.getItem("ehvaAutoAnimate") !== "false";
let isDockedMode = localStorage.getItem("juiceDockedMode") === "true";
let isDarkMode = localStorage.getItem("ehvaDarkMode") === "true";

// Juice Shop Simulation State
let currentJuiceUser = null;
let currentBasketCount = 0;
let currentJuicePage = "store";
let snackbarTimer = null;

function isAutoAnimateEnabled() {
  return autoAnimateEnabled;
}

function toggleAutoAnimate(enabled) {
  autoAnimateEnabled = enabled;
  localStorage.setItem("ehvaAutoAnimate", enabled);
  const chk = document.getElementById("chk-auto-animate");
  if (chk) chk.checked = enabled;
  showJuiceSnackbar(enabled ? "Target Exploit Auto-Animation: Enabled." : "Target Exploit Auto-Animation: Disabled.");
}

function updateGlobalPipeline(mod, customPayload = null) {
  const packetLabel = document.getElementById("global-packet-label");
  const telemetry = document.getElementById("global-pipeline-telemetry");
  if (!packetLabel || !telemetry) return;

  const defaultPayloadMap = {
    xss: document.getElementById("xss-payload")?.value || "<img src=x onerror=alert('XSS')>",
    sqli: document.getElementById("sqli-email")?.value || "' OR 1=1--",
    cmdi: document.getElementById("cmdi-host")?.value || "127.0.0.1; whoami",
    csrf: document.getElementById("csrf-email")?.value || "attacker@evil.com",
    weakauth: "POST /rest/user/login (" + (document.getElementById("weakauth-attempts")?.value || "8") + " requests)",
    headers: "Clickjacking Decoy Framing",
    scanner: document.getElementById("nmap-cmd-string")?.textContent || "nmap -sT -sV 127.0.0.1",
    report: "Audit Assessment Telemetry"
  };

  const payload = customPayload || defaultPayloadMap[mod] || "PAYLOAD READY";
  packetLabel.textContent = payload;
  telemetry.textContent = `STANDBY • READY TO TRANSMIT [${(mod || 'xss').toUpperCase()}]`;
  telemetry.classList.remove("breach");
}

function triggerPipelineTransmission(mod, payloadStr, onImpact = null) {
  updateGlobalPipeline(mod, payloadStr);
  const packet = document.getElementById("global-pipeline-packet");
  const targetNode = document.getElementById("global-target-node");
  const telemetry = document.getElementById("global-pipeline-telemetry");

  if (telemetry) {
    telemetry.textContent = `TRANSMITTING [${mod.toUpperCase()}] PAYLOAD TO 127.0.0.1:3000...`;
    telemetry.classList.remove("breach");
  }

  if (packet) {
    packet.classList.remove("firing");
    void packet.offsetWidth;
    packet.classList.add("firing");
  }

  // Execute impact callback
  if (onImpact) {
    if (!packet && !telemetry) {
      onImpact();
    } else {
      setTimeout(() => {
        if (targetNode) {
          targetNode.classList.remove("target-hit");
          void targetNode.offsetWidth;
          targetNode.classList.add("target-hit");
        }
        onImpact();
      }, 250);
    }
  }
}

function dispatchAttackToLiveTarget(module, payload) {
  try {
    const iframe = document.getElementById("live-juice-iframe");
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        type: "EXECUTE_ATTACK_ANIMATION",
        module,
        payload: typeof payload === "object" ? payload : { payload }
      }, "*");
    }
  } catch (e) {}

  fetch("http://localhost:3000/rest/attack-notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ module, payload })
  }).catch(() => {});
}

// ==========================================================================
// Initialization
// ==========================================================================
if (isDarkMode) {
  document.body.classList.add("dark-mode");
  const icon = document.getElementById("theme-icon");
  const text = document.getElementById("theme-text");
  if (icon) icon.textContent = "☀️";
  if (text) text.textContent = "Light Mode";
}

if (isDockedMode) {
  const modal = document.getElementById("juice-preview-modal");
  if (modal) modal.classList.add("docked-mode");
  const dockBtn = document.getElementById("btn-dock-toggle");
  if (dockBtn) dockBtn.textContent = "🗗 Centered";
}

renderJuiceProducts();
loadReport();

// Check target health
async function checkJuiceShopStatus() {
  const dot = document.getElementById("global-status-dot");
  const text = document.getElementById("global-status-text");
  const liveDot = document.getElementById("live-connection-dot");
  const liveText = document.getElementById("live-connection-text");
  try {
    const res = await fetch("/api/juice-status");
    const data = await res.json();
    if (data.reachable) {
      if (dot) {
        dot.className = "status-dot dot-online";
        text.textContent = "Juice Shop: Connected";
      }
      if (liveDot) liveDot.className = "live-dot connected";
      if (liveText) liveText.textContent = "Juice Shop active at " + data.url;
      const iframe = document.getElementById("live-juice-iframe");
      const fallback = document.getElementById("live-frame-fallback");
      if (iframe && (!iframe.src || iframe.src === "about:blank")) {
        iframe.src = "http://localhost:3000";
      }
      if (fallback) fallback.classList.remove("active");
    } else {
      if (dot) {
        dot.className = "status-dot dot-unknown";
        text.textContent = "Juice Shop: Lab Simulated";
      }
      if (liveDot) liveDot.className = "live-dot failed";
      if (liveText) liveText.textContent = "Juice Shop container offline (running in target spotlight mode)";
      const fallback = document.getElementById("live-frame-fallback");
      if (fallback) fallback.classList.add("active");
    }
  } catch (e) {
    if (dot) {
      dot.className = "status-dot dot-unknown";
      text.textContent = "Target: Lab Active";
    }
  }
}
checkJuiceShopStatus();
setInterval(checkJuiceShopStatus, 15000);

// ==========================================================================
// Theme & Preset Helpers
// ==========================================================================
function toggleDarkMode() {
  isDarkMode = !isDarkMode;
  document.body.classList.toggle("dark-mode", isDarkMode);
  localStorage.setItem("ehvaDarkMode", isDarkMode);
  const icon = document.getElementById("theme-icon");
  const text = document.getElementById("theme-text");
  if (icon) icon.textContent = isDarkMode ? "☀️" : "🌙";
  if (text) text.textContent = isDarkMode ? "Light Mode" : "Dark Mode";
}

function applyPreset(inputId, val) {
  const el = document.getElementById(inputId);
  if (el) {
    el.value = val;
    el.classList.add("error-shake");
    setTimeout(() => el.classList.remove("error-shake"), 300);
    updateGlobalPipeline(activeModule, val);
  }
}

function copyValue(inputId) {
  const el = document.getElementById(inputId);
  if (el && el.value) {
    navigator.clipboard.writeText(el.value).then(() => {
      showJuiceSnackbar("Copied payload to clipboard: " + el.value.slice(0, 30));
    });
  }
}

function copyPre(preId) {
  const el = document.getElementById(preId);
  if (el && el.textContent) {
    navigator.clipboard.writeText(el.textContent).then(() => {
      showJuiceSnackbar("Copied response to clipboard.");
    });
  }
}

function toggleAccordion(bodyId) {
  const body = document.getElementById(bodyId);
  if (body) {
    body.style.display = body.style.display === "none" ? "block" : "none";
  }
}

// ==========================================================================
// Dashboard Tab Switching
// ==========================================================================
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    activeModule = btn.dataset.tab;
    const panel = document.getElementById(activeModule);
    if (panel) panel.classList.add("active");
    if (activeModule === "report") loadReport();

    // Synchronize the Cyber Attack Pipeline with active tab
    updateGlobalPipeline(activeModule);

    // If preview modal is open, reflect the relevant view
    const modal = document.getElementById("juice-preview-modal");
    if (modal && modal.classList.contains("open") && activeModule !== "report") {
      openJuiceShopPreview(activeModule);
    }
  });
});

function show(id, data) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  }
}

// ==========================================================================
// Target Spotlight Navigation
// ==========================================================================
function navigateToJuicePage(pageName) {
  currentJuicePage = pageName;
  document.querySelectorAll(".mock-page").forEach((p) => p.classList.remove("active"));
  document.querySelectorAll(".target-reticle").forEach((r) => r.classList.remove("active"));

  const targetPage = document.getElementById(`page-juice-${pageName}`);
  if (targetPage) targetPage.classList.add("active");

  const urlDisplay = document.getElementById("juice-url-display");
  if (urlDisplay) {
    if (pageName === "store") {
      const searchVal = document.getElementById("mock-search-input")?.value || "";
      urlDisplay.textContent = searchVal
        ? `http://localhost:3000/#/search?q=${encodeURIComponent(searchVal)}`
        : "http://localhost:3000/#/search";
    } else {
      urlDisplay.textContent = `http://localhost:3000/#/${pageName}`;
    }
  }

  const dropdown = document.getElementById("mock-account-dropdown");
  if (dropdown) dropdown.classList.remove("show");
}

function renderJuiceProducts(filter = "") {
  const grid = document.getElementById("juice-product-grid");
  const countEl = document.getElementById("juice-product-count");
  if (!grid) return;

  grid.innerHTML = "";
  const query = (filter || "").toLowerCase().trim();
  const matched = JUICE_PRODUCTS.filter((p) => p.name.toLowerCase().includes(query));

  if (countEl) countEl.textContent = `${matched.length} item${matched.length === 1 ? "" : "s"}`;

  if (matched.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:2rem;color:#64748b;">
        <div style="font-size:2rem;margin-bottom:0.5rem">🔍</div>
        <h4>No products found for "${escapeHtml(filter)}"</h4>
        <p style="font-size:0.85rem">Try searching for apple, orange, banana, or carrot.</p>
      </div>
    `;
    return;
  }

  matched.forEach((p) => {
    const card = document.createElement("div");
    card.className = "mock-product-card";
    card.innerHTML = `
      <div class="product-img">${p.icon}</div>
      <div class="product-info">
        <h4>${p.name}</h4>
        <div class="price">${p.price}</div>
        <button class="btn-add-basket" onclick="addToBasket(${p.id})">Add to Basket</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

function handleJuiceSearchInput(val) {
  const clearBtn = document.getElementById("mock-search-clear");
  if (clearBtn) clearBtn.classList.toggle("active", !!val);
  renderJuiceProducts(val);

  const urlDisplay = document.getElementById("juice-url-display");
  if (urlDisplay && currentJuicePage === "store") {
    urlDisplay.textContent = val
      ? `http://localhost:3000/#/search?q=${encodeURIComponent(val)}`
      : "http://localhost:3000/#/search";
  }
}

function clearJuiceSearch() {
  const input = document.getElementById("mock-search-input");
  if (input) input.value = "";
  handleJuiceSearchInput("");
  const resCard = document.getElementById("juice-search-results-card");
  if (resCard) resCard.style.display = "none";
}

function addToBasket(id) {
  currentBasketCount++;
  const badge = document.getElementById("mock-basket-count");
  if (badge) badge.textContent = currentBasketCount;
  const product = JUICE_PRODUCTS.find((p) => p.id === id);
  showJuiceSnackbar(`Added ${product ? product.name : "item"} to basket. (Basket: ${currentBasketCount})`);
}

function toggleJuiceAccountMenu() {
  const dropdown = document.getElementById("mock-account-dropdown");
  if (dropdown) dropdown.classList.toggle("show");
}

function submitJuiceLogin() {
  const emailInput = document.getElementById("mock-login-email");
  const passInput = document.getElementById("mock-login-pass");
  const email = emailInput ? emailInput.value : "";
  const password = passInput ? passInput.value : "";

  if (email.includes("'") || email.includes("OR 1=1") || email.includes("--")) {
    executeLiveAttackReflection("sqli", { email, password });
  } else {
    emailInput?.classList.add("error-shake");
    passInput?.classList.add("error-shake");
    setTimeout(() => {
      emailInput?.classList.remove("error-shake");
      passInput?.classList.remove("error-shake");
    }, 400);
  }
}

function performJuiceLogout() {
  currentJuiceUser = null;
  const label = document.getElementById("mock-account-label");
  const avatar = document.getElementById("mock-account-avatar");
  const menuLogout = document.getElementById("menu-item-logout");
  const menuLogin = document.getElementById("menu-item-login");
  const basketCount = document.getElementById("mock-basket-count");

  if (label) label.textContent = "Account";
  if (avatar) avatar.textContent = "👤";
  if (menuLogout) menuLogout.style.display = "none";
  if (menuLogin) menuLogin.style.display = "block";
  if (basketCount) basketCount.textContent = "0";
  currentBasketCount = 0;

  showJuiceSnackbar("Logged out successfully.");
  toggleJuiceAccountMenu();
  navigateToJuicePage("store");
}

function showJuiceSnackbar(msg, duration = 3000) {
  const bar = document.getElementById("juice-snackbar");
  const text = document.getElementById("juice-snackbar-text");
  if (!bar || !text) return;

  text.textContent = msg;
  bar.classList.add("show");
  clearTimeout(snackbarTimer);
  snackbarTimer = setTimeout(() => {
    bar.classList.remove("show");
  }, duration);
}

function showAttackReflectionBanner(title, msg, icon = "💥") {
  const banner = document.getElementById("attack-reflection-banner");
  const titleEl = document.getElementById("reflection-title");
  const msgEl = document.getElementById("reflection-msg");
  const iconEl = document.getElementById("reflection-icon");

  if (banner && titleEl && msgEl) {
    titleEl.textContent = title;
    msgEl.textContent = msg;
    if (iconEl) iconEl.textContent = icon;
    banner.style.display = "flex";
  }
}

function dismissReflectionBanner() {
  const banner = document.getElementById("attack-reflection-banner");
  if (banner) banner.style.display = "none";
}

function updateClickjackOpacity(val) {
  const layer = document.getElementById("clickjack-attacker-layer");
  if (layer) layer.style.opacity = val / 100;
}

function handleClickjackDecoy() {
  showJuiceSnackbar("⚠️ CLICKJACKED! Attacker hijacked click to confirm sensitive transfer!", 4500);
  const victimBtn = document.getElementById("victim-action-btn");
  if (victimBtn) {
    victimBtn.style.background = "#ff9800";
    setTimeout(() => { victimBtn.style.background = "#dc2626"; }, 600);
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ==========================================================================
// Target Preview Controller & Spotlight Engine
// ==========================================================================
function openJuiceShopPreview(mod = null, attackContext = null) {
  const targetModule = mod || activeModule;
  if (targetModule === "report") return;
  lastAttackModule = targetModule;
  if (attackContext) lastAttackParams = attackContext;

  const modal = document.getElementById("juice-preview-modal");
  if (modal) {
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
  }

  executeLiveAttackReflection(targetModule, lastAttackParams);
}

function closeJuiceShopPreview() {
  const modal = document.getElementById("juice-preview-modal");
  if (modal) {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  }
  dismissMockXssAlert();
}

function toggleJuiceShopDock() {
  const modal = document.getElementById("juice-preview-modal");
  const dockBtn = document.getElementById("btn-dock-toggle");
  if (!modal) return;
  modal.classList.toggle("docked-mode");
  const isDocked = modal.classList.contains("docked-mode");
  localStorage.setItem("juiceDockedMode", isDocked);
  if (dockBtn) {
    dockBtn.textContent = isDocked ? "🗗 Centered" : "◫ Dock";
  }
}

function switchPreviewView(viewName) {
  document.querySelectorAll(".view-btn").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".preview-view").forEach((v) => v.classList.remove("active"));

  const btn = document.getElementById(`btn-view-${viewName}`);
  const view = document.getElementById(`view-${viewName}`);
  if (btn) btn.classList.add("active");
  if (view) view.classList.add("active");

  if (viewName === "live") {
    const iframe = document.getElementById("live-juice-iframe");
    if (iframe && (!iframe.src || iframe.src === "about:blank")) {
      iframe.src = "http://localhost:3000";
    }
  }
}

function reloadLiveJuiceShop() {
  const iframe = document.getElementById("live-juice-iframe");
  if (iframe) iframe.src = "http://localhost:3000?t=" + Date.now();
}

function replayAttackAnimation() {
  executeLiveAttackReflection(lastAttackModule, lastAttackParams);
}

function dismissMockXssAlert() {
  const alertOverlay = document.getElementById("mock-xss-alert");
  if (alertOverlay) alertOverlay.classList.remove("active");
}

// --- Animation Helpers (Nirmit CyberLab Engine) ---
function simulateTyping(inputEl, text, onComplete) {
  if (!inputEl) {
    if (onComplete) onComplete();
    return;
  }
  inputEl.value = "";
  inputEl.focus?.();
  let idx = 0;
  const speed = Math.max(12, Math.min(40, Math.floor(550 / Math.max(1, text.length))));
  const timer = setInterval(() => {
    if (idx < text.length) {
      inputEl.value += text.charAt(idx);
      idx++;
    } else {
      clearInterval(timer);
      if (onComplete) onComplete();
    }
  }, speed);
}

function setAttackState(moduleId, isFiring) {
  const panel = document.getElementById(moduleId)?.querySelector(".panel.attack");
  const btn = panel?.querySelector(".btn-run-attack");
  if (panel) panel.classList.toggle("firing", isFiring);
  if (btn) btn.classList.toggle("firing", isFiring);

  const globalStatus = document.getElementById("global-status-text");
  const globalDot = document.getElementById("global-status-dot");
  if (isFiring) {
    if (globalStatus) globalStatus.textContent = `🚨 EXPLOIT FIRING: [${moduleId.toUpperCase()}] TRANSMITTING...`;
    if (globalDot) globalDot.className = "status-dot dot-offline";
  } else {
    checkJuiceShopStatus();
  }
}

function setDefendState(moduleId, isDefending) {
  const panel = document.getElementById(moduleId)?.querySelector(".panel.defend");
  const btn = panel?.querySelector(".btn-run-defend");
  if (panel) panel.classList.toggle("defending", isDefending);
  if (btn) btn.classList.toggle("defending", isDefending);

  const globalStatus = document.getElementById("global-status-text");
  const globalDot = document.getElementById("global-status-dot");
  if (isDefending) {
    if (globalStatus) globalStatus.textContent = `🛡️ DEFENSE ACTIVE: [${moduleId.toUpperCase()}] MITIGATING...`;
    if (globalDot) globalDot.className = "status-dot dot-online";
  } else {
    checkJuiceShopStatus();
  }
}

function triggerBreachImpact(moduleId) {
  const panel = document.getElementById(moduleId)?.querySelector(".panel.attack");
  if (panel) {
    panel.classList.remove("breach-shake");
    void panel.offsetWidth;
    panel.classList.add("breach-shake");
    setTimeout(() => panel.classList.remove("breach-shake"), 600);
  }

  // Also shake active card inside spotlight preview
  const modal = document.getElementById("juice-preview-modal");
  if (modal && modal.classList.contains("open")) {
    const spotlightCard = modal.querySelector(".mock-page.active .mock-basket-card, .mock-page.active .mock-traversal-card, .mock-page.active .mock-card-generic, .mock-page.active .mock-auth-card, .mock-page.active .mock-profile-card, .mock-page.active #juice-search-results-card");
    if (spotlightCard) {
      spotlightCard.classList.remove("breach-shake");
      void spotlightCard.offsetWidth;
      spotlightCard.classList.add("breach-shake");
      setTimeout(() => spotlightCard.classList.remove("breach-shake"), 600);
    }
  }
}

function streamTerminalOutput(elId, data) {
  const el = document.getElementById(elId);
  if (!el) return;
  const rawText = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  el.classList.add("term-streaming");

  const lines = rawText.split("\n");
  if (lines.length <= 1) {
    el.textContent = rawText;
    setTimeout(() => el.classList.remove("term-streaming"), 250);
    return;
  }

  el.textContent = "";
  let lineIdx = 0;
  const lineTimer = setInterval(() => {
    if (lineIdx < lines.length) {
      el.textContent += lines[lineIdx] + (lineIdx < lines.length - 1 ? "\n" : "");
      lineIdx++;
    } else {
      clearInterval(lineTimer);
      el.classList.remove("term-streaming");
    }
  }, 16);
}

function executeLiveAttackReflection(mod, params = {}) {
  switchPreviewView("spotlight");
  dismissMockXssAlert();
  document.querySelectorAll(".target-reticle").forEach((r) => r.classList.remove("active"));

  const hudBadge = document.getElementById("hud-badge");
  const hudTitle = document.getElementById("hud-title");
  const hudDesc = document.getElementById("hud-desc");
  const hudTargetEl = document.getElementById("hud-target-element");

  if (mod === "xss") {
    navigateToJuicePage("store");
    const payload = params.payload || document.getElementById("xss-payload")?.value || "<img src=x onerror=alert('XSS')>";

    if (hudBadge) hudBadge.textContent = "💥 XSS REFLECTED";
    if (hudTitle) hudTitle.textContent = "Search Bar Query Injection (DOM XSS)";
    if (hudDesc) hudDesc.textContent = "Query inserted unescaped into innerHTML — Script evaluates in the DOM!";
    if (hudTargetEl) hudTargetEl.innerHTML = 'Target: <code>&lt;input id="searchQuery"&gt; in Navbar</code>';

    const searchInput = document.getElementById("mock-search-input");
    const searchReticle = document.getElementById("reticle-search");
    const resCard = document.getElementById("juice-search-results-card");
    const domContainer = document.getElementById("juice-dom-xss-container");

    if (searchReticle) searchReticle.classList.add("active");

    simulateTyping(searchInput, payload, () => {
      if (resCard) {
        resCard.style.display = "block";
        resCard.classList.remove("breach-shake");
        void resCard.offsetWidth;
        resCard.classList.add("breach-shake");
      }
      if (domContainer) {
        domContainer.innerHTML = escapeHtml(payload) + ` <span style="background:#dc2626;color:#fff;font-size:0.7rem;padding:2px 4px;border-radius:2px;font-weight:700">EXECUTED</span>`;
      }
      renderJuiceProducts(payload);
      showAttackReflectionBanner("DOM XSS Reflected!", `Query "${payload}" injected via innerHTML. Script executed!`, "💥");

      setTimeout(() => {
        const alertBody = document.getElementById("mock-alert-text");
        const alertOverlay = document.getElementById("mock-xss-alert");
        if (alertBody) {
          const match = payload.match(/alert\((['"]?)(.*?)\1\)/);
          alertBody.textContent = match ? match[2] || "XSS" : "XSS Executed!";
        }
        if (alertOverlay) alertOverlay.classList.add("active");
      }, 350);
    });

  } else if (mod === "sqli") {
    navigateToJuicePage("login");
    const email = params.email || document.getElementById("sqli-email")?.value || "' OR 1=1--";
    const password = params.password || document.getElementById("sqli-password")?.value || "anything";

    if (hudBadge) hudBadge.textContent = "💥 SQLi AUTH BYPASS REFLECTED";
    if (hudTitle) hudTitle.textContent = "Customer Login (/rest/user/login)";
    if (hudDesc) hudDesc.textContent = "SQL query logic altered: WHERE clause forced to TRUE. Logged in as Administrator!";
    if (hudTargetEl) hudTargetEl.innerHTML = 'Target: <code>&lt;input id="email"&gt; in Login Form</code>';

    const reticle = document.getElementById("reticle-sqli");
    const emailInput = document.getElementById("mock-login-email");
    const passInput = document.getElementById("mock-login-pass");
    const inspector = document.getElementById("mock-sqli-inspector");
    const querySpan = document.getElementById("live-sqli-code");
    const submitBtn = document.getElementById("mock-login-submit");

    if (reticle) reticle.classList.add("active");
    if (querySpan) querySpan.textContent = email;

    simulateTyping(emailInput, email, () => {
      if (passInput) passInput.value = password;
      if (submitBtn) {
        submitBtn.style.transform = "scale(0.96)";
        setTimeout(() => { submitBtn.style.transform = "scale(1)"; }, 200);
      }

      setTimeout(() => {
        if (inspector) {
          inspector.style.display = "block";
          inspector.classList.remove("breach-shake");
          void inspector.offsetWidth;
          inspector.classList.add("breach-shake");
        }
        currentJuiceUser = { email: "admin@juice-sh.op", role: "Administrator" };
        const accountLabel = document.getElementById("mock-account-label");
        if (accountLabel) accountLabel.textContent = "admin@juice-sh.op 👑";
        showAttackReflectionBanner("SQL Injection Bypassed Login!", "Query condition forced to TRUE. Authenticated as Administrator!", "🔓");
        showJuiceSnackbar("🎉 Bypassed authentication via SQL Injection!");
      }, 300);
    });

  } else if (mod === "cmdi") {
    navigateToJuicePage("cmdi");
    const host = params.host || document.getElementById("cmdi-host")?.value || "127.0.0.1; whoami";

    if (hudBadge) hudBadge.textContent = "COMMAND INJECTION REFLECTED";
    if (hudTitle) hudTitle.textContent = "System Command Evaluation (RCE)";
    if (hudDesc) hudDesc.textContent = "Shell metacharacters executed arbitrary OS payload with system privileges.";
    if (hudTargetEl) hudTargetEl.innerHTML = 'Target: <code>Host Diagnostic Input</code>';

    const reticle = document.getElementById("reticle-cmdi");
    const input = document.getElementById("mock-cmdi-input");
    const cmdiCard = document.getElementById("card-spotlight-cmdi");
    const terminal = document.getElementById("cmdi-terminal-preview");

    if (reticle) reticle.classList.add("active");

    simulateTyping(input, host, () => {
      if (cmdiCard) {
        cmdiCard.classList.remove("breach-shake");
        void cmdiCard.offsetWidth;
        cmdiCard.classList.add("breach-shake");
      }
      if (terminal) {
        terminal.textContent = `PING ${host}: 56 data bytes\n64 bytes from 127.0.0.1: time=0.04 ms\n\n[INJECTED COMMAND EXECUTED]\nnode-app-runner (uid=1000 gid=1000 groups=1000)`;
      }
      showAttackReflectionBanner("Command Injection Reflected!", `Arbitrary command executed on server via shell chaining!`, "💻");
    });

  } else if (mod === "csrf") {
    navigateToJuicePage("profile");
    const newEmail = params.newEmail || document.getElementById("csrf-email")?.value || "attacker@evil.com";

    if (hudBadge) hudBadge.textContent = "CSRF FORGERY REFLECTED";
    if (hudTitle) hudTitle.textContent = "State-Changing Action (/api/csrf/attack)";
    if (hudDesc) hudDesc.textContent = "Victim profile email overwritten without Anti-CSRF token verification.";
    if (hudTargetEl) hudTargetEl.innerHTML = 'Target: <code>POST /rest/user/change-email</code>';

    const reticle = document.getElementById("reticle-csrf");
    const emailInput = document.getElementById("mock-profile-email");
    const diffCard = document.getElementById("mock-csrf-diff");
    const diffNew = document.getElementById("csrf-diff-new");
    const profileCard = document.querySelector(".mock-profile-card");

    if (reticle) reticle.classList.add("active");

    simulateTyping(emailInput, newEmail, () => {
      if (profileCard) {
        profileCard.classList.remove("breach-shake");
        void profileCard.offsetWidth;
        profileCard.classList.add("breach-shake");
      }
      if (diffCard) diffCard.style.display = "block";
      if (diffNew) diffNew.textContent = newEmail;
      showAttackReflectionBanner("CSRF Exploit Reflected!", `Victim email overwritten to "${newEmail}" with zero token verification.`, "🚨");
    });

  } else if (mod === "weakauth") {
    navigateToJuicePage("login");
    const targetEmail = params.email || document.getElementById("weakauth-email")?.value || "admin@juice-sh.op";
    const attempts = parseInt(params.attempts) || parseInt(document.getElementById("weakauth-attempts")?.value) || 8;

    if (hudBadge) hudBadge.textContent = "BRUTE FORCE REFLECTED";
    if (hudTitle) hudTitle.textContent = "Login Endpoint Credential Flooding";
    if (hudDesc) hudDesc.textContent = "Rapid login attempts accepted without 429 lockout delays.";
    if (hudTargetEl) hudTargetEl.innerHTML = 'Target: <code>POST /rest/user/login</code>';

    const emailInput = document.getElementById("mock-login-email");
    if (emailInput) {
      emailInput.value = targetEmail;
    }

    const reticle = document.getElementById("reticle-weakauth");
    const floodMeter = document.getElementById("mock-weakauth-flood");
    const bar = document.getElementById("mock-weakauth-bar");
    const badge = document.getElementById("weakauth-counter-badge");
    const log = document.getElementById("mock-weakauth-log");
    const passInput = document.getElementById("mock-login-pass");

    if (reticle) reticle.classList.add("active");
    if (floodMeter) floodMeter.style.display = "block";
    if (log) log.innerHTML = "";

    let count = 0;
    const sprayTimer = setInterval(() => {
      count++;
      if (bar) bar.style.width = Math.round((count / attempts) * 100) + "%";
      if (badge) badge.textContent = `${count} / ${attempts} attempts`;
      if (passInput) {
        passInput.value = "password" + count;
        passInput.classList.remove("error-shake");
        void passInput.offsetWidth;
        passInput.classList.add("error-shake");
      }
      if (log) {
        const row = document.createElement("div");
        row.className = "weakauth-log-entry";
        row.innerHTML = `<span>Attempt #${count} [${escapeHtml(targetEmail)}]: guess${count}</span><span style="color:#dc2626">401 (0s delay)</span>`;
        log.appendChild(row);
      }
      if (count >= attempts) {
        clearInterval(sprayTimer);
        showAttackReflectionBanner("Weak Auth Reflected!", `${attempts} rapid login attempts completed with ZERO lockout for ${escapeHtml(targetEmail)}.`, "⚡");
      }
    }, 70);

  } else if (mod === "headers") {
    navigateToJuicePage("headers");
    if (hudBadge) hudBadge.textContent = "CLICKJACKING REFLECTED";
    if (hudTitle) hudTitle.textContent = "Missing X-Frame-Options Framing";
    if (hudDesc) hudDesc.textContent = "Absence of X-Frame-Options allows transparent iframe clickjacking.";
    if (hudTargetEl) hudTargetEl.innerHTML = 'Target: <code>HTTP Response Directives</code>';
    showAttackReflectionBanner("Missing Headers Reflected!", "Target page framed inside decoy layer. Adjust slider to reveal!", "👁️");

  } else if (mod === "scanner") {
    navigateToJuicePage("scanner");
    if (hudBadge) hudBadge.textContent = "PORT RECONNAISSANCE ACTIVE";
    if (hudTitle) hudTitle.textContent = "TCP Socket Discovery & Attack Surface Mapping";
    if (hudDesc) hudDesc.textContent = "Port 3000 verified OPEN and strictly required for all 6 OWASP web attack vectors.";
    if (hudTargetEl) hudTargetEl.innerHTML = 'Target: <code>127.0.0.1:3000 (HTTP) & :8080</code>';
    showAttackReflectionBanner("Port Recon Complete!", "Port 3000 confirmed listening and exposed for all web exploits.", "📡");
  }
}

// ==========================================================================
// Attack & Defense API Runners
// ==========================================================================
async function run(module, mode, method = "POST") {
  const outId = `${module}-${mode}-out`;
  show(outId, "Running " + mode + " assessment...");

  const payload = module === "xss" ? (document.getElementById("xss-payload")?.value || "<img src=x onerror=alert('XSS')>") : "HTTP Directives";

  if (mode === "attack") {
    setAttackState(module, true);
    triggerPipelineTransmission(module, payload, () => {
      dispatchAttackToLiveTarget(module, payload);
      if (isAutoAnimateEnabled()) {
        openJuiceShopPreview(module, { payload });
      } else {
        const modal = document.getElementById("juice-preview-modal");
        if (modal && modal.classList.contains("open")) {
          executeLiveAttackReflection(module, { payload });
        }
      }
    });
  } else {
    setDefendState(module, true);
  }

  try {
    let opts = { method };
    let url = `/api/${module}/${mode}`;
    if (module === "xss") {
      opts.headers = { "Content-Type": "application/json" };
      opts.body = JSON.stringify({ payload });
    }
    const r = await fetch(url, opts);
    const data = await r.json();
    streamTerminalOutput(outId, data);
    if (data.vulnerable === true) {
      triggerBreachImpact(module);
    }
    updateStatsLive();
  } catch (err) {
    show(outId, "Error: " + err.message);
  } finally {
    setTimeout(() => {
      setAttackState(module, false);
      setDefendState(module, false);
    }, 600);
  }
}

async function runSqli(mode) {
  const outId = `sqli-${mode}-out`;
  show(outId, "Running SQLi " + mode + "...");
  const email = document.getElementById("sqli-email")?.value || "' OR 1=1--";
  const password = document.getElementById("sqli-password")?.value || "anything";

  if (mode === "attack") {
    setAttackState("sqli", true);
    triggerPipelineTransmission("sqli", email, () => {
      dispatchAttackToLiveTarget("sqli", { email, password });
      if (isAutoAnimateEnabled()) {
        openJuiceShopPreview("sqli", { email, password });
      } else {
        const modal = document.getElementById("juice-preview-modal");
        if (modal && modal.classList.contains("open")) {
          executeLiveAttackReflection("sqli", { email, password });
        }
      }
    });
  } else {
    setDefendState("sqli", true);
  }

  try {
    const r = await fetch(`/api/sqli/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await r.json();
    streamTerminalOutput(outId, data);
    if (data.vulnerable === true) {
      triggerBreachImpact("sqli");
    }
    updateStatsLive();
  } catch (err) {
    show(outId, "Error: " + err.message);
  } finally {
    setTimeout(() => {
      setAttackState("sqli", false);
      setDefendState("sqli", false);
    }, 600);
  }
}

async function runCmdi(mode) {
  const outId = `cmdi-${mode}-out`;
  show(outId, "Running Command Injection " + mode + "...");
  const host = document.getElementById("cmdi-host")?.value || "127.0.0.1; whoami";

  if (mode === "attack") {
    setAttackState("cmdi", true);
    triggerPipelineTransmission("cmdi", host, () => {
      dispatchAttackToLiveTarget("cmdi", { host });
      if (isAutoAnimateEnabled()) {
        openJuiceShopPreview("cmdi", { host });
      } else {
        const modal = document.getElementById("juice-preview-modal");
        if (modal && modal.classList.contains("open")) {
          executeLiveAttackReflection("cmdi", { host });
        }
      }
    });
  } else {
    setDefendState("cmdi", true);
  }

  try {
    const r = await fetch(`/api/cmdi/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host }),
    });
    const data = await r.json();
    streamTerminalOutput(outId, data);
    if (data.vulnerable === true) {
      triggerBreachImpact("cmdi");
    }
    updateStatsLive();
  } catch (err) {
    show(outId, "Error: " + err.message);
  } finally {
    setTimeout(() => {
      setAttackState("cmdi", false);
      setDefendState("cmdi", false);
    }, 600);
  }
}

async function runCsrfAttack() {
  show("csrf-attack-out", "Running CSRF attack...");
  const newEmail = document.getElementById("csrf-email")?.value || "attacker@evil.com";

  setAttackState("csrf", true);
  triggerPipelineTransmission("csrf", newEmail, () => {
    dispatchAttackToLiveTarget("csrf", { newEmail });
    if (isAutoAnimateEnabled()) {
      openJuiceShopPreview("csrf", { newEmail });
    } else {
      const modal = document.getElementById("juice-preview-modal");
      if (modal && modal.classList.contains("open")) {
        executeLiveAttackReflection("csrf", { newEmail });
      }
    }
  });

  try {
    const r = await fetch("/api/csrf/attack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newEmail }),
    });
    const data = await r.json();
    streamTerminalOutput("csrf-attack-out", data);
    if (data.vulnerable === true) {
      triggerBreachImpact("csrf");
    }
    updateStatsLive();
  } catch (err) {
    show("csrf-attack-out", "Error: " + err.message);
  } finally {
    setTimeout(() => setAttackState("csrf", false), 600);
  }
}

async function runCsrfDefend(withToken) {
  show("csrf-defend-out", "Running CSRF defense...");
  setDefendState("csrf", true);
  try {
    let token = null;
    if (withToken) {
      const tr = await fetch("/api/csrf/legit-token");
      token = (await tr.json()).token;
    }
    const r = await fetch("/api/csrf/defend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newEmail: "attacker@evil.com", token }),
    });
    const data = await r.json();
    streamTerminalOutput("csrf-defend-out", data);
    updateStatsLive();
  } catch (err) {
    show("csrf-defend-out", "Error: " + err.message);
  } finally {
    setTimeout(() => setDefendState("csrf", false), 600);
  }
}

async function runWeakAuthAttack() {
  show("weakauth-attack-out", "Running brute force attack...");
  const email = document.getElementById("weakauth-email")?.value || "admin@juice-sh.op";
  const attempts = document.getElementById("weakauth-attempts")?.value || "8";

  setAttackState("weakauth", true);
  triggerPipelineTransmission("weakauth", `${attempts} Rapid Spray Attempts`, () => {
    dispatchAttackToLiveTarget("weakauth", { email, attempts });
    if (isAutoAnimateEnabled()) {
      openJuiceShopPreview("weakauth", { email, attempts });
    } else {
      const modal = document.getElementById("juice-preview-modal");
      if (modal && modal.classList.contains("open")) {
        executeLiveAttackReflection("weakauth", { email, attempts });
      }
    }
  });

  try {
    const r = await fetch("/api/weakauth/attack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, attempts }),
    });
    const data = await r.json();
    streamTerminalOutput("weakauth-attack-out", data);
    if (data.vulnerable === true) {
      triggerBreachImpact("weakauth");
    }
    updateStatsLive();
  } catch (err) {
    show("weakauth-attack-out", "Error: " + err.message);
  } finally {
    setTimeout(() => setAttackState("weakauth", false), 600);
  }
}

async function runWeakAuthDefend() {
  show("weakauth-defend-out", "Attempting login on protected endpoint...");
  setDefendState("weakauth", true);
  const password = document.getElementById("weakauth-password")?.value;
  try {
    const r = await fetch("/api/weakauth/defend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await r.json().catch(() => ({ blocked: true }));
    streamTerminalOutput("weakauth-defend-out", data);
    updateStatsLive();
  } catch (err) {
    show("weakauth-defend-out", "Error: " + err.message);
  } finally {
    setTimeout(() => setDefendState("weakauth", false), 600);
  }
}

// ==========================================================================
// Nmap Scanner & Port Reconnaissance Controller
// ==========================================================================
const NMAP_PRESET_QUERIES = {
  full: {
    cmd: "nmap -sT -sV -Pn -p 21,22,80,443,3000,3306,8080,27017 127.0.0.1",
    flags: [
      { flag: "-sT", desc: "TCP Connect Scan" },
      { flag: "-sV", desc: "Version Detection" },
      { flag: "-Pn", desc: "Skip Ping Probe" },
      { flag: "-p", desc: "Target Port List" }
    ]
  },
  target: {
    cmd: "nmap -sV -sC -Pn -p 3000 127.0.0.1",
    flags: [
      { flag: "-sV", desc: "Version Detection" },
      { flag: "-sC", desc: "Default NSE Scripts" },
      { flag: "-Pn", desc: "Skip Ping Probe" },
      { flag: "-p 3000", desc: "Port 3000 Only" }
    ]
  },
  scripts: {
    cmd: "nmap -p 3000 --script http-enum,http-headers,http-methods 127.0.0.1",
    flags: [
      { flag: "--script", desc: "NSE Web Scripts" },
      { flag: "http-enum", desc: "Directory Enumeration" },
      { flag: "http-headers", desc: "Security Headers" },
      { flag: "-p 3000", desc: "Target Port" }
    ]
  },
  top100: {
    cmd: "nmap -sT -Pn -T4 --top-ports 100 127.0.0.1",
    flags: [
      { flag: "-sT", desc: "TCP Connect Scan" },
      { flag: "-Pn", desc: "Skip Ping" },
      { flag: "-T4", desc: "Aggressive Timing" },
      { flag: "--top-ports 100", desc: "Top 100 Ports" }
    ]
  },
  fast: {
    cmd: "nmap -p 3000,8080 -Pn 127.0.0.1",
    flags: [
      { flag: "-p 3000,8080", desc: "Target & Controller Ports" },
      { flag: "-Pn", desc: "Treat Host as Online" }
    ]
  }
};

function handleNmapProfileChange(profileKey) {
  const profile = NMAP_PRESET_QUERIES[profileKey] || NMAP_PRESET_QUERIES.full;
  const cmdSpan = document.getElementById("nmap-cmd-string");
  if (cmdSpan) cmdSpan.textContent = profile.cmd;

  const legend = document.getElementById("nmap-flags-legend");
  if (legend && profile.flags) {
    legend.innerHTML = profile.flags.map(f => `<span class="flag-chip"><code>${escapeHtml(f.flag)}</code> ${escapeHtml(f.desc)}</span>`).join("");
  }
  updateGlobalPipeline("scanner", profile.cmd);
}

function copyNmapCommand() {
  const cmd = document.getElementById("nmap-cmd-string")?.textContent || "nmap -sT -sV -p 3000 127.0.0.1";
  navigator.clipboard.writeText(cmd).then(() => {
    showJuiceSnackbar("Copied Nmap query: " + cmd);
  });
}

function filterPortInfo(port) {
  const infoMap = {
    3000: "PORT 3000 (OPEN): Hosts OWASP Juice Shop web app. REQUIRED FOR ALL 6 ATTACKS: XSS, SQLi, CMDi, CSRF, Weak Auth, Headers.",
    8080: "PORT 8080 (OPEN): EHVA CyberLab Controller. Hosts attack dispatchers, telemetry loggers, and defense verification engine.",
    21: "PORT 21 (CLOSED): FTP raw socket closed.",
    22: "PORT 22 (CLOSED): SSH management disabled on test target.",
    80: "PORT 80 (CLOSED): Standard HTTP port closed; target binds to custom port 3000.",
    443: "PORT 443 (CLOSED): Standard HTTPS closed; isolated lab operates plaintext HTTP.",
    3306: "PORT 3306 (CLOSED): MySQL direct socket closed. Juice Shop uses embedded SQLite inside process on :3000; SQLi exploits web API.",
    27017: "PORT 27017 (CLOSED): MongoDB closed; no external NoSQL daemon running."
  };
  const msg = infoMap[port] || `Port ${port} inspected.`;
  showJuiceSnackbar(msg);
}

function renderPortMatrixCards(ports) {
  const grid = document.getElementById("nmap-ports-grid");
  if (!grid || !ports || !Array.isArray(ports)) return;

  grid.innerHTML = "";
  ports.forEach((p) => {
    const isOpen = p.status === "open";
    const isRequired = p.required === true;
    const isController = p.port === 8080;

    const card = document.createElement("div");
    card.className = `port-card ${isOpen ? 'port-open' : 'port-closed'} ${isRequired ? 'port-required' : ''}`;
    card.onclick = () => filterPortInfo(p.port);

    card.innerHTML = `
      <div class="port-card-top">
        <span class="port-num">${p.port}/tcp</span>
        <span class="port-badge ${isOpen ? 'open' : 'closed'}">${isOpen ? 'OPEN' : 'CLOSED'}</span>
      </div>
      <div class="port-service">${escapeHtml(p.service || 'unknown')}</div>
      <div class="port-requirement">${escapeHtml(p.note || (isOpen ? 'Service active' : 'Port closed / not in use'))}</div>
      ${isRequired ? (isController ? '<div class="port-req-tag" style="background:#e0f2fe;color:#0369a1;">🛡️ ASSESSMENT CONTROLLER</div>' : '<div class="port-req-tag">⭐ REQUIRED FOR ALL ATTACKS</div>') : ''}
    `;
    grid.appendChild(card);
  });
}

async function runScan() {
  const select = document.getElementById("nmap-profile-select");
  const profileKey = select?.value || "full";
  const cmdText = document.getElementById("nmap-cmd-string")?.textContent || "nmap -sT -sV 127.0.0.1";

  show("scanner-out", `# EXECUTING RECON QUERY: ${cmdText}\nScanning target localhost sockets 127.0.0.1 (ports 21, 22, 80, 443, 3000, 3306, 8080, 27017)...\nPlease wait 1-3 seconds...`);
  setAttackState("scanner", true);

  triggerPipelineTransmission("scanner", cmdText, () => {
    if (isAutoAnimateEnabled()) {
      openJuiceShopPreview("scanner");
    } else {
      const modal = document.getElementById("juice-preview-modal");
      if (modal && modal.classList.contains("open")) {
        executeLiveAttackReflection("scanner");
      }
    }
  });

  try {
    const r = await fetch("/api/scanner/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile: profileKey })
    });
    const data = await r.json();

    // Directly output the formatted Nmap text into the pre terminal
    streamTerminalOutput("scanner-out", data.output || data);
    updateStatsLive();

    if (data.ports && Array.isArray(data.ports)) {
      renderPortMatrixCards(data.ports);
    }
  } catch (err) {
    show("scanner-out", "Error executing scan: " + err.message);
  } finally {
    setTimeout(() => setAttackState("scanner", false), 600);
  }
}

// ==========================================================================
// Audit Report & Metrics
// ==========================================================================
let cachedReportData = [];

async function loadReport() {
  try {
    const r = await fetch("/api/report");
    const raw = await r.json();
    cachedReportData = Array.isArray(raw) ? raw.filter(run => run.module !== 'idor' && run.module !== 'traversal') : [];
    const tbody = document.querySelector("#report-table tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (cachedReportData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:#94a3b8">No assessment runs logged yet. Execute attack or defense tests to populate this table.</td></tr>`;
      return;
    }

    cachedReportData.forEach((run) => {
      const tr = document.createElement("tr");
      const isVuln = run.vulnerable === true;
      const isSecured = run.vulnerable === false;

      tr.innerHTML = `
        <td style="font-family:var(--font-mono);font-size:0.75rem">${new Date(run.timestamp).toLocaleTimeString()}</td>
        <td><strong>${run.module.toUpperCase()}</strong></td>
        <td><span class="mode-badge ${run.mode === 'attack' ? 'badge-attack' : 'badge-defend'}">${run.mode}</span></td>
        <td style="font-family:var(--font-mono);font-size:0.76rem;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(run.payload || "-")}</td>
        <td style="font-size:0.8rem">${escapeHtml(run.result || "-")}</td>
        <td>${isVuln ? '<span class="badge-vuln-yes">⚠️ YES</span>' : isSecured ? '<span class="badge-vuln-no">✅ NO</span>' : '<span class="badge-vuln-info">ℹ️ RECON</span>'}</td>
      `;
      tbody.appendChild(tr);
    });

    updateStatsLive();
  } catch (e) {
    console.error("Failed to load report", e);
  }
}

async function clearReport() {
  await fetch("/api/report", { method: "DELETE" });
  loadReport();
}

function updateStatsLive() {
  fetch("/api/report")
    .then((r) => r.json())
    .then((runs) => {
      const vulns = runs.filter((r) => r.vulnerable === true).length;
      const defends = runs.filter((r) => r.mode === "defend" || r.vulnerable === false).length;
      const vEl = document.getElementById("stat-vulns-found");
      const dEl = document.getElementById("stat-defenses-verified");
      if (vEl) vEl.textContent = vulns;
      if (dEl) dEl.textContent = defends;
    })
    .catch(() => {});
}

function exportReportJson() {
  if (!cachedReportData.length) {
    showJuiceSnackbar("No assessment logs to export.");
    return;
  }
  const blob = new Blob([JSON.stringify(cachedReportData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `EHVA_Security_Assessment_Report_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showJuiceSnackbar("Downloaded JSON audit log.");
}

function exportReportCsv() {
  if (!cachedReportData.length) {
    showJuiceSnackbar("No assessment logs to export.");
    return;
  }
  const headers = ["Timestamp", "Module", "Mode", "Payload", "Result", "Vulnerable"];
  const rows = cachedReportData.map((r) => [
    `"${r.timestamp}"`,
    `"${r.module}"`,
    `"${r.mode}"`,
    `"${(r.payload || "").replace(/"/g, '""')}"`,
    `"${(r.result || "").replace(/"/g, '""')}"`,
    `"${r.vulnerable === null ? "RECON" : r.vulnerable ? "YES" : "NO"}"`,
  ]);

  const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `EHVA_Security_Assessment_Report_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showJuiceSnackbar("Downloaded CSV assessment report.");
}
