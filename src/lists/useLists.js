// The dropdown lists the platform admin manages, loaded once after login (GET /api/lists/) and kept in memory.
import { useEffect, useState } from "react";
import { api } from "../api/client";

let cache = null;
let inflight = null;
const subscribers = new Set();

export function clearLists() {
  cache = null;
  inflight = null;
  subscribers.forEach((fn) => fn());
}

function load() {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = api.get("/lists/")
      .then((data) => { cache = data || {}; return cache; })
      .catch(() => { cache = {}; return cache; }) // a missing list must never break a screen
      .finally(() => { inflight = null; });
  }
  return inflight;
}

// const lists = useLists();  lists.get("allergies") -> [{ code, label, group, ... }]   lists.label("allergies", "latex") -> "Latex"
export function useLists() {
  const [, tick] = useState(0);
  const [ready, setReady] = useState(Boolean(cache));
  useEffect(() => {
    let live = true;
    const refresh = () => live && tick((n) => n + 1);
    subscribers.add(refresh);
    load().then(() => live && setReady(true));
    return () => { live = false; subscribers.delete(refresh); };
  }, []);
  const get = (key) => (cache && cache[key]) || [];
  const label = (key, code) => get(key).find((v) => v.code === code)?.label || code;
  return { ready, get, label };
}
