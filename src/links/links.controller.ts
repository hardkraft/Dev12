import { Controller, Get, Post, Body, Param, HttpStatus, Res, Req, Query } from '@nestjs/common';
import { LinksService } from './links.service';
import { LinkDto } from './dto/link.dto';
import { IdempotencyHook } from './IdempotencyCreateHook';

@Controller('links')
export class LinksController {
  constructor(private readonly linksService: LinksService, private readonly idempotencyHook: IdempotencyHook) { }

  @Post()
  async create(@Req() req, @Res({ passthrough: true }) res, @Body() createLinkDto: LinkDto) {
    const retrieved = await this.idempotencyHook.handleIdempotencyCreate(req, res);
    // create new link only if not found in cache
    if (retrieved === false) {
      return this.linksService.create(createLinkDto);
    }
  }

  @Get()
  findAll(@Query() query: { limit?: string, offset?: string, search?: string }) {
    const limit = query.limit ? parseInt(query.limit, 10) : undefined;
    const offset = query.offset ? parseInt(query.offset, 10) : undefined;
    return this.linksService.findAll({ limit, offset, search: query.search });
  }

  @Get(':slug')
  async findOne(@Res() res, @Param('slug') slug: string) {
    // technically not idempotent since visits are increased
    const url = await this.linksService.findOne(slug);
    res.status(HttpStatus.FOUND).redirect(url);
  }
}
