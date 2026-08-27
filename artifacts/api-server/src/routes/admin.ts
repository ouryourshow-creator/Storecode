import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { isAdminUser } from "../lib/adminAuth";

const router: IRouter = Router();

// GET /admin/me — check if currently authenticated as admin
// Used by the frontend on page load to verify Clerk auth + email whitelist
router.get("/admin/me", async (req, res): Promise<void> => {
  const auth = getAuth(req);

  if (!auth?.userId) {
    res.status(401).json({ isAdmin: false });
    return;
  }

  try {
    const result = await isAdminUser(auth.userId);

    if (result === null) {
      // ADMIN_EMAILS not configured — deny access.
      res.status(403).json({ isAdmin: false, error: "ADMIN_EMAILS not configured" });
      return;
    }

    if (result) {
      res.json({ isAdmin: true });
    } else {
      res.status(403).json({ isAdmin: false, error: "Not authorized as admin" });
    }
  } catch (err) {
    req.log.error({ err }, "Failed to verify admin status");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
