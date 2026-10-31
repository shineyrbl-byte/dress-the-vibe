import "server-only";
import type { MakeupEffect } from "./types";

// YouCam AI API (Perfect Corp), V2 structure. Docs: https://docs.perfectcorp.com/
const BASE_URL = process.env.YOUCAM_API_BASE ?? "https://yce-api-01.makeupar.com";

export class YouCamError extends Error {
  constructor(message: string, public code?: string, public status?: number) {
    super(message);
  }
}

const FRIENDLY: Record<string, string> = {
  error_no_face: "We couldn't find a face. Use a photo where your face is clearly visible.",
  error_pose: "Stand facing the camera with arms relaxed at your sides.",
  error_multi_person: "Only one person in the photo, please.",
  error_multiple_people: "Only one person in the photo, please.",
  error_no_shoulder: "Make sure your shoulders and body are in the photo, not just your face.",
  error_below_min_image_size: "Photo is too small. Use a bigger one.",
  error_invalid_src: "That photo doesn't work for try-on. Use a full-body photo against a plain background.",
  error_apply_region_mismatch: "This outfit needs a full-body photo. Step back so your whole body is in frame.",
  error_face_position_too_small: "Your face is too small in the photo for makeup. Try a closer photo.",
  error_face_position_out_of_boundary: "Your face is cut off. Center yourself in the frame.",
  error_face_angle_invalid: "Look straight at the camera for makeup try-on.",
  error_nsfw_content_detected: "That photo can't be used. Try a different one.",
  exceed_max_filesize: "Photo is over 10MB.",
  CreditInsufficiency: "The YouCam account is out of API units.",
  InvalidApiKey: "The YouCam API key is invalid.",
};

export const friendly = (code?: string, fallback = "Try-on failed. Try again.") => (code && FRIENDLY[code]) || fallback;
export const hasKey = () => Boolean(process.env.YOUCAM_API_KEY);

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.YOUCAM_API_KEY}`, "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || (body.status && body.status !== 200)) {
    const code = body.error_code ?? body.error;
    throw new YouCamError(friendly(code, `YouCam API error (${res.status})`), code, res.status);
  }
  return body.data as T;
}

export async function uploadImage(bytes: Uint8Array, contentType: string) {
  const data = await call<{ files: { file_id: string; requests: { method: string; url: string; headers: Record<string, string> }[] }[] }>(
    "/s2s/v2.0/file",
    {
      method: "POST",
      body: JSON.stringify({ files: [{ content_type: contentType, file_name: `vibe-${Date.now()}.jpg`, file_size: bytes.byteLength }] }),
    },
  );
  const file = data.files[0];
  const up = file.requests[0];
  const put = await fetch(up.url, { method: up.method ?? "PUT", headers: up.headers, body: Buffer.from(bytes) });
  if (!put.ok) throw new YouCamError(`Upload failed (${put.status})`, "error_upload");
  return file.file_id;
}

interface Task {
  task_status: string;
  error?: string | null;
  error_message?: string;
  results?: { url?: string } | { url?: string; download_url?: string }[] | null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function runTask(path: string, body: unknown, timeoutMs = 90_000) {
  const { task_id } = await call<{ task_id: string }>(path, { method: "POST", body: JSON.stringify(body) });
  const deadline = Date.now() + timeoutMs;
  let wait = 2000;
  while (Date.now() < deadline) {
    await sleep(wait);
    const t = await call<Task>(`${path}/${encodeURIComponent(task_id)}`);
    if (t.task_status === "success") {
      const r = (Array.isArray(t.results) ? t.results[0] : t.results) as { url?: string; download_url?: string } | null | undefined;
      const url = r?.url ?? r?.download_url;
      if (!url) throw new YouCamError("Try-on finished without an image.", "no_result");
      return url;
    }
    if (t.task_status === "error") throw new YouCamError(friendly(t.error ?? undefined, t.error_message), t.error ?? undefined);
    wait = Math.min(wait * 1.4, 5000);
  }
  throw new YouCamError("Try-on timed out. Try again.", "timeout");
}

/** Downloads a YouCam result (signed S3 URL) so the browser can use it on a canvas without CORS issues. */
async function toDataUrl(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new YouCamError("Couldn't download the try-on result.", "download_failed");
  const type = res.headers.get("content-type") ?? "image/jpeg";
  return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
}

/** AI Clothes try-on with one of YouCam's outfit templates. */
export async function tryOnOutfit(photo: Uint8Array | { url: string }, contentType: string, templateId: string) {
  const src = photo instanceof Uint8Array ? { src_file_id: await uploadImage(photo, contentType) } : { src_file_url: photo.url };
  const url = await runTask("/s2s/v2.0/task/cloth", { ...src, template_id: templateId });
  return toDataUrl(url);
}

/** AI Makeup VTO on a face crop. */
export async function tryOnMakeup(face: Uint8Array, contentType: string, effects: MakeupEffect[]) {
  const fileId = await uploadImage(face, contentType);
  const url = await runTask("/s2s/v2.0/task/makeup-vto", { src_file_id: fileId, effects, version: "1.0" });
  return toDataUrl(url);
}
