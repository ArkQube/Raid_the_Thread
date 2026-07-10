import { Scene, GameObjects } from 'phaser';
import type { InitResponse } from '../../shared/api';

export class MainMenu extends Scene {
  private titleText: GameObjects.Text | null = null;
  private subtitleText: GameObjects.Text | null = null;
  private bossText: GameObjects.Text | null = null;
  private progressText: GameObjects.Text | null = null;
  private progressBg: GameObjects.Rectangle | null = null;
  private progressFill: GameObjects.Rectangle | null = null;
  private statsText: GameObjects.Text | null = null;
  private playButton: GameObjects.Text | null = null;
  private vaultButton: GameObjects.Text | null = null;
  private helpButton: GameObjects.Text | null = null;
  private tutorialContainer: GameObjects.Container | null = null;
  private particles: GameObjects.Arc[] = [];
  private bgElements: GameObjects.GameObject[] = [];
  private gameData: InitResponse | null = null;

  constructor() {
    super('MainMenu');
  }

  init(): void {
    this.titleText = null;
    this.subtitleText = null;
    this.bossText = null;
    this.progressText = null;
    this.progressBg = null;
    this.progressFill = null;
    this.statsText = null;
    this.playButton = null;
    this.helpButton = null;
    this.tutorialContainer = null;
    this.particles = [];
    this.bgElements = [];
    this.gameData = null;
  }

  create() {
    this.cameras.main.setBackgroundColor(0x0a0e1a);
    void this.loadGameData();
    
    // Background and layout will be initially drawn here
    this.refreshLayout();
    
    this.scale.on('resize', () => {
      this.refreshLayout();
    });
  }

  private createDungeonBackground() {
    // Clear old elements
    this.bgElements.forEach((el) => el.destroy());
    this.bgElements = [];

    const { width, height } = this.scale;

    // Stone tile floor covering the entire background
    const graphics = this.add.graphics();
    this.bgElements.push(graphics);
    const tileSize = Math.max(48, Math.min(72, Math.floor(width / 6)));
    const seed = (x: number, y: number) => ((x * 2654435761) ^ (y * 2246822519)) >>> 0;
    for (let ty = 0; ty < height; ty += tileSize) {
      for (let tx = 0; tx < width; tx += tileSize) {
        const col = Math.floor(tx / tileSize);
        const row = Math.floor(ty / tileSize);
        const hash = seed(col, row) % 100;
        const shade = hash < 35 ? 0x12162a : hash < 60 ? 0x0f1324 : hash < 85 ? 0x161b30 : 0x0d1020;
        graphics.fillStyle(shade, 1);
        graphics.fillRect(tx + 1, ty + 1, tileSize - 2, tileSize - 2);
        graphics.lineStyle(1, 0x080b14, 0.6);
        graphics.strokeRect(tx + 1, ty + 1, tileSize - 2, tileSize - 2);

        // Subtle cracks on ~15% of tiles
        if (hash < 15) {
          graphics.lineStyle(1, 0x080b14, 0.4);
          const cx = tx + tileSize * 0.25 + (hash % 4) * 4;
          const cy = ty + tileSize * 0.2 + (hash % 6) * 3;
          graphics.lineBetween(cx, cy, cx + tileSize * 0.5, cy + tileSize * 0.6);
        }
      }
    }

    // Dungeon archway frame around center content
    const archWidth = Math.min(width * 0.88, 480);
    const archX = (width - archWidth) / 2;
    const archTop = height * 0.06;
    const archBottom = height * 0.92;
    const archHeight = archBottom - archTop;

    // Outer stone border
    graphics.lineStyle(4, 0x2a2f4a, 0.8);
    graphics.strokeRoundedRect(archX, archTop, archWidth, archHeight, 12);
    // Inner accent line
    graphics.lineStyle(2, 0xff6b35, 0.35);
    graphics.strokeRoundedRect(archX + 6, archTop + 6, archWidth - 12, archHeight - 12, 8);
    // Dark fill inside archway
    graphics.fillStyle(0x0a0e1a, 0.6);
    graphics.fillRoundedRect(archX + 8, archTop + 8, archWidth - 16, archHeight - 16, 6);

    // Edge vignette shadows
    for (let i = 0; i < 5; i++) {
      const alpha = 0.35 - i * 0.06;
      this.bgElements.push(this.add.rectangle(width / 2, i * 12, width, 24, 0x050810, Math.max(0, alpha)));
      this.bgElements.push(this.add.rectangle(width / 2, height - i * 12, width, 24, 0x050810, Math.max(0, alpha)));
      this.bgElements.push(this.add.rectangle(i * 12, height / 2, 24, height, 0x050810, Math.max(0, alpha)));
      this.bgElements.push(this.add.rectangle(width - i * 12, height / 2, 24, height, 0x050810, Math.max(0, alpha)));
    }

    // Flickering torches on the archway corners
    const torchSpots = [
      { x: archX + 12, y: archTop + 20 },
      { x: archX + archWidth - 12, y: archTop + 20 },
      { x: archX + 12, y: archBottom - 20 },
      { x: archX + archWidth - 12, y: archBottom - 20 },
    ];
    torchSpots.forEach((t) => {
      const glow = this.add.circle(t.x, t.y, 22, 0xff8c00, 0.08);
      const inner = this.add.circle(t.x, t.y, 10, 0xffaa33, 0.14);
      const text = this.add.text(t.x, t.y, '🔥', { fontSize: '12px' }).setOrigin(0.5);
      this.bgElements.push(glow, inner, text);
      this.tweens.add({
        targets: [glow, inner],
        alpha: { from: glow.alpha, to: glow.alpha * 0.3 },
        duration: 350 + Math.random() * 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Math.random() * 400,
      });
    });
  }

