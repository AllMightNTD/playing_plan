"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import type { AudioTrackDto } from "@/lib/media/audio-tracks";
import type { VirtualVideoPayloadDto, VirtualVideoSlideDto } from "@/server/services/ai/memory-script.service";

interface VirtualVideoCanvasProps {
  memoryId?: string;
  initialTrackId?: string;
  onToast?: (message: string, type?: "success" | "error" | "info") => void;
  refreshTrigger?: number;
}

export function VirtualVideoCanvas({
  memoryId = "default-memory",
  initialTrackId = "hanoi-autumn-lofi",
  onToast,
  refreshTrigger = 0,
}: VirtualVideoCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // States
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [tracks, setTracks] = useState<AudioTrackDto[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState(initialTrackId);
  const [videoPayload, setVideoPayload] = useState<VirtualVideoPayloadDto | null>(null);
  const [isLoadingScript, setIsLoadingScript] = useState(false);
  const [loadedImages, setLoadedImages] = useState<HTMLImageElement[]>([]);

  // Refs for Web Audio API & Canvas Animation Loop
  const audioCtxRef = useRef<AudioContext | null>(null);
  const beatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const slideStartTimeRef = useRef<number>(0);
  const isPlayingRef = useRef(false);
  isPlayingRef.current = isPlaying;

  const onToastRef = useRef(onToast);
  useEffect(() => {
    onToastRef.current = onToast;
  }, [onToast]);

  const toast = useCallback(
    (msg: string, type: "success" | "error" | "info" = "info") => {
      onToastRef.current?.(msg, type);
    },
    []
  );

  // 1. Tải danh sách Audio Tracks
  useEffect(() => {
    let ignore = false;
    async function fetchTracks() {
      try {
        const res = await fetch("/api/v1/user/memories/tracks");
        if (res.ok) {
          const data = (await res.json()) as { data: AudioTrackDto[] };
          if (!ignore && data.data) {
            setTracks(data.data);
          }
        }
      } catch {
        // Fallback tracks nếu offline
      }
    }
    fetchTracks();
    return () => {
      ignore = true;
    };
  }, []);

  // 2. Tải hoặc sinh kịch bản Video Kỷ Niệm Ảo
  const loadVirtualVideoScript = useCallback(
    async (simulate429 = false, silent = false) => {
      setIsLoadingScript(true);
      try {
        const res = await fetch(`/api/v1/user/memories/${memoryId}/virtual-video`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trackId: selectedTrackId,
            simulate429,
          }),
        });

        if (res.ok) {
          const json = (await res.json()) as { data: VirtualVideoPayloadDto };
          setVideoPayload(json.data);
          setCurrentSlideIndex(0);
          slideStartTimeRef.current = performance.now();

          if (!silent) {
            if (simulate429) {
              toast("🛡️ Gemini gặp HTTP 429 Rate Limit ➔ Đã tự động kích hoạt Fallback Heuristic Template thành công!", "info");
            } else {
              toast("✨ Gemini SDK đã sinh kịch bản kỷ niệm mới từ metadata ẩn danh (Zero PII)!", "success");
            }
          }
        } else {
          if (!silent) {
            toast("Không thể nạp kịch bản video, vui lòng thử lại.", "error");
          }
        }
      } catch {
        if (!silent) {
          toast("Lỗi kết nối khi nạp kịch bản video.", "error");
        }
      } finally {
        setIsLoadingScript(false);
      }
    },
    [memoryId, selectedTrackId, toast]
  );

  // Tải hoặc cập nhật kịch bản video khi mount hoặc khi refreshTrigger thay đổi
  useEffect(() => {
    loadVirtualVideoScript(false, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memoryId, refreshTrigger]);

  // 3. Preload các ảnh của slides vào bộ nhớ để Canvas vẽ không giật
  useEffect(() => {
    if (!videoPayload || videoPayload.slides.length === 0) return;

    let isCancelled = false;
    const images: HTMLImageElement[] = [];
    let loadedCount = 0;

    videoPayload.slides.forEach((slide, idx) => {
      const img = new Image();
      // Chỉ gán crossOrigin nếu là ảnh CDN ngoài (unsplash), ảnh nội bộ /api/... giữ nguyên session cookie
      if (slide.imageUrl.startsWith("http://") || slide.imageUrl.startsWith("https://")) {
        img.crossOrigin = "anonymous";
      }
      img.src = slide.imageUrl;
      img.onload = () => {
        if (isCancelled) return;
        loadedCount++;
        if (loadedCount === videoPayload.slides.length) {
          setLoadedImages(images);
        }
      };
      img.onerror = () => {
        // Nếu ảnh lỗi mạng, tạo ảnh fallback canvas đơn giản
        const fallbackCanvas = document.createElement("canvas");
        fallbackCanvas.width = 640;
        fallbackCanvas.height = 360;
        const ctx = fallbackCanvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = idx % 2 === 0 ? "#3A2A23" : "#24331E";
          ctx.fillRect(0, 0, 640, 360);
          ctx.fillStyle = "#FAF4E8";
          ctx.font = "bold 20px serif";
          ctx.fillText("Khoảnh khắc hẹn hò Hà Nội", 40, 180);
        }
        img.src = fallbackCanvas.toDataURL();
      };
      images[idx] = img;
    });

    return () => {
      isCancelled = true;
    };
  }, [videoPayload]);

  // 4. Web Audio Policy: Kích hoạt Lo-Fi Synthesizer sau tương tác click
  const startWebAudio = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass();
      }
      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }

      const activeTrack = tracks.find((t) => t.id === selectedTrackId);
      const frequencies = activeTrack?.audioFrequencyHz || [261.63, 329.63, 392.0, 523.25];
      let step = 0;

      if (beatIntervalRef.current) clearInterval(beatIntervalRef.current);

      // Nhịp beat phát mỗi ~700ms (~85 BPM)
      const intervalMs = Math.round((60 / (activeTrack?.bpm || 85)) * 1000);
      beatIntervalRef.current = setInterval(() => {
        if (!isPlayingRef.current || !audioCtxRef.current) return;
        const ctx = audioCtxRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.value = frequencies[step % frequencies.length];

        // Âm lượng dịu nhẹ Lo-Fi (0.04 -> 0.001)
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.45);
        step++;
      }, intervalMs);
    } catch {
      // Trình duyệt không hỗ trợ Web Audio
    }
  }, [tracks, selectedTrackId]);

  const stopWebAudio = useCallback(() => {
    if (beatIntervalRef.current) {
      clearInterval(beatIntervalRef.current);
      beatIntervalRef.current = null;
    }
  }, []);

  // 5. Toggle Play/Pause tuân thủ Web Audio Autoplay Prevention
  const togglePlay = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);

    if (nextState) {
      startWebAudio();
      slideStartTimeRef.current = performance.now();
      toast("🎵 Đang phát Phim Kỷ Niệm Ảo Ken Burns 60fps & Nhạc Lo-Fi!", "success");
    } else {
      stopWebAudio();
    }
  };

  // 6. Chuyển slide thủ công
  const handleNextSlide = () => {
    if (!videoPayload || videoPayload.slides.length === 0) return;
    setCurrentSlideIndex((prev) => (prev + 1) % videoPayload.slides.length);
    slideStartTimeRef.current = performance.now();
  };

  // 7. Canvas Ken Burns 60fps Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let isLoopRunning = true;

    const render = (now: number) => {
      if (!isLoopRunning) return;

      if (!videoPayload || videoPayload.slides.length === 0 || loadedImages.length === 0) {
        // Màn hình chờ khi chưa có dữ liệu
        ctx.fillStyle = "#181210";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#FAF4E8";
        ctx.font = "14px 'Be Vietnam Pro', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Đang chuẩn bị thước phim kỷ niệm...", canvas.width / 2, canvas.height / 2);
        animFrameIdRef.current = requestAnimationFrame(render);
        return;
      }

      const slides = videoPayload.slides;
      const currentSlide = slides[currentSlideIndex] || slides[0];
      const durationMs = (currentSlide.durationSec || 4.0) * 1000;
      const elapsed = isPlayingRef.current ? now - slideStartTimeRef.current : 0;
      let progress = Math.min(1.0, elapsed / durationMs);

      // Chuyển slide tự động theo Beatmap khi hết thời gian slide
      if (isPlayingRef.current && elapsed >= durationMs) {
        const nextIdx = (currentSlideIndex + 1) % slides.length;
        setCurrentSlideIndex(nextIdx);
        slideStartTimeRef.current = now;
        progress = 0;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Vẽ hình ảnh hiện tại với hiệu ứng Ken Burns hoặc Crossfade tĩnh
      const currentImg = loadedImages[currentSlideIndex] || loadedImages[0];
      if (currentImg && currentImg.complete) {
        ctx.save();

        if (isReducedMotion) {
          // Crossfade tĩnh: Scale 1.0 cố định, không pan
          ctx.drawImage(currentImg, 0, 0, canvas.width, canvas.height);
        } else {
          // Hiệu ứng Ken Burns Pan/Zoom 60fps
          let scale = 1.0;
          let transX = 0;
          let transY = 0;

          switch (currentSlide.panDirection) {
            case "zoom-in":
              scale = 1.0 + progress * 0.15;
              break;
            case "zoom-out":
              scale = 1.15 - progress * 0.15;
              break;
            case "pan-left":
              scale = 1.12;
              transX = 15 - progress * 30;
              break;
            case "pan-right":
              scale = 1.12;
              transX = -15 + progress * 30;
              break;
          }

          // Áp dụng transform với tâm điểm
          ctx.translate(canvas.width / 2 + transX, canvas.height / 2 + transY);
          ctx.scale(scale, scale);
          ctx.drawImage(currentImg, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
        }
        ctx.restore();

        // Hiệu ứng chuyển cảnh Crossfade mềm ở 0.6s cuối của slide
        const crossfadeWindowMs = 600;
        const timeRemaining = durationMs - elapsed;
        if (isPlayingRef.current && timeRemaining < crossfadeWindowMs && slides.length > 1) {
          const nextIdx = (currentSlideIndex + 1) % slides.length;
          const nextImg = loadedImages[nextIdx];
          if (nextImg && nextImg.complete) {
            const fadeAlpha = 1.0 - timeRemaining / crossfadeWindowMs;
            ctx.save();
            ctx.globalAlpha = Math.max(0, Math.min(1, fadeAlpha));
            ctx.drawImage(nextImg, 0, 0, canvas.width, canvas.height);
            ctx.restore();
          }
        }
      }

      // Khung viền phim bán trong suốt & Phụ đề kỷ niệm
      ctx.fillStyle = "rgba(24, 18, 16, 0.65)";
      ctx.fillRect(0, canvas.height - 56, canvas.width, 56);

      // Phụ đề thơ mộng từ Gemini
      ctx.fillStyle = "#FAF4E8";
      ctx.font = "bold 14px 'Be Vietnam Pro', serif";
      ctx.textAlign = "left";
      ctx.fillText(currentSlide.caption || "Khoảnh khắc hẹn hò Hà Nội", 18, canvas.height - 24);

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      isLoopRunning = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [videoPayload, loadedImages, currentSlideIndex, isReducedMotion]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (beatIntervalRef.current) clearInterval(beatIntervalRef.current);
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const activeTrack = tracks.find((t) => t.id === selectedTrackId) || {
    id: "hanoi-autumn-lofi",
    title: "Hanoi Autumn Lo-Fi",
    bpm: 85,
  };

  const currentSlide: VirtualVideoSlideDto | undefined = videoPayload?.slides[currentSlideIndex];

  return (
    <div className="bg-[#FFFDF9] border-2 border-[#CBB292] rounded-2xl p-4 sm:p-5 shadow-md space-y-4">
      {/* Header Điều Khiển & Accessibility */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="bg-brand-terracotta text-white text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
            Canvas 60fps
          </span>
          <span id="canvasModeLabel" className="text-xs font-bold text-paper-muted">
            {isReducedMotion ? "Hiệu ứng: Crossfade tĩnh (Reduced Motion)" : "Hiệu ứng: Ken Burns Pan/Zoom 60fps"}
          </span>
        </div>
        <label className="flex items-center gap-1.5 text-xs font-bold text-paper-ink cursor-pointer">
          <input
            type="checkbox"
            checked={isReducedMotion}
            onChange={(e) => {
              setIsReducedMotion(e.target.checked);
              toast(
                e.target.checked
                  ? "♿ Đã chuyển Canvas sang chế độ Crossfade tĩnh (prefers-reduced-motion)."
                  : "🎞️ Đã bật lại chuyển động Ken Burns 60fps."
              );
            }}
            className="accent-brand-terracotta"
          />
          <span>♿ prefers-reduced-motion (Crossfade tĩnh)</span>
        </label>
      </div>

      {/* Khung HTML5 Canvas + Đĩa Than Xoay Tròn Beat-Sync */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-paper-ink bg-[#181210]">
        <canvas
          ref={canvasRef}
          width={640}
          height={360}
          className="w-full h-56 sm:h-72 block object-cover"
        />

        {/* Đĩa than xoay góc phải (Chỉ quay khi user bấm Play - Tuân thủ Web Audio Autoplay Policy) */}
        <div className="absolute top-3 right-3 flex items-center gap-2 bg-black/65 backdrop-blur-xs px-2.5 py-1.5 rounded-full border border-white/20 text-white">
          <div
            id="vinylRecordIcon"
            className={`w-7 h-7 rounded-full bg-gradient-to-tr from-stone-900 via-stone-700 to-stone-900 border-2 border-brand-coral flex items-center justify-center ${
              isPlaying ? "animate-[spin_4s_linear_infinite]" : ""
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-brand-terracotta" />
          </div>
          <div className="text-[10px] leading-tight pr-1">
            <span className="font-bold block">{activeTrack.title}</span>
            <span className={isPlaying ? "text-amber-300 font-bold" : "text-stone-400"}>
              {isPlaying ? `Beatmap: ${activeTrack.bpm} BPM Sync` : "Beatmap: Chờ Click"}
            </span>
          </div>
        </div>

        {/* Badge Slide & Direction góc trái */}
        {currentSlide && (
          <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-1 rounded-md border border-white/10">
            Slide {currentSlideIndex + 1}/{videoPayload?.slides.length || 1} • {currentSlide.panDirection}
          </div>
        )}
      </div>

      {/* Thanh Điều Khiển Play/Pause + Dropdown Bài Nhạc Lo-Fi */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={togglePlay}
            id="playVirtualVideoBtn"
            className="bg-brand-terracotta hover:bg-brand-terracottaDark text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow flex items-center gap-1.5 transition active:scale-95"
          >
            <span>{isPlaying ? "⏸️" : "▶️"}</span>
            <span>{isPlaying ? "Tạm dừng Video & Nhạc" : "Phát Video & Nhạc Beat-Sync"}</span>
          </button>

          <button
            onClick={handleNextSlide}
            className="bg-[#EFE5D4] hover:bg-[#E2D2B8] text-paper-ink font-bold text-xs px-3 py-2.5 rounded-xl transition"
          >
            ⏭️ Chuyển ảnh
          </button>

          {tracks.length > 0 && (
            <select
              value={selectedTrackId}
              onChange={(e) => {
                setSelectedTrackId(e.target.value);
                stopWebAudio();
                setIsPlaying(false);
              }}
              className="bg-[#FAF4E8] border border-[#CBB292] text-paper-ink font-bold text-xs py-2 px-2.5 rounded-xl focus:outline-none"
            >
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  🎵 {t.title} ({t.bpm} BPM)
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Lời dẫn slide hiện tại */}
      <div className="bg-[#FAF4E8] border border-[#D8CBB8] rounded-xl p-3.5 space-y-1">
        <span className="text-[11px] font-bold text-paper-muted uppercase block tracking-wider">
          Lời dẫn khoảnh khắc:
        </span>
        <p id="aiGeneratedCaptionText" className="font-hand text-lg sm:text-xl font-bold text-brand-terracotta pt-0.5 leading-snug">
          &ldquo;{currentSlide?.caption || "Chiều thu Hà Nội dịu dàng, hai tâm hồn lặng ngắm nắng vàng buông xuống nhịp cầu Long Biên..."}&rdquo;
        </p>
      </div>
    </div>
  );
}
