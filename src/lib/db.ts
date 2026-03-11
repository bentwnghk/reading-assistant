import { Pool, PoolClient } from "pg"

let pool: Pool | null = null

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })
  }
  return pool
}

export async function getClient(): Promise<PoolClient> {
  const pool = getPool()
  return await pool.connect()
}

export function base64ToBuffer(base64String: string): Buffer {
  const base64Data = base64String.replace(/^data:[^;]+;base64,/, "")
  return Buffer.from(base64Data, "base64")
}

export function bufferToBase64(
  input: Buffer | string,
  contentType: string = "image/png"
): string {
  if (typeof input === "string") {
    if (input.startsWith("data:")) {
      return input
    }

    if (input.startsWith("\\x")) {
      const hexData = input.slice(2)
      return `data:${contentType};base64,${Buffer.from(hexData, "hex").toString("base64")}`
    }

    return `data:${contentType};base64,${input}`
  }

  return `data:${contentType};base64,${input.toString("base64")}`
}

process.on("SIGINT", async () => {
  if (pool) {
    await pool.end()
  }
  process.exit(0)
})

process.on("SIGTERM", async () => {
  if (pool) {
    await pool.end()
  }
  process.exit(0)
})