  private async loadGameData() {
    try {
      const response = await fetch('/api/init');
      if (!response.ok) return;
      this.gameData = await response.json();
      this.updateRaidDisplay();
    } catch (_err) {
      // Keep the menu playable; expanded scene retries.
    }
  }

  private updateRaidDisplay() {
    const data = this.gameData;
    const raid = data?.raid;
    if (!data || !raid) return;

    this.bossText?.setText(
      `${raid.bossEmoji} ${raid.bossName}\n${raid.bossTitle}`
    );
    this.progressText?.setText(
      `${raid.progressPercent}% defeated • ${raid.playerCount} raiders`
    );
    this.statsText?.setText(
      `Today: ${data.userBestDamage} damage\n` +
        `🔥 ${data.streak} day streak • ${data.rank}`
    );
    this.playButton?.setText(
      data.alreadyPlayed ? '⚔️ IMPROVE YOUR DAMAGE' : "⚔️ ENTER TODAY'S RAID"
    );

    if (this.progressFill) {
      const width = Math.min(this.scale.width * 0.72, 420);
      this.progressFill.width = Math.max(
        8,
        width * (raid.progressPercent / 100)
      );
    }
  }

  private createAmbientParticles() {
    this.particles.forEach((p) => p.destroy());
    this.particles = [];

    const { width, height } = this.scale;
    // Dungeon embers — warm orange and cool blue
    const colors = [0xff6b35, 0xffd166, 0xff8c00, 0x00d4ff, 0x72efdd];

    for (let i = 0; i < 28; i++) {
      const dot = this.add.circle(
        Math.random() * width,
        Math.random() * height,
        Math.random() * 2 + 0.5,
        colors[Math.floor(Math.random() * colors.length)] ?? 0xffd166,
        0.2
      );
      this.particles.push(dot);
      this.tweens.add({
        targets: dot,
        y: dot.y - 40 - Math.random() * 50,
        alpha: { from: 0.05, to: 0.4 },
        duration: 3500 + Math.random() * 4000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Math.random() * 2000,
      });
    }
  }

