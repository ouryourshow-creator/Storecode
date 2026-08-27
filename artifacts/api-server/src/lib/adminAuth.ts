import { clerkClient } from "@clerk/express";

/**
 * Returns true if the given Clerk userId has a VERIFIED email address that
 * matches one of the entries in the ADMIN_EMAILS environment variable
 * (comma-separated, case-insensitive).
 *
 * Unverified addresses (e.g. pending additions) are intentionally excluded to
 * prevent an attacker from gaining access by adding a whitelisted address
 * before verifying ownership.
 *
 * Returns null when ADMIN_EMAILS is not configured (caller should deny access).
 */
export async function isAdminUser(userId: string): Promise<boolean | null> {
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.length === 0) {
    return null; // not configured — caller should deny
  }

  const user = await clerkClient.users.getUser(userId);

  const verifiedEmails = user.emailAddresses
    .filter((e) => e.verification?.status === "verified")
    .map((e) => e.emailAddress.toLowerCase());

  return verifiedEmails.some((email) => adminEmails.includes(email));
}
