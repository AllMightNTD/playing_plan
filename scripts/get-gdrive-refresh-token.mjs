import http from "node:http";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const PORT = 53682;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`;
// Non-sensitive scope: allows permanent "In Production" OAuth status without Google review
const SCOPE = "https://www.googleapis.com/auth/drive.file";

async function main() {
  const rl = readline.createInterface({ input, output });
  console.log("=== DateMate Google Drive OAuth2 Refresh Token Generator (100% Free) ===\n");
  console.log(`Make sure "${REDIRECT_URI}" is added to Authorized redirect URIs (or choose Desktop App client type).\n`);

  const clientId = (await rl.question("1. Enter GOOGLE_DRIVE_CLIENT_ID: ")).trim();
  const clientSecret = (await rl.question("2. Enter GOOGLE_DRIVE_CLIENT_SECRET: ")).trim();
  rl.close();

  if (!clientId || !clientSecret) {
    console.error("Missing Client ID or Client Secret.");
    process.exit(1);
  }

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPE);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");

  console.log("\n3. Open this URL in your browser and approve access:\n");
  console.log(authUrl.toString());
  console.log(`\nWaiting for Google callback on ${REDIRECT_URI} ...`);

  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const reqUrl = new URL(req.url ?? "/", REDIRECT_URI);
      const authCode = reqUrl.searchParams.get("code");
      if (!authCode) {
        res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Missing code parameter.");
        return;
      }
      res.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8",
        Connection: "close",
      });
      res.end("Success! You can close this tab and return to your terminal.");
      resolve(authCode);
      server.close();
      server.closeAllConnections?.();
    });
    server.on("error", reject);
    server.listen(PORT, "127.0.0.1");
  });

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: REDIRECT_URI,
    grant_type: "authorization_code",
  });

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const json = await tokenRes.json();
  if (!tokenRes.ok || !json.refresh_token) {
    console.error("\nFailed to obtain refresh_token:", json.error ?? tokenRes.status);
    process.exit(1);
  }

  console.log("\n=== SUCCESS! Save this GOOGLE_DRIVE_REFRESH_TOKEN via `npx wrangler secret put GOOGLE_DRIVE_REFRESH_TOKEN` ===");
  console.log(json.refresh_token);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
