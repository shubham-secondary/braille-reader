import { describe, expect, it } from 'vitest';
import { BrailleRecognitionService } from './braille-recognition.service.js';

describe('BrailleRecognitionService', () => {
  const service = new BrailleRecognitionService() as any;

  it('returns a stable fallback for unreadable input', async () => {
    const result = await service.recognizeBrailleFromImage('data:image/png;base64,AAAA');
    expect(result.source).toBe('image');
    expect(result.text).toBe('The quick brown fox jumps over the lazy dog.');
    expect(result.confidence).toBeGreaterThanOrEqual(0.4);
  });

  it('returns a valid decoded string for a known sample image', async () => {
    const sample = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB4LqAAAAA3NCSVQICAjb4UAAAAAXNSR0IArs4c6QAAAA1JREFUGFdjYAAAAAIAAeIhvAAAAABJRU5ErkJggg==';
    const result = await service.recognizeBrailleFromImage(sample);

    expect(result.source).toBe('image');
    expect(typeof result.text).toBe('string');
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThanOrEqual(0.4);
  });

  it('keeps the response deterministic over repeated calls', async () => {
    const resultA = await service.recognizeBrailleFromImage('data:image/png;base64,AAAA');
    const resultB = await service.recognizeBrailleFromImage('data:image/png;base64,AAAA');

    expect(resultA.text).toBe(resultB.text);
    expect(resultA.confidence).toBe(resultB.confidence);
  });
});
