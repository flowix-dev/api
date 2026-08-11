import Redis from "ioredis";

const REDIS_URI = process.env.REDIS_URI || "redis://localhost:6379";

let client: Redis | null = null;

export function getRedis(): Redis {
  if (!client) {
    client = new Redis(REDIS_URI, {
      retryStrategy(times) {
        const delay = Math.min(times * 100, 3000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    client.on("connect", () => {
      console.log("Connected to Redis");
    });

    client.on("error", (err) => {
      console.error("Redis error:", err.message);
    });

    client.on("close", () => {
      console.log("Redis connection closed");
    });
  }

  return client;
}

export async function connectRedis(): Promise<void> {
  const redis = getRedis();
  if (redis.status !== "connecting" && redis.status !== "connect" && redis.status !== "ready") {
    await redis.connect();
  }
}

export async function disconnectRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}

export async function redisHealth(): Promise<{ status: string; latencyMs?: number }> {
  try {
    const redis = getRedis();
    const start = Date.now();
    await redis.ping();
    const latency = Date.now() - start;
    return { status: "ok", latencyMs: latency };
  } catch {
    return { status: "error" };
  }
}
