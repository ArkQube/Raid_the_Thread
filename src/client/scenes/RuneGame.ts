import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import type { CompleteRaidResponse, InitResponse } from '../../shared/api';

type Enemy = {
  body: Phaser.GameObjects.Image;
  speed: number;
  hp: number;
};

type Gem = {
  body: Phaser.GameObjects.Image;
  value: number;
};

type Trap = {
  body: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
};

type RuneGameData = {
  gameData?: InitResponse | null;
};

export class RuneGame extends Scene {
  private gameData: InitResponse | null = null;
  private player: Phaser.GameObjects.Image | null = null;
  private playerAura: Phaser.GameObjects.Arc | null = null;
  private playerIcon: Phaser.GameObjects.Text | null = null;
  private hpText: Phaser.GameObjects.Text | null = null;
  private timerText: Phaser.GameObjects.Text | null = null;
  private damageText: Phaser.GameObjects.Text | null = null;
  private bossHealthFill: Phaser.GameObjects.Rectangle | null = null;
  private bossHealthWidth = 0;
  private dashButton: Phaser.GameObjects.Arc | null = null;
  private dashText: Phaser.GameObjects.Text | null = null;
  private ultCharge = 0;
  private ultReady = false;
  private ultButton: Phaser.GameObjects.Rectangle | null = null;
  private ultIcon: Phaser.GameObjects.Text | null = null;
  private enemies: Enemy[] = [];
  private gems: Gem[] = [];
  private traps: Trap[] = [];
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private pointerActive = false;
  private moveVector = new Phaser.Math.Vector2(0, 0);
  private playerHp = 5;
  private damage = 0;
  private gemsCollected = 0;
  private enemiesDefeated = 0;
  private hasSpawnedElite = false;
  private elapsedMs = 0;
  private lastEnemySpawn = 0;
  private lastGemSpawn = 0;
  private lastTrapSpawn = 0;
  private lastAttack = 0;
  private invulnerableUntil = 0;
  private dashReadyAt = 0;
  private finished = false;

  constructor() {
    super('RuneGame');
  }

  init(data: RuneGameData): void {
    this.gameData = data.gameData ?? null;
    this.player = null;
    this.playerAura = null;
    this.playerIcon = null;
    this.hpText = null;
    this.timerText = null;
    this.damageText = null;
    this.bossHealthFill = null;
    this.bossHealthWidth = 0;
    this.dashButton = null;
    this.dashText = null;
    this.ultCharge = 0;
    this.ultReady = false;
    this.ultButton = null;
    this.ultIcon = null;
    this.enemies = [];
    this.gems = [];
    this.traps = [];
    this.pointerActive = false;
    this.moveVector.set(0, 0);
    this.playerHp = 5;
    this.damage = 0;
    this.gemsCollected = 0;
    this.enemiesDefeated = 0;
    this.hasSpawnedElite = false;
    this.elapsedMs = 0;
    this.lastEnemySpawn = 0;
    this.lastGemSpawn = 0;
    this.lastTrapSpawn = 0;
    this.lastAttack = 0;
    this.invulnerableUntil = 0;
    this.dashReadyAt = 0;
    this.finished = false;
  }

  create() {
    this.cameras.main.setBackgroundColor(0x071027);
    this.cursors = this.input.keyboard?.createCursorKeys() ?? null;
    void this.loadAndStart();
  }

  override update(time: number, delta: number) {
    if (this.finished || !this.player || !this.gameData) return;

    this.elapsedMs += delta;
    const raidLengthMs = 60000;

    this.updateMovement(delta);
    this.spawnLoop(time);
    this.updateEnemies(delta);
    this.updateTraps(delta);
    this.collectGems();
    this.autoAttack(time);
    this.updateHud(raidLengthMs);

    // No passive damage — score only from player actions

    if (this.playerHp <= 0 || this.elapsedMs >= raidLengthMs) {
      void this.finishRaid();
    }
  }

