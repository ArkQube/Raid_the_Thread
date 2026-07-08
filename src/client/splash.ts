import { requestExpandedMode } from '@devvit/web/client';
import type { InitResponse } from '../shared/api';

// Detect and apply Reddit theme (light/dark)
function applyTheme() {
  const isLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  document.body.classList.toggle('light-theme', isLight);
}
applyTheme();
window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', applyTheme);

const startButton = document.getElementById(
  'start-button'
) as HTMLButtonElement;
const bossEmoji = document.getElementById('boss-emoji') as HTMLDivElement;
const bossName = document.getElementById('boss-name') as HTMLHeadingElement;
const bossTitle = document.getElementById('boss-title') as HTMLParagraphElement;
const progressFill = document.getElementById('progress-fill') as HTMLDivElement;
const progressCopy = document.getElementById(
  'progress-copy'
) as HTMLParagraphElement;
const streakValue = document.getElementById('streak-value') as HTMLSpanElement;
const damageValue = document.getElementById('damage-value') as HTMLSpanElement;
const playersValue = document.getElementById(
  'players-value'
) as HTMLSpanElement;
const description = document.getElementById(
  'description'
) as HTMLParagraphElement;

startButton.addEventListener('click', (e) => {
  requestExpandedMode(e, 'game');
});

async function init() {
  try {
    const response = await fetch('/api/init');
    if (!response.ok) return;

    const data: InitResponse = await response.json();
    const raid = data.raid;

    bossEmoji.textContent = raid.bossEmoji;
    bossName.textContent = raid.bossName;
    bossTitle.textContent = raid.bossTitle;
    progressFill.style.width = `${raid.progressPercent}%`;
    progressCopy.textContent = `${raid.progressPercent}% defeated • ${raid.playerCount} raiders`;
    streakValue.textContent = String(data.streak);
    damageValue.textContent = String(data.userBestDamage);
    playersValue.textContent = String(raid.playerCount);
    description.textContent = `${raid.modifier.emoji} ${raid.modifier.label}: ${raid.modifier.description}`;

    if (data.alreadyPlayed) {
      startButton.innerHTML =
        '<span class="btn-icon">⚔️</span> Improve Your Damage';
    }
  } catch (_err) {
    // Silently fail on splash; expanded view retries.
  }
}

void init();
