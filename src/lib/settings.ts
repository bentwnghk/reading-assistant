import { getClient } from "./db"
import type { SettingStore } from "@/store/setting"

// Run once per process lifetime so GET/PUT routes don't pay DDL overhead.
let tableEnsured = false

export async function ensureSettingsTable(): Promise<boolean> {
  if (tableEnsured) return true
  const client = await getClient()

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        settings JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)
    tableEnsured = true
    return true
  } catch (error) {
    console.error("Failed to ensure settings table:", error)
    return false
  } finally {
    client.release()
  }
}

export async function getUserSettings(
  userId: string
): Promise<Partial<SettingStore> | null> {
  const client = await getClient()
  
  try {
    const result = await client.query(
      "SELECT settings FROM user_settings WHERE user_id = $1",
      [userId]
    )
    
    if (result.rows.length === 0) return null
    
    return result.rows[0].settings as Partial<SettingStore>
  } catch (error) {
    console.error("Failed to get user settings:", error)
    return null
  } finally {
    client.release()
  }
}

export async function upsertUserSettings(
  userId: string,
  settings: Partial<SettingStore>
): Promise<boolean> {
  const client = await getClient()
  
  try {
    await client.query(
      `INSERT INTO user_settings (user_id, settings)
       VALUES ($1, $2)
       ON CONFLICT (user_id)
       DO UPDATE SET settings = $2, updated_at = NOW()`,
      [userId, JSON.stringify(settings)]
    )
    
    return true
  } catch (error) {
    console.error("Failed to upsert user settings:", error)
    return false
  } finally {
    client.release()
  }
}


