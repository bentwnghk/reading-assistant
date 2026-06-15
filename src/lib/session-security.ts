import { getClient } from "./db";

const MAX_CONCURRENT_SESSIONS = parseInt(
  process.env.MAX_CONCURRENT_SESSIONS || "3",
  10
);

export async function enforceConcurrentSessionLimit(
  userId: string
): Promise<void> {
  const client = await getClient();
  try {
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
    client.release();
  }
}

export { MAX_CONCURRENT_SESSIONS };
