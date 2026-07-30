"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { WaveformEditor } from "./WaveformEditor";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type OverflowMode = "overflow" | "mute" | "trim";
type SubBeatState = "accent" | "on" | "mute";
type SubBeatSound = "tik" | "beep" | "boop" | "custom";
type Jati = 3 | 4 | 5 | 7 | 9;
type Kriya = "clap" | "wave" | "little-finger" | "ring-finger" | "middle-finger" | "index-finger" | "thumb" | "pulse";
type TalaSection =
  | { type: "laghu"; jati: Jati }
  | { type: "drutam" }
  | { type: "anudrutam" }
  | { type: "chapu-group"; aksharas: number }
  | { type: "custom"; aksharas: number };

type Beat = {
  id: number;
  label: string;
  syllable: string;
  fileName?: string;
  decodeError?: string;
  audioUrl?: string;
  audioBuffer?: AudioBuffer;
  duration?: number;
  peaks: number[];
  overflowMode: OverflowMode;
  trimStart: number;
  trimEnd?: number;
  gain: number;
  playbackRate: number;
  pitch: number;
  pan: number;
  fadeIn: number;
  fadeOut: number;
  reverse: boolean;
  loop: boolean;
  lowEq: number;
  midEq: number;
  highEq: number;
  compression: number;
  subdivision: number;
  subPattern: SubBeatState[];
  subSounds: SubBeatSound[];
  subAudioUrls: Array<string | undefined>;
  subAudioNames: Array<string | undefined>;
  kriyaOverride?: Kriya;
};

const talaPresets = [
  {
    name: "Ādi Tāḷa",
    sections: [{ type: "laghu", jati: 4 }, { type: "drutam" }, { type: "drutam" }] satisfies TalaSection[],
  },
  {
    name: "Rūpaka Tāḷa",
    sections: [{ type: "drutam" }, { type: "laghu", jati: 4 }] satisfies TalaSection[],
  },
  {
    name: "Miśra Cāpu",
    sections: [
      { type: "chapu-group", aksharas: 3 },
      { type: "chapu-group", aksharas: 2 },
      { type: "chapu-group", aksharas: 2 },
    ] satisfies TalaSection[],
  },
];

const laghuKriyas: Kriya[] = [
  "clap",
  "little-finger",
  "ring-finger",
  "middle-finger",
  "index-finger",
  "thumb",
  "little-finger",
  "ring-finger",
  "middle-finger",
];

const kriyaLabels: Record<Kriya, string> = {
  clap: "Clap",
  wave: "Wave",
  "little-finger": "Little finger",
  "ring-finger": "Ring finger",
  "middle-finger": "Middle finger",
  "index-finger": "Index finger",
  thumb: "Thumb",
  pulse: "Pulse",
};

function sectionLength(section: TalaSection) {
  if (section.type === "laghu") return section.jati;
  if (section.type === "drutam") return 2;
  if (section.type === "anudrutam") return 1;
  return section.aksharas;
}

function sectionName(section: TalaSection) {
  if (section.type === "laghu") return `${section.jati === 3 ? "Tisra" : section.jati === 4 ? "Chatusra" : section.jati === 5 ? "Khanda" : section.jati === 7 ? "Misra" : "Sankirna"} laghu`;
  if (section.type === "drutam") return "Drutam";
  if (section.type === "anudrutam") return "Anudrutam";
  if (section.type === "chapu-group") return "Cāpu pulse group";
  return "Custom group";
}

function derivedKriya(section: TalaSection, position: number): Kriya {
  if (section.type === "laghu") return laghuKriyas[position] ?? "pulse";
  if (section.type === "drutam") return position === 0 ? "clap" : "wave";
  if (section.type === "anudrutam") return "clap";
  return "pulse";
}

function totalAksharas(sections: TalaSection[]) {
  return sections.reduce((sum, section) => sum + sectionLength(section), 0);
}

function parseTalaSection(value: unknown): TalaSection | null {
  if (!value || typeof value !== "object") return null;
  const section = value as Record<string, unknown>;
  if (section.type === "drutam") return { type: "drutam" };
  if (section.type === "anudrutam") return { type: "anudrutam" };
  const jati = Number(section.jati);
  if (section.type === "laghu" && [3, 4, 5, 7, 9].includes(jati)) {
    return { type: "laghu", jati: jati as Jati };
  }
  const aksharas = Number(section.aksharas);
  if ((section.type === "chapu-group" || section.type === "custom") && Number.isInteger(aksharas) && aksharas > 0) {
    return { type: section.type, aksharas };
  }
  return null;
}

const syllables = ["TA", "KA", "DHI", "MI", "TA", "KA", "JO", "NU"];
const namedNadais: Record<number, { name: string; phrase: string }> = {
  3: { name: "Tisra", phrase: "ta-ki-ta" },
  4: { name: "Chatusra", phrase: "ta-ka-dhi-mi" },
  5: { name: "Khanda", phrase: "ta-dhi-gi-na-tom" },
  7: { name: "Misra", phrase: "ta-ki-ta-ta-ka-dhi-mi" },
  9: { name: "Sankirna", phrase: "ta-ka-dhi-mi-ta-dhi-gi-na-tom" },
};

const subdivisions = Array.from({ length: 16 }, (_, index) => {
  const count = index + 1;
  const named = namedNadais[count];
  return named ?? {
    name: count === 1 ? "Single" : count === 2 ? "Double" : "Custom",
    phrase: `${count} ${count === 1 ? "subdivision" : "subdivisions"}`,
  };
}).map((subdivision, index) => ({ count: index + 1, ...subdivision }));

function makeBeat(index: number): Beat {
  return {
    id: index + 1,
    label: `Akshara ${index + 1}`,
    syllable: syllables[index % syllables.length],
    peaks: Array.from({ length: 48 }, (_, i) => Number((0.18 + Math.abs(Math.sin(i * 0.78 + index)) * 0.68).toFixed(4))),
    overflowMode: "trim",
    trimStart: 0,
    gain: 1,
    playbackRate: 1,
    pitch: 0,
    pan: 0,
    fadeIn: 0,
    fadeOut: 0,
    reverse: false,
    loop: false,
    lowEq: 0,
    midEq: 0,
    highEq: 0,
    compression: 0,
    subdivision: 4,
    subPattern: ["accent", "on", "on", "on"],
    subSounds: ["tik", "tik", "tik", "tik"],
    subAudioUrls: [undefined, undefined, undefined, undefined],
    subAudioNames: [undefined, undefined, undefined, undefined],
  };
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function safeFileStem(name: string) {
  return name.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "my-tala";
}

function audioBufferToWav(buffer: AudioBuffer) {
  const channels = buffer.numberOfChannels;
  const bytesPerSample = 2;
  const dataLength = buffer.length * channels * bytesPerSample;
  const wav = new ArrayBuffer(44 + dataLength);
  const view = new DataView(wav);
  const writeText = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
  };
  writeText(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, dataLength, true);
  let offset = 44;
  for (let frame = 0; frame < buffer.length; frame += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[frame]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += bytesPerSample;
    }
  }
  return wav;
}

