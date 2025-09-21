import { Module } from '@nestjs/common';
import { LinksService } from './links.service';
import { LinksController } from './links.controller';
import { PrismaService } from './prisma.service';
import { IdempotencyHook } from './IdempotencyCreateHook';

@Module({
  controllers: [LinksController],
  providers: [LinksService, PrismaService, IdempotencyHook],
})
export class LinksModule { }
