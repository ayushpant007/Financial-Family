// Global fetch will be used
import crypto from "crypto";

const secret = "fallback-secret";
function hash(password: string): string {
  return crypto.createHmac("sha256", secret).update(password).digest("hex");
}

async function test() {
  const res = await fetch("http://localhost:5000/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" })
  });
  
  console.log("Status:", res.status);
  const data: any = await res.json();
  console.log("Response:", data);
}

test();
