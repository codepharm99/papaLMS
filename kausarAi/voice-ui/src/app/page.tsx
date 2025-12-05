"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Orb from "@/components/Orb";
import GradientText from "@/components/GradientText";
import { ShimmeringText } from "@/components/text/shimmering-text";
import { BubbleBackground } from "@/components/BubbleBackground";

type MicState =
  | "idle"
  | "recording"
  | "uploading"
  | "responded"
  | "denied"
  | "error";

function getPreferredMimeType(): string | undefined {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];

  return candidates.find((type) =>
    typeof MediaRecorder !== "undefined"
      ? MediaRecorder.isTypeSupported(type)
      : false
  );
}

function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numOfChan = buffer.numberOfChannels;
  const numFrames = buffer.length;
  const sampleRate = buffer.sampleRate;
  const bytesPerSample = 2;
  const blockAlign = numOfChan * bytesPerSample;
  const bufferLength = 44 + numFrames * blockAlign;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  let offset = 0;

  const writeString = (str: string) => {
    for (let i = 0; i < str.length; i += 1) {
      view.setUint8(offset, str.charCodeAt(i));
      offset += 1;
    }
  };

  writeString("RIFF");
  view.setUint32(offset, 36 + numFrames * blockAlign, true);
  offset += 4;
  writeString("WAVE");
  writeString("fmt ");
  view.setUint32(offset, 16, true);
  offset += 4;
  view.setUint16(offset, 1, true);
  offset += 2;
  view.setUint16(offset, numOfChan, true);
  offset += 2;
  view.setUint32(offset, sampleRate, true);
  offset += 4;
  view.setUint32(offset, sampleRate * blockAlign, true);
  offset += 4;
  view.setUint16(offset, blockAlign, true);
  offset += 2;
  view.setUint16(offset, bytesPerSample * 8, true);
  offset += 2;
  writeString("data");
  view.setUint32(offset, numFrames * blockAlign, true);
  offset += 4;

  for (let i = 0; i < numFrames; i += 1) {
    for (let channel = 0; channel < numOfChan; channel += 1) {
      const sample = buffer.getChannelData(channel)[i];
      const clamped = Math.max(-1, Math.min(1, sample));
      view.setInt16(
        offset,
        clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff,
        true
      );
      offset += 2;
    }
  }

  return arrayBuffer;
}

async function convertBlobToWav(blob: Blob): Promise<Blob> {
  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;

  if (!AudioContextClass) {
    throw new Error("AudioContext is not supported in this browser.");
  }

  const arrayBuffer = await blob.arrayBuffer();
  const context = new AudioContextClass();
  const audioBuffer = await context.decodeAudioData(arrayBuffer.slice(0));
  const wav = audioBufferToWav(audioBuffer);
  await context.close();
  return new Blob([wav], { type: "audio/wav" });
}

function hexToAudioUrl(hexString: string): string {
  const cleanHex = hexString.trim();
  const byteLength = Math.floor(cleanHex.length / 2);
  const bytes = new Uint8Array(byteLength);

  for (let i = 0; i < byteLength; i += 1) {
    const byte = cleanHex.slice(i * 2, i * 2 + 2);
    bytes[i] = parseInt(byte, 16);
  }

  const blob = new Blob([bytes], { type: "audio/wav" });
  return URL.createObjectURL(blob);
}

