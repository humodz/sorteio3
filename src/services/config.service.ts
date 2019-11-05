interface EnvOptions<T = any> {
  type?: (v: any) => T;
  defaultsTo?: T;
  required?: boolean;
}

function env<T = string>(
  key: string,
  { type, defaultsTo, required = true }: EnvOptions<T> = {}
): T {
  const value = process.env[key];

  if (value === undefined || value === '') {
    if (defaultsTo !== undefined) {
      return defaultsTo;
    } else if (required) {
      throw new Error(`Required environment variable missing: ${key}`);
    }
  }

  if (type) {
    return type(value);
  } else {
    return value as any;
  }
}

function CommaSeparatedArray(arrayText: string) {
  return arrayText.split(',');
}

export class ConfigService {
  private mattermostBaseUrl = env('MATTERMOST_BASE_URL');

  port = env<number>('PORT', { type: Number, defaultsTo: 8080 });

  mattermost = {
    apiToken: env('MATTERMOST_API_TOKEN'),
    apiBaseUrl: `${this.mattermostBaseUrl}/api/v4`,
    emojiBaseUrl: `${this.mattermostBaseUrl}/static/emoji`,
    channelUrl: env('MATTERMOST_CHANNEL_URL'),
  };

  allowedAccessTokens = env<string[]>('ACCESS_TOKENS', { type: CommaSeparatedArray });

  redis = {
    host: env('REDIS_HOST', { defaultsTo: 'localhost' }),
    port: env('REDIS_PORT', { type: Number, defaultsTo: 6379 }),
  };
}
