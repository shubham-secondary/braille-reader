import { describe, expect, it } from 'vitest';
import { BrailleRecognitionService } from './braille-recognition.service.js';

const pdfPageImage = 'data:image/png;base64,' + Buffer.from([
  0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,
]).toString('base64');

describe('braille page sample metrics', () => {
  it('measures a real page-like braille layout and returns consistent cell metrics', async () => {
    const service = new BrailleRecognitionService();
    const metrics = await service.detectBraillePageMetrics(pdfPageImage);

    expect(metrics).toBeDefined();
    expect(metrics.cellWidth).toBeGreaterThan(0);
    expect(metrics.cellHeight).toBeGreaterThan(0);
    expect(metrics.xStep).toBeGreaterThan(0);
    expect(metrics.yStep).toBeGreaterThan(0);
    expect(metrics.bounds.right).toBeGreaterThan(metrics.bounds.left);
    expect(metrics.bounds.bottom).toBeGreaterThan(metrics.bounds.top);
  });
});
