import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import { showToast } from '@devvit/web/client';
import type {
  CompleteRaidResponse,
  DailyRaid,
  LeaderboardResponse,
  ModifierOption,
  RaidModifier,
  RareGem,
  VoteResponse,
} from '../../shared/api';

type ResultsData = {
  result: CompleteRaidResponse;
  raid?: DailyRaid;
  local: {
    survivedSeconds: number;
    gems: number;
    enemiesDefeated: number;
  };
};

type ResultsLayout = {
  centerX: number;
  width: number;
  height: number;
  panelWidth: number;
  top: number;
  titleSize: string;
  scoreSize: string;
  bodySize: string;
  smallSize: string;
  sectionGap: number;
  progressHeight: number;
  statHeight: number;
  leaderboardHeight: number;
  voteHeight: number;
};

const RESULTS_DEPTH = {
  background: 0,
  content: 5,
  leaderboard: 8,
  votePanel: 9,
  buttons: 10,
};

const FALLBACK_OPTIONS: ModifierOption[] = [
  {
    id: 'lava',
    label: 'Lava Rush',
    emoji: '🔥',
    description: '',
    votes: 0,
  },
  {
    id: 'ghosts',
    label: 'Ghost Swarm',
    emoji: '👻',
    description: '',
    votes: 0,
  },
  {
    id: 'darkness',
    label: 'Darkness',
    emoji: '🌑',
    description: '',
    votes: 0,
  },
  {
    id: 'treasure',
    label: 'Treasure Fever',
    emoji: '💎',
    description: '',
    votes: 0,
  },
];

