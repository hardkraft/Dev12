import { BadRequestException, GoneException, Injectable, NotFoundException } from '@nestjs/common';
import { LinkDto } from './dto/link.dto';
import { PrismaService } from './prisma.service';

@Injectable()
export class LinksService {
  constructor(private prisma: PrismaService) { }

  private generateSlug(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async create(createLinkDto: LinkDto) {
    try {
      const urlRegex = /^(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,})$/i;
      if (!urlRegex.test(createLinkDto.url)) {
        throw new BadRequestException('Invalid URL format. URL must start with http:// or https://');
      }
      let slug = createLinkDto.slug;
      if (slug && (slug.length < 6 || slug.length > 100)) {
        throw new BadRequestException('Slug needs to be null or at least 6 characters and at most 100 characters long.');
      }
      // create slug if doesn't exist
      if (!slug) {
        slug = this.generateSlug(10);
      }
      let expiresAtDate: Date = null;
      if (createLinkDto.expiresAt) {
        expiresAtDate = new Date(createLinkDto.expiresAt);
        if (expiresAtDate < new Date()) {
          throw new BadRequestException('Expiration date cannot be in the past.');
        }
      }
      const link = await this.prisma.links.create({
        data: {
          slug,
          url: createLinkDto.url,
          expiresat: expiresAtDate,
          visits: 0,
        },
      });
      return link;
    } catch (e: any) {
      console.error(e, createLinkDto);
      // Handle Prisma unique constraint error
      if (e?.code === 'P2002' && e?.meta?.target?.includes('slug')) {
        throw new BadRequestException('Slug already exists. Please choose a different slug.');
      }
      throw e;
    }
  }

  async findAll(query: { limit?: number, offset?: number, search?: string }) {
    try {
      const { limit = 10, offset = 0, search } = query;

      const findManyOptions: any = {};
      const whereClause: any = {};

      if (search) {
        whereClause.OR = [
          { slug: { contains: search, mode: 'insensitive' } },
          { url: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (Object.keys(whereClause).length > 0) {
        findManyOptions.where = whereClause;
      }

      if (limit !== undefined) {
        findManyOptions.take = Number(limit);
      }
      if (offset !== undefined) {
        findManyOptions.skip = Number(offset);
      }

      const [items, total] = await this.prisma.$transaction([
        this.prisma.links.findMany(findManyOptions),
        this.prisma.links.count({ where: whereClause }),
      ]);

      return {
        items,
        total,
        limit: Number(limit),
        offset: Number(offset),
      };
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async findOne(slug: string) {
    try {
      // Use a transaction to ensure atomic read-and-update
      const result = await this.prisma.$transaction(async (tx) => {
        const link = await tx.links.findUnique({
          where: { slug },
        });

        if (!link) {
          throw new NotFoundException();
        }

        // Check expiration within the transaction
        if (link.expiresat && link.expiresat < new Date()) {
          throw new GoneException('Link has expired.');
        }

        // Update visits count atomically
        await tx.links.update({
          where: { slug },
          data: {
            visits: { increment: 1 },
          },
        });

        return link;
      });

      return result.url;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async update(slug: string) {
    try {
      const link = await this.prisma.links.update({
        where: { slug },
        data: {
          visits: { increment: 1 }
        },
      });
      return link;
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  }

  async remove(slug: string) {
    try {
      await this.prisma.links.delete({ where: { slug } });
      return { success: true };
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  }
}
