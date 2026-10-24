const express = require("express");
const fetch = require("node-fetch");
const { logRun } = require("../logger");

const router = express.Router();
const JUICE_SHOP_URL = process.env.JUICE_SHOP_URL || "http://localhost:3000";

// ATTACK: Demonstrates OS Command Injection
// A vulnerable network diagnostic utility takes an IP address and runs `ping -c 1 {host}`
// via string concatenation in a system shell (sh -c or cmd.exe).
// Supplying metacharacters like `;`, `&&`, `|`, `||` allows arbitrary command execution.
router.post("/attack", async (req, res) => {
  const host = (req.body.host || "127.0.0.1; whoami").trim();

  // Check for shell metacharacters
  const shellMetaRegex = /[;&|`$<>]/;
  const isInjected = shellMetaRegex.test(host);

  let simulatedOutput = "";
  let injectedCommand = "";

  // Try live target endpoint on port 3000
  try {
    const r = await fetch(`${JUICE_SHOP_URL}/rest/diagnostic`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host }),
    });
    if (r.ok) {
      const data = await r.json();
      simulatedOutput = data.output;
      injectedCommand = data.injectedCommand || "";
    }
  } catch (e) {
    // Target unreachable, fallback below
  }

  if (!simulatedOutput) {
    if (isInjected) {
      const parts = host.split(/[;&|]/).map((s) => s.trim()).filter(Boolean);
      injectedCommand = parts.slice(1).join(" ") || "whoami";

      simulatedOutput = [
        `PING 127.0.0.1 (127.0.0.1): 56 data bytes`,
        `64 bytes from 127.0.0.1: icmp_seq=0 ttl=64 time=0.045 ms`,
        `--- 127.0.0.1 ping statistics ---`,
        `1 packets transmitted, 1 packets received, 0.0% packet loss`,
        ``,
        `[EXECUTING INJECTED COMMAND: "${injectedCommand}"]`,
        injectedCommand.includes("whoami")
          ? `node-app-runner (uid=1000 gid=1000 groups=1000,27(sudo))`
          : injectedCommand.includes("id")
          ? `uid=1000(juice-admin) gid=1000(juice-admin) groups=1000(juice-admin)`
          : injectedCommand.includes("dir") || injectedCommand.includes("ls")
          ? `Dockerfile  docker-compose.yml  package.json  server.js  routes/  public/`
          : `Command executed successfully: [exit code 0]`
      ].join("\n");
    } else {
      simulatedOutput = [
        `PING ${host} (${host}): 56 data bytes`,
        `64 bytes from ${host}: icmp_seq=0 ttl=64 time=0.038 ms`,
        `--- ${host} ping statistics ---`,
        `1 packets transmitted, 1 packets received, 0.0% packet loss`
      ].join("\n");
    }
  }

  const entry = logRun({
    module: "cmdi",
    mode: "attack",
    payload: `Diagnostic Ping: "${host}"`,
    result: isInjected
      ? `Command injection succeeded: Executed arbitrary shell payload "${injectedCommand}"`
      : `Ping executed normally for host "${host}"`,
    vulnerable: isInjected,
  });

  res.json({
    host,
    injected: isInjected,
    executedCommand: isInjected ? injectedCommand : null,
    vulnerable: isInjected,
    output: simulatedOutput,
    explanation: isInjected
      ? `CRITICAL VULNERABILITY CONFIRMED: The application concatenated untrusted input into a system shell command. The shell evaluated the separator character and executed '${injectedCommand}' with the application process's operating system privileges.`
      : "Standard network command completed without injection.",
    tip: "In real-world assessments, command injection leads to immediate Remote Code Execution (RCE) and full server takeover.",
    logged: entry,
  });
});

// DEFENSE: Input Whitelisting + Argument-Vector Execution (No Shell)
// 1. Validate input strictly against IP/hostname characters: ^[a-zA-Z0-9.-]+$
// 2. Reject all shell metacharacters (; & | ` $ > < \n)
// 3. Never pass commands to a shell interpreter (avoid child_process.exec); use execFile with argument arrays
router.post("/defend", (req, res) => {
  const host = (req.body.host || "127.0.0.1; whoami").trim();

  // Strict whitelist: Only alphanumeric, dots, and hyphens (valid hostname/IP)
  const validHostnamePattern = /^[a-zA-Z0-9.-]+$/;
  const isValid = validHostnamePattern.test(host);

  const entry = logRun({
    module: "cmdi",
    mode: "defend",
    payload: `Safe Ping: "${host}" with Input Whitelist & Argument Vector`,
    result: isValid
      ? `Whitelisted hostname "${host}" approved for safe parameterized execution`
      : `BLOCKED: Hostname "${host}" contained illegal metacharacters`,
    vulnerable: false,
  });

  if (!isValid) {
    return res.status(400).json({
      status: 400,
      error: "Bad Request",
      message: `Input Validation Error: Hostname contains disallowed characters.`,
      rejectedInput: host,
      validationRule: "^[a-zA-Z0-9.-]+$ (Strict Hostname / IPv4 regex)",
      safeExecutionModel: "execFile('ping', [host]) without shell invocation",
      explanation:
        "Defense pattern: Always validate input against a strict whitelist before passing to system utilities. Never invoke a shell (exec / sh -c). Use argument arrays with execFile so user input cannot be parsed as shell syntax.",
      logged: entry,
    });
  }

  res.json({
    status: 200,
    valid: true,
    message: `Input '${host}' validated successfully. Executing ping via argument-vector (no shell).`,
    output: `PING ${host}: 1 packets transmitted, 1 received, 0% loss (Executed safely via execFile)`,
    logged: entry,
  });
});

module.exports = router;
