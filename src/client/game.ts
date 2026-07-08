import { Boot } from './scenes/Boot';
import { Preloader } from './scenes/Preloader';
import { MainMenu } from './scenes/MainMenu';
import { RuneGame } from './scenes/RuneGame';
import { Results } from './scenes/Results';
import { Vault } from './scenes/Vault';
import { patchSharpTextRendering } from './uiText';
import * as Phaser from 'phaser';

patchSharpTextRendering();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#0a0e27',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    autoRound: true,
    width: 1024,
    height: 768,
  },
  render: {
    antialias: true,
    antialiasGL: true,
  },
  scene: [Boot, Preloader, MainMenu, Vault, RuneGame, Results],
};

const StartGame = (parent: string) => {
  return new Phaser.Game({ ...config, parent });
};

document.addEventListener('DOMContentLoaded', () => {
  StartGame('game-container');
});
