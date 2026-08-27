import { createHash } from "node:crypto";

export function referralCodeFor(customerId: string): string {
  return `KTP${createHash("sha256").update(customerId).digest("hex").slice(0, 10).toUpperCase()}`;
}
