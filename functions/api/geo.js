export async function onRequestGet({ request }) {
  const location = normalizeEdgeLocation(request.cf);

  return new Response(JSON.stringify(location), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function normalizeEdgeLocation(cf = {}) {
  const latitude = Number(cf.latitude);
  const longitude = Number(cf.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return {};
  }

  return {
    latitude,
    longitude,
    city: cf.city || "",
    region: cf.region || "",
    country: cf.country || "",
    timezone: cf.timezone || "",
  };
}
