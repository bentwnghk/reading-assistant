import { NextResponse, type NextRequest } from "next/server";
import { Md5 } from "ts-md5";

export const runtime = "edge";
export const preferredRegion = [
  "cle1",
  "iad1",
  "pdx1",
  "sfo1",
  "sin1",
  "syd1",
  "hnd1",
  "kix1",
];

const API_PROXY_BASE_URL = process.env.OPENAI_COMPATIBLE_API_BASE_URL || "";
const API_KEY = process.env.OPENAI_COMPATIBLE_API_KEY || "";
const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD || "";

function generateSignature(key: string, timestamp: number): string {
  const timePrefix = timestamp.toString().substring(0, 8);
  const data = `${key}::${timePrefix}`;
  return Md5.hashStr(data);
}

function verifySignature(signature: string, key: string): boolean {
  const now = Date.now();
  
  for (let offset = -1; offset <= 1; offset++) {
    const checkTime = now + (offset * 10000);
    const expected = generateSignature(key, checkTime);
    if (signature === expected) {
      return true;
    }
  }
  
  return false;
}

async function handler(req: NextRequest) {
  let body;
  if (req.method.toUpperCase() !== "GET") {
    body = await req.json();
  }
  const searchParams = req.nextUrl.searchParams;
  const path = searchParams.getAll("slug");
  searchParams.delete("slug");
  const params = searchParams.toString();

  if (!API_PROXY_BASE_URL) {
    return NextResponse.json(
      { error: { code: 500, message: "API base URL not configured" } },
      { status: 500 }
    );
  }

  const clientAuth = req.headers.get("Authorization") || "";
  const authVerified = req.headers.get("X-Auth-Verified") === "true";
  
  let authorization: string;
  
  if (authVerified) {
    authorization = clientAuth;
  } else if (ACCESS_PASSWORD && API_KEY) {
    const token = clientAuth.replace("Bearer ", "");
    
    if (!token || !verifySignature(token, ACCESS_PASSWORD)) {
      return NextResponse.json(
        { error: { code: 403, message: "No permissions", status: "FORBIDDEN" } },
        { status: 403 }
      );
    }
    
    authorization = `Bearer ${API_KEY}`;
  } else {
    authorization = clientAuth;
  }

  try {
    let url = `${API_PROXY_BASE_URL}/${decodeURIComponent(path.join("/"))}`;
    if (params) url += `?${params}`;
    
    const payload: RequestInit = {
      method: req.method,
      headers: {
        "Content-Type": req.headers.get("Content-Type") || "application/json",
        Authorization: authorization,
      },
    };
    if (body) payload.body = JSON.stringify(body);
    const response = await fetch(url, payload);
    return new NextResponse(response.body, response);
  } catch (error) {
    if (error instanceof Error) {
      console.error(error);
      return NextResponse.json(
        { code: 500, message: error.message },
        { status: 500 }
      );
    }
  }
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
