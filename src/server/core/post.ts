import { reddit } from '@devvit/web/server';

export const createPost = async () => {
  return await reddit.submitCustomPost({
    title: '⚔️ Raid the Thread — Daily Subreddit Boss',
  });
};
