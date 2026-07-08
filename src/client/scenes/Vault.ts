import { Scene } from 'phaser';

export class Vault extends Scene {
  constructor() {
    super('Vault');
  }

  create() {
    this.cameras.main.setBackgroundColor(0x071027);

    // Title
    this.add.text(this.scale.width / 2, 80, 'THE VAULT', {
      fontFamily: 'Cinzel, serif',
      fontSize: '48px',
      color: '#ffd166',
    }).setOrigin(0.5);
    
    this.add.text(this.scale.width / 2, 130, 'Your collection of Rare Gems', {
      fontFamily: 'Inter, sans-serif',
      fontSize: '18px',
      color: '#a0aec0',
    }).setOrigin(0.5);

    // Get stats from registry
    const stats = this.registry.get('userStats');
    const rareGems = stats?.vaultGems || 0;

    // Draw grid of gems
    const cols = 5;
    const startX = this.scale.width / 2 - (cols * 80) / 2 + 40;
    const startY = 250;

    // We'll just show 15 slots total
    for (let i = 0; i < 15; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = startX + col * 80;
      const y = startY + row * 80;

      // Slot background
      this.add.rectangle(x, y, 64, 64, 0x1a2642, 0.8)
        .setStrokeStyle(2, 0x2d3748);

      if (i < rareGems) {
        // Has gem
        const gem = this.add.image(x, y, 'gem');
        gem.setScale(1.5);
        // Random rare tint
        const tints = [0xffd166, 0xef476f, 0x118ab2, 0x06d6a0, 0xb5179e];
        gem.setTint(tints[i % tints.length]);
      } else {
        // Empty slot
        this.add.text(x, y, '?', {
          fontFamily: 'Inter',
          fontSize: '24px',
          color: '#4a5568'
        }).setOrigin(0.5);
      }
    }

    // Back Button
    const backBtn = this.add
      .rectangle(this.scale.width / 2, this.scale.height - 80, 200, 50, 0x2b3a67)
      .setInteractive({ useHandCursor: true });
    
    this.add.text(this.scale.width / 2, this.scale.height - 80, 'BACK TO MENU', {
      fontFamily: 'Cinzel',
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5);

    backBtn.on('pointerdown', () => {
      this.scene.start('MainMenu');
    });
  }
}
