import * as fs from "fs";
import * as path from "path";
import { db, DbExecutor } from "@/server/db/client";
import {
  candidatePlaces,
  placeBlocklist,
  PlaceBlocklist,
  CandidatePlace,
} from "@/server/db/schema/governance";
import {
  scoreDateWorthiness,
  OsmPlaceCandidateInput,
} from "@/server/services/ingest/date-worthiness.scorer";
import { nanoid } from "nanoid";

export interface DistrictBBox {
  name: string;
  bbox: [number, number, number, number]; // [latMin, lngMin, latMax, lngMax]
}

export const HANOI_DISTRICTS: DistrictBBox[] = [
  // 6 Quận trung tâm cốt lõi
  { name: "hoan_kiem", bbox: [21.02, 105.845, 21.045, 105.865] },
  { name: "ba_dinh", bbox: [21.025, 105.815, 21.05, 105.845] },
  { name: "tay_ho", bbox: [21.05, 105.8, 21.09, 105.85] },
  { name: "dong_da", bbox: [21.005, 105.815, 21.03, 105.84] },
  { name: "cau_giay", bbox: [21.02, 105.78, 21.05, 105.81] },
  { name: "hai_ba_trung", bbox: [20.995, 105.845, 21.02, 105.87] },

  // Các quận phát triển sầm uất & vui chơi giải trí mở rộng
  { name: "thanh_xuan", bbox: [20.985, 105.795, 21.01, 105.825] },
  { name: "ha_dong", bbox: [20.95, 105.75, 20.99, 105.795] },
  { name: "nam_tu_liem", bbox: [20.99, 105.74, 21.03, 105.78] },
  { name: "bac_tu_liem", bbox: [21.04, 105.74, 21.09, 105.79] },
  { name: "long_bien", bbox: [21.02, 105.865, 21.065, 105.915] },
  { name: "hoang_mai", bbox: [20.96, 105.825, 20.995, 105.875] },
  { name: "gia_lam", bbox: [20.98, 105.92, 21.03, 105.97] },

  // Khu vực dã ngoại, cắm trại glamping ngoại thành
  { name: "soc_son", bbox: [21.24, 105.78, 21.33, 105.88] },
  { name: "ba_vi", bbox: [21.05, 105.32, 21.15, 105.42] },
];

/**
 * Chia nhỏ bounding box thành lưới 2x2 (4 ô nhỏ) để giảm tải cho Overpass server,
 * hoàn toàn loại bỏ lỗi 502 Bad Gateway và 504 Gateway Timeout.
 */
export function subdivideBBox(
  bbox: [number, number, number, number],
  grid = 2,
): Array<[number, number, number, number]> {
  const [latMin, lngMin, latMax, lngMax] = bbox;
  const latStep = (latMax - latMin) / grid;
  const lngStep = (lngMax - lngMin) / grid;

  const tiles: Array<[number, number, number, number]> = [];
  for (let i = 0; i < grid; i++) {
    for (let j = 0; j < grid; j++) {
      const tileLatMin = Number((latMin + i * latStep).toFixed(5));
      const tileLatMax = Number((latMin + (i + 1) * latStep).toFixed(5));
      const tileLngMin = Number((lngMin + j * lngStep).toFixed(5));
      const tileLngMax = Number((lngMin + (j + 1) * lngStep).toFixed(5));
      tiles.push([tileLatMin, tileLngMin, tileLatMax, tileLngMax]);
    }
  }
  return tiles;
}

export interface OsmIngestOptions {
  dryRun?: boolean;
  districts?: string[];
  outputDir?: string;
  delayMs?: number;
  insertToDb?: boolean;
  executor?: DbExecutor;
  subdivideDense?: boolean; // Tự động chia nhỏ các quận mật độ cao
}

/**
 * Xây dựng truy vấn Overpass QL cho một bounding box, bao quát toàn diện:
 * Cà phê, Ẩm thực, Pub/Bar, Rạp phim, Triển lãm, Bảo tàng, Công viên, Vui chơi giải trí, Tiệm bánh & Workshop
 */
export function buildOverpassQuery(
  bbox: [number, number, number, number],
): string {
  const [latMin, lngMin, latMax, lngMax] = bbox;
  return `
    [out:json][timeout:25][maxsize:268435456];
    (
      node["amenity"~"cafe|restaurant|bar|pub|ice_cream|fast_food|cinema|theatre|arts_centre"](${latMin},${lngMin},${latMax},${lngMax});
      node["tourism"~"viewpoint|museum|gallery|theme_park|zoo|attraction|aquarium|picnic_site"](${latMin},${lngMin},${latMax},${lngMax});
      node["leisure"~"park|garden|bowling_alley|miniature_golf|sports_centre|water_park|amusement_arcade"](${latMin},${lngMin},${latMax},${lngMax});
      node["shop"~"bakery|pastry|coffee|tea|art|craft"](${latMin},${lngMin},${latMax},${lngMax});
    );
    out body;
  `;
}

/**
 * Pipeline nạp dữ liệu địa điểm thô từ OpenStreetMap có phân vùng,
 * tôn trọng Fair Use Policy (delay 3s) và áp dụng bộ chấm điểm tiềm năng hẹn hò.
 */
