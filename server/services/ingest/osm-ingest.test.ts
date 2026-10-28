import { describe, it, expect } from "vitest";
import { buildOverpassQuery, runOsmIngestion } from "@/scripts/pipeline/osm-ingest";
import * as fs from "fs";

describe("OSM Ingestion Pipeline", () => {
  it("should construct valid Overpass QL query with bounding box", () => {
    const query = buildOverpassQuery([21.02, 105.84, 21.04, 105.86]);
    expect(query).toContain("amenity");
    expect(query).toContain("tourism");
    expect(query).toContain("21.02,105.84,21.04,105.86");
  });

  it("should run OSM ingestion in dryRun mode, discarding junk and keeping romantic cafes", async () => {
    const testDir = "scripts/output/test_osm";
    const res = await runOsmIngestion({
      dryRun: true,
      districts: ["hoan_kiem", "ba_dinh"],
      outputDir: testDir,
      delayMs: 10,
    });

    expect(res.districtsScanned).toBe(2);
    // Mỗi quận mock 1 quán lãng mạn (pass) và 1 quán trà đá (fail)
    expect(res.qualifyingCandidatesCount).toBe(2);

    for (const c of res.candidates) {
      expect(c.score).toBeGreaterThanOrEqual(40);
      expect(c.candidate.name).not.toContain("Trà đá");
    }

    // Dọn dẹp folder test
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });
});
