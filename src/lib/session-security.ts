import { getClient } from "./db";
import type { PoolClient } from "pg";

const MAX_CONCURRENT_SESSIONS = parseInt(
  process.env.MAX_CONCURRENT_SESSIONS || "3",
  10
);

export async function enforceConcurrentSessionLimit(
  userId: string
): Promise<void> {
  // Best-effort pruning: pool acquisition is inside the try so a transient
  // DB failure can never abort the sign-in flow that awaits this event.
  let client: PoolClient | null = null;
  try {
    client = await getClient();
    await client.query(
      `DELETE FROM sessions
       WHERE "userId" = $1
       AND "sessionToken" NOT IN (
         SELECT "sessionToken" FROM sessions
         WHERE "userId" = $1
         ORDER BY "createdAt" DESC
         LIMIT $2
       )`,
      [userId, MAX_CONCURRENT_SESSIONS]
    );
  } catch (error) {
    console.error("Failed to enforce concurrent session limit:", error);
  } finally {
    client?.release();
  }
}

export { MAX_CONCURRENT_SESSIONS };
