import { ConfigService } from '@/services/config.service';
import { MattermostService } from '@/services/mattermost.service';
import { Reaction, SlashCommandRequest, SlashCommandResponse } from '@/interfaces/mattermost';
import { randomItem, shuffleInPlace } from '@/utils';
import * as uuid from 'uuid/v4';
import { RedisService } from '@/services/redis.service';

const frasesSilvio = [
  'Quem quer dinheiro?',
  'É solteiro, casado ou tico-tico no fubá?',
  'Ritmo, é ritmo de festa',
  'Quem vai ganhar?!',
  'Ai ai ai ui ui!',
  'Três aviõezinhos de cinquenta reais para o auditório',
  'Mas quem é que eu vou chamar',
  'Ha-Ha-Hi-Hi, Vem pra cá! Vem pra cá!',
  'Vale dez reais?',
  'Ma-mas você é da caravana de onde-m?',
];

function respond({
  text, response_type = 'ephemeral', extra_responses = [],
}: SlashCommandResponse = {}): SlashCommandResponse {
  const usernameAndIcon = {
    username: 'Bot do Sorteio (3)',
    icon_url: 'https://files.catbox.moe/dpfetu.jpeg',
  };

  return {
    ...usernameAndIcon,
    text,
    response_type,
    extra_responses: extra_responses.map(response => ({
      ...usernameAndIcon,
      ...response,
    })),
  };
}