export default function Home() {
  const [bpm, setBpm] = useState(60);
  const [beats, setBeats] = useState<Beat[]>(() => Array.from({ length: 8 }, (_, i) => makeBeat(i)));
  const [activeBeat, setActiveBeat] = useState(0);
  const [activeSubBeat, setActiveSubBeat] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState(0);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [talaName, setTalaName] = useState("My morning korvai");
  const [saveState, setSaveState] = useState("Database-free");
  const [waveZoom, setWaveZoom] = useState(1);
  const [previewing, setPreviewing] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [infoPanel, setInfoPanel] = useState<"guide" | "learn" | null>(null);
  const [focusedSubBeat, setFocusedSubBeat] = useState<number | null>(null);
  const [subBeatClickEnabled, setSubBeatClickEnabled] = useState(true);
  const [sections, setSections] = useState<TalaSection[]>([
    { type: "laghu", jati: 4 },
    { type: "drutam" },
    { type: "drutam" },
  ]);
  const [importError, setImportError] = useState("");
  const [renderingAudio, setRenderingAudio] = useState(false);
  const importInput = useRef<HTMLInputElement>(null);
  const startedAt = useRef(0);
  const elapsedAtStart = useRef(0);
  const lastPlayedSlot = useRef("");
  const clickContext = useRef<AudioContext | null>(null);
  const previewAudio = useRef<HTMLAudioElement | null>(null);
  const previewStop = useRef<(() => void) | null>(null);

  const beatDuration = 60 / bpm;
  const cycleDuration = beatDuration * beats.length;
  const cycle = Math.floor(elapsed / cycleDuration) + 1;
  const current = beats[selected] ?? beats[0];
  const groupedBeats = useMemo(() => {
    const groups: Array<{ number: number; start: number; section: TalaSection; beats: Beat[] }> = [];
    let start = 0;
    for (const section of sections) {
      if (start >= beats.length) break;
      const size = sectionLength(section);
      groups.push({ number: groups.length + 1, start, section, beats: beats.slice(start, start + size) });
      start += size;
    }
    if (start < beats.length) {
      const section: TalaSection = { type: "custom", aksharas: beats.length - start };
      groups.push({ number: groups.length + 1, start, section, beats: beats.slice(start) });
    }
    return groups;
  }, [sections, beats]);

  const overflowCount = useMemo(
    () => beats.filter((beat) => (beat.duration ?? 0) > beatDuration).length,
    [beats, beatDuration],
  );

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => {
      const nextElapsed = elapsedAtStart.current + (performance.now() - startedAt.current) / 1000;
      const absoluteSlot = Math.floor(nextElapsed / beatDuration);
      const beatIndex = absoluteSlot % beats.length;
      const beat = beats[beatIndex];
      const withinBeat = nextElapsed - absoluteSlot * beatDuration;
      const subBeat = Math.min(beat.subdivision - 1, Math.floor(withinBeat / (beatDuration / beat.subdivision)));
      const slotKey = `${absoluteSlot}:${subBeat}`;
      if (slotKey !== lastPlayedSlot.current) {
        lastPlayedSlot.current = slotKey;
        if (subBeat === 0) void playBeat(beat);
        if (subBeatClickEnabled) {
          playSubBeat(beat.subPattern[subBeat], subBeat === 0, beat.subSounds[subBeat], beat.subAudioUrls[subBeat]);
        }
      }
      setElapsed(nextElapsed);
      setActiveBeat(beatIndex);
      setActiveSubBeat(subBeat);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, beatDuration, beats, subBeatClickEnabled]);

  useEffect(() => {
    void import("tone");
  }, []);

  useEffect(() => {
    return () => {
      previewStop.current?.();
      beats.forEach((beat) => {
        if (beat.audioUrl) URL.revokeObjectURL(beat.audioUrl);
        beat.subAudioUrls.forEach((url) => url && URL.revokeObjectURL(url));
      });
    };
  }, []);

  async function ensureAudioReady() {
    const context = clickContext.current ?? new AudioContext();
    clickContext.current = context;
    if (context.state === "suspended") await context.resume();
    const Tone = await import("tone");
    await Tone.start();
  }

  async function togglePlay() {
    if (playing) {
      setPlaying(false);
      return;
    }
    try {
      await ensureAudioReady();
    } catch (error) {
      console.error("Audio could not be started:", error);
      setSaveState("Tap play again to enable audio");
      return;
    }
    startedAt.current = performance.now();
    elapsedAtStart.current = elapsed;
    lastPlayedSlot.current = "";
    setPlaying(true);
  }

  function seekTo(nextElapsed: number) {
    const value = Math.max(0, nextElapsed);
    setElapsed(value);
    setActiveBeat(Math.floor(value / beatDuration) % beats.length);
    setActiveSubBeat(0);
    lastPlayedSlot.current = "";
    if (playing) {
      startedAt.current = performance.now();
      elapsedAtStart.current = value;
    }
  }

  function selectAkshara(index: number) {
    setSelected(index);
    setFocusedSubBeat(null);
    setInspectorOpen(true);
  }

  function stopPlayback() {
    setPlaying(false);
    const cycleStart = Math.floor(elapsed / cycleDuration) * cycleDuration;
    setElapsed(cycleStart);
    setActiveBeat(0);
    setActiveSubBeat(0);
    lastPlayedSlot.current = "";
  }

  function playSubBeat(state: SubBeatState, downbeat: boolean, sound: SubBeatSound = "tik", customUrl?: string) {
    if (state === "mute") return;
    if (sound === "custom" && customUrl) {
      const audio = new Audio(customUrl);
      audio.volume = state === "accent" || downbeat ? 1 : 0.65;
      void audio.play();
      return;
    }
    const context = clickContext.current ?? new AudioContext();
    clickContext.current = context;
    if (context.state === "suspended") void context.resume();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const baseFrequency = sound === "beep" ? 660 : sound === "boop" ? 220 : 880;
    oscillator.frequency.value = state === "accent" || downbeat ? baseFrequency * 1.35 : baseFrequency;
    const duration = sound === "beep" ? 0.12 : sound === "boop" ? 0.16 : 0.045;
    const volume = state === "accent" || downbeat ? 0.11 : 0.04;
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration + 0.005);
  }

  async function playBeat(beat: Beat, preview = false) {
    if (!beat.audioUrl || beat.overflowMode === "mute") return;
    if (beat.audioBuffer) {
      const Tone = await import("tone");
      await Tone.start();
      const compensatedPitch = beat.pitch - 12 * Math.log2(beat.playbackRate);
      const pitchShift = new Tone.PitchShift({ pitch: compensatedPitch, windowSize: 0.08, wet: 1 });
      pitchShift.pitch = compensatedPitch;
      const eq = new Tone.EQ3(beat.lowEq, beat.midEq, beat.highEq);
      const compressor = new Tone.Compressor({
        threshold: -12 - beat.compression * 36,
        ratio: 1 + beat.compression * 11,
      });
      const panner = new Tone.Panner(beat.pan);
      const gain = new Tone.Gain(beat.gain);
      pitchShift.connect(eq);
      eq.connect(compressor);
      compressor.connect(panner);
      panner.connect(gain);
      gain.toDestination();
      const player = new Tone.Player(beat.audioBuffer);
      player.playbackRate = beat.playbackRate;
      player.fadeIn = beat.fadeIn;
      player.fadeOut = beat.fadeOut;
      player.reverse = beat.reverse;
      player.loop = beat.loop;
      player.loopStart = beat.trimStart;
      player.loopEnd = beat.trimEnd ?? beat.duration ?? beatDuration;
      player.connect(pitchShift);
      const selectionDuration = Math.max(0.01, (beat.trimEnd ?? beat.duration ?? beatDuration) - beat.trimStart);
      const sourceDuration = beat.overflowMode === "trim"
        ? Math.min(selectionDuration, beatDuration * beat.playbackRate)
        : selectionDuration;
      const dispose = () => {
        player.dispose();
        pitchShift.dispose();
        eq.dispose();
        compressor.dispose();
        panner.dispose();
        gain.dispose();
      };
      player.start(undefined, beat.trimStart, sourceDuration);
      if (preview) {
        previewStop.current?.();
        previewStop.current = () => {
          try { player.stop(); } catch { /* already stopped */ }
          dispose();
          previewStop.current = null;
          setPreviewing(false);
        };
        setPreviewing(true);
      }
      window.setTimeout(() => {
        if (preview) {
          if (previewStop.current) previewStop.current();
        } else {
          dispose();
        }
      }, (sourceDuration / beat.playbackRate + 0.08) * 1000);
      return;
    }
    const audio = new Audio(beat.audioUrl);
    audio.currentTime = beat.trimStart;
    audio.playbackRate = beat.playbackRate;
    audio.volume = beat.fadeIn > 0 ? 0 : beat.gain;
    if (preview) {
      previewAudio.current?.pause();
      previewAudio.current = audio;
      setPreviewing(true);
      audio.addEventListener("ended", () => setPreviewing(false), { once: true });
    }
    void audio.play();
    const selectionDuration = Math.max(0, (beat.trimEnd ?? beat.duration ?? beatDuration) - beat.trimStart);
    const audibleDuration = (beat.overflowMode === "trim" ? Math.min(beatDuration, selectionDuration) : selectionDuration) / beat.playbackRate;
    const started = performance.now();
    const shapeVolume = () => {
      if (audio.paused) return;
      const passed = (performance.now() - started) / 1000;
      const fadeInGain = beat.fadeIn > 0 ? Math.min(1, passed / beat.fadeIn) : 1;
      const remaining = audibleDuration - passed;
      const fadeOutGain = beat.fadeOut > 0 ? Math.min(1, remaining / beat.fadeOut) : 1;
      audio.volume = Math.max(0, Math.min(1, beat.gain * fadeInGain * fadeOutGain));
      requestAnimationFrame(shapeVolume);
    };
    requestAnimationFrame(shapeVolume);
    if (Number.isFinite(audibleDuration)) {
      window.setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
        if (preview) setPreviewing(false);
      }, Math.max(0, audibleDuration * 1000));
    }
  }

  async function togglePreview() {
    if (previewing) {
      previewStop.current?.();
      previewAudio.current?.pause();
      previewAudio.current = null;
      setPreviewing(false);
      return;
    }
    try {
      await ensureAudioReady();
      if (current) await playBeat(current, true);
    } catch (error) {
      console.error("Audio preview could not be started:", error);
      setSaveState("Tap preview again to enable audio");
    }
  }

  function resetEdit() {
    if (!current?.duration) return;
    updateBeat({
      trimStart: 0,
      trimEnd: Math.min(current.duration, beatDuration),
      gain: 1,
      playbackRate: 1,
      pitch: 0,
      pan: 0,
      fadeIn: 0,
      fadeOut: 0,
      reverse: false,
      loop: false,
      lowEq: 0,
      midEq: 0,
      highEq: 0,
      compression: 0,
    });
  }

  async function uploadAudio(event: ChangeEvent<HTMLInputElement>, index: number) {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const buffer = await file.arrayBuffer();
    let peaks = current.peaks;
    let audioBuffer: AudioBuffer | undefined;
    let duration = 0;
    try {
      const context = new AudioContext();
      try {
        audioBuffer = await context.decodeAudioData(buffer.slice(0));
      } catch (nativeError) {
        throw nativeError;
      }
      duration = audioBuffer.duration;
      const channel = audioBuffer.getChannelData(0);
      const bucket = Math.max(1, Math.floor(channel.length / 48));
      peaks = Array.from({ length: 48 }, (_, i) => {
        let max = 0;
        for (let j = i * bucket; j < Math.min(channel.length, (i + 1) * bucket); j += 1) {
          max = Math.max(max, Math.abs(channel[j]));
        }
        return Math.max(0.08, max);
      });
      await context.close();
    } catch {
      URL.revokeObjectURL(url);
      setBeats((items) =>
        items.map((beat, beatIndex) =>
          beatIndex === index
            ? { ...beat, fileName: file.name, decodeError: "This audio could not be decoded. Use Ogg/Opus, WebM/Opus, WAV, MP3, or M4A." }
            : beat,
        ),
      );
      setSelected(index);
      event.target.value = "";
      return;
    }
    setBeats((items) =>
      items.map((beat, beatIndex) =>
        beatIndex === index
          ? { ...beat, fileName: file.name, decodeError: undefined, audioUrl: url, audioBuffer, duration, trimEnd: Math.min(duration, beatDuration), peaks }
          : beat,
      ),
    );
    setSelected(index);
    window.setTimeout(() => document.getElementById("beat-inspector")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  function updateBeat(patch: Partial<Beat>) {
    setBeats((items) => items.map((beat, index) => (index === selected ? { ...beat, ...patch } : beat)));
  }

  function updateBeatWithPreview(patch: Partial<Beat>) {
    updateBeat(patch);
    if (previewing && current) {
      previewStop.current?.();
      void playBeat({ ...current, ...patch }, true);
    }
  }

  function setSubdivision(count: number, applyToAll = false) {
    const safeCount = Math.max(1, Math.min(16, Math.round(count)));
    const resizePattern = (previous: SubBeatState[]) =>
      Array.from({ length: safeCount }, (_, index) => previous[index] ?? (index === 0 ? "accent" : "on"));
    beats.forEach((beat, index) => {
      if (!applyToAll && index !== selected) return;
      beat.subAudioUrls.slice(safeCount).forEach((url) => url && URL.revokeObjectURL(url));
    });
    setBeats((items) => items.map((beat, index) =>
      applyToAll || index === selected
        ? {
            ...beat,
            subdivision: safeCount,
            subPattern: resizePattern(beat.subPattern),
            subSounds: Array.from({ length: safeCount }, (_, subIndex) => beat.subSounds[subIndex] ?? "tik"),
            subAudioUrls: Array.from({ length: safeCount }, (_, subIndex) => beat.subAudioUrls[subIndex]),
            subAudioNames: Array.from({ length: safeCount }, (_, subIndex) => beat.subAudioNames[subIndex]),
          }
        : beat,
    ));
    setActiveSubBeat(0);
    setFocusedSubBeat(null);
  }

  function cycleSubBeat(index: number) {
    const order: SubBeatState[] = ["on", "accent", "mute"];
    const next = order[(order.indexOf(current.subPattern[index]) + 1) % order.length];
    updateBeat({ subPattern: current.subPattern.map((state, subIndex) => subIndex === index ? next : state) });
    playSubBeat(next, index === 0, current.subSounds[index], current.subAudioUrls[index]);
  }

  function setSubBeatSound(index: number, sound: SubBeatSound) {
    updateBeat({ subSounds: current.subSounds.map((value, subIndex) => subIndex === index ? sound : value) });
    playSubBeat(current.subPattern[index], index === 0, sound, current.subAudioUrls[index]);
  }

  function uploadSubBeatSound(event: ChangeEvent<HTMLInputElement>, index: number) {
    const file = event.target.files?.[0];
    if (!file) return;
    const previousUrl = current.subAudioUrls[index];
    if (previousUrl) URL.revokeObjectURL(previousUrl);
    const url = URL.createObjectURL(file);
    updateBeat({
      subSounds: current.subSounds.map((sound, subIndex) => subIndex === index ? "custom" : sound),
      subAudioUrls: current.subAudioUrls.map((value, subIndex) => subIndex === index ? url : value),
      subAudioNames: current.subAudioNames.map((value, subIndex) => subIndex === index ? file.name : value),
    });
    playSubBeat(current.subPattern[index], index === 0, "custom", url);
  }

  function clearBeatAudio(index: number) {
    const beat = beats[index];
    if (!beat) return;
    if (beat.audioUrl) URL.revokeObjectURL(beat.audioUrl);
    previewStop.current?.();
    previewAudio.current?.pause();
    setPreviewing(false);
    setBeats((items) => items.map((item, beatIndex) => beatIndex === index
      ? {
          ...item,
          fileName: undefined,
          decodeError: undefined,
          audioUrl: undefined,
          audioBuffer: undefined,
          duration: undefined,
          trimStart: 0,
          trimEnd: undefined,
        }
      : item));
    setSaveState(`Removed audio from akshara ${index + 1}`);
  }

  function deleteBeat(index: number) {
    if (beats.length <= 1) return;
    const beat = beats[index];
    if (beat.audioUrl) URL.revokeObjectURL(beat.audioUrl);
    beat.subAudioUrls.forEach((url) => url && URL.revokeObjectURL(url));
    setBeats((items) => items.filter((_, beatIndex) => beatIndex !== index));
    setSelected((currentIndex) => {
      if (currentIndex > index) return currentIndex - 1;
      if (currentIndex === index) return Math.max(0, Math.min(index, beats.length - 2));
      return currentIndex;
    });
    setActiveBeat(0);
    setElapsed(0);
    setSections((groups) => {
      let cursor = 0;
      const next = [...groups];
      const groupIndex = next.findIndex((section) => {
        cursor += sectionLength(section);
        return index < cursor;
      });
      if (groupIndex >= 0) {
        const nextLength = sectionLength(next[groupIndex]) - 1;
        if (nextLength === 0) next.splice(groupIndex, 1);
        else next[groupIndex] = { type: "custom", aksharas: nextLength };
      }
      return next.length ? next : [{ type: "custom", aksharas: 1 }];
    });
  }

  function addAkshara(newAnga = false) {
    const nextIndex = beats.length;
    const nextId = Math.max(...beats.map((beat) => beat.id)) + 1;
    setBeats((items) => [...items, { ...makeBeat(nextIndex), id: nextId }]);
    setSections((groups) => {
      if (newAnga) return [...groups, { type: "custom", aksharas: 1 }];
      const last = groups.at(-1);
      if (!last) return [{ type: "custom", aksharas: 1 }];
      return [...groups.slice(0, -1), { type: "custom", aksharas: sectionLength(last) + 1 }];
    });
    setSelected(nextIndex);
    setFocusedSubBeat(null);
    setSaveState(newAnga ? `Added custom group ${sections.length + 1}` : `Added akshara ${nextIndex + 1}`);
  }

  function addAksharaToAnga(groupIndex: number) {
    const insertIndex = sections.slice(0, groupIndex + 1).reduce((total, section) => total + sectionLength(section), 0);
    const nextId = Math.max(...beats.map((beat) => beat.id)) + 1;
    setBeats((items) => [
      ...items.slice(0, insertIndex),
      { ...makeBeat(insertIndex), id: nextId },
      ...items.slice(insertIndex),
    ]);
    setSections((groups) => groups.map((section, index) =>
      index === groupIndex ? { type: "custom", aksharas: sectionLength(section) + 1 } : section,
    ));
    setSelected(insertIndex);
    setFocusedSubBeat(null);
    setSaveState(`Added akshara to group ${groupIndex + 1}`);
  }

  function changeSectionType(groupIndex: number, value: string) {
    const currentSection = sections[groupIndex];
    if (!currentSection) return;
    const nextSection: TalaSection =
      value === "drutam" ? { type: "drutam" }
      : value === "anudrutam" ? { type: "anudrutam" }
      : value.startsWith("laghu-") ? { type: "laghu", jati: Number(value.slice(6)) as Jati }
      : { type: "custom", aksharas: sectionLength(currentSection) };
    const oldLength = sectionLength(currentSection);
    const nextLength = sectionLength(nextSection);
    const start = sections.slice(0, groupIndex).reduce((sum, section) => sum + sectionLength(section), 0);

    if (nextLength < oldLength) {
      beats.slice(start + nextLength, start + oldLength).forEach((beat) => {
        if (beat.audioUrl) URL.revokeObjectURL(beat.audioUrl);
        beat.subAudioUrls.forEach((url) => url && URL.revokeObjectURL(url));
      });
    }
    setBeats((items) => {
      if (nextLength === oldLength) return items;
      if (nextLength < oldLength) return [...items.slice(0, start + nextLength), ...items.slice(start + oldLength)];
      const nextId = Math.max(...items.map((beat) => beat.id)) + 1;
      const added = Array.from({ length: nextLength - oldLength }, (_, index) => ({
        ...makeBeat(start + oldLength + index),
        id: nextId + index,
      }));
      return [...items.slice(0, start + oldLength), ...added, ...items.slice(start + oldLength)];
    });
    setSections((items) => items.map((section, index) => index === groupIndex ? nextSection : section));
    setSelected(start);
    setActiveBeat(0);
    setElapsed(0);
    setSaveState(`Changed group ${groupIndex + 1} to ${sectionName(nextSection)}`);
  }

  function applyPreset(preset: (typeof talaPresets)[number]) {
    const beatCount = totalAksharas(preset.sections);
    setTalaName(preset.name);
    setBeats(Array.from({ length: beatCount }, (_, i) => ({ ...(beats[i] ?? makeBeat(i)), kriyaOverride: undefined })));
    setSections(preset.sections.map((section) => ({ ...section })));
    setSelected(0);
    setActiveBeat(0);
    setElapsed(0);
  }

  function exportTala() {
    const arrangement = {
      format: "thalam-arrangement",
      version: 3,
      name: talaName,
      bpm,
      beatCount: beats.length,
      sections,
      angas: sections.map(sectionLength),
      beats: beats.map(({ audioUrl: _audioUrl, audioBuffer: _audioBuffer, subAudioUrls: _subAudioUrls, ...beat }) => beat),
    };
    const blob = new Blob([JSON.stringify(arrangement, null, 2)], { type: "application/json" });
    downloadBlob(blob, `${safeFileStem(talaName)}.json`);
    setSaveState("Tāḷa exported");
  }

  async function importTala(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImportError("");
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== "object") throw new Error("This file does not contain a tāḷa arrangement.");
      const arrangement = parsed as Record<string, unknown>;
      if (arrangement.format !== "thalam-arrangement" || !Array.isArray(arrangement.beats)) {
        throw new Error("Choose a Tāla Lab arrangement JSON file.");
      }
      if (arrangement.beats.length < 1 || arrangement.beats.length > 128) {
        throw new Error("The arrangement must contain between 1 and 128 aksharas.");
      }
      const importedBeats = arrangement.beats.map((value, index) => {
        if (!value || typeof value !== "object") throw new Error(`Akshara ${index + 1} is invalid.`);
        const raw = value as Partial<Beat>;
        const subdivision = Number.isInteger(raw.subdivision) && raw.subdivision! > 0 && raw.subdivision! <= 32
          ? raw.subdivision!
          : 4;
        const base = makeBeat(index);
        const subPattern = Array.from({ length: subdivision }, (_, subIndex) => {
          const state = raw.subPattern?.[subIndex];
          return state === "accent" || state === "mute" || state === "on" ? state : subIndex === 0 ? "accent" : "on";
        });
        const subSounds = Array.from({ length: subdivision }, (_, subIndex) => {
          const sound = raw.subSounds?.[subIndex];
          return sound === "beep" || sound === "boop" || sound === "custom" || sound === "tik" ? sound : "tik";
        });
        return {
          ...base,
          ...raw,
          id: typeof raw.id === "number" ? raw.id : index + 1,
          label: typeof raw.label === "string" ? raw.label : base.label,
          syllable: typeof raw.syllable === "string" ? raw.syllable : base.syllable,
          peaks: Array.isArray(raw.peaks) ? raw.peaks.filter((peak): peak is number => typeof peak === "number").slice(0, 96) : base.peaks,
          subdivision,
          subPattern,
          subSounds,
          subAudioUrls: Array(subdivision).fill(undefined),
          subAudioNames: Array.from({ length: subdivision }, (_, subIndex) => raw.subAudioNames?.[subIndex]),
          audioUrl: undefined,
          audioBuffer: undefined,
          duration: undefined,
          trimEnd: undefined,
          decodeError: raw.fileName ? "Reattach this audio file to restore playback." : undefined,
        } satisfies Beat;
      });
      const importedBpm = typeof arrangement.bpm === "number" && Number.isFinite(arrangement.bpm)
        ? Math.max(20, Math.min(300, arrangement.bpm))
        : 60;
      const importedSections = Array.isArray(arrangement.sections)
        ? arrangement.sections.map(parseTalaSection).filter((section): section is TalaSection => section !== null)
        : [];
      const legacyAngas = Array.isArray(arrangement.angas)
        ? arrangement.angas.filter((size): size is number => Number.isInteger(size) && size > 0)
        : [];
      const importedName = typeof arrangement.name === "string" ? arrangement.name : "";
      const migratedLegacySections: TalaSection[] =
        /ādi|adi/i.test(importedName) && legacyAngas.join(",") === "4,2,2"
          ? [{ type: "laghu", jati: 4 }, { type: "drutam" }, { type: "drutam" }]
          : /rūpaka|rupaka/i.test(importedName) && legacyAngas.join(",") === "2,4"
            ? [{ type: "drutam" }, { type: "laghu", jati: 4 }]
            : /cāpu|chapu/i.test(importedName)
              ? legacyAngas.map((aksharas) => ({ type: "chapu-group", aksharas }))
              : legacyAngas.map((aksharas) => ({ type: "custom", aksharas }));
      const candidateSections = importedSections.length ? importedSections : migratedLegacySections;
      const validSections = totalAksharas(candidateSections) === importedBeats.length
        ? candidateSections
        : [{ type: "custom", aksharas: importedBeats.length }] satisfies TalaSection[];
      beats.forEach((beat) => {
        if (beat.audioUrl) URL.revokeObjectURL(beat.audioUrl);
        beat.subAudioUrls.forEach((url) => url && URL.revokeObjectURL(url));
      });
      setPlaying(false);
      setTalaName(importedName || file.name.replace(/\.json$/i, ""));
      setBpm(importedBpm);
      setBeats(importedBeats);
      setSections(validSections);
      setSelected(0);
      setActiveBeat(0);
      setActiveSubBeat(0);
      setElapsed(0);
      setSaveState(`Imported ${importedBeats.length} aksharas`);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Could not import this file.");
    }
  }

  async function exportWav() {
    if (renderingAudio) return;
    setRenderingAudio(true);
    setImportError("");
    setSaveState("Rendering audio…");
    try {
      const sampleRate = 44100;
      const duration = Math.max(0.1, cycleDuration);
      const offline = new OfflineAudioContext(2, Math.ceil(duration * sampleRate), sampleRate);
      const master = offline.createGain();
      master.gain.value = 0.82;
      master.connect(offline.destination);

      beats.forEach((beat, beatIndex) => {
        if (!beat.audioBuffer || beat.overflowMode === "mute") return;
        const source = offline.createBufferSource();
        const sourceBuffer = offline.createBuffer(
          beat.audioBuffer.numberOfChannels,
          beat.audioBuffer.length,
          beat.audioBuffer.sampleRate,
        );
        for (let channel = 0; channel < beat.audioBuffer.numberOfChannels; channel += 1) {
          const data = beat.audioBuffer.getChannelData(channel);
          sourceBuffer.copyToChannel(beat.reverse ? Float32Array.from(data).reverse() : data, channel);
        }
        source.buffer = sourceBuffer;
        source.playbackRate.value = beat.playbackRate * 2 ** (beat.pitch / 12);
        source.loop = beat.loop;
        source.loopStart = beat.trimStart;
        source.loopEnd = beat.trimEnd ?? beat.duration ?? beatDuration;

        const low = offline.createBiquadFilter();
        low.type = "lowshelf";
        low.frequency.value = 250;
        low.gain.value = beat.lowEq;
        const mid = offline.createBiquadFilter();
        mid.type = "peaking";
        mid.frequency.value = 1200;
        mid.Q.value = 0.8;
        mid.gain.value = beat.midEq;
        const high = offline.createBiquadFilter();
        high.type = "highshelf";
        high.frequency.value = 4000;
        high.gain.value = beat.highEq;
        const compressor = offline.createDynamicsCompressor();
        compressor.threshold.value = -12 - beat.compression * 36;
        compressor.ratio.value = 1 + beat.compression * 11;
        const panner = offline.createStereoPanner();
        panner.pan.value = beat.pan;
        const gain = offline.createGain();
        const startsAt = beatIndex * beatDuration;
        const selectionDuration = Math.max(0.01, (beat.trimEnd ?? beat.duration ?? beatDuration) - beat.trimStart);
        const audibleDuration = Math.min(
          beat.overflowMode === "trim" ? beatDuration : duration - startsAt,
          selectionDuration / source.playbackRate.value,
        );
        gain.gain.setValueAtTime(beat.fadeIn > 0 ? 0 : beat.gain, startsAt);
        if (beat.fadeIn > 0) gain.gain.linearRampToValueAtTime(beat.gain, startsAt + Math.min(beat.fadeIn, audibleDuration));
        if (beat.fadeOut > 0) {
          gain.gain.setValueAtTime(beat.gain, Math.max(startsAt, startsAt + audibleDuration - beat.fadeOut));
          gain.gain.linearRampToValueAtTime(0, startsAt + audibleDuration);
        }
        source.connect(low).connect(mid).connect(high).connect(compressor).connect(panner).connect(gain).connect(master);
        source.start(startsAt, beat.trimStart, beat.loop ? undefined : selectionDuration);
        source.stop(Math.min(duration, startsAt + audibleDuration));
      });

      if (subBeatClickEnabled) {
        beats.forEach((beat, beatIndex) => {
          beat.subPattern.forEach((state, subIndex) => {
            if (state === "mute") return;
            const startsAt = beatIndex * beatDuration + subIndex * beatDuration / beat.subdivision;
            const oscillator = offline.createOscillator();
            const gain = offline.createGain();
            const sound = beat.subSounds[subIndex];
            const baseFrequency = sound === "beep" ? 660 : sound === "boop" ? 220 : 880;
            const clickDuration = sound === "beep" ? 0.12 : sound === "boop" ? 0.16 : 0.045;
            oscillator.frequency.value = state === "accent" || subIndex === 0 ? baseFrequency * 1.35 : baseFrequency;
            gain.gain.setValueAtTime(state === "accent" || subIndex === 0 ? 0.11 : 0.04, startsAt);
            gain.gain.exponentialRampToValueAtTime(0.0001, Math.min(duration, startsAt + clickDuration));
            oscillator.connect(gain).connect(master);
            oscillator.start(startsAt);
            oscillator.stop(Math.min(duration, startsAt + clickDuration + 0.005));
          });
        });
      }
      const rendered = await offline.startRendering();
      downloadBlob(new Blob([audioBufferToWav(rendered)], { type: "audio/wav" }), `${safeFileStem(talaName)}.wav`);
      setSaveState("WAV exported");
    } catch {
      setImportError("Audio rendering failed. Try reattaching clips or using a shorter cycle.");
      setSaveState("Render failed");
    } finally {
      setRenderingAudio(false);
    }
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      if (event.code === "Space") {
        event.preventDefault();
        togglePlay();
      } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        const direction = event.key === "ArrowLeft" ? -1 : 1;
        setSelected((index) => Math.max(0, Math.min(beats.length - 1, index + direction)));
        setFocusedSubBeat(null);
      } else if (event.key === "Delete" || event.key === "Backspace") {
        if (beats[selected]?.audioUrl || beats[selected]?.fileName) {
          event.preventDefault();
          clearBeatAudio(selected);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [beats, playing, selected]);

  return (
    <main>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <img src={`${basePath}/favicon.png`} alt="" />
          </span>
          <div><strong>Tāla Lab</strong><small>Carnatic rhythm studio</small></div>
        </div>
        <div className="topbar-context">
          <span>Now composing</span>
          <strong>{talaName}</strong>
        </div>
        <div className="file-actions">
          <input ref={importInput} type="file" accept="application/json,.json" onChange={importTala} />
          <button onClick={() => importInput.current?.click()}>Import</button>
          <button className="save-button" onClick={exportWav} disabled={renderingAudio}>{renderingAudio ? "Rendering…" : "Export audio"}</button>
        </div>
      </header>

      <section className="workspace">
        {importError && <div className="file-error" role="alert"><span>{importError}</span><button onClick={() => setImportError("")} aria-label="Dismiss">×</button></div>}
        <aside className="sidebar">
          <div className="rail-intro">
            <span className="eyebrow">CURRENT CYCLE</span>
            <strong>{beats.length} aksharas</strong>
            <p>{sections.map(sectionLength).join(" + ")} structure · {cycleDuration.toFixed(2)} seconds</p>
          </div>
          <div className="rail-presets">
            <div className="section-heading"><span>Start from</span><small>PRESETS</small></div>
            {talaPresets.map((preset) => (
              <button className="preset" key={preset.name} onClick={() => applyPreset(preset)}>
                <span><strong>{preset.name}</strong><small>{preset.sections.map(sectionLength).join(" + ")}</small></span>
                <b>{totalAksharas(preset.sections)}</b>
              </button>
            ))}
            <button className="new-tala" onClick={() => { setTalaName("Untitled tāḷa"); setBeats(Array.from({ length: 4 }, (_, i) => makeBeat(i))); setSections([{ type: "custom", aksharas: 4 }]); setSelected(0); }}>
              <span>＋</span> Blank cycle
            </button>
          </div>
          <div className="rail-actions">
            <button onClick={exportTala}>Save project</button>
            <button onClick={() => setInfoPanel("guide")}>Quick guide</button>
            <button onClick={() => setInfoPanel("learn")}>Rhythm glossary</button>
          </div>
        </aside>

        <div className="composer">
          <div className="composer-heading">
          <div><span>TĀḶA ARRANGEMENT</span><h1>Compose your rhythm</h1><p>Arrange aksharas (beats), choose the nadai, and add your sounds.</p></div>
            <span className="save-state">● {saveState}</span>
          </div>
          <div className="tala-title-row">
            <div>
              <label htmlFor="tala-name">TĀḶA NAME</label>
              <input id="tala-name" value={talaName} onChange={(e) => setTalaName(e.target.value)} />
            </div>
            <div className="bpm-box">
              <label htmlFor="bpm">TEMPO</label>
              <div><input id="bpm" type="number" min="20" max="300" value={bpm} onChange={(e) => setBpm(Math.max(20, Number(e.target.value)))} /><span>BPM</span></div>
              <small>{beatDuration.toFixed(2)} sec / akshara</small>
            </div>
          </div>

          <div className="transport">
            <div className="transport-buttons">
              <button onClick={() => seekTo(elapsed - beatDuration)} aria-label="Previous akshara" title="Previous akshara">‹</button>
              <button className="play" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>{playing ? "Ⅱ" : "▶"}</button>
              <button onClick={stopPlayback} aria-label="Stop and return to cycle start" title="Stop">■</button>
              <button onClick={() => seekTo(elapsed + beatDuration)} aria-label="Next akshara" title="Next akshara">›</button>
            </div>
            <div className="transport-time"><span>{formatTime(elapsed)}</span><small>CYCLE {cycle}</small></div>
            <button className={`click-toggle ${subBeatClickEnabled ? "on" : ""}`} onClick={() => setSubBeatClickEnabled((enabled) => !enabled)} aria-pressed={subBeatClickEnabled}>
              <span>♪</span><b>Sub-beat click</b><small>{subBeatClickEnabled ? "On" : "Off"}</small>
            </button>
            <div className="progress-wrap">
              <div className="progress-track"><span style={{ width: `${((elapsed % cycleDuration) / cycleDuration) * 100}%` }} /></div>
              <small>{((elapsed % cycleDuration) / cycleDuration * 100).toFixed(0)}% of cycle</small>
            </div>
            <div className="position"><span>AKSHARA · SUBDIVISION</span><strong>{activeBeat + 1}<i>/ {beats.length}</i></strong><small>subdivision {activeSubBeat + 1} / {beats[activeBeat]?.subdivision ?? 1}</small></div>
          </div>

          <div className={`studio-grid ${inspectorOpen ? "" : "inspector-closed"}`}>
          <section className="arrangement-panel">
          <div className="timeline-head">
            <div><h2>Akshara (beat) timeline</h2><span>Structure {sections.map(sectionLength).join(" + ")} · {overflowCount ? `${overflowCount} audio ${overflowCount === 1 ? "clip exceeds" : "clips exceed"} its slot` : "all sounds fit their beats"}</span></div>
            <div className="timeline-actions">
              <button onClick={() => addAkshara()}>＋ Add akshara</button>
              <button className="primary" onClick={() => addAkshara(true)}>＋ Add group</button>
            </div>
          </div>

          <div className="cycle-stage" aria-label="Visual tāḷa cycle">
            <div className="cycle-orbit">
              <div className="cycle-centre">
                <span>ONE CYCLE</span>
                <strong>{beats.length}</strong>
                <small>aksharas · {cycleDuration.toFixed(1)}s</small>
              </div>
              {beats.map((beat, index) => {
                const angle = (index / beats.length) * Math.PI * 2 - Math.PI / 2;
                return (
                  <button
                    key={beat.id}
                    className={`orbit-beat ${inspectorOpen && selected === index ? "selected" : ""} ${playing && activeBeat === index ? "playing" : ""}`}
                    style={{
                      left: `${50 + Math.cos(angle) * 39}%`,
                      top: `${50 + Math.sin(angle) * 39}%`,
                    }}
                    onClick={() => selectAkshara(index)}
                    aria-label={`Select akshara ${index + 1}`}
                  >
                    <b>{index + 1}</b>
                    <span>{beat.syllable}</span>
                    <i>{beat.subdivision}</i>
                  </button>
                );
              })}
            </div>
            <div className="cycle-selection">
              <span>SELECTED PULSE</span>
              <strong>Akshara {selected + 1}</strong>
              <p>{current.subdivision} subdivisions · {current.fileName ?? "No audio assigned"}</p>
              <button onClick={() => document.getElementById("beat-inspector")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Edit this pulse →</button>
            </div>
          </div>

          <div className="structure-heading"><span>CYCLE STRUCTURE</span><small>Edit aṅgas without leaving the cycle</small></div>
          <div className="anga-sequence">
            {groupedBeats.map((group, groupIndex) => (
              <section className="anga-group" key={`${group.start}-${group.beats.length}`}>
                <div className="anga-label">
                  <span>{group.section.type === "chapu-group" ? "PULSE GROUP" : group.section.type === "custom" ? "CUSTOM GROUP" : "AṄGA"} {group.number}</span>
                  <div>
                    <strong>{sectionName(group.section)} · {group.beats.length} AKSHARAS</strong>
                    {group.section.type !== "chapu-group" && (
                      <select
                        aria-label={`Structure for group ${group.number}`}
                        value={group.section.type === "laghu" ? `laghu-${group.section.jati}` : group.section.type}
                        onChange={(event) => changeSectionType(groupIndex, event.target.value)}
                      >
                        <option value="anudrutam">Anudrutam · 1</option>
                        <option value="drutam">Drutam · 2</option>
                        <option value="laghu-3">Tisra laghu · 3</option>
                        <option value="laghu-4">Chatusra laghu · 4</option>
                        <option value="laghu-5">Khanda laghu · 5</option>
                        <option value="laghu-7">Misra laghu · 7</option>
                        <option value="laghu-9">Sankirna laghu · 9</option>
                        <option value="custom">Custom group</option>
                      </select>
                    )}
                    <button onClick={() => addAksharaToAnga(groupIndex)}>＋ Akshara</button>
                  </div>
                </div>
                <div className="beat-grid">
                  {group.beats.map((beat, offset) => {
                    const index = group.start + offset;
                    const tooLong = (beat.duration ?? 0) > beatDuration;
                    const kriya = beat.kriyaOverride ?? derivedKriya(group.section, offset);
                    return (
                      <article
                        key={beat.id}
                        className={`beat-card ${inspectorOpen && selected === index ? "selected" : ""} ${activeBeat === index && playing ? "active" : ""}`}
                        onClick={() => selectAkshara(index)}
                      >
                        <div className="beat-top">
                          <span>{index + 1}</span>
                          <small>{kriyaLabels[kriya]}</small>
                          <button
                            className="delete-beat"
                            disabled={beats.length <= 1}
                            aria-label={`Delete akshara ${index + 1}`}
                            title={beats.length <= 1 ? "A tāḷa needs at least one akshara" : `Delete akshara ${index + 1}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              deleteBeat(index);
                            }}
                          >×</button>
                        </div>
                        <label className="kriya-select">
                          <span>Kriya</span>
                          <select
                            value={beat.kriyaOverride ?? ""}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => {
                              event.stopPropagation();
                              const value = event.target.value as Kriya | "";
                              selectAkshara(index);
                              setBeats((items) => items.map((item, beatIndex) =>
                                beatIndex === index ? { ...item, kriyaOverride: value || undefined } : item,
                              ));
                            }}
                          >
                            <option value="">Automatic · {kriyaLabels[derivedKriya(group.section, offset)]}</option>
                            {Object.entries(kriyaLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                          </select>
                        </label>
                        <div className={`mini-wave ${beat.fileName ? "has-audio" : ""}`}>
                          {beat.peaks.slice(0, 20).map((peak, i) => <i key={i} style={{ height: `${peak * 100}%` }} />)}
                        </div>
                        <div className="card-subbeats" aria-label={`${beat.subdivision} sub-beats`}>
                          {beat.subPattern.map((state, subIndex) => <i key={subIndex} className={`${state} ${playing && activeBeat === index && activeSubBeat === subIndex ? "playing" : ""}`} />)}
                        </div>
                        <button
                          className="edit-subdivisions"
                          onClick={(event) => {
                            event.stopPropagation();
                            selectAkshara(index);
                            window.setTimeout(() => document.getElementById("beat-inspector")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
                          }}
                        >
                          Open inspector →
                        </button>
                        <label className="upload">
                          <input type="file" accept="audio/*,.opus,.ogg,.oga,.webm" onChange={(e) => uploadAudio(e, index)} />
                          {beat.fileName ? <><strong>{beat.fileName}</strong><small>{beat.decodeError ?? `${beat.duration?.toFixed(2)} sec`}</small></> : <><strong>＋ Add sound</strong><small>WAV, MP3, M4A, OPUS</small></>}
                        </label>
                        {beat.decodeError && <span className="decode-error">!</span>}
                        {tooLong && <span className="warning">↗ {(beat.duration! - beatDuration).toFixed(2)}s over</span>}
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
          <div className="cycle-brace"><span>1 CYCLE · {cycleDuration.toFixed(2)} SECONDS</span></div>
          <p className="shortcut-hint">Shortcuts: <kbd>Space</kbd> play/pause · <kbd>←</kbd><kbd>→</kbd> select akshara · <kbd>Delete</kbd> remove its audio</p>
          </section>

          {inspectorOpen && <aside className="inspector-panel">
          <div className="inspector-heading" id="beat-inspector">
            <div className="inspector-identity">
              <b>{selected + 1}</b>
              <div>
                <span>SELECTED AKSHARA</span>
                <h2>Beat {selected + 1}</h2>
                <p>Shape the inner rhythm and sound of this beat.</p>
              </div>
            </div>
            <div className="inspector-beat-switcher">
              <button className="close-inspector" onClick={() => setInspectorOpen(false)} aria-label="Deselect akshara and collapse beat controls" title="Close beat controls">×</button>
            </div>
          </div>

          <div className="inspector-summary">
            <div><span>BEAT LENGTH</span><strong>{beatDuration.toFixed(2)}s</strong></div>
            <div><span>NADAI</span><strong>{current.subdivision}</strong><small>{namedNadais[current.subdivision]?.name ?? "Custom"}</small></div>
            <div><span>AUDIO SAMPLE</span><strong>{current.fileName ? "Loaded" : "Empty"}</strong><small>{current.fileName ?? "Add a sound below"}</small></div>
          </div>

          <div className="unified-inspector">
          <section className="subdivision-editor">
            <div className="subdivision-head">
              <div>
                <span className="section-number">1</span>
                <div><h3>Choose the nadai</h3><p>How many equal notes should play inside this akshara?</p></div>
              </div>
              <span className="sub-duration">{(beatDuration / current.subdivision).toFixed(3)}s per subdivision</span>
            </div>
            <div className="nadai-select-row">
              <label htmlFor="nadai-select">
                <span>Nadai / subdivision count</span>
                <select id="nadai-select" value={current.subdivision} onChange={(event) => setSubdivision(Number(event.target.value))}>
                  {subdivisions.map((subdivision) => (
                    <option key={subdivision.count} value={subdivision.count}>
                      {subdivision.count} — {subdivision.name}{namedNadais[subdivision.count] ? ` · ${subdivision.phrase}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <span>CURRENT PATTERN</span>
                <strong>{current.subdivision} notes</strong>
                <small>{namedNadais[current.subdivision]?.phrase ?? `${current.subdivision} equal subdivisions`}</small>
              </div>
            </div>
            <div className="subbeat-grid">
              {current.subPattern.map((state, index) => (
                <div
                  key={index}
                  className={`subbeat-slot ${state} ${playing && activeBeat === selected && activeSubBeat === index ? "playing" : ""}`}
                >
                  <button className="subbeat-state" onClick={() => cycleSubBeat(index)} aria-label={`Subdivision ${index + 1}, ${state}`}>
                    <span>{index + 1}</span>
                    <b>{state === "accent" ? "ACCENT" : state === "mute" ? "MUTE" : "NORMAL"}</b>
                    <small>{(index * beatDuration / current.subdivision).toFixed(3)}s</small>
                  </button>
                  <button className={`sound-chip ${focusedSubBeat === index ? "active" : ""}`} onClick={() => setFocusedSubBeat(focusedSubBeat === index ? null : index)}>
                    ♪ {current.subSounds[index] === "custom" ? current.subAudioNames[index] ?? "Custom" : current.subSounds[index]}
                  </button>
                </div>
              ))}
            </div>
            {focusedSubBeat !== null && (
              <div className="sub-sound-panel">
                <div>
                  <strong>Subdivision {focusedSubBeat + 1} sound</strong>
                  <small>Choose a generated sine tone or upload your own sound.</small>
                </div>
                <div className="sound-segments">
                  {(["tik", "beep", "boop", "custom"] as SubBeatSound[]).map((sound) => (
                    <button key={sound} className={current.subSounds[focusedSubBeat] === sound ? "active" : ""} onClick={() => setSubBeatSound(focusedSubBeat, sound)}>
                      <b>{sound === "tik" ? "•" : sound === "beep" ? "―" : sound === "boop" ? "●" : "+"}</b>
                      <span>{sound}</span>
                    </button>
                  ))}
                </div>
                {current.subSounds[focusedSubBeat] === "custom" && (
                  <label className="custom-sound-action">
                    <input type="file" accept="audio/*,.opus,.ogg,.oga,.webm" onChange={(event) => uploadSubBeatSound(event, focusedSubBeat)} />
                    {current.subAudioNames[focusedSubBeat] ? `Replace ${current.subAudioNames[focusedSubBeat]}` : "Upload custom audio"}
                  </label>
                )}
                <button className="close-sound-panel" onClick={() => setFocusedSubBeat(null)} aria-label="Close sub-beat sound editor">×</button>
              </div>
            )}
            <div className="subdivision-foot">
              <span><i className="legend accent" /> Accent <i className="legend on" /> Normal <i className="legend mute" /> Muted</span>
              <button onClick={() => setSubdivision(current.subdivision, true)}>Apply {current.subdivision} subdivisions to all aksharas</button>
            </div>
          </section>

          {current?.audioUrl ? <section className="editor">
            <div className="editor-head">
              <div><span className="editor-index">{selected + 1}</span><h3>{current?.fileName ?? `Akshara ${selected + 1}`}</h3></div>
              <div className="editor-actions">
                <button className="preview-button" onClick={togglePreview} disabled={!current?.audioUrl}>{previewing ? "■ Stop" : "▶ Preview selection"}</button>
                <button className="reset-button" onClick={resetEdit} disabled={!current?.audioUrl}>Reset</button>
              </div>
            </div>
            <div className="wave-toolbar">
              <span><b>1</b> Choose the part to play</span>
              {advancedOpen && <label>Zoom <input type="range" min="1" max="4" step=".25" value={waveZoom} onChange={(e) => setWaveZoom(Number(e.target.value))} /> {waveZoom.toFixed(1)}×</label>}
            </div>
            <div className="wave-scroll">
              {current?.audioBuffer && current.duration ? (
                <WaveformEditor
                  buffer={current.audioBuffer}
                  trimStart={current.trimStart}
                  trimEnd={current.trimEnd ?? current.duration}
                  slotDuration={beatDuration}
                  zoom={waveZoom}
                  onChange={(trimStart, trimEnd) => updateBeat({ trimStart, trimEnd })}
                />
              ) : (
                <div className="waveform placeholder">
                  {(current?.peaks ?? []).map((peak, i) => <i key={i} style={{ height: `${peak * 100}%` }} />)}
                </div>
              )}
            </div>
            <div className="ruler"><span>0.0s</span><span>{(current?.duration ?? beatDuration).toFixed(2)}s</span></div>

            {current?.duration ? (
              <>
                <div className="simple-controls">
                  <div className="control-title"><b>2</b><span><strong>Shape the sound</strong><small>Set its length, tempo, and musical pitch.</small></span></div>
                  <div className="edit-controls primary">
                  <label>
                    <span><b>Start</b><output>{current.trimStart.toFixed(2)}s</output></span>
                    <input type="range" min="0" max={Math.max(0, (current.trimEnd ?? current.duration) - 0.01)} step=".01" value={current.trimStart} onChange={(e) => updateBeat({ trimStart: Number(e.target.value) })} />
                  </label>
                  <label>
                    <span><b>End</b><output>{(current.trimEnd ?? current.duration).toFixed(2)}s</output></span>
                    <input type="range" min={Math.min(current.duration, current.trimStart + 0.01)} max={current.duration} step=".01" value={current.trimEnd ?? current.duration} onChange={(e) => updateBeat({ trimEnd: Number(e.target.value) })} />
                  </label>
                  <label>
                    <span><b>Tempo</b><output>{current.playbackRate.toFixed(2)}×</output></span>
                    <input type="range" min=".5" max="2" step=".05" value={current.playbackRate} onChange={(e) => updateBeatWithPreview({ playbackRate: Number(e.target.value) })} />
                  </label>
                  <label className="pitch-control">
                    <span><b>Pitch</b><output>{current.pitch > 0 ? "+" : ""}{current.pitch.toFixed(0)} st</output></span>
                    <input type="range" min="-12" max="12" step="1" value={current.pitch} onChange={(e) => updateBeatWithPreview({ pitch: Number(e.target.value) })} />
                    <div className="pitch-presets">
                      {[-12, -7, 0, 7, 12].map((pitch) => <button key={pitch} className={current.pitch === pitch ? "active" : ""} onClick={() => updateBeatWithPreview({ pitch })}>{pitch > 0 ? "+" : ""}{pitch}</button>)}
                    </div>
                  </label>
                  <button className="match-slot" onClick={() => {
                    const selection = (current.trimEnd ?? current.duration!) - current.trimStart;
                    updateBeat({ playbackRate: Math.max(0.5, Math.min(2, selection / beatDuration)) });
                  }}>Auto-fit to this akshara</button>
                  </div>
                  <button className="advanced-toggle" onClick={() => setAdvancedOpen((open) => !open)} aria-expanded={advancedOpen}>
                    {advancedOpen ? "Hide advanced controls" : "Show advanced controls"} <span>{advancedOpen ? "−" : "+"}</span>
                  </button>
                  {advancedOpen && <div className="edit-controls advanced-options">
                    <label>
                      <span><b>Volume</b><output>{Math.round(current.gain * 100)}%</output></span>
                      <input type="range" min="0" max="1" step=".01" value={current.gain} onChange={(e) => updateBeat({ gain: Number(e.target.value) })} />
                    </label>
                    <label>
                      <span><b>Stereo position</b><output>{current.pan === 0 ? "Centre" : current.pan < 0 ? `${Math.round(-current.pan * 100)}L` : `${Math.round(current.pan * 100)}R`}</output></span>
                      <input type="range" min="-1" max="1" step=".01" value={current.pan} onChange={(e) => updateBeat({ pan: Number(e.target.value) })} />
                    </label>
                    <label>
                      <span><b>Fade in</b><output>{current.fadeIn.toFixed(2)}s</output></span>
                      <input type="range" min="0" max={Math.min(2, ((current.trimEnd ?? current.duration) - current.trimStart) / 2)} step=".01" value={current.fadeIn} onChange={(e) => updateBeat({ fadeIn: Number(e.target.value) })} />
                    </label>
                    <label>
                      <span><b>Fade out</b><output>{current.fadeOut.toFixed(2)}s</output></span>
                      <input type="range" min="0" max={Math.min(2, ((current.trimEnd ?? current.duration) - current.trimStart) / 2)} step=".01" value={current.fadeOut} onChange={(e) => updateBeat({ fadeOut: Number(e.target.value) })} />
                    </label>
                    <label>
                      <span><b>Bass EQ</b><output>{current.lowEq > 0 ? "+" : ""}{current.lowEq} dB</output></span>
                      <input type="range" min="-12" max="12" step="1" value={current.lowEq} onChange={(e) => updateBeat({ lowEq: Number(e.target.value) })} />
                    </label>
                    <label>
                      <span><b>Mid EQ</b><output>{current.midEq > 0 ? "+" : ""}{current.midEq} dB</output></span>
                      <input type="range" min="-12" max="12" step="1" value={current.midEq} onChange={(e) => updateBeat({ midEq: Number(e.target.value) })} />
                    </label>
                    <label>
                      <span><b>Treble EQ</b><output>{current.highEq > 0 ? "+" : ""}{current.highEq} dB</output></span>
                      <input type="range" min="-12" max="12" step="1" value={current.highEq} onChange={(e) => updateBeat({ highEq: Number(e.target.value) })} />
                    </label>
                    <label>
                      <span><b>Compression</b><output>{Math.round(current.compression * 100)}%</output></span>
                      <input type="range" min="0" max="1" step=".05" value={current.compression} onChange={(e) => updateBeat({ compression: Number(e.target.value) })} />
                    </label>
                    <div className="effect-toggles">
                      <button className={current.reverse ? "active" : ""} onClick={() => updateBeat({ reverse: !current.reverse })}>↶ Reverse</button>
                      <button className={current.loop ? "active" : ""} onClick={() => updateBeat({ loop: !current.loop })}>↻ Loop selection</button>
                      <button onClick={() => {
                        const channel = current.audioBuffer?.getChannelData(0);
                        if (!channel) return;
                        let peak = 0;
                        for (let i = 0; i < channel.length; i += 1) peak = Math.max(peak, Math.abs(channel[i]));
                        updateBeat({ gain: peak > 0 ? Math.min(2, 0.95 / peak) : 1 });
                      }}>◇ Normalize</button>
                    </div>
                  </div>}
                </div>
                <div className="overflow-panel">
                  <div className="control-title"><b>3</b><span><strong>At the next akshara</strong><small>Choose what happens when this pulse ends.</small></span></div>
                <div className="mode-options">
                  {(["overflow", "mute", "trim"] as OverflowMode[]).map((mode) => (
                    <button key={mode} className={current.overflowMode === mode ? "active" : ""} onClick={() => updateBeat({ overflowMode: mode })}>
                      <b>{mode === "overflow" ? "↗" : mode === "mute" ? "×" : "✂"}</b>
                      <span><strong>{mode === "overflow" ? "Keep playing" : mode === "mute" ? "No sound" : "Stop on time"}</strong><small>{mode === "overflow" ? "Continue into the next pulse" : mode === "mute" ? "Skip this akshara" : `End after ${beatDuration.toFixed(2)}s`}</small></span>
                    </button>
                  ))}
                </div>
              </div>
              </>
            ) : (
              <div className="empty-editor"><strong>Drop a sound on this akshara</strong><span>Its waveform and timing choices will appear here.</span></div>
            )}
          </section> : <section className="audio-start">
            <span className="audio-step">2</span>
            <h3>Add the beat sound</h3>
            <p>Upload a sample or recording. Trimming, pitch, volume, and timing controls will appear here.</p>
            <label className="inspector-upload">
              <input type="file" accept="audio/*,.opus,.ogg,.oga,.webm" onChange={(event) => uploadAudio(event, selected)} />
              Choose audio file
            </label>
          </section>}
          </div>
          </aside>}
          </div>
        </div>
      </section>

      {infoPanel && (
        <div className="info-overlay" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setInfoPanel(null);
        }}>
          <section className="info-panel" role="dialog" aria-modal="true" aria-labelledby="info-title">
            <div className="info-head">
              <div>
                <span>{infoPanel === "guide" ? "QUICK START" : "RHYTHM BASICS"}</span>
                <h2 id="info-title">{infoPanel === "guide" ? "Build your first tāḷa" : "Understand the cycle"}</h2>
              </div>
              <button onClick={() => setInfoPanel(null)} aria-label="Close panel">×</button>
            </div>
            {infoPanel === "guide" ? (
              <div className="guide-steps">
                <article><b>1</b><div><h3>Choose a cycle</h3><p>Start with Ādi, Rūpaka, or Miśra Cāpu—or create a custom tāḷa and add as many aksharas as you need.</p></div></article>
                <article><b>2</b><div><h3>Set the tempo</h3><p>Enter BPM. The app calculates each akshara as <strong>60 ÷ BPM</strong> seconds.</p></div></article>
                <article><b>3</b><div><h3>Add a sound</h3><p>Use “Add sound” on any akshara. WAV, MP3, M4A, Opus, Ogg, and compatible WebM audio are accepted.</p></div></article>
                <article><b>4</b><div><h3>Edit the real waveform</h3><p>Drag the IN and OUT markers, then adjust tempo and pitch. Open Advanced controls for EQ, compression, fades, reverse, loop, and normalization.</p></div></article>
                <article><b>5</b><div><h3>Choose the boundary</h3><p>Let a sound continue, silence that akshara, or stop it exactly when the next pulse begins.</p></div></article>
                <article><b>6</b><div><h3>Preview and export</h3><p>Preview one selection or play the full cycle. Export saves the arrangement settings as a portable JSON file.</p></div></article>
                <article className="install-instructions">
                  <b>7</b>
                  <div>
                    <h3>Save Tāla Lab on your phone</h3>
                    <p><strong>Android:</strong> Open the deployed site in Chrome, tap the ⋮ menu, then choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p>
                    <p><strong>iPhone or iPad:</strong> Open the site in Safari, tap Share, scroll down, then choose <strong>Add to Home Screen</strong> and confirm with Add.</p>
                    <small>Install from the HTTPS production site. Open it online once before relying on offline access.</small>
                  </div>
                </article>
              </div>
            ) : (
              <div className="learn-grid">
                <article><span>01</span><h3>Tāḷa</h3><p>A repeating rhythmic framework. One complete repetition is a cycle.</p></article>
                <article><span>02</span><h3>Akshara</h3><p>One timed pulse in the cycle. The interface also calls it a beat for clarity.</p></article>
                <article><span>03</span><h3>BPM</h3><p>Beats per minute. At 60 BPM, every akshara lasts exactly 1 second.</p></article>
                <article><span>04</span><h3>Aṅga</h3><p>A Suladi tāḷa component: anudrutam has 1 akshara, drutam has 2, and laghu has 3, 4, 5, 7, or 9 according to its jāti.</p></article>
                <article><span>05</span><h3>Kriya</h3><p>The hand action marking an akshara: clap, wave, or a finger count. Aṅga type determines the traditional kriya sequence.</p></article>
                <article><span>06</span><h3>Gati / Nadai</h3><p>Nadai divides each akshara. Traditional options are Tisra 3, Chatusra 4, Khanda 5, Misra 7, and Sankirna 9; other counts are shown as custom subdivisions.</p></article>
                <div className="math-example">
                  <span>WORKED EXAMPLE</span>
                  <h3>8 aksharas · 60 BPM · time 1:01</h3>
                  <code>61 seconds ÷ 1 sec = beat index 61{"\n"}61 modulo 8 = 5</code>
                  <p>The engine is at zero-based index <strong>5</strong>, which musicians see as the <strong>sixth displayed akshara</strong>. Seven full cycles are complete.</p>
                </div>
              </div>
            )}
            <button className="back-compose" onClick={() => setInfoPanel(null)}>Back to composer</button>
          </section>
        </div>
      )}

      <footer>
        <span>Tāla Lab · Carnatic rhythm studio</span>
        <button onClick={() => setInfoPanel("guide")}>Install on phone</button>
        <span className="footer-links">
          <a href={`${basePath}/privacy/`}>Privacy</a>
          <a href="https://github.com/CGS26/thalam-studio" target="_blank" rel="noreferrer">Source</a>
        </span>
      </footer>
    </main>
  );
}
