import { handleSongUrl, sendJson } from "./_shared.js";

export async function onRequestGet({ request }) {
  try {
    return await handleSongUrl(new URL(request.url));
  } catch (error) {
    console.error(error);
    return sendJson({ error: "Internal server error" }, 500);
  }
}
