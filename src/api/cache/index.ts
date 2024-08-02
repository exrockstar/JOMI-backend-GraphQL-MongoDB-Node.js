import NodeCache from "node-cache";

const ttl = process.env.MEM_CACHE_TTL
  ? parseInt(process.env.MEM_CACHE_TTL)
  : undefined;

export const ipCache = new NodeCache({
  stdTTL: ttl ?? 60,
});

export const user_access_cache = new NodeCache({
  stdTTL: ttl ?? 600,
});
