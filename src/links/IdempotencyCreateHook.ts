import { Injectable, OnModuleInit } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { LinkDto } from './dto/link.dto';

// can be used as middleware too
@Injectable()
export class IdempotencyHook implements OnModuleInit {
	onModuleInit() { }
	// in memory cache
	private readonly idempotencyStore = new Map<string, any>();

	// for post create req only
	async handleIdempotencyCreate(req: FastifyRequest, res: FastifyReply) {
		const idempotencyKey = req.headers['idempotency-key'];
		let storeKey: string;

		// create global key for same requests
		if (idempotencyKey) {
			const body = req.body as LinkDto;
			// throw away expiry since same slugs should be rejected
			storeKey = `${body.url} ${body.slug}`
			console.log(storeKey);

			if (this.idempotencyStore.has(storeKey)) {
				const cachedResponse = this.idempotencyStore.get(storeKey);
				console.log('restoring', cachedResponse)
				return res.status(cachedResponse.status).send(cachedResponse.body);
			}

			// Intercept the response to cache it
			if (storeKey) {
				const originalSend = res.send.bind(res);
				res.send = (body: any) => {
					console.log('storing', res.statusCode, body)
					this.idempotencyStore.set(storeKey, {
						status: res.statusCode,
						body,
					});
					return originalSend(body);
				};
				return false;
			}
		}
		// nothing returned from cache
		return false;
	}
}