  private async loadAndStart() {
    if (!this.gameData) {
      const loadingText = this.add
        .text(
          this.scale.width / 2,
          this.scale.height / 2,
          'Opening dungeon...',
          {
            fontFamily: 'Inter, sans-serif',
            fontSize: '18px',
            color: '#e0e6ed',
          }
        )
        .setOrigin(0.5);

      try {
        const response = await fetch('/api/init');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        this.gameData = await response.json();
        loadingText.destroy();
      } catch (_err) {
        loadingText.setText('Failed to open dungeon. Tap to retry.');
        this.input.once('pointerdown', () => this.scene.restart());
        return;
      }
    }

    this.buildArena();
    this.bindControls();
  }

  private buildArena() {
    const { width, height } = this.scale;
    const raid = this.gameData?.raid;
    const modifier = raid?.modifier;

    this.createDungeonBackdrop(width, height, modifier?.id ?? 'lava');
    this.createBossSetPiece(width, height, raid);
    this.createHudFrame(width, raid, modifier);
    this.createSkillBar(width, height);

    this.hpText = this.add.text(18, 82, '', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '13px',
      color: '#ff6b6b',
      stroke: '#050914',
      strokeThickness: 3,
    }).setDepth(18);
    this.timerText = this.add
      .text(width - 18, 82, '', {
        fontFamily: 'Inter, sans-serif',
        fontSize: '13px',
        color: '#e0e6ed',
        stroke: '#050914',
        strokeThickness: 3,
      })
      .setOrigin(1, 0)
      .setDepth(18);
    this.damageText = this.add
      .text(width / 2, 82, '', {
        fontFamily: 'Inter, sans-serif',
        fontSize: '12px',
        color: '#ffd166',
        align: 'center',
        stroke: '#050914',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0)
      .setDepth(18);

    const playerY = Math.min(height - 170, height * 0.72);
    this.playerAura = this.add.circle(width / 2, playerY, 26, 0x00d4ff, 0.12);
    this.player = this.add.image(width / 2, playerY, 'player');
    this.playerIcon = this.add
      .text(width / 2, playerY, '⚔️', { fontSize: '18px' })
      .setOrigin(0.5);

    // (Virtual joystick graphics removed in favor of pointer-follow)
    const dashX = width - 74;
    const dashY = height - 82;
    this.dashButton = this.add
      .circle(dashX, dashY, 42, 0xe85d04, 0.86)
      .setStrokeStyle(3, 0xffd166, 0.65);
    this.dashText = this.add
      .text(dashX, dashY, 'DASH', {
        fontFamily: 'Inter, sans-serif',
        fontSize: '12px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    if (modifier?.id === 'darkness') {
      this.add
        .rectangle(width / 2, height / 2, width, height, 0x000000, 0.22)
        .setDepth(8);
      this.player.setDepth(10);
      this.playerAura.setDepth(9);
    }

    this.updateHud(60000);
  }

  private createDungeonBackdrop(
    width: number,
    height: number,
    modifierId: string
  ): void {
    // Base floor
    this.add.rectangle(width / 2, height / 2, width, height, 0x1f2335);

    const graphics = this.add.graphics();
    graphics.fillStyle(0x282c44, 1);
    graphics.fillRect(0, 112, width, height - 196);

    // Draw procedural stone tiles
    const tileSize = Math.max(40, Math.min(64, Math.floor(width / 7)));
    for (let y = 112; y < height - 84; y += tileSize) {
      for (let x = 0; x < width; x += tileSize) {
        // Alternating tile shades for a classic RPG dungeon floor look
        const shade = (x / tileSize + y / tileSize) % 2 === 0 ? 0x2e334d : 0x24283b;
        graphics.fillStyle(shade, 1);
        graphics.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
        
        // Mortar lines (borders)
        graphics.lineStyle(2, 0x171923, 0.6);
        graphics.strokeRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
      }
    }

    // Dynamic environmental elements based on modifier
    const isDark = modifierId === 'darkness';
    const isLava = modifierId === 'lava';
    
    const channelColor = isLava ? 0xff5a13 : isDark ? 0x111116 : 0x1a759f;
    const glowColor = isLava ? 0xffd166 : isDark ? 0x3d2745 : 0x76c893;

    // Draw some stylized channels / chasms running through the dungeon
    const channels = [
      { x: width * 0.12, y: 130, w: 24, h: height - 230 },
      { x: width * 0.42, y: height * 0.38, w: 32, h: height * 0.44 },
      { x: width * 0.72, y: height * 0.28, w: 28, h: height * 0.48 },
      { x: width * 0.22, y: height * 0.58, w: width * 0.62, h: 24 },
    ];

    channels.forEach((channel) => {
      // Depth shadow
      graphics.fillStyle(0x0b0d14, 1);
      graphics.fillRect(channel.x - 4, channel.y - 4, channel.w + 8, channel.h + 8);
      // Fluid/Chasm core
      graphics.fillStyle(channelColor, 0.9);
      graphics.fillRect(channel.x, channel.y, channel.w, channel.h);
      // Edge highlight
      graphics.lineStyle(1.5, glowColor, 0.8);
      graphics.strokeRect(channel.x, channel.y, channel.w, channel.h);
    });

    // Embers / Particles rising from the channels
    const numParticles = isLava ? 36 : 18;
    for (let i = 0; i < numParticles; i++) {
      const p = this.add.circle(
        Math.random() * width,
        130 + Math.random() * Math.max(80, height - 240),
        Math.random() * 2 + 1,
        glowColor,
        0.6
      );
      this.tweens.add({
        targets: p,
        y: p.y - 30 - Math.random() * 40,
        alpha: 0,
        duration: 1500 + Math.random() * 2000,
        repeat: -1,
        delay: Math.random() * 1000,
        ease: 'Sine.easeOut',
      });
    }
  }

  private createBossSetPiece(
    width: number,
    height: number,
    raid: InitResponse['raid'] | undefined
  ): void {

    const bossY = Math.min(166, height * 0.21);
    const bossScale = Math.min(1.25, Math.max(0.82, width / 520));

    this.add
      .circle(width / 2, bossY + 4, 112 * bossScale, 0x6d1d16, 0.22)
      .setDepth(2);
    this.add
      .circle(width / 2, bossY + 2, 76 * bossScale, 0x2b102d, 0.72)
      .setDepth(3);
    this.add
      .polygon(
        width / 2,
        bossY + 8,
        [
          -42, -38, -16, -66, 0, -34, 18, -66, 44, -36, 36, 38, 0, 58, -38, 36,
        ],
        0x23111b,
        1
      )
      .setScale(bossScale)
      .setStrokeStyle(3, 0xff6b35, 0.9)
      .setDepth(4);
    this.add
      .text(width / 2, bossY - 6, raid?.bossEmoji ?? '👹', {
        fontSize: `${Math.round(42 * bossScale)}px`,
      })
      .setOrigin(0.5)
      .setDepth(5);
    this.add
      .text(width / 2, bossY + 48 * bossScale, raid?.bossName ?? 'Daily Boss', {
        fontFamily: 'Cinzel, serif',
        fontSize: `${Math.round(13 * bossScale)}px`,
        color: '#ffd166',
        stroke: '#050914',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(5);

    this.tweens.add({
      targets: this.add.circle(width / 2, bossY + 6, 102 * bossScale, 0xff4f1f, 0.08).setDepth(2),
      scaleX: 1.08,
      scaleY: 1.08,
      alpha: 0.2,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add.rectangle(width / 2, 112, width, 22, 0x1b1115, 0.9).setDepth(6);
    this.add.rectangle(width / 2, 122, Math.min(width, 520), 18, 0x2a2026, 1).setDepth(7);
  }

  private createHudFrame(
    width: number,
    raid: InitResponse['raid'] | undefined,
    modifier: InitResponse['raid']['modifier'] | undefined
  ): void {
    this.add.rectangle(width / 2, 46, width, 92, 0x080b12, 0.88).setDepth(15);
    this.add.rectangle(width / 2, 92, width, 2, 0xff6b35, 0.7).setDepth(16);

    this.add.rectangle(68, 39, 112, 62, 0x151923, 0.95).setStrokeStyle(2, 0x4a5368, 1).setDepth(17);
    this.add.text(18, 15, 'HP', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '10px',
      color: '#9ff8a8',
    }).setDepth(18);
    this.add.rectangle(70, 21, 78, 10, 0x273043, 1).setDepth(18);
    this.add.rectangle(31, 21, 72, 7, 0x30d158, 1).setOrigin(0, 0.5).setDepth(19);
    this.add.text(18, 35, 'MP', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '10px',
      color: '#72efdd',
    }).setDepth(18);
    this.add.rectangle(70, 41, 78, 10, 0x273043, 1).setDepth(18);
    this.add.rectangle(31, 41, 62, 7, 0x00d4ff, 1).setOrigin(0, 0.5).setDepth(19);

    this.add.text(width / 2, 12, 'RAID THE THREAD', {
      fontFamily: 'Cinzel, serif',
      fontSize: '18px',
      color: '#ffd166',
      stroke: '#050914',
      strokeThickness: 3,
    }).setOrigin(0.5, 0).setDepth(18);
    this.add.text(width / 2, 38, `${modifier?.emoji ?? '🔥'} ${modifier?.label ?? 'Daily Curse'}`, {
      fontFamily: 'Inter, sans-serif',
      fontSize: '11px',
      color: '#d7e3ff',
      align: 'center',
      wordWrap: { width: Math.min(width - 176, 380) },
    }).setOrigin(0.5, 0).setDepth(18);

    const infoX = width - 70;
    this.add.rectangle(infoX, 39, 116, 62, 0x151923, 0.95).setStrokeStyle(2, 0x4a5368, 1).setDepth(17);
    this.add.text(infoX, 14, 'DUNGEON', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '10px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(18);
    this.add.text(infoX, 31, 'FLOOR 15 / B1', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '10px',
      color: '#aebce0',
    }).setOrigin(0.5, 0).setDepth(18);

    const bossBarWidth = Math.min(260, width * 0.5);
    this.add.rectangle(width / 2, 104, bossBarWidth, 13, 0x2c1b1d, 1).setDepth(18);
    this.bossHealthWidth = bossBarWidth;
    this.bossHealthFill = this.add
      .rectangle(width / 2 - bossBarWidth / 2, 104, bossBarWidth, 9, 0xff6b35, 1)
      .setOrigin(0, 0.5)
      .setDepth(19);
    this.add.text(width / 2, 111, raid?.bossTitle ?? 'Ancient Menace', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '10px',
      color: '#aebce0',
    }).setOrigin(0.5, 0).setDepth(18);
  }

  private createSkillBar(width: number, height: number): void {
    const barY = height - 34;
    this.add.rectangle(width / 2, barY, width, 68, 0x080b12, 0.82).setDepth(14);
    this.add.rectangle(width / 2, height - 68, width, 2, 0xff6b35, 0.45).setDepth(15);

    const skills = ['⚔️', '5', '6', '✦'];
    skills.forEach((skill, index) => {
      const x = 24 + index * 48;
      const btn = this.add.rectangle(x, barY, 38, 38, 0x111a2d, 0.95).setStrokeStyle(2, 0x326a7d, 1).setDepth(16);
      const icon = this.add.text(x, barY - 2, skill, {
        fontFamily: 'Inter, sans-serif',
        fontSize: index === 0 || index === 3 ? '18px' : '16px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(17);
      this.add.text(x, barY - 31, index === 3 ? 'ULT' : String(index + 1), {
        fontFamily: 'Inter, sans-serif',
        fontSize: '9px',
        color: '#aebce0',
      }).setOrigin(0.5).setDepth(17);

      if (index === 3) {
        this.ultButton = btn;
        this.ultIcon = icon;
        btn.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.performUlt());
      }
    });

    this.add.rectangle(width - 54, barY, 92, 34, 0x151923, 0.95).setStrokeStyle(2, 0x4a5368, 1).setDepth(16);
    this.add.text(width - 54, barY - 6, 'SCORE', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '10px',
      color: '#aebce0',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(17);
  }

  private bindControls() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isDashPointer(pointer)) {
        this.performDash();
        return;
      }
      if (pointer.y < 124) return;

      if (this.player) {
        const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.player.x, this.player.y);
        if (dist > 70) return; // Prevent teleporting; must grab the player!
      }

      this.pointerActive = true;
    });

