/** https://api.mattermost.com */

import axios from 'axios';
import { AxiosInstance } from 'axios';
import { ConfigService } from '@/services/config.service';
import { User, Reaction } from '@/interfaces/mattermost';

export class MattermostService {
  axios: AxiosInstance;
  baseUrl = this.configService.mattermost.apiBaseUrl;

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.axios = axios.create({
      baseURL: this.baseUrl,
      headers: { Authorization: `Bearer ${configService.mattermost.apiToken}`},
    });
  }

  findUserByUsername(username: string): Promise<User> {
    return this.axios.get(`/users/username/${username}`).then(res => res.data);
  }

  findUserById(userId: string): Promise<User> {
    return this.axios.get(`/users/${userId}`).then(res => res.data);
  }

  async findManyUsersById(userIds: string[]): Promise<User[]> {
    if (!userIds || !userIds.length) {
      return [];
    }

    return this.axios.post(`/users/ids`, userIds).then(res => res.data);
  }

  listPostReactions(postId: string): Promise<Reaction[]> {
    return this.axios.get(`/posts/${postId}/reactions`).then(res => res.data);
  }

  getUserProfilePictureUrl(userId: string): string {
    return `${this.baseUrl}/users/${userId}/image`;
  }

  getUserDisplayName(user: User): string {
    if (user.first_name && user.last_name) {
      // Tem os dois: first e last
      return user.first_name + ' ' + user.last_name;
    }

    const name = user.first_name || user.last_name;

    if (name) {
      // Tem um, mas não o outro (tanto faz qual)
      return name;
    } else {
      // Não tem nem first, nem last
      return user.username;
    }
  }
}
