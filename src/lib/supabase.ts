import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* Supabase client for saving/sharing playground designs. Optional: if the env
 * vars aren't set, `supabase` is null and the app falls back to URL-encoded
 * sharing (?s=…) so nothing breaks. The publishable key is safe on the client. */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;
export const cloudShareEnabled = supabase !== null;

/** A short, URL-friendly id for a shared design. */
export function shortId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 9);
}
