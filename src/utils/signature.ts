import { Md5 } from "ts-md5";

export function generateSignature(key: string, timestamp: number): string {
  const data = `${key}::${timestamp.toString().substring(0, 8)}`;
  return Md5.hashStr(data);
}

export function parseAccessPasswords(passwordEnv: string): string[] {
  if (!passwordEnv || passwordEnv.trim() === "") return [];
  return passwordEnv.split(",").map((p) => p.trim()).filter((p) => p.length > 0);
}

export function verifySignature(
  signature = "",
  keyOrKeys: string | string[],
  _timestamp: number
): boolean {
  const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
  const now = Date.now();
  for (const key of keys) {
    for (let offset = -1; offset <= 1; offset++) {
      const checkTime = now + offset * 10000;
      const generatedSignature = generateSignature(key, checkTime);
      if (signature === generatedSignature) {
        return true;
      }
    }
  }
  return false;
}

export function verifyDirectPassword(
  password: string,
  passwordEnv: string
): boolean {
  const validPasswords = parseAccessPasswords(passwordEnv);
  return validPasswords.includes(password);
}
