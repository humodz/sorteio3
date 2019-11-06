import { ConfigService } from '@/services/config.service';
import { createClient, RedisClient } from 'redis';

export class RedisService {
  private client: RedisClient;
  private warned = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly options = { warnOnce: true },
  ) {
    this.client = createClient({
      host: configService.redis.host,
      port: configService.redis.port,
    });

    this.client.on('error', err => {
      if (!this.warned || !this.options.warnOnce) {
        console.error(err);
        this.warned = true;
      }
    });
  }

  async set(key: string, value: any) {
    await new Promise((ok, fail) => this.client.set(key, JSON.stringify(value), (err, res) => err ? fail(err) : ok(res)));
  }

  async get<T = any>(key: string): Promise<T> {
    const rawValue = await new Promise<string>((ok, fail) => this.client.get(key, (err, res) => err ? fail(err) : ok(res)));

    if (rawValue === undefined || rawValue === null) {
      return null;
    }

    return JSON.parse(rawValue);
  }
}
