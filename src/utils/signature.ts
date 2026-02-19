import { Md5 } from "ts-md5";

export function generateSignature(key: string, timestamp: number): string {
  const data = `${key}::${timestamp.toString().substring(0, 8)}`;
  return Md5.hashStr(data);
}

export function verifySignature(
  signature = "",
  key: string,
  _timestamp: number
): boolean {
  const now = Date.now();
  for (let offset = -1; offset <= 1; offset++) {
    const checkTime = now + offset * 10000;
    const generatedSignature = generateSignature(key, checkTime);
    if (signature === generatedSignature) {
      return true;
    }
  }
  return false;
}
