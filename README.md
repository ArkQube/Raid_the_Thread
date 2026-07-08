# ⚔️ Raid the Thread

A daily co-op boss raid built for Reddit's **Games with a Hook** hackathon.

## The Game

Raid the Thread turns a Reddit post into a shared dungeon raid. Every day, the subreddit gets a new boss with a shared HP bar. Each redditor plays a short Phaser arena run, dodging traps, collecting gems, defeating enemies, and sending damage to the community boss.

The hook is simple:

- **One daily boss** for the whole subreddit.
- **Every user's best run contributes damage** to the shared HP bar.
- **Daily leaderboards** reward top damage dealers.
- **Streaks and ranks** give players a reason to return.
- **Shareable raid results** help players compare runs in comments.
- **Tomorrow's dungeon curse voting** lets the community influence the next raid.

## Why it fits Reddit

The game is built around community momentum: users can see the boss HP drop as more redditors join the raid, then vote on tomorrow's modifier. This creates a clear reason to play, share, comment, and come back the next day.

## Tech Stack

- **Platform**: Reddit Devvit Web
- **Frontend**: Phaser 4 + Vite
- **Backend**: Hono server routes
- **Data**: Devvit Redis
- **Runtime**: Node.js 22

## Commands

- `npm run dev`: Starts a Devvit playtest session.
- `npm run build`: Builds the client and server.
- `npm run type-check`: Checks TypeScript types.
- `npm run lint`: Checks ESLint.
- `npm run deploy`: Type-checks, lints, and uploads the app.
- `npm run launch`: Deploys and publishes for review.
