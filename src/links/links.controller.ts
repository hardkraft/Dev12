import { Controller, Get, Post, Body, Param, HttpStatus, Res, Query } from '@nestjs/common';
import { LinksService } from './links.service';
import { LinkDto } from './dto/link.dto';

@Controller('links')
export class LinksController {
  constructor(private readonly linksService: LinksService) { }

  @Post()
  create(@Body() createLinkDto: LinkDto) {
    return this.linksService.create(createLinkDto);
  }

  @Get()
  findAll(@Query() query: { limit?: string, offset?: string, search?: string }) {
    const limit = query.limit ? parseInt(query.limit, 10) : undefined;
    const offset = query.offset ? parseInt(query.offset, 10) : undefined;
    return this.linksService.findAll({ limit, offset, search: query.search });
  }

  @Get(':slug')
  async findOne(@Res({ passthrough: true }) res, @Param('slug') slug: string) {
    const url = await this.linksService.findOne(slug);
    res.status(HttpStatus.FOUND).redirect(url);
  }
}
