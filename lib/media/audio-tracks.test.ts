import { describe, expect, it } from "vitest";
import { getAudioTracks, getAudioTrackById, ROYALTY_FREE_TRACKS } from "./audio-tracks";

describe("Royalty-Free Audio Tracks & Offline Beatmap", () => {
  it("should return at least 3 royalty-free tracks with beatmaps", () => {
    const tracks = getAudioTracks();
    expect(tracks.length).toBeGreaterThanOrEqual(3);

    for (const track of tracks) {
      expect(track.id).toBeTruthy();
      expect(track.title).toBeTruthy();
      expect(track.bpm).toBeGreaterThan(0);
      expect(track.durationSec).toBeGreaterThan(0);
      expect(track.beatmap.length).toBeGreaterThan(3);
      expect(track.beatmap[0]).toBe(0);
      // Kiểm tra beatmap tăng dần đơn điệu
      for (let i = 1; i < track.beatmap.length; i++) {
        expect(track.beatmap[i]).toBeGreaterThan(track.beatmap[i - 1]);
      }
    }
  });

  it("should return the exact track by id, and fallback to default if not found", () => {
    const track = getAudioTrackById("westlake-sunset-acoustic");
    expect(track.id).toBe("westlake-sunset-acoustic");
    expect(track.bpm).toBe(75);

    const defaultTrack = getAudioTrackById("non-existent-id");
    expect(defaultTrack.id).toBe(ROYALTY_FREE_TRACKS[0].id);
  });
});
