import { Injectable } from '@nestjs/common';
import { BrailleRecognitionService } from './braille-recognition.service.js';

@Injectable()
export class AppService {
  constructor(private readonly brailleRecognitionService: BrailleRecognitionService) {}

  getHello(): string {
    return 'Hello World!';
  }

  getHealth(): { status: string; app: string } {
    return {
      status: 'ok',
      app: 'braille-reader-api',
    };
  }

  async scanBraille(body: { image?: string; text?: string }): Promise<{
    status: string;
    message: string;
    extractedText: string;
    confidence: number;
    source: 'image' | 'manual';
  }> {
    const source = body.image ? 'image' : 'manual';

    if (body.image) {
      const result = await this.brailleRecognitionService.recognizeBrailleFromImage(body.image);
      return {
        status: 'processed',
        message: 'Braille image processed successfully.',
        extractedText: result.text,
        confidence: result.confidence,
        source,
      };
    }

    const extractedText = body.text ?? 'The quick brown fox jumps over the lazy dog.';

    return {
      status: 'processed',
      message: 'Braille text processed successfully.',
      extractedText,
      confidence: 0.93,
      source,
    };
  }

  generateSpeech(body: { text: string; voice?: string; rate?: number }): {
    status: string;
    message: string;
    text: string;
    voice: string;
    rate: number;
  } {
    return {
      status: 'ready',
      message: 'Speech generation is configured for mobile playback.',
      text: body.text,
      voice: body.voice ?? 'default',
      rate: body.rate ?? 1,
    };
  }
}
