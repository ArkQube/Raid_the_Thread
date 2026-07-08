import * as Phaser from 'phaser';

const MAX_TEXT_RESOLUTION = 3;

export function getUiResolution(): number {
  if (typeof window === 'undefined' || !window.devicePixelRatio) return 1;
  return Math.min(window.devicePixelRatio, MAX_TEXT_RESOLUTION);
}

/**
 * Patches Phaser's text factory so every `scene.add.text(...)` call in the
 * game renders at the device's pixel ratio by default. Without this, Phaser
 * renders text canvases at 1x resolution and the browser upscales them to
 * fill high-DPI (Retina/mobile) screens, which looks blurry.
 */
export function patchSharpTextRendering(): void {
  const factoryPrototype = Phaser.GameObjects.GameObjectFactory.prototype;
  const originalText = factoryPrototype.text;

  factoryPrototype.text = function (
    this: Phaser.GameObjects.GameObjectFactory,
    x: number,
    y: number,
    text: string | string[],
    style?: Phaser.Types.GameObjects.Text.TextStyle,
  ): Phaser.GameObjects.Text {
    const mergedStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      resolution: getUiResolution(),
      ...(style ?? {}),
    };
    return originalText.call(this, x, y, text, mergedStyle);
  };
}
