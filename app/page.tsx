"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

type OverflowMode = "overflow" | "mute" | "trim";

type Beat = {
  id: number;
  label: string;
  syllable: string;
  fileName?: string;
  audioUrl?: string;
  duration?: number;
  peaks: number[];
  overflowMode: OverflowMode;
  trimStart: number;
  trimEnd?: number;
};

const talaPresets = [
  { name: "Ādi Tāḷa", angas: "4 + 2 + 2", beats: 8 },
  { name: "Rūpaka Tāḷa", angas: "2 + 4", beats: 6 },
  { name: "Miśra Cāpu", angas: "3 + 4", beats: 7 },
];

const syllables = ["TA", "KA", "DHI", "MI", "TA", "KA", "JO", "NU"];

function makeBeat(index: number): Beat {
  return {
    id: Date.now() + index,
    label: `Akshara ${index + 1}`,
    syllable: syllables[index % syllables.length],
    peaks: Array.from({ length: 48 }, (_, i) => 0.18 + Math.abs(Math.sin(i * 0.78 + index)) * 0.68),
    overflowMode: "trim",
    trimStart: 0,
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
  const [elapsed, setElapsed] = useState(61);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState(0);
  const [talaName, setTalaName] = useState("My morning korvai");
  const [saveState, setSaveState] = useState("Saved locally");
  const startedAt = useRef(0);
  const elapsedAtStart = useRef(0);
  const timers = useRef<number[]>([]);

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
      setElapsed(nextElapsed);
      setActiveBeat(Math.floor(nextElapsed / beatDuration) % beats.length);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, beatDuration, beats.length]);

  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout);
      beats.forEach((beat) => beat.audioUrl && URL.revokeObjectURL(beat.audioUrl));
    };
  }, []);

  function togglePlay() {
    if (playing) {
      setPlaying(false);
      timers.current.forEach(clearTimeout);
      timers.current = [];
      return;
    }
    startedAt.current = performance.now();
    elapsedAtStart.current = elapsed;
    setPlaying(true);
    scheduleCycle(elapsed);
  }

  function scheduleCycle(from: number) {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const currentSlot = Math.floor(from / beatDuration);
    for (let offset = 0; offset < beats.length * 2; offset += 1) {
      const slot = currentSlot + offset;
      const beatIndex = slot % beats.length;
      const wait = Math.max(0, slot * beatDuration - from) * 1000;
      const timer = window.setTimeout(() => playBeat(beats[beatIndex]), wait);
      timers.current.push(timer);
    }
  }

  function playBeat(beat: Beat) {
    if (!beat.audioUrl || beat.overflowMode === "mute") return;
    const audio = new Audio(beat.audioUrl);
    audio.currentTime = beat.trimStart;
    void audio.play();
    if (beat.overflowMode === "trim") {
      const stopAfter = Math.min(beatDuration, (beat.trimEnd ?? beat.duration ?? beatDuration) - beat.trimStart);
      window.setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
      }, Math.max(0, stopAfter * 1000));
    }
  }

  async function uploadAudio(event: ChangeEvent<HTMLInputElement>, index: number) {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    const duration = await new Promise<number>((resolve) => {
      audio.addEventListener("loadedmetadata", () => resolve(audio.duration), { once: true });
    });
    const buffer = await file.arrayBuffer();
    let peaks = current.peaks;
    try {
      const context = new AudioContext();
      const decoded = await context.decodeAudioData(buffer.slice(0));
      const channel = decoded.getChannelData(0);
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
      // The browser can still play formats it cannot decode for waveform analysis.
    }
    setBeats((items) =>
      items.map((beat, beatIndex) =>
        beatIndex === index
          ? { ...beat, fileName: file.name, audioUrl: url, duration, trimEnd: Math.min(duration, beatDuration), peaks }
          : beat,
      ),
    );
    setSelected(index);
  }

  function updateBeat(patch: Partial<Beat>) {
    setBeats((items) => items.map((beat, index) => (index === selected ? { ...beat, ...patch } : beat)));
  }

  function applyPreset(preset: (typeof talaPresets)[number]) {
    setTalaName(preset.name);
    setBeats(Array.from({ length: preset.beats }, (_, i) => beats[i] ?? makeBeat(i)));
    setSelected(0);
    setActiveBeat(0);
    setElapsed(0);
  }

  async function saveTala() {
    setSaveState("Saving…");
    try {
      const response = await fetch("/api/talas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: talaName,
          bpm,
          beatCount: beats.length,
          beats: beats.map(({ audioUrl: _audioUrl, ...beat }) => beat),
        }),
      });
      if (!response.ok) throw new Error("Save failed");
      setSaveState("Saved to SQLite");
    } catch {
      setSaveState("Draft kept on this device");
    }
  }

  return (
    <main>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">தா</span>
          <div><strong>Thālam</strong><small>rhythm studio</small></div>
        </div>
        <nav aria-label="Primary navigation">
          <button className="nav-active">Composer</button>
          <button>My tāḷas</button>
          <button>Learn</button>
        </nav>
        <button className="save-button" onClick={saveTala}>Save tāḷa</button>
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
            <div className="position"><span>AKSHARA</span><strong>{activeBeat + 1}<i>/ {beats.length}</i></strong><small>engine index {activeBeat}</small></div>
          </div>

          <div className="timeline-head">
            <div><h2>Akshara sequence</h2><span>{overflowCount ? `${overflowCount} audio ${overflowCount === 1 ? "clip exceeds" : "clips exceed"} its slot` : "All clips fit their slots"}</span></div>
            <button onClick={() => setBeats((items) => [...items, makeBeat(items.length)])}>＋ Add akshara</button>
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
                  <div className="beat-top"><span>{index + 1}</span><small>{beat.syllable}</small></div>
                  <div className={`mini-wave ${beat.fileName ? "has-audio" : ""}`}>
                    {beat.peaks.slice(0, 20).map((peak, i) => <i key={i} style={{ height: `${peak * 100}%` }} />)}
                  </div>
                  <label className="upload">
                    <input type="file" accept="audio/*" onChange={(e) => uploadAudio(e, index)} />
                    {beat.fileName ? <><strong>{beat.fileName}</strong><small>{beat.duration?.toFixed(2)} sec</small></> : <><strong>＋ Add sound</strong><small>WAV, MP3, M4A</small></>}
                  </label>
                  {tooLong && <span className="warning">↗ {(beat.duration! - beatDuration).toFixed(2)}s over</span>}
                </article>
              );
            })}
          </div>

          <div className="cycle-brace"><span>1 CYCLE · {cycleDuration.toFixed(2)} SECONDS</span></div>

          <section className="editor">
            <div className="editor-head">
              <div><span className="editor-index">{selected + 1}</span><h3>{current?.fileName ?? `Akshara ${selected + 1}`}</h3></div>
              <div className="tabs"><button className="active">Waveform</button><button>Details</button></div>
            </div>
            <div className="waveform">
              <div className="slot-shade" style={{ width: `${Math.min(100, (beatDuration / Math.max(current?.duration ?? beatDuration, beatDuration)) * 100)}%` }} />
              {(current?.peaks ?? []).map((peak, i) => <i key={i} style={{ height: `${peak * 100}%` }} />)}
              {current?.duration && current.duration > beatDuration && <span className="slot-line" style={{ left: `${(beatDuration / current.duration) * 100}%` }}><b>SLOT END</b></span>}
            </div>
            <div className="ruler"><span>0.0s</span><span>{(current?.duration ?? beatDuration).toFixed(2)}s</span></div>

            {current?.duration && current.duration > beatDuration ? (
              <div className="overflow-panel">
                <div><strong>Audio exceeds this akshara</strong><span>{current.duration.toFixed(2)}s audio in a {beatDuration.toFixed(2)}s slot</span></div>
                <div className="mode-options">
                  {(["overflow", "mute", "trim"] as OverflowMode[]).map((mode) => (
                    <button key={mode} className={current.overflowMode === mode ? "active" : ""} onClick={() => updateBeat({ overflowMode: mode })}>
                      <b>{mode === "overflow" ? "↗" : mode === "mute" ? "×" : "✂"}</b>
                      <span><strong>{mode === "overflow" ? "Let it ring" : mode === "mute" ? "Mute" : "Trim to fit"}</strong><small>{mode === "overflow" ? "Continue over the next pulse" : mode === "mute" ? "Skip this sound" : `Stop at ${beatDuration.toFixed(2)}s`}</small></span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-editor"><strong>Drop a sound on this akshara</strong><span>Its waveform and timing choices will appear here.</span></div>
            )}
          </section>
        </div>
      </section>

      <footer><span>Thālam · Carnatic rhythm studio</span><span>Space: play / pause · 60 ÷ BPM = seconds per akshara</span></footer>
    </main>
  );
}