export class Results extends Scene {
  private resultInfo: ResultsData | null = null;
  private voteButtons: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('Results');
  }

  init(passedData: ResultsData): void {
    this.resultInfo = passedData;
    this.voteButtons = [];
  }

  create(): void {
    if (!this.resultInfo) {
      this.scene.start('MainMenu');
      return;
    }

    this.cameras.main.setBackgroundColor(0x071027);
    this.renderResults();
    this.scale.once('resize', () => {
      this.scene.restart(this.resultInfo ?? undefined);
    });
  }

  private renderResults(): void {
    const data = this.resultInfo;
    if (!data) return;

    const layout = this.getLayout();
    const result = data.result;
    const raid = data.raid;

    this.createBackground(layout);
    this.createVictoryParticles(layout);

    let y = layout.top;
    this.add
      .text(
        layout.centerX,
        y,
        result.defeated ? '🏆 BOSS DEFEATED' : '⚔️ DAMAGE SENT',
        {
          fontFamily: 'Cinzel, serif',
          fontSize: layout.titleSize,
          color: '#ffd166',
          stroke: '#071027',
          strokeThickness: 3,
          align: 'center',
        }
      )
      .setOrigin(0.5, 0)
      .setDepth(RESULTS_DEPTH.content);

    y += layout.height < 600 ? 30 : 36;
    this.add
      .text(
        layout.centerX,
        y,
        raid ? `${raid.bossEmoji} ${raid.bossName}` : 'Daily Raid Boss',
        {
          fontFamily: 'Inter, sans-serif',
          fontSize: layout.bodySize,
          color: '#d7e3ff',
          align: 'center',
        }
      )
      .setOrigin(0.5, 0)
      .setDepth(RESULTS_DEPTH.content);

    y += layout.height < 600 ? 29 : 35;
    this.add
      .text(layout.centerX, y, String(result.damage), {
        fontFamily: 'Cinzel, serif',
        fontSize: layout.scoreSize,
        color: '#ffffff',
        stroke: '#22335f',
        strokeThickness: 2,
        align: 'center',
      })
      .setOrigin(0.5, 0)
      .setDepth(RESULTS_DEPTH.content);

    y += layout.height < 600 ? 60 : 74;
    this.add
      .text(
        layout.centerX,
        y,
        result.contributedDamage > 0
          ? 'ADDED TO COMMUNITY BOSS HP'
          : 'BEST DAMAGE ALREADY SAVED',
        {
          fontFamily: 'Inter, sans-serif',
          fontSize: layout.smallSize,
          color: result.contributedDamage > 0 ? '#72efdd' : '#aebce0',
          align: 'center',
        }
      )
      .setOrigin(0.5, 0)
      .setDepth(RESULTS_DEPTH.content);

    y += layout.sectionGap + 12;
    this.drawCommunityProgress(layout, y, result);

    y += layout.progressHeight + layout.sectionGap;
    this.drawStats(layout, y, result);

    y += layout.statHeight + layout.sectionGap;

    // Show rare gem find if applicable
    if (result.foundGem) {
      this.drawRareGemFind(layout, y, result.foundGem);
      y += (layout.height < 650 ? 52 : 64) + layout.sectionGap;
    }

    void this.loadLeaderboard(layout, y);

    y += layout.leaderboardHeight + layout.sectionGap;
    this.buildVotePanel(layout, y, raid?.modifierOptions ?? []);

    const buttonsY = y + layout.voteHeight + layout.sectionGap + 4;
    this.buildButtons(layout, buttonsY);
  }

  private getLayout(): ResultsLayout {
    const { width, height } = this.scale;
    const compact = height < 650;
    return {
      centerX: width / 2,
      width,
      height,
      panelWidth: Math.min(width - 28, compact ? 410 : 440),
      top: compact ? 18 : 24,
      titleSize: compact ? '20px' : '25px',
      scoreSize: compact ? '48px' : '66px',
      bodySize: compact ? '13px' : '14px',
      smallSize: compact ? '10px' : '12px',
      sectionGap: compact ? 8 : 14,
      progressHeight: compact ? 54 : 66,
      statHeight: compact ? 58 : 72,
      leaderboardHeight: compact ? 70 : 92,
      voteHeight: compact ? 78 : 92,
    };
  }

  private createBackground(layout: ResultsLayout): void {
    this.add
      .rectangle(
        layout.centerX,
        layout.height / 2,
        layout.width,
        layout.height,
        0x071027
      )
      .setDepth(RESULTS_DEPTH.background);
    this.add
      .circle(
        layout.centerX,
        layout.height * 0.18,
        Math.min(layout.width, layout.height) * 0.52,
        0x13214b,
        0.28
      )
      .setDepth(RESULTS_DEPTH.background);
    this.add
      .circle(
        layout.width * 0.12,
        layout.height * 0.88,
        Math.min(130, layout.width * 0.32),
        0xe85d04,
        0.07
      )
      .setDepth(RESULTS_DEPTH.background);
    this.add
      .circle(
        layout.width * 0.92,
        layout.height * 0.18,
        Math.min(120, layout.width * 0.3),
        0x72efdd,
        0.06
      )
      .setDepth(RESULTS_DEPTH.background);
  }

  private drawCommunityProgress(
    layout: ResultsLayout,
    y: number,
    result: CompleteRaidResponse
  ): void {
    const barWidth = layout.panelWidth - 38;
    const panelCenterY = y + layout.progressHeight / 2;

    this.add
      .rectangle(
        layout.centerX,
        panelCenterY,
        layout.panelWidth,
        layout.progressHeight,
        0x0d1734,
        0.94
      )
      .setStrokeStyle(1, 0x263b72, 1)
      .setDepth(RESULTS_DEPTH.content);
    this.add
      .rectangle(layout.centerX, y + 22, barWidth, 18, 0x1b2145, 1)
      .setStrokeStyle(2, 0x415489, 1)
      .setDepth(RESULTS_DEPTH.content);
    this.add
      .rectangle(
        layout.centerX - barWidth / 2,
        y + 22,
        Math.max(10, barWidth * (result.progressPercent / 100)),
        14,
        0xff6b35,
        1
      )
      .setOrigin(0, 0.5)
      .setDepth(RESULTS_DEPTH.content);

    this.add
      .text(
        layout.centerX,
        y + 36,
        `${result.progressPercent}% defeated • ${result.playerCount} raider${result.playerCount === 1 ? '' : 's'}`,
        {
          fontFamily: 'Inter, sans-serif',
          fontSize: layout.bodySize,
          color: '#ffffff',
          align: 'center',
        }
      )
      .setOrigin(0.5, 0)
      .setDepth(RESULTS_DEPTH.content);
  }

  private drawStats(
    layout: ResultsLayout,
    y: number,
    result: CompleteRaidResponse
  ): void {
    const cardWidth = (layout.panelWidth - 18) / 3;
    const stats = [
      {
        icon: '💎',
        label: 'Gems',
        value: String(this.resultInfo?.local.gems ?? 0),
      },
      {
        icon: '⏱',
        label: 'Survived',
        value: `${this.resultInfo?.local.survivedSeconds ?? 0}s`,
      },
      { icon: '🔥', label: 'Streak', value: `${result.streak}` },
    ];

    stats.forEach((stat, index) => {
      const x =
        layout.centerX -
        layout.panelWidth / 2 +
        cardWidth / 2 +
        index * (cardWidth + 9);
      this.add
        .rectangle(
          x,
          y + layout.statHeight / 2,
          cardWidth,
          layout.statHeight,
          0x0d1734,
          0.95
        )
        .setStrokeStyle(1, 0x263b72, 1)
        .setDepth(RESULTS_DEPTH.content);
      this.add
        .text(x, y + 7, stat.icon, {
          fontSize: layout.height < 650 ? '18px' : '22px',
        })
        .setOrigin(0.5, 0)
        .setDepth(RESULTS_DEPTH.content);
      this.add
        .text(x, y + (layout.height < 650 ? 29 : 34), stat.value, {
          fontFamily: 'Cinzel, serif',
          fontSize: layout.height < 650 ? '15px' : '18px',
          color: '#ffd166',
          align: 'center',
        })
        .setOrigin(0.5, 0)
        .setDepth(RESULTS_DEPTH.content);
      this.add
        .text(x, y + (layout.height < 650 ? 47 : 56), stat.label, {
          fontFamily: 'Inter, sans-serif',
          fontSize: layout.height < 650 ? '9px' : '11px',
          color: '#aebce0',
          align: 'center',
        })
        .setOrigin(0.5, 0)
        .setDepth(RESULTS_DEPTH.content);
    });
  }

  private drawRareGemFind(
    layout: ResultsLayout,
    y: number,
    gem: RareGem
  ): void {
    const compact = layout.height < 650;
    const bannerH = compact ? 52 : 64;
    const tierColors: Record<string, number> = {
      common: 0x9b59b6,
      rare: 0x3498db,
      epic: 0xf39c12,
      legendary: 0xe74c3c,
    };
    const borderColor = tierColors[gem.tier] ?? 0xffd166;

    // Glowing banner background
    this.add
      .rectangle(
        layout.centerX,
        y + bannerH / 2,
        layout.panelWidth,
        bannerH,
        0x1a0e2e,
        0.95
      )
      .setStrokeStyle(2, borderColor, 1)
      .setDepth(RESULTS_DEPTH.content);

    // Pulsing glow behind banner
    const glow = this.add
      .rectangle(
        layout.centerX,
        y + bannerH / 2,
        layout.panelWidth - 4,
        bannerH - 4,
        borderColor,
        0.08
      )
      .setDepth(RESULTS_DEPTH.content);
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.05, to: 0.18 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Header
    this.add
      .text(layout.centerX, y + (compact ? 8 : 10), '🏆 RARE RUNE FOUND!', {
        fontFamily: 'Cinzel, serif',
        fontSize: compact ? '12px' : '14px',
        color: '#ffd166',
        align: 'center',
      })
      .setOrigin(0.5, 0)
      .setDepth(RESULTS_DEPTH.content);

    // Gem info
    const tierLabel = gem.tier.charAt(0).toUpperCase() + gem.tier.slice(1);
    this.add
      .text(
        layout.centerX,
        y + (compact ? 26 : 32),
        `${gem.emoji} ${gem.name} (${tierLabel})`,
        {
          fontFamily: 'Inter, sans-serif',
          fontSize: compact ? '11px' : '13px',
          color: '#ffffff',
          align: 'center',
        }
      )
      .setOrigin(0.5, 0)
      .setDepth(RESULTS_DEPTH.content);
  }

  private buildButtons(
    layout: ResultsLayout,
    y: number
  ): void {
    const container = this.add.container(0, 0).setDepth(RESULTS_DEPTH.buttons);
    const buttonGap = Math.min(16, layout.panelWidth * 0.04);
    const buttonWidth = Math.min(156, (layout.panelWidth - buttonGap) / 2);
    const buttonOffset = buttonWidth / 2 + buttonGap / 2;

    const shareButton = this.add
      .text(layout.centerX - buttonOffset, y, 'CALL TO ARMS', {
        fontFamily: 'Inter, sans-serif',
        fontSize: layout.height < 650 ? '11px' : '12px',
        color: '#ffffff',
        backgroundColor: '#1b2145',
        fixedWidth: buttonWidth,
        align: 'center',
        padding: { x: 10, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', async () => {
        shareButton.setText('CALLING...');
        try {
          const res = await fetch('/api/call-to-arms', { method: 'POST' });
          if (res.ok) {
            showToast('Comment posted! Thanks for recruiting!');
            shareButton.setText('CALLED!');
            shareButton.setStyle({ backgroundColor: '#4a5368' });
            shareButton.disableInteractive();
          } else {
            showToast('Failed to post comment.');
            shareButton.setText('CALL TO ARMS');
          }
        } catch (e) {
          showToast('Network error.');
          shareButton.setText('CALL TO ARMS');
        }
      })
      .on('pointerover', function (this: Phaser.GameObjects.Text) {
        this.setStyle({ backgroundColor: '#30406f' });
      })
      .on('pointerout', function (this: Phaser.GameObjects.Text) {
        this.setStyle({ backgroundColor: '#1b2145' });
      });

    const raidAgainButton = this.add
      .text(layout.centerX + buttonOffset, y, '↻ RAID AGAIN', {
        fontFamily: 'Inter, sans-serif',
        fontSize: layout.height < 650 ? '12px' : '14px',
        color: '#ffffff',
        backgroundColor: '#e85d04',
        fixedWidth: buttonWidth,
        align: 'center',
        padding: { x: 10, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('RuneGame'));

    const backLink = this.add
      .text(layout.centerX, y + 38, 'Back to raid post', {
        fontFamily: 'Inter, sans-serif',
        fontSize: layout.height < 650 ? '11px' : '13px',
        color: '#aebce0',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('MainMenu'));

    container.add([shareButton, raidAgainButton, backLink]);
  }

  private buildVotePanel(
    layout: ResultsLayout,
    y: number,
    options: ModifierOption[]
  ): void {
    const container = this.add
      .container(0, 0)
      .setDepth(RESULTS_DEPTH.votePanel);

    const panelBg = this.add
      .rectangle(
        layout.centerX,
        y + layout.voteHeight / 2,
        layout.panelWidth,
        layout.voteHeight,
        0x0d1734,
        0.94
      )
      .setStrokeStyle(1, 0x263b72, 1);

    const heading = this.add
      .text(layout.centerX, y + 10, "VOTE TOMORROW'S CURSE", {
        fontFamily: 'Cinzel, serif',
        fontSize: layout.height < 650 ? '11px' : '13px',
        color: '#ffd166',
        align: 'center',
      })
      .setOrigin(0.5, 0);

    container.add([panelBg, heading]);

    const visibleOptions = (options.length > 0 ? options : FALLBACK_OPTIONS)
      .slice(0, 4);
    const gap = 8;
    const buttonWidth = Math.min(
      78,
      (layout.panelWidth - 34 - gap * (visibleOptions.length - 1)) /
        visibleOptions.length
    );
    const startX =
      layout.centerX -
      (buttonWidth * visibleOptions.length +
        gap * (visibleOptions.length - 1)) /
        2 +
      buttonWidth / 2;

    visibleOptions.forEach((option, index) => {
      const x = startX + index * (buttonWidth + gap);
      const button = this.add
        .text(x, y + (layout.height < 650 ? 47 : 53), `${option.emoji} ${option.votes}`, {
          fontFamily: 'Inter, sans-serif',
          fontSize: layout.height < 650 ? '11px' : '13px',
          color: '#ffffff',
          backgroundColor: '#1b2145',
          fixedWidth: buttonWidth,
          align: 'center',
          padding: { x: 8, y: layout.height < 650 ? 7 : 9 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          void this.submitVote(option.id);
        });
      container.add(button);
      this.voteButtons.push(button);
    });
  }

  private async submitVote(modifier: RaidModifier): Promise<void> {
    try {
      const response = await fetch('/api/raid/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modifier }),
      });
      if (!response.ok) {
        showToast('Vote failed. Try again.');
        return;
      }
      const data: VoteResponse = await response.json();
      data.options
        .slice(0, this.voteButtons.length)
        .forEach((option, index) => {
          this.voteButtons[index]?.setText(`${option.emoji} ${option.votes}`);
        });
      showToast('Vote counted for tomorrow!');
    } catch (_err) {
      showToast('Vote failed. Try again.');
    }
  }

  private async loadLeaderboard(
    layout: ResultsLayout,
    y: number
  ): Promise<void> {
    const container = this.add
      .container(0, 0)
      .setDepth(RESULTS_DEPTH.leaderboard);

    const panelBg = this.add
      .rectangle(
        layout.centerX,
        y + layout.leaderboardHeight / 2,
        layout.panelWidth,
        layout.leaderboardHeight,
        0x0d1734,
        0.94
      )
      .setStrokeStyle(1, 0x263b72, 1);
    const heading = this.add
      .text(layout.centerX, y + 8, "🏆 TODAY'S TOP DAMAGE", {
        fontFamily: 'Cinzel, serif',
        fontSize: layout.height < 650 ? '11px' : '13px',
        color: '#ffd166',
        align: 'center',
      })
      .setOrigin(0.5, 0);
    container.add([panelBg, heading]);

    try {
      const response = await fetch('/api/leaderboard?type=daily');
      if (!response.ok) return;
      const leaderboardData: LeaderboardResponse = await response.json();
      const entries = leaderboardData.entries.slice(0, 3);

      if (entries.length === 0) {
        const emptyText = this.add
          .text(layout.centerX, y + 36, 'Be the first raider on the board.', {
            fontFamily: 'Inter, sans-serif',
            fontSize: layout.height < 650 ? '11px' : '13px',
            color: '#aebce0',
            align: 'center',
          })
          .setOrigin(0.5, 0);
        container.add(emptyText);
        return;
      }

      entries.forEach((entry, index) => {
        const medals = ['🥇', '🥈', '🥉'];
        const prefix = medals[index] ?? `${index + 1}.`;
        const entryText = this.add
          .text(
            layout.centerX,
            y + 31 + index * (layout.height < 650 ? 15 : 18),
            `${prefix} ${entry.username} - ${entry.score}`,
            {
              fontFamily: 'Inter, sans-serif',
              fontSize: layout.height < 650 ? '11px' : '13px',
              color: index === 0 ? '#ffd166' : '#e0e6ed',
              align: 'center',
              wordWrap: { width: layout.panelWidth - 30 },
            }
          )
          .setOrigin(0.5, 0);
        container.add(entryText);
      });
    } catch (_err) {
      // Optional UI.
    }
  }

  private createVictoryParticles(layout: ResultsLayout): void {
    const colors = [0xffd166, 0xff6b35, 0x72efdd, 0x7c3aed, 0xffffff];

    for (let i = 0; i < 28; i++) {
      const particle = this.add
        .circle(
          layout.centerX + (Math.random() - 0.5) * 220,
          layout.height * 0.16,
          Math.random() * 3 + 1,
          colors[Math.floor(Math.random() * colors.length)] ?? 0xffd166,
          0.8
        )
        .setDepth(RESULTS_DEPTH.background + 1);
      this.tweens.add({
        targets: particle,
        x: particle.x + (Math.random() - 0.5) * 320,
        y: particle.y + Math.random() * layout.height * 0.42,
        alpha: 0,
        scaleX: 0,
        scaleY: 0,
        duration: 1500 + Math.random() * 1400,
        delay: Math.random() * 450,
        ease: 'Power2',
      });
    }
  }
}
