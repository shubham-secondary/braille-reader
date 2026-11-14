import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller('api')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth(): { status: string; app: string } {
    return this.appService.getHealth();
  }

  @Post('scan')
  scanBraille(@Body() body: { image?: string; text?: string }) {
    return this.appService.scanBraille(body);
  }

  @Post('tts')
  generateSpeech(@Body() body: { text: string; voice?: string; rate?: number }) {
    return this.appService.generateSpeech(body);
  }
}
