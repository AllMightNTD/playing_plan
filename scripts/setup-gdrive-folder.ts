import { isRealEnvValue } from "@/server/storage/photo-storage.gateway";
import {
  DEFAULT_GDRIVE_FOLDER_NAME,
  ensureGoogleDriveFolder,
} from "@/server/storage/gdrive-folder.provisioner";

interface DriveEnvCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

function readRequiredDriveCredentials(): DriveEnvCredentials {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

  const missing: string[] = [];
  if (!isRealEnvValue(clientId)) missing.push("GOOGLE_DRIVE_CLIENT_ID");
  if (!isRealEnvValue(clientSecret)) missing.push("GOOGLE_DRIVE_CLIENT_SECRET");
  if (!isRealEnvValue(refreshToken)) missing.push("GOOGLE_DRIVE_REFRESH_TOKEN");

  if (missing.length > 0) {
    process.stderr.write(
      `Missing or placeholder credentials in .env: ${missing.join(", ")}. Fill them in .env first.\n`
    );
    process.exit(1);
  }

  return {
    clientId: (clientId as string).trim(),
    clientSecret: (clientSecret as string).trim(),
    refreshToken: (refreshToken as string).trim(),
  };
}

async function main(): Promise<void> {
  const credentials = readRequiredDriveCredentials();
  const customName = process.argv[2]?.trim() || DEFAULT_GDRIVE_FOLDER_NAME;

  process.stdout.write(`Provisioning Google Drive app-owned folder "${customName}"...\n`);

  const result = await ensureGoogleDriveFolder({
    ...credentials,
    folderName: customName,
  });

  const statusLabel = result.created
    ? "Created new app-owned folder"
    : "Reused existing app-owned folder";

  process.stdout.write(`\n=== SUCCESS (${statusLabel}) ===\n`);
  process.stdout.write(`Folder Name : ${result.folderName}\n`);
  process.stdout.write(`Drive URL   : https://drive.google.com/drive/folders/${result.folderId}\n\n`);
  process.stdout.write("1. Paste this line into your local .env file:\n");
  process.stdout.write(`GOOGLE_DRIVE_FOLDER_ID="${result.folderId}"\n\n`);
  process.stdout.write("2. For Cloudflare deployment, save it as a secret:\n");
  process.stdout.write("pnpm wrangler secret put GOOGLE_DRIVE_FOLDER_ID\n");
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(
    `\nFailed to provision Google Drive folder: ${message}\n` +
      "Make sure Google Drive API is enabled in Google Cloud Console and your GOOGLE_DRIVE_REFRESH_TOKEN is valid.\n"
  );
  process.exit(1);
});
