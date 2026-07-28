"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { WaveformEditor } from "./WaveformEditor";

type OverflowMode = "overflow" | "mute" | "trim";
type SubBeatState = "accent" | "on" | "mute";

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
};

const talaPresets = [
  { name: "Ādi Tāḷa", angas: "4 + 2 + 2", beats: 8 },
  { name: "Rūpaka Tāḷa", angas: "2 + 4", beats: 6 },
  { name: "Miśra Cāpu", angas: "3 + 4", beats: 7 },
];

const syllables = ["TA", "KA", "DHI", "MI", "TA", "KA", "JO", "NU"];
const nadais = [
  { count: 3, name: "Tisra", phrase: "ta-ki-ta" },
  { count: 4, name: "Chatusra", phrase: "ta-ka-dhi-mi" },
  { count: 5, name: "Khanda", phrase: "ta-dhi-gi-na-tom" },
  { count: 7, name: "Misra", phrase: "ta-ki-ta-ta-ka-dhi-mi" },
  { count: 9, name: "Sankirna", phrase: "ta-ka-dhi-mi-ta-dhi-gi-na-tom" },
];

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
  };
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function Home() {
  const [bpm, setBpm] = useState(60);
  const [beats, setBeats] = useState<Beat[]>(() => Array.from({ length: 8 }, (_, i) => makeBeat(i)));
  const [activeBeat, setActiveBeat] = useState(0);
  const [activeSubBeat, setActiveSubBeat] = useState(0);
  const [elapsed, setElapsed] = useState(61);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState(0);
  const [talaName, setTalaName] = useState("My morning korvai");
  const [saveState, setSaveState] = useState("Database-free");
  const [waveZoom, setWaveZoom] = useState(1);
  const [previewing, setPreviewing] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [infoPanel, setInfoPanel] = useState<"guide" | "learn" | null>(null);
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
        playSubBeat(beat.subPattern[subBeat], subBeat === 0);
      }
      setElapsed(nextElapsed);
      setActiveBeat(beatIndex);
      setActiveSubBeat(subBeat);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, beatDuration, beats]);

  useEffect(() => {
    void import("tone");
  }, []);

  useEffect(() => {
    return () => {
      previewStop.current?.();
      beats.forEach((beat) => beat.audioUrl && URL.revokeObjectURL(beat.audioUrl));
    };
  }, []);

  function togglePlay() {
    if (playing) {
      setPlaying(false);
      return;
    }
    startedAt.current = performance.now();
    elapsedAtStart.current = elapsed;
    lastPlayedSlot.current = "";
    setPlaying(true);
  }

  function playSubBeat(state: SubBeatState, downbeat: boolean) {
    if (state === "mute") return;
    const context = clickContext.current ?? new AudioContext();
    clickContext.current = context;
    if (context.state === "suspended") void context.resume();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = state === "accent" || downbeat ? 1250 : 880;
    const volume = state === "accent" || downbeat ? 0.11 : 0.04;
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.04);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.045);
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

  function togglePreview() {
    if (previewing) {
      previewStop.current?.();
      previewAudio.current?.pause();
      previewAudio.current = null;
      setPreviewing(false);
      return;
    }
    if (current) playBeat(current, true);
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
    const resizePattern = (previous: SubBeatState[]) =>
      Array.from({ length: count }, (_, index) => previous[index] ?? (index === 0 ? "accent" : "on"));
    setBeats((items) => items.map((beat, index) =>
      applyToAll || index === selected
        ? { ...beat, subdivision: count, subPattern: resizePattern(beat.subPattern) }
        : beat,
    ));
    setActiveSubBeat(0);
  }

  function cycleSubBeat(index: number) {
    const order: SubBeatState[] = ["on", "accent", "mute"];
    const next = order[(order.indexOf(current.subPattern[index]) + 1) % order.length];
    updateBeat({ subPattern: current.subPattern.map((state, subIndex) => subIndex === index ? next : state) });
    playSubBeat(next, index === 0);
  }

  function deleteBeat(index: number) {
    if (beats.length <= 1) return;
    const beat = beats[index];
    if (beat.audioUrl) URL.revokeObjectURL(beat.audioUrl);
    setBeats((items) => items.filter((_, beatIndex) => beatIndex !== index));
    setSelected((currentIndex) => {
      if (currentIndex > index) return currentIndex - 1;
      if (currentIndex === index) return Math.max(0, Math.min(index, beats.length - 2));
      return currentIndex;
    });
    setActiveBeat(0);
    setElapsed(0);
  }

  function applyPreset(preset: (typeof talaPresets)[number]) {
    setTalaName(preset.name);
    setBeats(Array.from({ length: preset.beats }, (_, i) => beats[i] ?? makeBeat(i)));
    setSelected(0);
    setActiveBeat(0);
    setElapsed(0);
  }

  function exportTala() {
    const arrangement = {
      format: "thalam-arrangement",
      version: 1,
      name: talaName,
      bpm,
      beatCount: beats.length,
      beats: beats.map(({ audioUrl: _audioUrl, audioBuffer: _audioBuffer, ...beat }) => beat),
    };
    const blob = new Blob([JSON.stringify(arrangement, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${talaName.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "my-thalam"}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setSaveState("Tāḷa exported");
  }

  return (
    <main>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">தா</span>
          <div><strong>Thālam</strong><small>rhythm studio</small></div>
        </div>
        <nav aria-label="Primary navigation">
          <button className={!infoPanel ? "nav-active" : ""} onClick={() => setInfoPanel(null)}>Composer</button>
          <button className={infoPanel === "guide" ? "nav-active" : ""} onClick={() => setInfoPanel("guide")}>Guide</button>
          <button className={infoPanel === "learn" ? "nav-active" : ""} onClick={() => setInfoPanel("learn")}>Learn</button>
        </nav>
        <button className="save-button" onClick={exportTala}>Export tāḷa</button>
      </header>

      <section className="hero">
        <div>
          <span className="eyebrow">TĀḶA WORKBENCH</span>
          <h1>Shape rhythm.<br /><em>Hear every akshara.</em></h1>
          <p>Build, arrange, and rehearse Carnatic rhythm cycles with your own sounds.</p>
        </div>
        <div className="hero-meta">
          <span>{saveState}</span>
          <strong>{beats.length} aksharas · {bpm} BPM</strong>
        </div>
      </section>

      <section className="workspace">
        <aside className="sidebar">
          <div className="section-heading"><span>Quick start</span><small>PRESETS</small></div>
          {talaPresets.map((preset) => (
            <button className="preset" key={preset.name} onClick={() => applyPreset(preset)}>
              <span><strong>{preset.name}</strong><small>{preset.angas}</small></span>
              <b>{preset.beats}</b>
            </button>
          ))}
          <button className="new-tala" onClick={() => { setTalaName("Untitled tāḷa"); setBeats(Array.from({ length: 4 }, (_, i) => makeBeat(i))); }}>
            <span>＋</span> New tāḷa
          </button>
          <div className="notation-note">
            <span>⌁</span>
            <p><strong>Akshara</strong> is one pulse in a tāḷa cycle. “Beat” is shown alongside it for clarity.</p>
          </div>
        </aside>

        <div className="composer">
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
            <button className="play" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>{playing ? "Ⅱ" : "▶"}</button>
            <div className="transport-time"><span>{formatTime(elapsed)}</span><small>CYCLE {cycle}</small></div>
            <div className="progress-track"><span style={{ width: `${((elapsed % cycleDuration) / cycleDuration) * 100}%` }} /></div>
            <div className="position"><span>AKSHARA · MĀTRA</span><strong>{activeBeat + 1}<i>/ {beats.length}</i></strong><small>sub-beat {activeSubBeat + 1} / {beats[activeBeat]?.subdivision ?? 1}</small></div>
          </div>

          <div className="timeline-head">
            <div><h2>Akshara sequence</h2><span>{overflowCount ? `${overflowCount} audio ${overflowCount === 1 ? "clip exceeds" : "clips exceed"} its slot` : "All clips fit their slots"}</span></div>
            <button onClick={() => setBeats((items) => [...items, { ...makeBeat(items.length), id: Math.max(...items.map((beat) => beat.id)) + 1 }])}>＋ Add akshara</button>
          </div>

          <div className="beat-grid">
            {beats.map((beat, index) => {
              const tooLong = (beat.duration ?? 0) > beatDuration;
              return (
                <article
                  key={beat.id}
                  className={`beat-card ${selected === index ? "selected" : ""} ${activeBeat === index && playing ? "active" : ""}`}
                  onClick={() => setSelected(index)}
                >
                  <div className="beat-top">
                    <span>{index + 1}</span>
                    <small>{beat.syllable}</small>
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
                  <div className={`mini-wave ${beat.fileName ? "has-audio" : ""}`}>
                    {beat.peaks.slice(0, 20).map((peak, i) => <i key={i} style={{ height: `${peak * 100}%` }} />)}
                  </div>
                  <div className="card-subbeats" aria-label={`${beat.subdivision} sub-beats`}>
                    {beat.subPattern.map((state, subIndex) => <i key={subIndex} className={`${state} ${playing && activeBeat === index && activeSubBeat === subIndex ? "playing" : ""}`} />)}
                  </div>
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

          <section className="subdivision-editor">
            <div className="subdivision-head">
              <div>
                <span className="section-number">A</span>
                <div><h3>Sub-beats inside Akshara {selected + 1}</h3><p>Choose a gati/nadai, then tap each mātra to cycle: normal → accent → mute.</p></div>
              </div>
              <span className="sub-duration">{(beatDuration / current.subdivision).toFixed(3)}s per mātra</span>
            </div>
            <div className="nadai-row">
              {nadais.map((nadai) => (
                <button key={nadai.count} className={current.subdivision === nadai.count ? "active" : ""} onClick={() => setSubdivision(nadai.count)}>
                  <b>{nadai.count}</b><span><strong>{nadai.name}</strong><small>{nadai.phrase}</small></span>
                </button>
              ))}
            </div>
            <div className="subbeat-grid">
              {current.subPattern.map((state, index) => (
                <button
                  key={index}
                  className={`${state} ${playing && activeBeat === selected && activeSubBeat === index ? "playing" : ""}`}
                  onClick={() => cycleSubBeat(index)}
                  aria-label={`Mātra ${index + 1}, ${state}`}
                >
                  <span>{index + 1}</span>
                  <b>{state === "accent" ? "ACCENT" : state === "mute" ? "MUTE" : "NORMAL"}</b>
                  <small>{(index * beatDuration / current.subdivision).toFixed(3)}s</small>
                </button>
              ))}
            </div>
            <div className="subdivision-foot">
              <span><i className="legend accent" /> Accent <i className="legend on" /> Normal <i className="legend mute" /> Muted</span>
              <button onClick={() => setSubdivision(current.subdivision, true)}>Apply {current.subdivision}-nadai to all aksharas</button>
            </div>
          </section>

          <div className="cycle-brace"><span>1 CYCLE · {cycleDuration.toFixed(2)} SECONDS</span></div>

          <section className="editor">
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
          </section>
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
                <article><b>4</b><div><h3>Edit the real waveform</h3><p>Drag the gold IN and OUT markers, then adjust tempo and pitch. Open Advanced controls for EQ, compression, fades, reverse, loop, and normalization.</p></div></article>
                <article><b>5</b><div><h3>Choose the boundary</h3><p>Let a sound continue, silence that akshara, or stop it exactly when the next pulse begins.</p></div></article>
                <article><b>6</b><div><h3>Preview and export</h3><p>Preview one selection or play the full cycle. Export saves the arrangement settings as a portable JSON file.</p></div></article>
              </div>
            ) : (
              <div className="learn-grid">
                <article><span>01</span><h3>Tāḷa</h3><p>A repeating rhythmic framework. One complete repetition is a cycle.</p></article>
                <article><span>02</span><h3>Akshara</h3><p>One timed pulse in the cycle. The interface also calls it a beat for clarity.</p></article>
                <article><span>03</span><h3>BPM</h3><p>Beats per minute. At 60 BPM, every akshara lasts exactly 1 second.</p></article>
                <article><span>04</span><h3>Anga</h3><p>A structural division of a tāḷa, such as the 4 + 2 + 2 grouping in Ādi Tāḷa.</p></article>
                <article><span>05</span><h3>Mātra</h3><p>A smaller timed subdivision inside an akshara. Mātra duration is akshara duration divided by the chosen subdivision count.</p></article>
                <article><span>06</span><h3>Gati / Nadai</h3><p>The subdivision pattern: Tisra 3, Chatusra 4, Khanda 5, Misra 7, or Sankirna 9 mātras per akshara.</p></article>
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

      <footer><span>Thālam · Carnatic rhythm studio</span><span>Space: play / pause · 60 ÷ BPM = seconds per akshara</span></footer>
    </main>
  );
}
