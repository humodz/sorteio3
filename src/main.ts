import 'reflect-metadata';

import * as tsConfigPaths from 'tsconfig-paths';

tsConfigPaths.register({
  baseUrl: './',
  paths: { '@/*': ['dist/*'] }
});

import { config } from 'dotenv';
config();

import * as express from 'express';
import * as bodyParser from 'body-parser';

import { asyncHandler, asyncMiddleware, errorHandler } from '@/utils';
import { ConfigService } from '@/services/config.service';
import { MattermostService } from '@/services/mattermost.service';
import { MiddlewareService } from '@/services/middleware.service';
import { RaffleService } from '@/services/raffle.service';
import { RedisService } from '@/services/redis.service';
import { Router } from 'express';

function main() {
  const configService = new ConfigService();
  const redisService = new RedisService(configService);
  const middlewareService = new MiddlewareService(configService);
  const mattermostService = new MattermostService(configService);
  const raffleService = new RaffleService(redisService, configService, mattermostService);

  const app = express();
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());

  app.use((req, res, next) => {
    console.log({
      date: new Date().toISOString(),
      body: req.body,
    });
    next();
  });

  app.post(
    '/raffle',
    Router()
      .use(asyncMiddleware(middlewareService.validateSlashCommandBody()))
      .use(asyncMiddleware(middlewareService.verifyAccessToken()))
      .use('/', asyncHandler(req => raffleService.raffle(req.body)))
  );

  app.use(errorHandler(middlewareService.sendExceptionAsChatMessage()));

  app.listen(configService.port);
  console.log(`Listening on port ${configService.port}`);
}

main();
