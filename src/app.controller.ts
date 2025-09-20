import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { LinksService } from './links/links.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService, private readonly linksService: LinksService) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async health(): Promise<boolean> {
    try {
      return await this.linksService.health();
    } catch (e) {
      console.error('Health check failed:', e);
      return false;
    }
  }

}
