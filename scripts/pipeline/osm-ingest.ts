import * as fs from "fs";
import * as path from "path";
import { db, DbExecutor } from "@/server/db/client";
import { candidatePlaces, placeBlocklist, PlaceBlocklist } from "@/server/db/schema/governance";
import { scoreDateWorthiness, OsmPlaceCandidateInput } from "@/server/services/ingest/date-worthiness.scorer";
import { nanoid } from "nanoid";

export interface DistrictBBox {
  name: string;
  bbox: [number, number, number, number]; // [latMin, lngMin, latMax, lngMax]
}

export const HANOI_DISTRICTS: DistrictBBox[] = [
  { name: "hoan_kiem", bbox: [21.020, 105.845, 21.045, 105.865] },
  { name: "ba_dinh", bbox: [21.025, 105.815, 21.050, 105.845] },
  { name: "tay_ho", bbox: [21.050, 105.800, 21.090, 105.850] },
  { name: "dong_da", bbox: [21.005, 105.815, 21.030, 105.840] },
  { name: "cau_giay", bbox: [21.020, 105.780, 21.050, 105.810] },
  { name: "hai_ba_trung", bbox: [20.995, 105.845, 21.020, 105.870] },
];

export interface OsmIngestOptions {
  dryRun?: boolean;
  districts?: string[];
  outputDir?: string;
  delayMs?: number;
  insertToDb?: boolean;
  executor?: DbExecutor;
}

/**
 * Xây dựng truy vấn Overpass QL cho một bounding box
 */
export function buildOverpassQuery(bbox: [number, number, number, number]): string {
  const [latMin, lngMin, latMax, lngMax] = bbox;
  return `
    [out:json][timeout:25];
    (
      node["amenity"~"cafe|restaurant"](${latMin},${lngMin},${latMax},${lngMax});
      node["tourism"~"viewpoint|museum|gallery"](${latMin},${lngMin},${latMax},${lngMax});
      node["leisure"="park"](${latMin},${lngMin},${latMax},${lngMax});
    );
    out body;
  `;
}

/**
 * Pipeline nạp dữ liệu địa điểm thô từ OpenStreetMap có phân vùng,
 * tôn trọng Fair Use Policy (delay 3s) và áp dụng bộ chấm điểm tiềm năng hẹn hò.
 */
