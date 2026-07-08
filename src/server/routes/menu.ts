import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context, redis } from '@devvit/web/server';
import { createPost } from '../core/post';

export const menu = new Hono();

menu.post('/post-create', async (c) => {
  try {
    const post = await createPost();

    return c.json<UiResponse>(
      {
        navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<UiResponse>(
      {
        showToast: 'Failed to create Raid the Thread post',
      },
      400
    );
  }
});

menu.post('/reset-raid', async (c) => {
  try {
    const dateStr = new Date().toISOString().slice(0, 10);
    // Clear today's raid data
    await redis.del(`raid:${dateStr}:damage`);
    await redis.del(`raid:${dateStr}:players`);
    await redis.del(`raid:${dateStr}:modifier`);
    await redis.del(`leaderboard:daily:${dateStr}`);

    // Clear current user's data for today
    const userId = context.userId;
    if (userId) {
      await redis.del(`user:${userId}:raid:${dateStr}:bestDamage`);
      await redis.del(`user:${userId}:raid:${dateStr}:vote`);
    }

    return c.json<UiResponse>(
      {
        showToast: `Daily raid data for ${dateStr} has been reset!`,
      },
      200
    );
  } catch (error) {
    console.error(`Error resetting raid: ${error}`);
    return c.json<UiResponse>(
      {
        showToast: 'Failed to reset raid data',
      },
      400
    );
  }
});
