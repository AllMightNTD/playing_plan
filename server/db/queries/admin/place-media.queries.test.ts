import { describe, expect, it } from "vitest";
import { db } from "@/server/db/client";
import { placeMedia } from "@/server/db/schema/places";
import { buildRealPhotoSyncQuery, replaceableImagesWhere } from "./place-media.queries";

// Chỉ render SQL bằng toSQL(), không chạy query nên không chạm DB
describe("place-media.queries (SQL)", () => {
  it("replace chỉ xóa ảnh stock/Bing, giữ ảnh upload/wikimedia/instagram", () => {
    const q = db.delete(placeMedia).where(replaceableImagesWhere("p1")).toSQL();
    expect(q.sql).toMatch(/`platform` in \(\?, \?, \?\)/i);
    expect(q.params).toEqual(expect.arrayContaining(["p1", "image", "unsplash", "pexels", "bing"]));
    expect(q.params).not.toContain("upload");
    expect(q.params).not.toContain("wikimedia");
  });

  it("list sync: chỉ place published, bỏ place có ảnh curated hoặc đã có ảnh Bing", () => {
    const q = buildRealPhotoSyncQuery({}).toSQL();
    expect(q.sql).toMatch(/`places`\.`status` = \?/);
    expect(q.params).toContain("published");
    expect(q.sql).toMatch(/platform` in \('wikimedia', 'upload', 'instagram'\)/i);
    expect(q.sql.match(/NOT EXISTS/g)).toHaveLength(2);
  });

  it("force: vẫn bỏ place có ảnh curated, chỉ bỏ điều kiện ảnh Bing", () => {
    const q = buildRealPhotoSyncQuery({ force: true }).toSQL();
    expect(q.params).toContain("published");
    expect(q.sql.match(/NOT EXISTS/g)).toHaveLength(1);
    expect(q.sql).toMatch(/'wikimedia', 'upload', 'instagram'/);
  });
});
