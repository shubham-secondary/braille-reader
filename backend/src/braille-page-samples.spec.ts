import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { BrailleRecognitionService } from './braille-recognition.service.js';

async function makeBraillePage(sampleCells: number[], cols = 10): Promise<string> {
  const width = 1200;
  const height = 700;
  const canvas = Buffer.alloc(width * height);

  const cellW = 70;
  const cellH = 90;
  const paddingX = 80;
  const paddingY = 80;

  for (let i = 0; i < sampleCells.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const xOrigin = paddingX + col * cellW;
    const yOrigin = paddingY + row * cellH;
    const pattern = [
      [0.25, 0.18],
      [0.25, 0.52],
      [0.25, 0.82],
      [0.75, 0.18],
      [0.75, 0.52],
      [0.75, 0.82],
    ] as const;

    for (let index = 0; index < pattern.length; index++) {
      if ((sampleCells[i] & (1 << index)) === 0) continue;
      const cx = Math.round(xOrigin + pattern[index][0] * cellW);
      const cy = Math.round(yOrigin + pattern[index][1] * cellH);
      for (let yy = Math.max(0, cy - 8); yy <= Math.min(height - 1, cy + 8); yy++) {
        for (let xx = Math.max(0, cx - 8); xx <= Math.min(width - 1, cx + 8); xx++) {
          canvas[yy * width + xx] = 0;
        }
      }
    }
  }

  const pngBuffer = await sharp(canvas, { raw: { width, height, channels: 1 } }).png().toBuffer();
  return `data:image/png;base64,${pngBuffer.toString('base64')}`;
}

async function fileToDataUrl(filePath: string): Promise<string> {
  const buffer = await fs.promises.readFile(filePath);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

describe('Braille page segmentation', () => {
  const samples = [
    { label: 'basic line', cells: [1, 2, 3, 4, 5, 6], cols: 6 },
    { label: 'dense row', cells: [7, 8, 9, 10, 11, 12], cols: 6 },
    { label: 'mixed cells', cells: [1, 3, 9, 17, 25, 33], cols: 6 },
    { label: 'long line', cells: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], cols: 10 },
  ];

  it.each(samples)('recognizes a page-style braille sample: $label', async ({ cells, cols }) => {
    const service = new BrailleRecognitionService();
    const image = await makeBraillePage(cells, cols);
    const result = await service.recognizeBrailleFromImage(image);

    expect(result.source).toBe('image');
    expect(typeof result.text).toBe('string');
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThanOrEqual(0.4);
  });

  it('measures metrics for rendered PDF page samples when available', async () => {
    const sampleDir = path.resolve(__dirname, '../sample-output');
    const files = fs.existsSync(sampleDir)
      ? fs.readdirSync(sampleDir).filter((name) => name.toLowerCase().endsWith('.png')).sort()
      : [];

    if (!files.length) {
      return;
    }

    const service = new BrailleRecognitionService();
    const first = files[0];
    const image = await fileToDataUrl(path.join(sampleDir, first));
    const metrics = await service.detectBraillePageMetrics(image);

    expect(metrics.cellWidth).toBeGreaterThan(0);
    expect(metrics.cellHeight).toBeGreaterThan(0);
    expect(metrics.xStep).toBeGreaterThan(0);
    expect(metrics.yStep).toBeGreaterThan(0);
    expect(metrics.bounds.right).toBeGreaterThan(metrics.bounds.left);
    expect(metrics.bounds.bottom).toBeGreaterThan(metrics.bounds.top);
  });
});
