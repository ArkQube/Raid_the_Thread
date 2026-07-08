import { Scene } from 'phaser';

export class Preloader extends Scene {
  constructor() {
    super('Preloader');
  }

  init() {
    const { width, height } = this.scale;
    this.cameras.resize(width, height);
    this.cameras.main.setBackgroundColor(0x071027);

    const barWidth = Math.min(300, width * 0.6);
    const cx = width / 2;
    const cy = height / 2;

    this.add.rectangle(cx, cy, barWidth + 4, 24).setStrokeStyle(2, 0xff6b35);
    const bar = this.add
      .rectangle(cx - barWidth / 2, cy, 4, 20, 0xff6b35)
      .setOrigin(0, 0.5);

    this.add
      .text(cx, cy - 42, 'Opening the Raid...', {
        fontFamily: 'Cinzel, serif',
        fontSize: '20px',
        color: '#e0e6ed',
      })
      .setOrigin(0.5);

    this.load.on('progress', (progress: number) => {
      bar.width = 4 + (barWidth - 4) * progress;
    });
  }

  preload() {
    // 1. Particle
    const particleCanvas = this.textures.createCanvas('particle', 8, 8);
    if (particleCanvas) {
      const pCtx = particleCanvas.getContext();
      pCtx.beginPath();
      pCtx.arc(4, 4, 3, 0, Math.PI * 2);
      pCtx.fillStyle = '#ffffff';
      pCtx.fill();
      particleCanvas.refresh();
    }

    // 2. Player (Glowing Wizard Magic Shield / Crest)
    const playerCanvas = this.textures.createCanvas('player', 36, 36);
    if (playerCanvas) {
      const ctx = playerCanvas.getContext();
      ctx.translate(18, 18);
      // Outer glow circle
      const grad = ctx.createRadialGradient(0, 0, 8, 0, 0, 18);
      grad.addColorStop(0, 'rgba(0, 212, 255, 1)');
      grad.addColorStop(0.5, 'rgba(0, 212, 255, 0.4)');
      grad.addColorStop(1, 'rgba(0, 212, 255, 0)');
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Shield base
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#071027';
      ctx.fill();
      ctx.strokeStyle = '#e0fbfc';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Magic crest cross
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(0, 6);
      ctx.moveTo(-6, 0);
      ctx.lineTo(6, 0);
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 2;
      ctx.stroke();
      playerCanvas.refresh();
    }

    // 3. Enemy (Creepy Neon Spiked Demon)
    const enemyCanvas = this.textures.createCanvas('enemy', 28, 28);
    if (enemyCanvas) {
      const ctx = enemyCanvas.getContext();
      ctx.translate(14, 14);
      const spikes = 6;
      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        const angle = (i * Math.PI) / spikes;
        const dist = i % 2 === 0 ? 12 : 7;
        ctx.lineTo(Math.cos(angle) * dist, Math.sin(angle) * dist);
      }
      ctx.closePath();
      ctx.fillStyle = '#ff477e';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Eyes
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-3, -3, 2, 2);
      ctx.fillRect(1, -3, 2, 2);
      enemyCanvas.refresh();
    }

    // 4. Gem (Cyan Diamond with highlight)
    const gemCanvas = this.textures.createCanvas('gem', 24, 24);
    if (gemCanvas) {
      const ctx = gemCanvas.getContext();
      ctx.translate(12, 12);
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(8, 0);
      ctx.lineTo(0, 10);
      ctx.lineTo(-8, 0);
      ctx.closePath();
      ctx.fillStyle = '#72efdd';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Spark highlight
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2, -5, 3, 3);
      gemCanvas.refresh();
    }

    // 5. Sawblade Trap (Rotating metal blade with teeth)
    const sawCanvas = this.textures.createCanvas('sawblade', 32, 32);
    if (sawCanvas) {
      const ctx = sawCanvas.getContext();
      ctx.translate(16, 16);
      const teeth = 10;
      ctx.beginPath();
      for (let i = 0; i < teeth * 2; i++) {
        const angle = (i * Math.PI) / teeth;
        const dist = i % 2 === 0 ? 15 : 9;
        ctx.lineTo(Math.cos(angle) * dist, Math.sin(angle) * dist);
      }
      ctx.closePath();
      ctx.fillStyle = '#3a3d52';
      ctx.fill();
      ctx.strokeStyle = '#ff6b35';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Inner glowing core
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd166';
      ctx.fill();
      sawCanvas.refresh();
    }
  }

  create() {
    this.scene.start('MainMenu');
  }
}
