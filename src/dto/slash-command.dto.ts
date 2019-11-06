import { SlashCommandRequest } from '@/interfaces/mattermost';
import { IsNotEmpty } from 'class-validator';
import { validate } from '@/utils';

export class SlashCommandRequestDto implements SlashCommandRequest {
  static validate = (body: any) => validate(SlashCommandRequestDto, body);

  @IsNotEmpty()
  command: string;

  @IsNotEmpty()
  // tslint:disable-next-line
  user_name: string;

  @IsNotEmpty()
  text: string;

  @IsNotEmpty()
  token: string;
}

