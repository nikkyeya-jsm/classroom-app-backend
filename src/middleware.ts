import { aj } from "./lib/arcjet.js";
import { slidingWindow } from "@arcjet/node";
import type { UserRoles } from "./types.js";

// Predefine role-based sliding window clients
const slidingWindows = {
  admin: aj.withRule(slidingWindow({ mode: "LIVE", interval: "1m", max: 200 })),
  teacher: aj.withRule(
    slidingWindow({ mode: "LIVE", interval: "1m", max: 100 })
  ),
  student: aj.withRule(
    slidingWindow({ mode: "LIVE", interval: "1m", max: 50 })
  ),
};

const messages = {
  admin: "Admin request limit exceeded (200 per minute). Slow down!",
  teacher: "Teacher request limit exceeded (100 per minute). Please wait.",
  student:
    "Guest request limit exceeded (50 per minute). Sign up for higher limits.",
};

const middleware = async (req: any, res: any, next: any) => {
  // Skip in test environment
  if (process.env.NODE_ENV === "test") return next();

  console.log("Arcjet middleware invoked");

  try {
    const role = (req.headers["x-user-role"] as UserRoles) || "student";
    console.log("User role detected:", role);
    const client =
      slidingWindows[role as UserRoles] || slidingWindows["student"];
    const message = messages[role as UserRoles] || messages["student"];

    // Protect the request using Arcjet
    const decision = await client.protect(req);

    if (decision.isDenied()) {
      if (decision.reason.isBot()) {
        return res.status(403).json({
          error: "Forbidden",
          message: "Automated requests are not allowed",
        });
      }
      if (decision.reason.isShield()) {
        return res.status(403).json({
          error: "Forbidden",
          message: "Request blocked by security policy",
        });
      }
      if (decision.reason.isRateLimit()) {
        return res.status(429).json({
          error: "Too Many Requests",
          message,
        });
      }

      // Generic denial fallback
      return res
        .status(403)
        .json({ error: "Forbidden", message: "Access denied" });
    }

    // All checks passed
    next();
  } catch (error) {
    console.error("Arcjet middleware error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Something went wrong with the security middleware.",
    });
  }
};

export default middleware;
