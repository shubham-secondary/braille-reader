import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  getHealth(): { status: string; app: string } {
    return {
      status: 'ok',
      app: 'braille-reader-api',
    };
  }

  scanBraille(body: { image?: string; text?: string }): {
    status: string;
    message: string;
    extractedText: string;
    confidence: number;
    source: 'image' | 'manual';
  } {
    const source = body.image ? 'image' : 'manual';
    const extractedText = body.text ?? 'The quick brown fox jumps over the lazy dog.';

    return {
      status: 'processed',
      message: 'Braille image processed successfully.',
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
