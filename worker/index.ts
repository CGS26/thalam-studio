/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/talas") {
      await env.DB.batch([
        env.DB.prepare(`CREATE TABLE IF NOT EXISTS talas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          bpm INTEGER NOT NULL,
          beat_count INTEGER NOT NULL,
          arrangement TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`),
        env.DB.prepare("CREATE INDEX IF NOT EXISTS talas_updated_at_idx ON talas (updated_at)"),
      ]);

      if (request.method === "GET") {
        const result = await env.DB.prepare(
          "SELECT id, name, bpm, beat_count AS beatCount, arrangement, updated_at AS updatedAt FROM talas ORDER BY updated_at DESC",
        ).all();
        return Response.json(result.results);
      }

      if (request.method === "POST") {
        const body = await request.json() as { name?: string; bpm?: number; beatCount?: number; beats?: unknown[] };
        if (!body.name || !body.bpm || !body.beatCount || !Array.isArray(body.beats)) {
          return Response.json({ error: "Invalid tāḷa" }, { status: 400 });
        }
        const result = await env.DB.prepare(
          "INSERT INTO talas (name, bpm, beat_count, arrangement) VALUES (?, ?, ?, ?)",
        ).bind(body.name, body.bpm, body.beatCount, JSON.stringify(body.beats)).run();
        return Response.json({ id: result.meta.last_row_id }, { status: 201 });
      }

      return new Response("Method not allowed", { status: 405 });
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
