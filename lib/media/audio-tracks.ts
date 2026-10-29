export interface AudioTrackDto {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  durationSec: number;
  mood: "chill" | "romantic" | "peaceful";
  beatmap: number[];
  audioFrequencyHz: number[];
}

export const ROYALTY_FREE_TRACKS: AudioTrackDto[] = [
  {
    id: "hanoi-autumn-lofi",
    title: "Hanoi Autumn Lo-Fi",
    artist: "DateMate Studio",
    bpm: 85,
    durationSec: 32,
    mood: "chill",
    // Chuyển slide theo phách 4s (~4 phách của 85 BPM)
    beatmap: [0.0, 4.0, 8.0, 12.0, 16.0, 20.0, 24.0, 28.0],
    audioFrequencyHz: [261.63, 329.63, 392.0, 523.25], // C4, E4, G4, C5
  },
  {
    id: "westlake-sunset-acoustic",
    title: "Westlake Sunset Acoustic",
    artist: "DateMate Studio",
    bpm: 75,
    durationSec: 36,
    mood: "romantic",
    // Chuyển slide theo phách 4.5s
    beatmap: [0.0, 4.5, 9.0, 13.5, 18.0, 22.5, 27.0, 31.5],
    audioFrequencyHz: [220.0, 277.18, 329.63, 440.0], // A3, C#4, E4, A4
  },
  {
    id: "old-quarter-rain-piano",
    title: "Old Quarter Rain Piano",
    artist: "DateMate Studio",
    bpm: 70,
    durationSec: 38,
    mood: "peaceful",
    // Chuyển slide theo phách 4.8s
    beatmap: [0.0, 4.8, 9.6, 14.4, 19.2, 24.0, 28.8, 33.6],
    audioFrequencyHz: [196.0, 246.94, 293.66, 392.0], // G3, B3, D4, G4
  },
];

export function getAudioTracks(): AudioTrackDto[] {
  return ROYALTY_FREE_TRACKS.map((t) => ({ ...t, beatmap: [...t.beatmap] }));
}

export function getAudioTrackById(id?: string | null): AudioTrackDto {
  const found = ROYALTY_FREE_TRACKS.find((t) => t.id === id);
  return found ? { ...found, beatmap: [...found.beatmap] } : { ...ROYALTY_FREE_TRACKS[0], beatmap: [...ROYALTY_FREE_TRACKS[0].beatmap] };
}