export async function runOsmIngestion(options: OsmIngestOptions = {}) {
  const outputDir = options.outputDir || path.resolve(process.cwd(), "scripts/output/osm");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const delayMs = options.delayMs ?? 3000;
  const targetDistricts = options.districts
    ? HANOI_DISTRICTS.filter((d) => options.districts!.includes(d.name))
    : HANOI_DISTRICTS;

  console.log(`[OSM Ingest] Bắt đầu thu thập cho ${targetDistricts.length} quận (dryRun: ${Boolean(options.dryRun)})...`);

  // Lấy blocklist từ DB nếu có
  let blocklist: PlaceBlocklist[] = [];
  if (options.insertToDb && options.executor) {
    blocklist = await options.executor.select().from(placeBlocklist);
  }

  const qualifyingCandidates: Array<{
    candidate: OsmPlaceCandidateInput;
    score: number;
    district: string;
  }> = [];

  for (let i = 0; i < targetDistricts.length; i++) {
    const district = targetDistricts[i];
    console.log(`[OSM Ingest] Đang quét quận ${district.name} [${district.bbox.join(",")}]...`);

    const cacheFile = path.join(outputDir, `${district.name}.json`);
    let elements: Array<{
      id: number;
      lat: number;
      lon: number;
      tags?: Record<string, string>;
    }> = [];

    if (fs.existsSync(cacheFile)) {
      console.log(`[OSM Ingest] Đọc dữ liệu từ cache: ${cacheFile}`);
      const raw = fs.readFileSync(cacheFile, "utf-8");
      elements = JSON.parse(raw);
    } else if (options.dryRun) {
      // Mock dữ liệu trong môi trường test
      elements = [
        {
          id: 10001 + i,
          lat: district.bbox[0] + 0.005,
          lon: district.bbox[1] + 0.005,
          tags: {
            name: `Hanoi Romantic Cafe ${district.name}`,
            amenity: "cafe",
            outdoor_seating: "yes",
            opening_hours: "07:00-23:00",
            "contact:facebook": "https://fb.com/sample",
          },
        },
        {
          id: 20001 + i,
          lat: district.bbox[0] + 0.002,
          lon: district.bbox[1] + 0.002,
          tags: {
            name: "Trà đá vỉa hè",
            amenity: "cafe",
          },
        },
      ];
      fs.writeFileSync(cacheFile, JSON.stringify(elements, null, 2), "utf-8");
    } else {
      // Gọi Overpass API thật với cơ chế fallback mirrors chống Bad Gateway
      const query = buildOverpassQuery(district.bbox);
      const mirrors = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
        "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
      ];

      let success = false;
      for (const mirror of mirrors) {
        try {
          const url = `${mirror}?data=${encodeURIComponent(query)}`;
          const res = await fetch(url, {
            headers: { "User-Agent": "DateMate-Ingestion/1.0 (hanoi-dating-catalog)" },
          });
          if (res.ok) {
            const data = (await res.json()) as { elements?: typeof elements };
            elements = data.elements || [];
            fs.writeFileSync(cacheFile, JSON.stringify(elements, null, 2), "utf-8");
            success = true;
            break;
          } else {
            console.warn(`[OSM Ingest] Mirror ${mirror} trả về ${res.status} ${res.statusText}. Thử mirror tiếp theo...`);
          }
        } catch (err: unknown) {
          console.warn(`[OSM Ingest] Mirror ${mirror} lỗi kết nối: ${err instanceof Error ? err.message : err}`);
        }
      }

      if (!success) {
        console.error(`[OSM Ingest] Không thể lấy dữ liệu quận ${district.name} từ toàn bộ các mirror Overpass.`);
      }

      // Giãn cách 3 giây tránh bị 429
      if (i < targetDistricts.length - 1 && delayMs > 0) {
        console.log(`[OSM Ingest] Tạm nghỉ ${delayMs}ms theo Fair Use Policy...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    // Chấm điểm và lọc
    for (const el of elements) {
      const tags = el.tags || {};
      const name = tags.name;
      if (!name) continue;

      const candidateInput: OsmPlaceCandidateInput = {
        osmId: `node/${el.id}`,
        name,
        lat: el.lat,
        lng: el.lon,
        category: tags.amenity || tags.tourism || tags.leisure || "cafe",
        tags,
        address: tags["addr:street"]
          ? `${tags["addr:housenumber"] || ""} ${tags["addr:street"]}, Hà Nội`.trim()
          : `Hà Nội (${district.name})`,
      };

      const scoreResult = scoreDateWorthiness(candidateInput, blocklist);
      if (scoreResult.passesThreshold) {
        qualifyingCandidates.push({
          candidate: candidateInput,
          score: scoreResult.score,
          district: district.name,
        });

        // Nếu yêu cầu nạp DB và có executor
        if (options.insertToDb && options.executor) {
          const now = new Date();
          await options.executor
            .insert(candidatePlaces)
            .values({
              id: `cnd_${nanoid(16)}`,
              osmId: candidateInput.osmId,
              name: candidateInput.name,
              searchName: candidateInput.name.toLowerCase(),
              lat: candidateInput.lat.toString(),
              lng: candidateInput.lng.toString(),
              address: candidateInput.address || "Hà Nội",
              city: "hanoi",
              category: candidateInput.category,
              rawTags: candidateInput.tags,
              datingScore: scoreResult.score,
              status: "pending",
              createdAt: now,
              updatedAt: now,
            })
            .onDuplicateKeyUpdate({
              set: {
                datingScore: scoreResult.score,
                rawTags: candidateInput.tags,
                updatedAt: now,
              },
            });
        }
      }
    }
  }

  console.log(`[OSM Ingest] Đã tìm thấy ${qualifyingCandidates.length} địa điểm thỏa mãn điều kiện hẹn hò (>=40).`);
  return {
    districtsScanned: targetDistricts.length,
    qualifyingCandidatesCount: qualifyingCandidates.length,
    candidates: qualifyingCandidates,
  };
}

if (require.main === module) {
  runOsmIngestion({ dryRun: true, delayMs: 100 })
    .then((res) => console.log(`[OSM Complete] Candidates found: ${res.qualifyingCandidatesCount}`))
    .catch((err) => {
      console.error("[OSM Fatal Error]", err);
      process.exit(1);
    });
}
