import { ConfigService } from '@/services/config.service';
import { ErrorRequestHandler, Handler } from 'express';
import { prettyFormatErrors, randomItem } from '@/utils';
import { HttpException } from '@/errors';
import { SlashCommandRequestDto } from '@/dto/slash-command.dto';

export class MiddlewareService {
  constructor(
    private readonly configService: ConfigService
  ) {}

  validateSlashCommandBody(): Handler {
    return (req) => {
      const { instance, errors } = SlashCommandRequestDto.validate(req.body);

      if (errors.length) {
        const result = {
          status: 400,
          message: 'Bad Request',
          response: prettyFormatErrors(errors),
        };

        throw new HttpException(result);
      }

      req.body = instance;
    };
  }

  verifyAccessToken(): Handler {
    const { allowedAccessTokens } = this.configService;

    return (req) => {
      const token = req.body.token as string;

      if (!token || !allowedAccessTokens.includes(token)) {
        throw new HttpException({ status: 401, message: 'Unauthorized' });
      }
    };
  }

  sendExceptionAsChatMessage(): ErrorRequestHandler {
    const { emojiBaseUrl } = this.configService.mattermost;
    const iconIds = ['2049-fe0f', '1f525', '1f4a5', '1f4a3', '2620-fe0f', '1f4a9', '1f494', '1f198'];
    const iconUrls = iconIds.map(id => `${emojiBaseUrl}/${id}.png`);

    return (err, req, res) => {
      if (HttpException.isHttp(err)) {
        res.status(err.getStatus()).json(err.getResponse());
        return;
      }

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
