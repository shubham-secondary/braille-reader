import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { BrailleRecognitionService } from './braille-recognition.service.js';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, BrailleRecognitionService],
})
export class AppModule {}
