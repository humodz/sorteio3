/** https://api.mattermost.com */

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
}

export interface Reaction {
  emoji_name: string;
  user_id: string;
}

/** https://developers.mattermost.com/integrate/slash-commands/#basic-usage */
export interface SlashCommandRequest {
  command: string;
  user_name: string;
  text: string;
  token: string;
}

/** https://developers.mattermost.com/integrate/slash-commands/#parameters */
export interface SlashCommandResponse {
  username?: string;
  icon_url?: string;
  text?: string;
  response_type?: 'in_channel' | 'ephemeral';
  extra_responses?: SlashCommandResponse[];
}
