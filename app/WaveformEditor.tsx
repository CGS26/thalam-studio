"use client";

import { PointerEvent, useEffect, useRef } from "react";

type Props = {
  buffer: AudioBuffer;
  trimStart: number;
  trimEnd: number;
  slotDuration: number;
  zoom: number;
  onChange: (start: number, end: number) => void;
};

export function WaveformEditor({ buffer, trimStart, trimEnd, slotDuration, zoom, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragMode = useRef<"start" | "end" | "seek" | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => {
      const width = Math.max(720, Math.round(canvas.parentElement!.clientWidth * zoom));
      const height = 170;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const context = canvas.getContext("2d")!;
      context.scale(ratio, ratio);
      context.fillStyle = "#faf6f0";
      context.fillRect(0, 0, width, height);

      context.strokeStyle = "#e5ddd2";
      context.lineWidth = 1;
      for (let x = 0; x < width; x += 50) {
        context.beginPath();
        context.moveTo(x + 0.5, 0);
        context.lineTo(x + 0.5, height);
        context.stroke();
      }

      const startX = (trimStart / buffer.duration) * width;
      const endX = (trimEnd / buffer.duration) * width;
      context.fillStyle = "#d5a64c20";
      context.fillRect(startX, 0, endX - startX, height);

      const channel = buffer.getChannelData(0);
      const samplesPerPixel = Math.max(1, Math.floor(channel.length / width));
      context.strokeStyle = "#b84a32";
      context.lineWidth = 1;
      context.beginPath();
      for (let x = 0; x < width; x += 1) {
        let min = 1;
        let max = -1;
        const from = x * samplesPerPixel;
        const to = Math.min(channel.length, from + samplesPerPixel);
        for (let sample = from; sample < to; sample += 1) {
          min = Math.min(min, channel[sample]);
          max = Math.max(max, channel[sample]);
        }
        context.moveTo(x + 0.5, (1 + min) * height / 2);
        context.lineTo(x + 0.5, (1 + max) * height / 2);
      }
      context.stroke();

      const slotX = (slotDuration / buffer.duration) * width;
      if (slotX < width) {
        context.setLineDash([5, 4]);
        context.strokeStyle = "#813220";
        context.beginPath();
        context.moveTo(slotX, 0);
        context.lineTo(slotX, height);
        context.stroke();
        context.setLineDash([]);
        context.fillStyle = "#813220";
        context.font = "700 9px Arial";
        context.fillText("AKSHARA END", slotX + 5, 14);
      }

      [
        { x: startX, label: "IN" },
        { x: endX, label: "OUT" },
      ].forEach(({ x, label }) => {
        context.fillStyle = "#d5a64c";
        context.fillRect(x - 2, 0, 4, height);
        context.fillRect(label === "IN" ? x : x - 27, 0, 27, 18);
        context.fillStyle = "#231d19";
        context.font = "700 9px Arial";
        context.fillText(label, label === "IN" ? x + 6 : x - 23, 12);
      });
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas.parentElement!);
    return () => observer.disconnect();
  }, [buffer, trimStart, trimEnd, slotDuration, zoom]);

  function timeAt(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return Math.max(0, Math.min(buffer.duration, ((event.clientX - rect.left) / rect.width) * buffer.duration));
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    const time = timeAt(event);
    const tolerance = buffer.duration * 0.025 / zoom;
    dragMode.current = Math.abs(time - trimStart) <= tolerance
      ? "start"
      : Math.abs(time - trimEnd) <= tolerance
        ? "end"
        : "seek";
    event.currentTarget.setPointerCapture(event.pointerId);
    if (dragMode.current === "seek") onChange(Math.min(time, trimEnd - 0.01), trimEnd);
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!dragMode.current) return;
    const time = timeAt(event);
    if (dragMode.current === "start" || dragMode.current === "seek") {
      onChange(Math.max(0, Math.min(trimEnd - 0.01, time)), trimEnd);
    } else {
      onChange(trimStart, Math.min(buffer.duration, Math.max(trimStart + 0.01, time)));
    }
  }

  return (
    <canvas
      ref={canvasRef}
      className="true-waveform"
      aria-label="Interactive audio waveform. Drag the gold IN and OUT handles to select audio."
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={() => { dragMode.current = null; }}
      onPointerCancel={() => { dragMode.current = null; }}
    />
  );
}
