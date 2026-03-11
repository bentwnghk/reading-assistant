import { getClient } from "./db"
import type { SettingStore } from "@/store/setting"

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
       DO UPDATE SET settings = $2`,
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
