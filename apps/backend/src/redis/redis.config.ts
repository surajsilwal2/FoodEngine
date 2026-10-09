const DEFAULT_PORT = 6379;

/**
 * The Redis settings this backend actually uses.
 *
 * Declared explicitly, rather than as ioredis's own `RedisOptions`, because the
 * same object is handed to two different clients - ioredis and BullMQ - and each
 * ships its own option type. A structural type satisfies both, so neither needs
 * a cast at the call site.
 */
export interface RedisConnectionSettings {
  host: string;
  port: number;
  username?: string;
  password?: string;
  tls?: { servername: string };
  /** BullMQ refuses to start a worker unless retries are unlimited. */
  maxRetriesPerRequest: null;
  /** Hosted Redis serves traffic before INFO reports readiness. */
  enableReadyCheck: boolean;
  connectTimeout: number;
}

/**
 * Connection settings shared by the application's Redis client and by BullMQ, so
 * the two can never drift onto different servers.
 *
 * REDIS_URL is the preferred form because hosted providers hand out URLs that
 * already carry the scheme, credentials and port. A bare host cannot express
 * TLS or authentication, and a value like "https://host" is not a hostname at
 * all - ioredis would try to resolve it and fail with getaddrinfo ENOTFOUND.
 */
export function getRedisOptions(): RedisConnectionSettings {
  const base = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    connectTimeout: 10_000,
  } as const;

  const url = process.env.REDIS_URL?.trim();
  if (url) {
    const parsed = new URL(url);
    const isTls = parsed.protocol === 'rediss:';

    return {
      ...base,
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : DEFAULT_PORT,
      username: parsed.username
        ? decodeURIComponent(parsed.username)
        : undefined,
      password: parsed.password
        ? decodeURIComponent(parsed.password)
        : undefined,
      // rediss:// means "the same server, wrapped in TLS". Without the
      // servername the handshake has no SNI host to present.
      ...(isTls ? { tls: { servername: parsed.hostname } } : {}),
    };
  }

  // Local docker-compose Redis, which needs no TLS and no password.
  return {
    ...base,
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT || DEFAULT_PORT),
    password: process.env.REDIS_PASSWORD || undefined,
  };
}