export class RaffleService {
  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly mattermostService: MattermostService,
  ) {}

  async raffle(body: SlashCommandRequest): Promise<SlashCommandResponse> {
    const args = this.parseArguments(body.text);

    console.log({ args });

    if (args.isHelp) {
      return respond({ text: this.helpMessage(body.command) });
    }

    if (args.invalid) {
      return respond({ text: `Link do post ou id do sorteio não é válido: ${args.invalid}` });
    }

    const { postId, previousWinners } = await this.checkExistingRaffle(args.postOrRaffle);

    if (!postId) {
      return respond({ text: `Id de sorteio inválido: ${args.postOrRaffle.id}` });
    }

    let postReactions = await this.mattermostService.listPostReactions(postId);

    console.log({
      wantedReactions: args.wantedReactions,
      allReactions: postReactions.map(reaction => ({ emoji: reaction.emoji_name, userId: reaction.user_id })),
      previousWinners,
    });

    if (args.wantedReactions.length) {
      postReactions = postReactions.filter(reaction => args.wantedReactions.includes(reaction.emoji_name));
    }

    const userIds = this.getParticipants(postReactions, previousWinners);

    console.log({
      participants: userIds,
      filteredReactions: postReactions.map(reaction => ({ emoji: reaction.emoji_name, userId: reaction.user_id })),
    });

    if (!userIds.length) {
      return respond({ text: 'Nenhum usuário reagiu.' });
    } else if (Number.isNaN(args.numberOfWinners) || args.numberOfWinners < 0) {
      return respond({ text: `Número de vencedores inválido: ${args.numberOfWinners}` });
    } else if (userIds.length <= args.numberOfWinners) {
      return respond({
        text: `Número de vencedores (${args.numberOfWinners}) deve ser maior que o número de pessoas sorteadas (${userIds.length}).`
      });
    }

    const winnerIds = shuffleInPlace(userIds).slice(0, args.numberOfWinners);
    const winnerUsers = await this.mattermostService.findManyUsersById(winnerIds);

    const lines = [
      `\`${body.command} ${body.text}\``,
      `sorteado por: @${body.user_name}`,
      `# ${randomItem(frasesSilvio)}`,
      `#### Sorteio: ${args.prize}`,
    ];

    if (winnerUsers.length === 1) {
      lines.push(`## Vencedor: @${winnerUsers[0].username}`);
    } else {
      const winnerDisplayNames = winnerUsers.map((user, i) => `${i + 1}. @${user.username}`);
      lines.push('## Vencedores');
      lines.push(...winnerDisplayNames);
    }

    const winnerPictures = winnerUsers.map(user =>
      `![${user.username}](${this.mattermostService.getUserProfilePictureUrl(user.id)} "${user.username}")`,
    );

    lines.push(winnerPictures.join(''));

    previousWinners.push(...winnerIds);
    const continueRaffleId = await this.saveRaffle(postId, previousWinners);
    const reactionsString = !args.wantedReactions.length ? 'any' : args.wantedReactions.map(r => `:${r}:`).join(',');

    const previousWinnersUsers = await this.mattermostService.findManyUsersById(previousWinners);

    return respond({
      text: lines.join('\n'),
      response_type: args.isPublic ? 'in_channel' : 'ephemeral',
      extra_responses: [{
        response_type: 'ephemeral',
        text: [
          '**Esta é uma mensagem temporária que desaparecerá automaticamente**',
          'Para continuar o sorteio com as mesmas opções, use o seguinte comando:',
          '```',
          `${body.command} ${continueRaffleId} ${args.prize} ${args.numberOfWinners} ${reactionsString} ${args.isPublic ? 'public' : ''}`,
          '```',
          'Pessoas que já ganharam não serão sorteadas novamente.',
          'Ganhadores até agora (pessoas que não participarão mais):',
          ...previousWinnersUsers.map((winner, i) => `${i + 1}. @${winner.username}`),
        ].join('\n'),
      }]
    });
  }

  getParticipants(reactions: Reaction[], previousWinners: string[]) {
    const participants = new Set(reactions.map(reaction => reaction.user_id));

    for (const winner of previousWinners) {
      participants.delete(winner);
    }

    return Array.from(participants);
  }

  async checkExistingRaffle(postOrRaffle: { type: 'post' | 'raffle', id: string }) {
    if (postOrRaffle.type === 'post') {
      return {
        postId: postOrRaffle.id,
        previousWinners: [] as string[],
      };
    } else {
      const existing = await this.redisService.get(postOrRaffle.id);
      return existing || { postId: null, previousWinners: [] as string[] };
    }
  }

  async saveRaffle(postId: string, previousWinners: string[]) {
    const raffleId = `@continue:${uuid()}`;
    await this.redisService.set(raffleId, {
      creationDate: new Date(),
      postId,
      previousWinners
    });
    return raffleId;
  }

  parseArguments(bodyText: string) {
    const args = bodyText.split(' ').filter(s => s);
    const [permalinkOrId, prize, numberOfWinnersString, reactionsString, isPublicString] = args;

    if (!permalinkOrId || permalinkOrId.toLowerCase() === 'help') {
      return { isHelp: true };
    }

    let postOrRaffle: { type: 'post' | 'raffle', id: string };

    if (permalinkOrId.startsWith('@continue:')) {
      postOrRaffle = {
        type: 'raffle',
        id: permalinkOrId,
      };
    } else {
      // Exemplo de permalink: https://im.dominio.com.br/time/pl/00001111222233334444555566
      postOrRaffle = {
        type: 'post',
        id: permalinkOrId.split('/pl/')[1],
      };
    }

    if (!postOrRaffle) {
      return { invalid: permalinkOrId };
    }

    const numberOfWinners = Math.max(1, parseInt(numberOfWinnersString || '0', 10));

    let wantedReactions: string[] = [];

    if (reactionsString && reactionsString.toLowerCase() !== 'any') {
      // Exemplos de valores de reactionsString: undefined, ":thumbsup:", ":+1:,:thumbsup:", "thumbsup"
      wantedReactions = reactionsString
        .replace(/:/g, '')
        .split(',')
        .filter(s => s);
    }

    const isPublic = Boolean(isPublicString) && isPublicString.toLowerCase() === 'public';

    return { isHelp: false, postOrRaffle, prize, numberOfWinners, wantedReactions, isPublic };
  }

  helpMessage(command: string) {
    const { channelUrl } = this.configService.mattermost;

    return [
      `\`${command} permalink item-sorteado número-vencedores reações é-publico?\``,
      'permalink: permalink do post com as reações de quem vai participar',
      'item-sorteado: qualquer palavra sem espaços',
      'número-vencedores: número de vencedores',
      'reações: pode ser any para pegar todas, ou uma lista separado com vírgulas. Por exemplo: `:thumbsup:,:+1:,:heart:`',
      'é-publico?: Se for passado public, todo mundo vê o sorteio, senão apenas você vê. ',
      'Exemplos:',
      `\`${command} ${channelUrl}/pl/abcdefghijklmnopqrstuvwxyz Bolo 1 :heart:\``,
      `\`${command} ${channelUrl}/pl/abcdefghijklmnopqrstuvwxyz Marmita 3 :heart:,:thumbsup: public\``,
      `\`${command} ${channelUrl}/pl/abcdefghijklmnopqrstuvwxyz Pamonha 10 any public\``,
    ].join('\n');
  }
}