export default function Home() {
  const [micState, setMicState] = useState<MicState>("idle");
  const [level, setLevel] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [answer, setAnswer] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [, setTtsUrl] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const inputSoundRef = useRef<HTMLAudioElement | null>(null);
  const progressSoundRef = useRef<HTMLAudioElement | null>(null);
  const outputSoundRef = useRef<HTMLAudioElement | null>(null);
  const isMountedRef = useRef(true);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const isStoppingRef = useRef(false);

  const stopProgressSound = useCallback(() => {
    const sound = progressSoundRef.current;
    if (sound) {
      sound.pause();
      sound.currentTime = 0;
    }
  }, []);

  const playInputSound = useCallback(() => {
    const sound = inputSoundRef.current;
    if (!sound) return;
    sound.currentTime = 0;
    void sound.play().catch(() => undefined);
  }, []);

  const startProgressSound = useCallback(() => {
    const sound = progressSoundRef.current;
    if (!sound) return;
    sound.loop = true;
    sound.currentTime = 0;
    void sound.play().catch(() => undefined);
  }, []);

  const playOutputSound = useCallback(() => {
    const sound = outputSoundRef.current;
    if (!sound) return;
    sound.currentTime = 0;
    void sound.play().catch(() => undefined);
  }, []);

  const teardownAudioGraph = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    analyserRef.current?.disconnect();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setLevel(0);
  }, []);

  const readLevel = useCallback(function measure() {
    if (!analyserRef.current || !dataArrayRef.current) return;

    analyserRef.current.getByteTimeDomainData(dataArrayRef.current);

    let sumSquares = 0;
    for (let i = 0; i < dataArrayRef.current.length; i += 1) {
      const normalized = (dataArrayRef.current[i] - 128) / 128;
      sumSquares += normalized * normalized;
    }

    const rms = Math.sqrt(sumSquares / dataArrayRef.current.length);
    const clamped = Math.min(1, rms * 3.5);
    setLevel(clamped);

    rafRef.current = requestAnimationFrame(measure);
  }, []);

  const processRecording = useCallback(async () => {
    if (!isMountedRef.current) return;
    isStoppingRef.current = false;

    if (!recordedChunksRef.current.length) {
      setMicState("error");
      setErrorMessage("Аудио жазылмады. Қайталап көріңіз.");
      return;
    }

    setMicState("uploading");
    startProgressSound();

    try {
      const recordedBlob = new Blob(recordedChunksRef.current, {
        type: recorderRef.current?.mimeType || "audio/webm",
      });

      const wavBlob = await convertBlobToWav(recordedBlob);
      const formData = new FormData();
      formData.append(
        "file",
        new File([wavBlob], "recording.wav", { type: "audio/wav" })
      );

      const response = await fetch("/api/mangisoz", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Жүктеу сәтсіз аяқталды.");
      }

      setTranscript(payload.transcription || "");
      setAnswer(payload.answer || "");
      if (typeof payload?.ttsAudio === "string" && payload.ttsAudio.trim()) {
        const newUrl = hexToAudioUrl(payload.ttsAudio);
        setTtsUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return newUrl;
        });
        if (ttsAudioRef.current) {
          ttsAudioRef.current.pause();
        }
        ttsAudioRef.current = new Audio(newUrl);
        void ttsAudioRef.current.play().catch(() => undefined);
      } else {
        if (ttsAudioRef.current) {
          ttsAudioRef.current.pause();
          ttsAudioRef.current = null;
        }
        setTtsUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
      }
      setMicState("responded");
      playOutputSound();
    } catch (error) {
      setMicState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Белгісіз қате орын алды."
      );
    } finally {
      stopProgressSound();
      recordedChunksRef.current = [];
    }
  }, [playOutputSound, startProgressSound, stopProgressSound]);

  const startRecording = useCallback(async () => {
    setErrorMessage(null);
    setTranscript("");
    setAnswer("");
    setTtsUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setMicState("error");
      setErrorMessage("Микрофон қолжетімсіз.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }).webkitAudioContext;

      if (!AudioContextClass) {
        setMicState("error");
        setErrorMessage("AudioContext қолдамайтын браузер.");
        return;
      }

      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.82;
      const dataArray = new Uint8Array(analyser.fftSize) as Uint8Array<ArrayBuffer>;

      source.connect(analyser);
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;

      recordedChunksRef.current = [];
      const preferredMimeType = getPreferredMimeType();
      const recorder = new MediaRecorder(
        stream,
        preferredMimeType ? { mimeType: preferredMimeType } : undefined
      );

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        void processRecording();
      };

      recorderRef.current = recorder;

      setMicState("recording");
      playInputSound();
      readLevel();
      recorder.start();
    } catch (error) {
      const isPermissionError =
        error instanceof DOMException && error.name === "NotAllowedError";
      setMicState(isPermissionError ? "denied" : "error");
      setErrorMessage("Микрофонға рұқсат беріңіз.");
    }
  }, [playInputSound, processRecording, readLevel]);

  const stopRecording = useCallback(() => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    setMicState((prev) => (prev === "recording" ? "uploading" : prev));

    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        // ignore stop errors and fall through
      }
    } else if (recordedChunksRef.current.length) {
      void processRecording();
    }
    teardownAudioGraph();
    setTimeout(() => {
      isStoppingRef.current = false;
    }, 0);
  }, [processRecording, teardownAudioGraph]);

  const handleMicToggle = useCallback(() => {
    if (micState === "uploading") {
      return;
    }

    if (micState === "recording") {
      stopRecording();
      return;
    }

    void startRecording();
  }, [micState, startRecording, stopRecording]);

  useEffect(() => {
    inputSoundRef.current = new Audio("/sounds/input.mp3");
    progressSoundRef.current = new Audio("/sounds/progress_loop.wav");
    outputSoundRef.current = new Audio("/sounds/output.mp3");

    return () => {
      isMountedRef.current = false;
      if (recorderRef.current) {
        recorderRef.current.onstop = null;
        if (recorderRef.current.state === "recording") {
          recorderRef.current.stop();
        }
        recorderRef.current = null;
      }
      teardownAudioGraph();
      stopProgressSound();
      [inputSoundRef.current, progressSoundRef.current, outputSoundRef.current].forEach(
        (sound) => {
          sound?.pause();
        }
      );
      setTtsUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        ttsAudioRef.current = null;
      }
    };
  }, [stopProgressSound, teardownAudioGraph]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
      teardownAudioGraph();
      setTtsUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        ttsAudioRef.current = null;
      }
    };
  }, [teardownAudioGraph]);

  const isAlert = micState === "denied" || micState === "error";
  const hue = isAlert ? 300 : 0; // keep base palette blue/purple/white
  const hoverIntensity = Math.min(
    0.8,
    (isAlert ? 0.12 : 0.18) + (micState === "recording" ? level * 0.5 : 0.12)
  );
  const drive =
    micState === "recording"
      ? Math.max(0.25, Math.min(1, 0.15 + level * 2.5))
      : micState === "uploading"
        ? 0.4
        : 0.3;
  const forceHoverState = micState === "recording" || micState === "uploading";

  const renderStatusText = () => {
    if (micState === "recording") {
      return (
        <ShimmeringText
          text="Жазылу..."
          duration={3}
          shimmeringColor="#cdd3ff"
          className="text-2xl font-black leading-tight sm:text-3xl text-center whitespace-nowrap"
        />
      );
    }

    if (micState === "uploading") {
      return (
        <ShimmeringText
          text="Жүктеу..."
          duration={3}
          shimmeringColor="#cdd3ff"
          className="text-2xl font-black leading-tight sm:text-3xl text-center whitespace-nowrap"
        />
      );
    }

    if (micState === "denied") {
      return (
        <ShimmeringText
          text="Микрофонға рұқсат қажет"
          duration={4}
          shimmeringColor="#fca5a5"
          className="text-xl font-semibold leading-tight sm:text-2xl text-center whitespace-nowrap"
        />
      );
    }

    if (micState === "error") {
      return (
        <ShimmeringText
          text="Қате. Қайталап көріңіз."
          duration={4}
          shimmeringColor="#fbbf24"
          className="text-xl font-semibold leading-tight sm:text-2xl text-center whitespace-nowrap"
        />
      );
    }

    return (
      <GradientText
        colors={["#7c3aed", "#60a5fa", "#e5e7ff", "#60a5fa", "#7c3aed"]}
        animationSpeed={10}
        className="text-2xl font-black leading-tight sm:text-3xl text-center whitespace-nowrap"
      >
        Kausar
      </GradientText>
    );
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050915] text-slate-50">
      <BubbleBackground interactive className="absolute inset-0 z-0" />
      <main className="relative z-10 mx-auto flex min-h-screen flex-col items-center justify-center px-6 py-16">
        <button
          type="button"
          onClick={handleMicToggle}
          disabled={micState === "uploading"}
          aria-label="Toggle microphone listener"
          className="group relative h-[22rem] w-[22rem] overflow-hidden rounded-full border-0 bg-transparent p-0 shadow-none outline-none transition-transform duration-500 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-75"
        >
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-8">
            <div className="relative flex min-w-[16ch] justify-center py-1">
              {renderStatusText()}
            </div>
          </div>
          <Orb
            className="h-full w-full"
            hue={hue}
            hoverIntensity={hoverIntensity}
            rotateOnHover
            forceHoverState={forceHoverState}
            drive={drive}
            disablePointer
          />
        </button>

        <section className="mt-10 w-full max-w-2xl space-y-4 text-center">
          {micState === "recording" && (
            <p className="text-sm text-slate-300">
              Дыбысты жазу жүріп жатыр. Тоқтату үшін орбты қайта басыңыз.
            </p>
          )}

          {micState === "uploading" && (
            <p className="text-sm text-slate-300">
              ОЛЛАМА-ға жіберілуде, күте тұрыңыз...
            </p>
          )}

          {transcript && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-left text-slate-100">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Транскрипция
              </p>
              <p className="mt-2 text-base leading-relaxed">{transcript}</p>
            </div>
          )}

          {answer && (
            <div className="rounded-xl border border-indigo-400/30 bg-indigo-500/10 p-4 text-left text-slate-100 shadow-[0_20px_60px_-32px_rgba(99,102,241,0.4)]">
              <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">
                Kausar AI жауап
              </p>
              <p className="mt-2 text-base leading-relaxed">{answer}</p>
            </div>
          )}

          {errorMessage && (
            <div className="rounded-xl border border-orange-400/30 bg-orange-500/10 p-4 text-left text-orange-100">
              <p className="text-sm font-semibold">{errorMessage}</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
