import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LinksModule } from './links/links.module';
import { LinksService } from './links/links.service';
import { PrismaService } from './links/prisma.service';

@Module({
  imports: [LinksModule],
  controllers: [AppController],
  providers: [AppService, LinksService, PrismaService],
})
export class AppModule { }