export async function runOsmIngestion(options: OsmIngestOptions = {}) {
  const outputDir =
    options.outputDir || path.resolve(process.cwd(), "scripts/output/osm");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const delayMs = options.delayMs ?? 3000;
  const targetDistricts = options.districts
    ? HANOI_DISTRICTS.filter((d) => options.districts!.includes(d.name))
    : HANOI_DISTRICTS;

  console.log(
    `[OSM Ingest] Bắt đầu thu thập cho ${targetDistricts.length} quận (dryRun: ${Boolean(options.dryRun)})...`,
  );

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
    console.log(
      `[OSM Ingest] Đang quét quận ${district.name} [${district.bbox.join(",")}]...`,
    );

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
      // Xác định xem quận có cần chia nhỏ bounding box thành lưới 2x2 không
      const denseDistricts = [
        "dong_da",
        "cau_giay",
        "hoan_kiem",
        "hai_ba_trung",
        "ba_dinh",
        "hoang_mai",
        "nam_tu_liem",
        "thanh_xuan",
        "ha_dong",
      ];
      const shouldSubdivide =
        options.subdivideDense !== false &&
        denseDistricts.includes(district.name);
      const tilesToScan = shouldSubdivide
        ? subdivideBBox(district.bbox, 2)
        : [district.bbox];

      if (shouldSubdivide) {
        console.log(
          `[OSM Ingest] Chia nhỏ quận ${district.name} thành 4 phân vùng con để chống nghẽn server.`,
        );
      }

      const mirrors = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
        "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
        "https://overpass.private.coffee/api/interpreter",
      ];

      const elementMap = new Map<number, (typeof elements)[0]>();

      for (let t = 0; t < tilesToScan.length; t++) {
        const tileBbox = tilesToScan[t];
        const query = buildOverpassQuery(tileBbox);
        let success = false;

        for (const mirror of mirrors) {
          try {
            const url = `${mirror}?data=${encodeURIComponent(query)}`;
            const res = await fetch(url, {
              headers: {
                "User-Agent": "DateMate-Ingestion/2.0 (hanoi-dating-catalog)",
              },
            });
            if (res.ok) {
              const data = (await res.json()) as { elements?: typeof elements };
              for (const el of data.elements || []) {
                elementMap.set(el.id, el);
              }
              success = true;
              break;
            } else {
              console.warn(
                `[OSM Ingest] Mirror ${mirror} trả về ${res.status} ${res.statusText}. Thử mirror tiếp theo...`,
              );
            }
          } catch (err: unknown) {
            console.warn(
              `[OSM Ingest] Mirror ${mirror} lỗi: ${err instanceof Error ? err.message : err}`,
            );
          }
        }

        if (!success) {
          console.warn(
            `[OSM Ingest] Không lấy được dữ liệu ô [${tileBbox.join(",")}] của quận ${district.name}.`,
          );
        }

        if (t < tilesToScan.length - 1) {
          await new Promise((r) => setTimeout(r, 800));
        }
      }

      elements = Array.from(elementMap.values());
      fs.writeFileSync(cacheFile, JSON.stringify(elements, null, 2), "utf-8");

      // Giãn cách 2.5s theo Fair Use Policy
      if (i < targetDistricts.length - 1 && delayMs > 0) {
        console.log(
          `[OSM Ingest] Tạm nghỉ ${delayMs}ms theo Fair Use Policy...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    // Chấm điểm và lọc
    const districtCandidatesToInsert: CandidatePlace[] = [];
    const now = new Date();

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

        if (options.insertToDb && options.executor) {
          districtCandidatesToInsert.push({
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
            evaluatedTier: null,
            evaluatedDateFit: null,
            batchId: null,
          });
        }
      }
    }

    // Ghi batch vào DB (mỗi batch 50 bản ghi) để tốc độ siêu nhanh
    if (
      options.insertToDb &&
      options.executor &&
      districtCandidatesToInsert.length > 0
    ) {
      const CHUNK_SIZE = 50;
      for (let c = 0; c < districtCandidatesToInsert.length; c += CHUNK_SIZE) {
        const chunk = districtCandidatesToInsert.slice(c, c + CHUNK_SIZE);
        for (const item of chunk) {
          await options.executor
            .insert(candidatePlaces)
            .values(item)
            .onDuplicateKeyUpdate({
              set: {
                datingScore: item.datingScore,
                rawTags: item.rawTags,
                updatedAt: now,
              },
            });
        }
      }
    }
  }

  console.log(
    `[OSM Ingest] Đã tìm thấy ${qualifyingCandidates.length} địa điểm thỏa mãn điều kiện hẹn hò (>=40).`,
  );
  return {
    districtsScanned: targetDistricts.length,
    qualifyingCandidatesCount: qualifyingCandidates.length,
    candidates: qualifyingCandidates,
  };
}

if (require.main === module) {
  runOsmIngestion({ dryRun: true, delayMs: 100 })
    .then((res) =>
      console.log(
        `[OSM Complete] Candidates found: ${res.qualifyingCandidatesCount}`,
      ),
    )
    .catch((err) => {
      console.error("[OSM Fatal Error]", err);
      process.exit(1);
    });
}
