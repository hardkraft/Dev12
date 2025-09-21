import { Test, TestingModule } from '@nestjs/testing';
import { IdempotencyHook } from './IdempotencyCreateHook';
import { FastifyRequest, FastifyReply } from 'fastify';
import { LinkDto } from './dto/link.dto';

describe('IdempotencyCreateHook', () => {
	let hook: IdempotencyHook;
	let mockRequest: Partial<FastifyRequest>;
	let mockResponse: Partial<FastifyReply>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [IdempotencyHook],
		}).compile();

		hook = module.get<IdempotencyHook>(IdempotencyHook);

		// Reset the in-memory store before each test
		(hook as any).idempotencyStore.clear();

		mockRequest = {
			headers: {},
			body: {},
		};

		mockResponse = {
			status: jest.fn().mockReturnThis(),
			send: jest.fn().mockReturnThis(),
		};
	});

	it('should be defined', () => {
		expect(hook).toBeDefined();
	});

	describe('handleIdempotencyCreate', () => {
		it('should return false when no idempotency key is provided', async () => {
			mockRequest.headers = {};
			mockRequest.body = { url: 'https://example.com', slug: 'test123' };

			const result = await hook.handleIdempotencyCreate(
				mockRequest as FastifyRequest,
				mockResponse as FastifyReply
			);

			expect(result).toBe(false);
		});

		it('should return false when idempotency key is provided but no cached response exists', async () => {
			mockRequest.headers = { 'idempotency-key': 'test-key-123' };
			mockRequest.body = { url: 'https://example.com', slug: 'test123' };

			const result = await hook.handleIdempotencyCreate(
				mockRequest as FastifyRequest,
				mockResponse as FastifyReply
			);

			expect(result).toBe(false);
		});

		it('should return cached response when idempotency key exists in cache', async () => {
			const idempotencyKey = 'test-key-123';
			const linkData = { url: 'https://example.com', slug: 'test123' };
			const cachedResponse = {
				status: 201,
				body: { slug: 'test123', url: 'https://example.com', visits: 0 }
			};

			// Pre-populate the cache
			const storeKey = `${linkData.url} ${linkData.slug}`;
			(hook as any).idempotencyStore.set(storeKey, cachedResponse);

			mockRequest.headers = { 'idempotency-key': idempotencyKey };
			mockRequest.body = linkData;

			const result = await hook.handleIdempotencyCreate(
				mockRequest as FastifyRequest,
				mockResponse as FastifyReply
			);

			// The hook returns the response object when cache hit
			expect(result).toBe(mockResponse);
			expect(mockResponse.status).toHaveBeenCalledWith(201);
			expect(mockResponse.send).toHaveBeenCalledWith(cachedResponse.body);
		});

		it('should create store key from url and slug when idempotency key is provided', async () => {
			const idempotencyKey = 'test-key-123';
			const linkData = { url: 'https://example.com', slug: 'test123' };

			mockRequest.headers = { 'idempotency-key': idempotencyKey };
			mockRequest.body = linkData;

			const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

			await hook.handleIdempotencyCreate(
				mockRequest as FastifyRequest,
				mockResponse as FastifyReply
			);

			expect(consoleSpy).toHaveBeenCalledWith('https://example.com test123');
			consoleSpy.mockRestore();
		});

		it('should intercept and cache response when idempotency key is provided', async () => {
			const idempotencyKey = 'test-key-123';
			const linkData = { url: 'https://example.com', slug: 'test123' };
			const responseBody = { slug: 'test123', url: 'https://example.com', visits: 0 };

			mockRequest.headers = { 'idempotency-key': idempotencyKey };
			mockRequest.body = linkData;
			mockResponse.statusCode = 201;

			const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

			const result = await hook.handleIdempotencyCreate(
				mockRequest as FastifyRequest,
				mockResponse as FastifyReply
			);

			expect(result).toBe(false);
			expect(typeof mockResponse.send).toBe('function');

			// Simulate sending a response
			mockResponse.send(responseBody);

			// Check that the response was cached
			const storeKey = `${linkData.url} ${linkData.slug}`;
			const cached = (hook as any).idempotencyStore.get(storeKey);
			expect(cached).toEqual({
				status: 201,
				body: responseBody
			});

			expect(consoleSpy).toHaveBeenCalledWith('storing', 201, responseBody);
			consoleSpy.mockRestore();
		});

		it('should handle requests without slug in body', async () => {
			const idempotencyKey = 'test-key-123';
			const linkData = { url: 'https://example.com' }; // No slug

			mockRequest.headers = { 'idempotency-key': idempotencyKey };
			mockRequest.body = linkData;

			const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

			const result = await hook.handleIdempotencyCreate(
				mockRequest as FastifyRequest,
				mockResponse as FastifyReply
			);

			expect(result).toBe(false);
			expect(consoleSpy).toHaveBeenCalledWith('https://example.com undefined');
			consoleSpy.mockRestore();
		});

		it('should handle multiple different requests with same idempotency key', async () => {
			const idempotencyKey = 'test-key-123';
			const linkData1 = { url: 'https://example.com', slug: 'test123' };
			const linkData2 = { url: 'https://google.com', slug: 'google123' };

			// First request
			mockRequest.headers = { 'idempotency-key': idempotencyKey };
			mockRequest.body = linkData1;
			mockResponse.statusCode = 201;

			await hook.handleIdempotencyCreate(
				mockRequest as FastifyRequest,
				mockResponse as FastifyReply
			);

			// Simulate response
			mockResponse.send({ slug: 'test123', url: 'https://example.com', visits: 0 });

			// Second request with different data
			mockRequest.body = linkData2;
			mockResponse.statusCode = 201;

			const result = await hook.handleIdempotencyCreate(
				mockRequest as FastifyRequest,
				mockResponse as FastifyReply
			);

			expect(result).toBe(false); // Should not find cached response for different data
		});

		it('should handle same request data with different idempotency keys', async () => {
			const linkData = { url: 'https://example.com', slug: 'test123' };
			const responseBody = { slug: 'test123', url: 'https://example.com', visits: 0 };

			// First request with key1
			mockRequest.headers = { 'idempotency-key': 'key1' };
			mockRequest.body = linkData;
			mockResponse.statusCode = 201;

			await hook.handleIdempotencyCreate(
				mockRequest as FastifyRequest,
				mockResponse as FastifyReply
			);
			mockResponse.send(responseBody);

			// Second request with key2 but same data - should find cached response
			mockRequest.headers = { 'idempotency-key': 'key2' };
			mockRequest.body = linkData;
			mockResponse.statusCode = 201;

			const result = await hook.handleIdempotencyCreate(
				mockRequest as FastifyRequest,
				mockResponse as FastifyReply
			);

			// Should find cached response since store key is based on URL+slug, not idempotency key
			expect(result).toBe(mockResponse);
		});

		it('should restore cached response and log the action', async () => {
			const idempotencyKey = 'test-key-123';
			const linkData = { url: 'https://example.com', slug: 'test123' };
			const cachedResponse = {
				status: 201,
				body: { slug: 'test123', url: 'https://example.com', visits: 0 }
			};

			// Pre-populate the cache
			const storeKey = `${linkData.url} ${linkData.slug}`;
			(hook as any).idempotencyStore.set(storeKey, cachedResponse);

			mockRequest.headers = { 'idempotency-key': idempotencyKey };
			mockRequest.body = linkData;

			const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

			const result = await hook.handleIdempotencyCreate(
				mockRequest as FastifyRequest,
				mockResponse as FastifyReply
			);

			expect(result).toBe(mockResponse);
			expect(consoleSpy).toHaveBeenCalledWith('restoring', cachedResponse);
			consoleSpy.mockRestore();
		});

		it('should handle error responses in cache', async () => {
			const idempotencyKey = 'test-key-123';
			const linkData = { url: 'https://example.com', slug: 'test123' };
			const errorResponse = {
				status: 400,
				body: { message: 'Invalid URL format', error: 'Bad Request', statusCode: 400 }
			};

			// Pre-populate the cache with error response
			const storeKey = `${linkData.url} ${linkData.slug}`;
			(hook as any).idempotencyStore.set(storeKey, errorResponse);

			mockRequest.headers = { 'idempotency-key': idempotencyKey };
			mockRequest.body = linkData;

			const result = await hook.handleIdempotencyCreate(
				mockRequest as FastifyRequest,
				mockResponse as FastifyReply
			);

			expect(result).toBe(mockResponse);
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.send).toHaveBeenCalledWith(errorResponse.body);
		});

		it('should preserve original send method functionality', async () => {
			const idempotencyKey = 'test-key-123';
			const linkData = { url: 'https://example.com', slug: 'test123' };
			const responseBody = { slug: 'test123', url: 'https://example.com', visits: 0 };

			mockRequest.headers = { 'idempotency-key': idempotencyKey };
			mockRequest.body = linkData;
			mockResponse.statusCode = 201;

			const originalSend = jest.fn().mockReturnValue('original-result');
			mockResponse.send = originalSend;

			await hook.handleIdempotencyCreate(
				mockRequest as FastifyRequest,
				mockResponse as FastifyReply
			);

			// The send method should be wrapped but still call the original
			const result = mockResponse.send(responseBody);
			expect(result).toBe('original-result');
			expect(originalSend).toHaveBeenCalledWith(responseBody);
		});
	});

	describe('onModuleInit', () => {
		it('should be callable without errors', () => {
			expect(() => hook.onModuleInit()).not.toThrow();
		});
	});
});