    this.input.on('pointerup', () => {
      this.pointerActive = false;
      this.moveVector.set(0, 0);
    });
  }

  private isDashPointer(pointer: Phaser.Input.Pointer): boolean {
    if (!this.dashButton) return false;
    const distDash = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.dashButton.x, this.dashButton.y);
    return distDash <= 58;
  }

  private performUlt() {
    if (!this.ultReady || this.finished) return;
    this.ultCharge = 0;
    this.ultReady = false;
    
    // Wipe all enemies
    this.cameras.main.flash(600, 255, 255, 255, false);
    for (const enemy of this.enemies) {
      this.damage += 12;
      this.enemiesDefeated += 1;
      this.ultCharge += 2; // refund a tiny bit
      enemy.body.destroy();
      
      const x = enemy.body.x;
      const y = enemy.body.y;
      this.add.text(x, y, '+KO', { fontSize: '10px', color: '#ff6b35' })
        .setOrigin(0.5)
        .setDepth(10);
    }
    this.enemies = [];
  }

  private performDash() {
    if (!this.player || !this.playerAura || this.elapsedMs < this.dashReadyAt)
      return;

    const direction = this.moveVector.clone();
    if (direction.length() === 0) {
      direction.set(0, -1);
    }
    direction.normalize();

    const dashDistance = 100;
    const nextX = Phaser.Math.Clamp(
      this.player.x + direction.x * dashDistance,
      18,
      this.scale.width - 18
    );
    const nextY = Phaser.Math.Clamp(
      this.player.y + direction.y * dashDistance,
      132,
      this.scale.height - 24
    );

    this.dashReadyAt = this.elapsedMs + 1200;
    this.invulnerableUntil = Math.max(
      this.invulnerableUntil,
      this.elapsedMs + 220
    );
    this.player.setPosition(nextX, nextY);
    this.playerAura.setPosition(nextX, nextY);
    this.playerIcon?.setPosition(nextX, nextY);
    this.damage += 2;
    this.cameras.main.flash(90, 114, 239, 221, false);
    this.tweens.add({
      targets: [this.dashButton, this.dashText],
      alpha: 0.42,
      duration: 120,
      yoyo: true,
      ease: 'Power2',
    });
  }

  private updateMovement(delta: number) {
    if (!this.player || !this.playerAura) return;

    if (this.pointerActive) {
      const pointer = this.input.activePointer;
      const nextX = Phaser.Math.Clamp(pointer.x, 18, this.scale.width - 18);
      const nextY = Phaser.Math.Clamp(pointer.y, 132, this.scale.height - 24);
      
      this.player.setPosition(nextX, nextY);
      this.playerAura.setPosition(nextX, nextY);
      this.playerIcon?.setPosition(nextX, nextY);
    } else {
      const keyboardVector = new Phaser.Math.Vector2(0, 0);
      if (this.cursors?.left.isDown) keyboardVector.x -= 1;
      if (this.cursors?.right.isDown) keyboardVector.x += 1;
      if (this.cursors?.up.isDown) keyboardVector.y -= 1;
      if (this.cursors?.down.isDown) keyboardVector.y += 1;
      if (keyboardVector.length() > 0) keyboardVector.normalize();

      const speed = 230;
      const nextX = Phaser.Math.Clamp(
        this.player.x + keyboardVector.x * speed * (delta / 1000),
        18,
        this.scale.width - 18
      );
      const nextY = Phaser.Math.Clamp(
        this.player.y + keyboardVector.y * speed * (delta / 1000),
        132,
        this.scale.height - 24
      );
      
      this.player.setPosition(nextX, nextY);
      this.playerAura.setPosition(nextX, nextY);
      this.playerIcon?.setPosition(nextX, nextY);
    }
  }

  private spawnLoop(time: number) {
    const modifier = this.gameData?.raid.modifier.id;
    // Progressive difficulty: spawn rates decrease (more spawns) as time progresses
    // Phase 0-20s: easy, 20-40s: medium, 40-60s: hard
    // Step function: Difficulty spikes every 10 seconds (10000ms)
    const steps = Math.floor(this.elapsedMs / 10000); // 0 to 5
    const phase = Math.min(steps / 5, 1); 
    const rampFactor = 1 - phase * 0.6; // rates shrink by up to 60% at end

    const baseEnemyRate = modifier === 'ghosts' ? 1000 : 1300;
    const baseGemRate = modifier === 'treasure' ? 720 : 960; // 20% faster than 1400/1800
    const baseTrapRate = modifier === 'lava' ? 1400 : 2200;

    const enemyRate = baseEnemyRate * rampFactor;
    const gemRate = baseGemRate * Math.max(0.7, rampFactor); // gems don't slow as much
    const trapRate = baseTrapRate * rampFactor;

    if (time - this.lastEnemySpawn > enemyRate) {
      this.spawnEnemy();
      this.lastEnemySpawn = time;
    }
    if (time - this.lastGemSpawn > gemRate) {
      this.spawnGem();
      this.lastGemSpawn = time;
    }
    if (time - this.lastTrapSpawn > trapRate) {
      this.spawnTrap();
      this.lastTrapSpawn = time;
    }
    
    // Spawn Elite Enemy once per game after 30 seconds
    if (this.elapsedMs > 30000 && !this.hasSpawnedElite) {
      this.hasSpawnedElite = true;
      this.spawnElite();
    }
  }

  private spawnElite() {
    const x = Math.random() > 0.5 ? -20 : this.scale.width + 20;
    const y = Math.random() > 0.5 ? 132 : this.scale.height + 20;
    const elite = this.add.image(x, y, 'enemy');
    elite.setTint(0xff0000); // Blood red
    elite.setScale(1.5);
    this.enemies.push({
      body: elite,
      speed: 75, // Very fast
      hp: 5, // Extremely tanky
    });
    this.flashText('ELITE ENEMY!', this.scale.width / 2, 200, '#ff0000');
  }

  private spawnEnemy() {
    const side = Math.floor(Math.random() * 4);
    const x =
      side === 0
        ? -20
        : side === 1
          ? this.scale.width + 20
          : Math.random() * this.scale.width;
    const y =
      side === 2
        ? 132
        : side === 3
          ? this.scale.height + 20
          : Math.random() * this.scale.height;
    const enemy = this.add.image(x, y, 'enemy');
    if (this.gameData?.raid.modifier.id === 'ghosts') {
      enemy.setTint(0xb8f7ff);
    }
    // Progressive enemy speed: starts slow, ramps up over the raid
    const phaseSpeed = this.elapsedMs / 3000; // increases by ~20 over 60s
    this.enemies.push({
      body: enemy,
      speed: 28 + Math.random() * 22 + phaseSpeed,
      hp: 1,
    });
  }

  private spawnGem() {
    const x = Phaser.Math.Between(28, Math.max(28, this.scale.width - 28));
    const y = Phaser.Math.Between(146, Math.max(146, this.scale.height - 118));
    const gem = this.add.image(x, y, 'gem');
    this.tweens.add({
      targets: gem,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.gems.push({ body: gem, value: 1 });
  }

  private spawnTrap() {
    const horizontal = Math.random() > 0.5;
    const trap = this.add.image(
      horizontal
        ? -16
        : Phaser.Math.Between(24, Math.max(24, this.scale.width - 24)),
      horizontal
        ? Phaser.Math.Between(146, Math.max(146, this.scale.height - 118))
        : 132,
      'sawblade'
    );
    // Progressive trap speed: starts slow, ramps up over the raid
    const trapPhase = 1 + (this.elapsedMs / 60000) * 0.6; // 1.0x to 1.6x speed over 60s
    this.traps.push({
      body: trap,
      vx: horizontal ? (70 + Math.random() * 50) * trapPhase : 0,
      vy: horizontal ? 0 : (70 + Math.random() * 50) * trapPhase,
    });
  }

  private updateEnemies(delta: number) {
    if (!this.player) return;
    for (const enemy of this.enemies) {
      const direction = new Phaser.Math.Vector2(
        this.player.x - enemy.body.x,
        this.player.y - enemy.body.y
      );
      if (direction.length() > 0) direction.normalize();
      enemy.body.x += direction.x * enemy.speed * (delta / 1000);
      enemy.body.y += direction.y * enemy.speed * (delta / 1000);

      if (this.distance(enemy.body, this.player) < 27) {
        this.damagePlayer();
      }
    }
  }

  private updateTraps(delta: number) {
    if (!this.player) return;
    const activeTraps: Trap[] = [];
    for (const trap of this.traps) {
      trap.body.x += trap.vx * (delta / 1000);
      trap.body.y += trap.vy * (delta / 1000);
      trap.body.rotation += delta / 130;
      if (this.distance(trap.body, this.player) < 28) {
        this.damagePlayer();
      }
      if (
        trap.body.x < -40 ||
        trap.body.x > this.scale.width + 40 ||
        trap.body.y < 116 ||
        trap.body.y > this.scale.height + 40
      ) {
        trap.body.destroy();
      } else {
        activeTraps.push(trap);
      }
    }
    this.traps = activeTraps;
  }

  private collectGems() {
    if (!this.player) return;
    const remaining: Gem[] = [];
    for (const gem of this.gems) {
      if (this.distance(gem.body, this.player) < 28) {
        this.gemsCollected += gem.value;
        this.damage += 6; // Increased from 4
        this.ultCharge += 5; // collecting gems charges ULT
        this.flashText(`+${gem.value} 💎`, gem.body.x, gem.body.y, '#72efdd');
        gem.body.destroy();
      } else {
        remaining.push(gem);
      }
    }
    this.gems = remaining;
  }

  private autoAttack(time: number) {
    if (!this.player || time - this.lastAttack < 480) return;
    this.lastAttack = time;

    let nearest: Enemy | null = null;
    let nearestDistance = 9999;
    for (const enemy of this.enemies) {
      const dist = this.distance(enemy.body, this.player);
      if (dist < nearestDistance) {
        nearest = enemy;
        nearestDistance = dist;
      }
    }

    if (!nearest || nearestDistance > 180) return;

    const beam = this.add
      .line(
        0,
        0,
        this.player.x,
        this.player.y,
        nearest.body.x,
        nearest.body.y,
        0x00d4ff,
        0.8
      )
      .setOrigin(0, 0)
      .setLineWidth(3);
    this.tweens.add({
      targets: beam,
      alpha: 0,
      duration: 140,
      onComplete: () => beam.destroy(),
    });

    nearest.hp -= 1;
    nearest.body.setTint(0xffffff);
    this.time.delayedCall(60, () => nearest?.body.clearTint());
    this.damage += 4.5;

    if (nearest.hp <= 0) {
      this.enemiesDefeated += 1;
      this.ultCharge += 10; // KOs charge ULT heavily
      this.damage += 12;
      this.flashText('+KO', nearest.body.x, nearest.body.y, '#ffd166');
      nearest.body.destroy();
      this.enemies = this.enemies.filter((enemy) => enemy !== nearest);
    }
  }

  private damagePlayer() {
    if (this.elapsedMs < this.invulnerableUntil) return;
    this.invulnerableUntil = this.elapsedMs + 1800;
    this.playerHp -= 1;
    this.cameras.main.shake(120, 0.01);
    this.player?.setTint(0xff6b6b);
    this.time.delayedCall(140, () => this.player?.clearTint());
  }

  private updateHud(raidLengthMs: number) {
    const remainingSeconds = Math.max(
      0,
      Math.ceil((raidLengthMs - this.elapsedMs) / 1000)
    );

    if (this.ultCharge >= 100 && !this.ultReady) {
      this.ultReady = true;
      this.ultCharge = 100;
    } else if (this.ultCharge > 100) {
      this.ultCharge = 100;
    }

    if (this.ultButton && this.ultIcon) {
      if (this.ultReady) {
        this.ultButton.setStrokeStyle(2, 0xffd166, 1);
        this.ultIcon.setColor('#ffd166');
      } else {
        this.ultButton.setStrokeStyle(2, 0x326a7d, 1);
        this.ultIcon.setColor('#ffffff');
      }
    }

    this.hpText?.setText(`❤️ ${Math.max(0, this.playerHp)}`);
    this.timerText?.setText(`⏱ ${remainingSeconds}s`);
    this.damageText?.setText(
      `⚔️ ${Math.round(this.damage)}  •  💎 ${this.gemsCollected}  •  KOs ${this.enemiesDefeated}`
    );
    if (this.bossHealthFill) {
      const progress = Math.min(1, this.elapsedMs / raidLengthMs);
      this.bossHealthFill.width = Math.max(
        8,
        this.bossHealthWidth * (1 - progress * 0.72)
      );
    }

    if (this.dashButton && this.dashText) {
      const dashReady = this.elapsedMs >= this.dashReadyAt;
      this.dashButton.setAlpha(dashReady ? 0.86 : 0.34);
      this.dashText.setText(
        dashReady
          ? 'DASH'
          : `${Math.ceil((this.dashReadyAt - this.elapsedMs) / 1000)}s`
      );
    }
  }

  private async finishRaid() {
    if (this.finished) return;
    this.finished = true;

    this.input.removeAllListeners();
    const survivedSeconds = Math.round(this.elapsedMs / 1000);
    await this.playCompletionAnimation();
    const endingText = this.add
      .text(
        this.scale.width / 2,
        this.scale.height / 2,
        'Sending damage to the raid...',
        {
          fontFamily: 'Inter, sans-serif',
          fontSize: '18px',
          color: '#ffffff',
          backgroundColor: '#101735',
          padding: { x: 18, y: 12 },
        }
      )
      .setOrigin(0.5)
      .setDepth(20);

    try {
      const response = await fetch('/api/raid/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          damage: Math.round(this.damage),
          gems: this.gemsCollected,
          survivedSeconds,
          enemiesDefeated: this.enemiesDefeated,
        }),
      });

      if (!response.ok) {
        endingText.setText('Could not submit run. Tap to retry.');
        this.input.once('pointerdown', () =>
          this.scene.restart({ gameData: this.gameData })
        );
        return;
      }

      const result: CompleteRaidResponse = await response.json();
      this.scene.start('Results', {
        result,
        raid: this.gameData?.raid,
        local: {
          survivedSeconds,
          gems: this.gemsCollected,
          enemiesDefeated: this.enemiesDefeated,
        },
      });
    } catch (_err) {
      endingText.setText('Network error. Tap to retry.');
      this.input.once('pointerdown', () =>
        this.scene.restart({ gameData: this.gameData })
      );
    }
  }

  private flashText(message: string, x: number, y: number, color: string) {
    const text = this.add
      .text(x, y, message, {
        fontFamily: 'Inter, sans-serif',
        fontSize: '14px',
        color,
        stroke: '#071027',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: text,
      y: y - 28,
      alpha: 0,
      duration: 650,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  private playCompletionAnimation(): Promise<void> {
    return new Promise((resolve) => {
      const { width, height } = this.scale;
      const centerX = this.player?.x ?? width / 2;
      const centerY = this.player?.y ?? height / 2;
      const burst = this.add.circle(centerX, centerY, 12, 0x00d4ff, 0.45).setDepth(30);
      const sigil = this.add
        .polygon(
          centerX,
          centerY,
          [0, -38, 34, -12, 22, 32, -22, 32, -34, -12],
          0xffd166,
          0.14
        )
        .setStrokeStyle(3, 0xffd166, 0.9)
        .setDepth(31);
      const beam = this.add
        .line(0, 0, centerX, centerY, width / 2, Math.min(148, height * 0.22), 0x72efdd, 0.88)
        .setOrigin(0, 0)
        .setLineWidth(6)
        .setDepth(32);
      const label = this.add
        .text(width / 2, Math.min(height / 2, centerY - 68), 'RUNE STRIKE', {
          fontFamily: 'Cinzel, serif',
          fontSize: '24px',
          color: '#ffd166',
          stroke: '#050914',
          strokeThickness: 5,
        })
        .setOrigin(0.5)
        .setAlpha(0)
        .setDepth(33);

      this.cameras.main.shake(180, 0.008);
      this.tweens.add({
        targets: burst,
        radius: 96,
        alpha: 0,
        duration: 520,
        ease: 'Cubic.easeOut',
      });
      this.tweens.add({
        targets: sigil,
        angle: 180,
        scaleX: 1.45,
        scaleY: 1.45,
        alpha: 0,
        duration: 720,
        ease: 'Cubic.easeOut',
      });
      this.tweens.add({
        targets: beam,
        alpha: 0,
        duration: 520,
        delay: 160,
        ease: 'Sine.easeOut',
      });
      this.tweens.add({
        targets: label,
        y: label.y - 28,
        alpha: { from: 0, to: 1 },
        duration: 260,
        yoyo: true,
        hold: 260,
        ease: 'Sine.easeOut',
      });
      this.time.delayedCall(820, () => {
        burst.destroy();
        sigil.destroy();
        beam.destroy();
        label.destroy();
        resolve();
      });
    });
  }

  private distance(
    a: { x: number; y: number },
    b: { x: number; y: number }
  ): number {
    return Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
  }
}
