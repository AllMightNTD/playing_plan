import { describe, expect, it, beforeEach } from "vitest";
import { AppError } from "@/server/http/errors";
import {
  createGoogleDrivePhotoStorageGateway,
  createInMemoryPhotoStorageGateway,
  resetInMemoryPhotoStorage,
} from "./photo-storage.gateway";
import {
  DEFAULT_GDRIVE_FOLDER_NAME,
  ensureGoogleDriveFolder,
} from "./gdrive-folder.provisioner";

describe("PhotoStorageGateway (Google Drive OAuth2 REST v3 + InMemory Fallback)", () => {
  beforeEach(() => {
    resetInMemoryPhotoStorage();
  });

  it("should upload, fetch, delete single photo and purge room photos via Google Drive REST v3", async () => {
    const calls: Array<{ url: string; method: string; auth?: string | null; bodyText?: string }> = [];

    const fakeFetch: typeof fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const method = init?.method ?? "GET";
      const headers = new Headers(init?.headers);
      calls.push({ url, method, auth: headers.get("authorization") });

      if (url === "https://oauth2.googleapis.com/token") {
        return new Response(
          JSON.stringify({ access_token: "ya29.test_token_1", expires_in: 3600 }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.startsWith("https://www.googleapis.com/upload/drive/v3/files") && method === "POST") {
        return new Response(JSON.stringify({ id: "1DriveFileAbc_99" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url === "https://www.googleapis.com/drive/v3/files/1DriveFileAbc_99?alt=media" && method === "GET") {
        return new Response(new Uint8Array([1, 2, 3, 4, 5]), {
          status: 200,
          headers: { "Content-Type": "image/webp" },
        });
      }

      if (url === "https://www.googleapis.com/drive/v3/files/1DriveFileAbc_99" && method === "DELETE") {
        return new Response(null, { status: 204 });
      }

      if (url.startsWith("https://www.googleapis.com/drive/v3/files?") && method === "GET") {
        return new Response(
          JSON.stringify({ files: [{ id: "file_room_1" }, { id: "file_room_2" }] }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.startsWith("https://www.googleapis.com/drive/v3/files/file_room_") && method === "DELETE") {
        return new Response(null, { status: 204 });
      }

      return new Response("Unexpected call", { status: 500 });
    };

    const gateway = createGoogleDrivePhotoStorageGateway({
      clientId: "cid",
      clientSecret: "csecret",
      refreshToken: "rtoken",
      folderId: "folder_root_123",
      fetchImpl: fakeFetch,
    });

    const uploaded = await gateway.putPhoto({
      roomId: "room_alpha",
      uploadId: "img_001",
      fileName: "sunset.webp",
      mimeType: "image/webp",
      bytes: new Uint8Array([1, 2, 3, 4, 5]),
    });

    expect(uploaded.storageRef).toBe("gdrive:1DriveFileAbc_99");

    const downloaded = await gateway.getPhoto("gdrive:1DriveFileAbc_99");
    expect(downloaded).toEqual(new Uint8Array([1, 2, 3, 4, 5]));

    await gateway.deletePhoto("gdrive:1DriveFileAbc_99");
    await gateway.deleteRoomPhotos("room_alpha");

    // Token must be fetched only ONCE thanks to caching across all 4 operations
    const tokenCalls = calls.filter((c) => c.url === "https://oauth2.googleapis.com/token");
    expect(tokenCalls).toHaveLength(1);
  });

  it("should deduplicate concurrent OAuth2 token refreshes and refresh again after expiry", async () => {
    let tokenFetchCount = 0;
    let currentTimeMs = 1_000_000;

    const fakeFetch: typeof fetch = async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url === "https://oauth2.googleapis.com/token") {
        tokenFetchCount += 1;
        await new Promise((r) => setTimeout(r, 15));
        return new Response(
          JSON.stringify({ access_token: `tok_${tokenFetchCount}`, expires_in: 120 }),
          { status: 200 }
        );
      }
      return new Response(new Uint8Array([9, 9]), { status: 200 });
    };

    const gateway = createGoogleDrivePhotoStorageGateway({
      clientId: "cid",
      clientSecret: "csecret",
      refreshToken: "rtoken",
      fetchImpl: fakeFetch,
      now: () => currentTimeMs,
    });

    // 4 concurrent reads on cold cache -> must share 1 single OAuth refresh
    await Promise.all([
      gateway.getPhoto("gdrive:abc_1"),
      gateway.getPhoto("gdrive:abc_2"),
      gateway.getPhoto("gdrive:abc_3"),
      gateway.getPhoto("gdrive:abc_4"),
    ]);
    expect(tokenFetchCount).toBe(1);

    // Advance past (120s - 60s safety margin) -> triggers a second refresh
    currentTimeMs += 65_000;
    await gateway.getPhoto("gdrive:abc_1");
    expect(tokenFetchCount).toBe(2);
  });

  it("should safely handle legacy disk paths, 404 files, path-traversal refs, and upstream 403 errors", async () => {
    const fakeFetch: typeof fetch = async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url === "https://oauth2.googleapis.com/token") {
        return new Response(JSON.stringify({ access_token: "tok", expires_in: 3600 }), { status: 200 });
      }
      if (url.includes("missing_file_404")) {
        return new Response("Not Found", { status: 404 });
      }
      return new Response("Quota Exceeded", { status: 403 });
    };

    const gateway = createGoogleDrivePhotoStorageGateway({
      clientId: "cid",
      clientSecret: "csecret",
      refreshToken: "rtoken",
      fetchImpl: fakeFetch,
    });

    // Legacy local disk path from older schema rows -> returns null without crashing
    expect(await gateway.getPhoto("rooms/r1/memories/img_old.webp")).toBeNull();
    await expect(gateway.deletePhoto("rooms/r1/memories/img_old.webp")).resolves.toBeUndefined();

    // Malformed / path-traversal Drive ref -> returns null safely
    expect(await gateway.getPhoto("gdrive:../../etc/passwd")).toBeNull();

    // Deleted file on Drive -> returns null
    expect(await gateway.getPhoto("gdrive:missing_file_404")).toBeNull();

    // Upstream 403 error on upload -> throws standardized UPLOAD_STORAGE_UNAVAILABLE
    await expect(
      gateway.putPhoto({
        roomId: "r1",
        uploadId: "img_err",
        fileName: "a.webp",
        mimeType: "image/webp",
        bytes: new Uint8Array([1]),
      })
    ).rejects.toThrowError(AppError);
  });

  it("should support offline InMemoryPhotoStorageGateway with room-level purge", async () => {
    const mem = createInMemoryPhotoStorageGateway();
    const a1 = await mem.putPhoto({
      roomId: "roomA",
      uploadId: "img1",
      fileName: "1.webp",
      mimeType: "image/webp",
      bytes: new Uint8Array([10, 20]),
    });
    const b1 = await mem.putPhoto({
      roomId: "roomB",
      uploadId: "img2",
      fileName: "2.webp",
      mimeType: "image/webp",
      bytes: new Uint8Array([30, 40]),
    });

    expect(await mem.getPhoto(a1.storageRef)).toEqual(new Uint8Array([10, 20]));
    await mem.deleteRoomPhotos("roomA");
    expect(await mem.getPhoto(a1.storageRef)).toBeNull();
    expect(await mem.getPhoto(b1.storageRef)).toEqual(new Uint8Array([30, 40]));
  });

  it("should create default DateMate_Memories folder when missing and reuse existing app folder idempotently", async () => {
    let createdFolderId: string | null = null;
    const postBodies: Array<Record<string, unknown>> = [];

    const fakeFetch: typeof fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const method = init?.method ?? "GET";

      if (url === "https://oauth2.googleapis.com/token") {
        return new Response(JSON.stringify({ access_token: "ya29.folder_tok", expires_in: 3600 }), { status: 200 });
      }

      if (url.startsWith("https://www.googleapis.com/drive/v3/files?") && method === "GET") {
        const files = createdFolderId ? [{ id: createdFolderId, name: DEFAULT_GDRIVE_FOLDER_NAME }] : [];
        return new Response(JSON.stringify({ files }), { status: 200 });
      }

      if (url.startsWith("https://www.googleapis.com/drive/v3/files") && method === "POST") {
        postBodies.push(JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>);
        createdFolderId = "1AppCreatedFolder_XYZ";
        return new Response(JSON.stringify({ id: createdFolderId, name: DEFAULT_GDRIVE_FOLDER_NAME }), { status: 200 });
      }

      return new Response("Unexpected", { status: 500 });
    };

    const first = await ensureGoogleDriveFolder({
      clientId: "cid",
      clientSecret: "csecret",
      refreshToken: "rtoken",
      fetchImpl: fakeFetch,
    });
    expect(first).toEqual({
      folderId: "1AppCreatedFolder_XYZ",
      folderName: "DateMate_Memories",
      created: true,
    });
    expect(postBodies).toEqual([
      {
        name: "DateMate_Memories",
        mimeType: "application/vnd.google-apps.folder",
      },
    ]);

    const second = await ensureGoogleDriveFolder({
      clientId: "cid",
      clientSecret: "csecret",
      refreshToken: "rtoken",
      fetchImpl: fakeFetch,
    });
    expect(second).toEqual({
      folderId: "1AppCreatedFolder_XYZ",
      folderName: "DateMate_Memories",
      created: false,
    });
    expect(postBodies).toHaveLength(1);
  });

  it("should ignore dirty malformed folder IDs from Drive list and create a clean app folder", async () => {
    const fakeFetch: typeof fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const method = init?.method ?? "GET";

      if (url === "https://oauth2.googleapis.com/token") {
        return new Response(JSON.stringify({ access_token: "ya29.tok", expires_in: 3600 }), { status: 200 });
      }
      if (url.startsWith("https://www.googleapis.com/drive/v3/files?") && method === "GET") {
        return new Response(
          JSON.stringify({ files: [{ id: "../bad/id" }, { id: "" }, { name: "no_id" }] }),
          { status: 200 }
        );
      }
      if (url.startsWith("https://www.googleapis.com/drive/v3/files") && method === "POST") {
        return new Response(JSON.stringify({ id: "1CleanFolder_888" }), { status: 200 });
      }
      return new Response("Unexpected", { status: 500 });
    };

    const res = await ensureGoogleDriveFolder({
      clientId: "cid",
      clientSecret: "csecret",
      refreshToken: "rtoken",
      fetchImpl: fakeFetch,
    });
    expect(res).toEqual({
      folderId: "1CleanFolder_888",
      folderName: "DateMate_Memories",
      created: true,
    });
  });

  it("should reject blank folderName or invalid parentFolderId before making network calls", async () => {
    let networkCalled = false;
    const fakeFetch: typeof fetch = async () => {
      networkCalled = true;
      return new Response("Unexpected", { status: 500 });
    };

    await expect(
      ensureGoogleDriveFolder({
        clientId: "cid",
        clientSecret: "csecret",
        refreshToken: "rtoken",
        folderName: "   ",
        fetchImpl: fakeFetch,
      })
    ).rejects.toMatchObject({ definition: { code: "VALIDATION_FAILED" } });

    await expect(
      ensureGoogleDriveFolder({
        clientId: "cid",
        clientSecret: "csecret",
        refreshToken: "rtoken",
        parentFolderId: "https://drive.google.com/drive/folders/abc",
        fetchImpl: fakeFetch,
      })
    ).rejects.toMatchObject({ definition: { code: "VALIDATION_FAILED" } });

    expect(networkCalled).toBe(false);
  });

  it("should deduplicate concurrent ensureGoogleDriveFolder calls for same account and isolate different accounts", async () => {
    let createCallsAccountA = 0;
    let createCallsAccountB = 0;

    const fakeFetch: typeof fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const method = init?.method ?? "GET";

      if (url === "https://oauth2.googleapis.com/token") {
        const body = String(init?.body ?? "");
        const token = body.includes("rtoken_A") ? "tok_A" : "tok_B";
        return new Response(JSON.stringify({ access_token: token, expires_in: 3600 }), { status: 200 });
      }

      const auth = new Headers(init?.headers).get("authorization");
      if (url.startsWith("https://www.googleapis.com/drive/v3/files?") && method === "GET") {
        await new Promise((r) => setTimeout(r, 15));
        return new Response(JSON.stringify({ files: [] }), { status: 200 });
      }

      if (url.startsWith("https://www.googleapis.com/drive/v3/files") && method === "POST") {
        await new Promise((r) => setTimeout(r, 15));
        if (auth === "Bearer tok_A") {
          createCallsAccountA += 1;
          return new Response(JSON.stringify({ id: "1Folder_AccountA" }), { status: 200 });
        }
        createCallsAccountB += 1;
        return new Response(JSON.stringify({ id: "1Folder_AccountB" }), { status: 200 });
      }

      return new Response("Unexpected", { status: 500 });
    };

    const [a1, a2, a3, b1] = await Promise.all([
      ensureGoogleDriveFolder({ clientId: "cid", clientSecret: "sec", refreshToken: "rtoken_A", fetchImpl: fakeFetch }),
      ensureGoogleDriveFolder({ clientId: "cid", clientSecret: "sec", refreshToken: "rtoken_A", fetchImpl: fakeFetch }),
      ensureGoogleDriveFolder({ clientId: "cid", clientSecret: "sec", refreshToken: "rtoken_A", fetchImpl: fakeFetch }),
      ensureGoogleDriveFolder({ clientId: "cid", clientSecret: "sec", refreshToken: "rtoken_B", fetchImpl: fakeFetch }),
    ]);

    expect(createCallsAccountA).toBe(1);
    expect(createCallsAccountB).toBe(1);
    expect(a1.folderId).toBe("1Folder_AccountA");
    expect(a2.folderId).toBe("1Folder_AccountA");
    expect(a3.folderId).toBe("1Folder_AccountA");
    expect(b1.folderId).toBe("1Folder_AccountB");
  });

  it("should escape quotes in custom folderName query and throw UPLOAD_STORAGE_UNAVAILABLE on Drive 403", async () => {
    let capturedQueryUrl = "";
    const fakeFetch: typeof fetch = async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url === "https://oauth2.googleapis.com/token") {
        return new Response(JSON.stringify({ access_token: "tok", expires_in: 3600 }), { status: 200 });
      }
      capturedQueryUrl = url;
      return new Response("Drive API not enabled", { status: 403 });
    };

    await expect(
      ensureGoogleDriveFolder({
        clientId: "cid",
        clientSecret: "sec",
        refreshToken: "rtoken",
        folderName: "Couple's\\Memories",
        fetchImpl: fakeFetch,
      })
    ).rejects.toMatchObject({ definition: { code: "UPLOAD_STORAGE_UNAVAILABLE" } });

    const decodedQuery = decodeURIComponent(capturedQueryUrl);
    expect(decodedQuery).toContain("name = 'Couple\\'s\\\\Memories'");
  });
});