  private refreshLayout(): void {
    const { width, height } = this.scale;
    this.cameras.resize(width, height);
    
    // Redraw backgrounds to match new dimensions
    this.createDungeonBackground();
    this.createAmbientParticles();

    const scaleFactor = Math.min(width / 600, height / 820, 1.15);
    const panelWidth = Math.min(width * 0.86, 460);

    if (!this.titleText) {
      this.titleText = this.add
        .text(0, 0, 'RAID THE THREAD', {
          fontFamily: 'Cinzel, serif',
          fontSize: '42px',
          color: '#ffd166',
          stroke: '#080b1f',
          strokeThickness: 4,
          align: 'center',
        })
        .setOrigin(0.5);
    }
    this.titleText.setPosition(width / 2, height * 0.13).setScale(scaleFactor);

    if (!this.subtitleText) {
      this.subtitleText = this.add
        .text(0, 0, 'Daily subreddit boss raid', {
          fontFamily: 'Inter, sans-serif',
          fontSize: '16px',
          color: '#9fb3d1',
          align: 'center',
        })
        .setOrigin(0.5);
    }
    this.subtitleText
      .setPosition(width / 2, height * 0.2)
      .setScale(scaleFactor);

    if (!this.bossText) {
      this.bossText = this.add
        .text(0, 0, "Loading today's boss...", {
          fontFamily: 'Cinzel, serif',
          fontSize: '24px',
          color: '#ffffff',
          align: 'center',
          lineSpacing: 8,
        })
        .setOrigin(0.5);
    }
    this.bossText.setPosition(width / 2, height * 0.32).setScale(scaleFactor);

    const progressY = height * 0.44;
    if (!this.progressBg) {
      this.progressBg = this.add
        .rectangle(width / 2, progressY, panelWidth, 18, 0x1b2145, 1)
        .setStrokeStyle(2, 0x3b4a75);
    }
    this.progressBg.setPosition(width / 2, progressY);
    this.progressBg.setSize(panelWidth, 18);

    if (!this.progressFill) {
      this.progressFill = this.add
        .rectangle(width / 2 - panelWidth / 2, progressY, 8, 14, 0xff6b35, 1)
        .setOrigin(0, 0.5);
    }
    this.progressFill.setPosition(width / 2 - panelWidth / 2, progressY);

    if (!this.progressText) {
      this.progressText = this.add
        .text(0, 0, '0% defeated • gathering raiders', {
          fontFamily: 'Inter, sans-serif',
          fontSize: '14px',
          color: '#e0e6ed',
          align: 'center',
        })
        .setOrigin(0.5);
    }
    this.progressText
      .setPosition(width / 2, progressY + 28)
      .setScale(scaleFactor);

    if (!this.statsText) {
      this.statsText = this.add
        .text(0, 0, '🔥 Loading your raid streak...', {
          fontFamily: 'Inter, sans-serif',
          fontSize: '15px',
          color: '#9fb3d1',
          align: 'center',
          lineSpacing: 6,
        })
        .setOrigin(0.5);
    }
    this.statsText.setPosition(width / 2, height * 0.54).setScale(scaleFactor);

    if (!this.playButton) {
      this.playButton = this.add
        .text(0, 0, "⚔️ ENTER TODAY'S RAID", {
          fontFamily: 'Cinzel, serif',
          fontSize: '20px',
          color: '#ffffff',
          backgroundColor: '#e85d04',
          padding: { x: 26, y: 14 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () =>
          this.playButton?.setStyle({ backgroundColor: '#ff7b00' })
        )
        .on('pointerout', () =>
          this.playButton?.setStyle({ backgroundColor: '#e85d04' })
        )
        .on('pointerdown', () => {
          this.scene.start('RuneGame', { gameData: this.gameData });
        });

      this.tweens.add({
        targets: this.playButton,
        scaleX: scaleFactor * 1.04,
        scaleY: scaleFactor * 1.04,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
    this.playButton.setPosition(width / 2, height * 0.68).setScale(scaleFactor);

    if (!this.helpButton) {
      this.helpButton = this.add
        .text(0, 0, '❔ How this raid works', {
          fontFamily: 'Inter, sans-serif',
          fontSize: '15px',
          color: '#9fb3d1',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.showTutorial())
        .on('pointerover', () => this.helpButton?.setColor('#ffffff'))
        .on('pointerout', () => this.helpButton?.setColor('#9fb3d1'));
    }
    this.helpButton.setPosition(width / 2, height * 0.76).setScale(scaleFactor);

    if (!this.vaultButton) {
      this.vaultButton = this.add
        .text(0, 0, '💎 My Vault', {
          fontFamily: 'Inter, sans-serif',
          fontSize: '15px',
          color: '#ffd166',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.scene.start('Vault'))
        .on('pointerover', () => this.vaultButton?.setColor('#ffffff'))
        .on('pointerout', () => this.vaultButton?.setColor('#ffd166'));
    }
    this.vaultButton.setPosition(width / 2, height * 0.82).setScale(scaleFactor);

    this.updateRaidDisplay();
  }

  private showTutorial() {
    const { width, height } = this.scale;

    if (!this.tutorialContainer) {
      this.tutorialContainer = this.add.container(0, 0);
      const bg = this.add
        .rectangle(width / 2, height / 2, width, height, 0x000000, 0.86)
        .setInteractive();
      const boxWidth = Math.min(width * 0.88, 430);
      const boxHeight = Math.min(height * 0.72, 470);
      const box = this.add
        .rectangle(width / 2, height / 2, boxWidth, boxHeight, 0x101735)
        .setStrokeStyle(2, 0xff6b35);
      const title = this.add
        .text(width / 2, height / 2 - boxHeight / 2 + 42, 'HOW TO RAID', {
          fontFamily: 'Cinzel, serif',
          fontSize: '24px',
          color: '#ffd166',
        })
        .setOrigin(0.5);
      const rules = this.add
        .text(
          width / 2,
          height / 2 - 5,
          'The boss belongs to the whole subreddit.\n\n' +
            'Drag to move. Dodge enemies and traps.\n' +
            'Collect gems and survive to build damage.\n' +
            'Your best run helps lower the community boss HP.\n\n' +
            "After the run, share your damage and vote for tomorrow's dungeon curse.",
          {
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            color: '#e0e6ed',
            align: 'center',
            lineSpacing: 8,
            wordWrap: { width: boxWidth - 50 },
          }
        )
        .setOrigin(0.5);
      const closeBtn = this.add
        .text(width / 2, height / 2 + boxHeight / 2 - 48, 'Start raiding', {
          fontFamily: 'Inter, sans-serif',
          fontSize: '16px',
          color: '#ffffff',
          backgroundColor: '#e85d04',
          padding: { x: 20, y: 10 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.tutorialContainer?.setVisible(false));

      this.tutorialContainer.add([bg, box, title, rules, closeBtn]);
    }

    this.tutorialContainer.setVisible(true).setDepth(100);
  }
}
