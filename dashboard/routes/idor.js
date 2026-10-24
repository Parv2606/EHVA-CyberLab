const express = require("express");
const fetch = require("node-fetch");
const { logRun } = require("../logger");

const router = express.Router();
const JUICE_SHOP_URL = process.env.JUICE_SHOP_URL || "http://localhost:3000";

// Mock baskets database for standalone simulation
const MOCK_BASKETS = {
  1: {
    id: 1,
    owner: "admin@juice-sh.op",
    role: "Administrator",
    items: [
      { product: "OWASP Juice Shop CTF Girlie-Shirt", price: 22.49, quantity: 2 },
      { product: "Super Secret Admin Master Token Keycard", price: 999.0, quantity: 1 },
      { product: "Melon Bike (Orange)", price: 2999.0, quantity: 1 }
    ],
    total: 6042.98,
    shippingAddress: "Executive Suite 1, OWASP HQ, Geneva",
    paymentMethod: "Corporate Card **** 8821"
  },
  2: {
    id: 2,
    owner: "victim@juice-sh.op",
    role: "Customer",
    items: [
      { product: "Apple Juice (1000ml)", price: 1.99, quantity: 4 },
      { product: "Strawberry Juice (500ml)", price: 3.99, quantity: 2 }
    ],
    total: 15.94,
    shippingAddress: "42 Wallaby Way, Sydney",
    paymentMethod: "Visa **** 4111"
  },
  3: {
    id: 3,
    owner: "bob@juice-sh.op",
    role: "Customer",
    items: [
      { product: "Carrot Juice (1000ml)", price: 2.99, quantity: 3 },
      { product: "Fruit Press", price: 89.99, quantity: 1 }
    ],
    total: 98.96,
    shippingAddress: "742 Evergreen Terrace, Springfield",
    paymentMethod: "Mastercard **** 5555"
  }
};

// ATTACK: An unauthorized user requests another user's basket/order by ID
// OWASP Juice Shop's /rest/basket/:id famously does not check whether the authenticated
// user owns the basket being accessed, leaking PII and order contents.
router.post("/attack", async (req, res) => {
  const basketId = parseInt(req.body.basketId || "1", 10);
  const requesterUserId = 99; // Attacker is logged in as user #99 or unauthenticated

  try {
    // Attempt request to Juice Shop target
    const r = await fetch(`${JUICE_SHOP_URL}/rest/basket/${basketId}`);
    const data = await r.json().catch(() => null);

    if (r.ok && data) {
      const entry = logRun({
        module: "idor",
        mode: "attack",
        payload: `GET /rest/basket/${basketId} (as unauthorized user #${requesterUserId})`,
        result: `Unauthorized access granted to Basket #${basketId} (owner exposed)`,
        vulnerable: true,
      });

      return res.json({
        basketId,
        requesterUserId,
        status: r.status,
        vulnerable: true,
        data,
        explanation: `IDOR confirmed: The server returned Basket #${basketId} data to requester #${requesterUserId} without verifying object ownership.`,
        logged: entry,
      });
    }
    throw new Error("Target returned non-200 or empty data");
  } catch (err) {
    // Standalone lab simulation
    const basket = MOCK_BASKETS[basketId] || {
      id: basketId,
      owner: `user${basketId}@juice-sh.op`,
      role: "Customer",
      items: [{ product: "Generic Juice Pack", price: 9.99, quantity: 1 }],
      total: 9.99,
      shippingAddress: "Confidential Customer Address",
      paymentMethod: "Card **** 1234"
    };

    const entry = logRun({
      module: "idor",
      mode: "attack",
      payload: `GET /rest/basket/${basketId} (as unauthorized user #${requesterUserId})`,
      result: `Unauthorized access granted to Basket #${basketId} of ${basket.owner}`,
      vulnerable: true,
    });

    res.json({
      basketId,
      requesterUserId,
      status: 200,
      vulnerable: true,
      data: basket,
      explanation: `IDOR confirmed: The server returned Basket #${basketId} belonging to ${basket.owner} without checking whether the requester (#${requesterUserId}) owns this record.`,
      tip: "In OWASP Juice Shop, incrementing /rest/basket/1 to /rest/basket/2 leaks all other users' shopping carts and customer information.",
      logged: entry,
      notice: "Executed in simulated lab target mode.",
    });
  }
});

// DEFENSE: Enforce session-bound Object-Level Authorization (ABAC / Ownership Validation)
// The system checks that the requesting user ID matches the basket owner's ID.
router.post("/defend", (req, res) => {
  const basketId = parseInt(req.body.basketId || "1", 10);
  const currentUserId = parseInt(req.body.currentUserId || "99", 10); // Simulated logged-in user

  // In protected architecture, user 99 only owns basket 99. Baskets 1, 2, 3 belong to users 1, 2, 3.
  const isOwner = basketId === currentUserId;

  const entry = logRun({
    module: "idor",
    mode: "defend",
    payload: `GET /rest/basket/${basketId} with Ownership Verification (User: ${currentUserId})`,
    result: isOwner
      ? `Authorized: User #${currentUserId} granted access to owned Basket #${basketId}`
      : `Blocked: Access denied to Basket #${basketId} (Ownership mismatch: User #${currentUserId})`,
    vulnerable: false,
  });

  if (!isOwner) {
    return res.status(403).json({
      status: 403,
      error: "Forbidden",
      message: `Access Denied: You do not have permission to view Basket #${basketId}.`,
      ownershipCheck: {
        requesterUserId: currentUserId,
        basketOwnerId: basketId,
        authorized: false,
      },
      defensePattern:
        "Defense pattern: Always validate that the authenticated session identity owns or has explicit permission for the requested resource ID. Never trust client-supplied entity identifiers without server-side authorization checks.",
      logged: entry,
    });
  }

  res.json({
    status: 200,
    authorized: true,
    basket: MOCK_BASKETS[basketId] || { id: basketId, owner: "authenticated-user" },
    logged: entry,
  });
});

module.exports = router;
