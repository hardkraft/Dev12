import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';

describe('AppController (e2e)', () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello Shortener');
  });

  describe('Links (e2e)', () => {
    let createdLink: any;

    it('POST /links - should create a link with custom slug', () => {
      const linkData = {
        url: 'https://example.com',
        slug: `test123-${Date.now()}`,
        expiresAt: '2025-12-31T23:59:59.000Z',
      };

      return request(app.getHttpServer())
        .post('/links')
        .send(linkData)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('slug', linkData.slug);
          expect(res.body).toHaveProperty('url', 'https://example.com');
          expect(res.body).toHaveProperty('expiresat');
          expect(res.body).toHaveProperty('visits', 0);
          createdLink = res.body;
        });
    });

    it('POST /links - should create a link with auto-generated slug', () => {
      const linkData = {
        url: 'https://google.com/test',
        expiresAt: '2025-12-31T23:59:59.000Z',
      };

      return request(app.getHttpServer())
        .post('/links')
        .send(linkData)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('slug');
          expect(res.body.slug).toHaveLength(10);
          expect(res.body).toHaveProperty('url', 'https://google.com/test');
          expect(res.body).toHaveProperty('visits', 0);
        });
    });

    it('POST /links - should create a link without expiration', () => {
      const linkData = {
        url: 'https://github.com',
        slug: `testgithub123-${Date.now()}`,
      };

      return request(app.getHttpServer())
        .post('/links')
        .send(linkData)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('slug', linkData.slug);
          expect(res.body).toHaveProperty('url', linkData.url);
          expect(res.body.expiresat).toBeNull();
        });
    });

    it('POST /links - should reject invalid URL format', () => {
      const linkData = {
        url: 'invalid-url',
        slug: 'test123',
      };

      return request(app.getHttpServer())
        .post('/links')
        .send(linkData)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('URL must be a valid http or https address.');
        });
    });

    it('POST /links - should reject URL without protocol', () => {
      const linkData = {
        url: 'example.com',
        slug: 'test123',
      };

      return request(app.getHttpServer())
        .post('/links')
        .send(linkData)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('URL must be a valid http or https address.');
        });
    });

    it('POST /links - should reject slug shorter than 6 characters', () => {
      const linkData = {
        url: 'https://example.com',
        slug: 'abc',
      };

      return request(app.getHttpServer())
        .post('/links')
        .send(linkData)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Slug must be at least 6 characters long if provided.');
        });
    });

    it('POST /links - should reject past expiration date', () => {
      const linkData = {
        url: 'https://example.com',
        slug: 'test123',
        expiresAt: '2020-01-01T00:00:00.000Z',
      };

      return request(app.getHttpServer())
        .post('/links')
        .send(linkData)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Expiration date cannot be in the past');
        });
    });

    it('GET /links - should return all links', () => {
      return request(app.getHttpServer())
        .get('/links')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.items)).toBe(true);
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('limit');
          expect(res.body).toHaveProperty('offset');
        });
    });

    it('GET /links/:slug - should redirect to original URL', () => {
      // Use the slug from the created link
      const slug = createdLink?.slug || 'test123';
      return request(app.getHttpServer())
        .get(`/links/${slug}`)
        .expect(302)
        .expect('Location', 'https://example.com');
    });

    it('GET /links/:slug - should return 404 for non-existent slug', () => {
      return request(app.getHttpServer())
        .get('/links/nonexistent')
        .expect(404);
    });


    it('GET /links - should support pagination with limit and offset', () => {
      return request(app.getHttpServer())
        .get('/links?limit=5&offset=0')
        .expect(200)
        .expect((res) => {
          expect(res.body.limit).toBe(5);
          expect(res.body.offset).toBe(0);
          expect(Array.isArray(res.body.items)).toBe(true);
        });
    });

    it('GET /links - should support search functionality', () => {
      return request(app.getHttpServer())
        .get('/links?search=example')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.items)).toBe(true);
        });
    });

    it('POST /links - should handle duplicate slug constraint', () => {
      const linkData = {
        url: 'https://duplicate.com',
        slug: createdLink?.slug || 'test123', // Use the same slug as first test
      };

      return request(app.getHttpServer())
        .post('/links')
        .send(linkData)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Slug already exists');
        });
    });
  });
});
