import { type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { isAdminUser } from "../lib/adminAuth";

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = getAuth(req);

  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const result = await isAdminUser(auth.userId);

    if (result === null) {
      // ADMIN_EMAILS not configured — deny access.
      // Set ADMIN_EMAILS (comma-separated) in the environment to grant admin access.
      res.status(403).json({ error: "Forbidden: ADMIN_EMAILS not configured" });
      return;
    }

    if (!result) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    next();
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
}
