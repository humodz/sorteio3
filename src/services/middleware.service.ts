import { ConfigService } from '@/services/config.service';
import { ErrorRequestHandler, Handler } from 'express';
import { randomItem } from '@/utils';

export class MiddlewareService {
  constructor(
    private readonly configService: ConfigService
  ) {
  }

  validateSlashCommandBody() {
    return 'TODO';
  }

  verifyAccessToken(): Handler {
    const { allowedAccessTokens } = this.configService;

    return (req, res, next) => {
      const token = req.body.token as string;

      if (!token || !allowedAccessTokens.includes(token)) {
        res.status(401).send('Unauthorized');
      } else {
        next();
      }
    };
  }

  sendExceptionAsChatMessage(): ErrorRequestHandler {
    const { emojiBaseUrl } = this.configService.mattermost;

    return (err, req, res) => {
      const iconIds = ['2049-fe0f', '1f525', '1f4a5', '1f4a3', '2620-fe0f', '1f4a9', '1f494', '1f198'];
      const iconUrls = iconIds.map(id => `${emojiBaseUrl}/${id}.png`);

      const command = req && req.body && req.body.command;
      const message = err && err.message;
      const stackTrace = err && err.stack;

      console.error(err);

      res.json({
        username: `Exception caught on ${command}`,
        icon_url: randomItem(iconUrls),
        text: '```js\n' + message + '\n' + stackTrace + '\n```',
        response_type: 'ephemeral',
      });
    };
  }
}
