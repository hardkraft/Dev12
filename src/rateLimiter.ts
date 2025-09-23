import { HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';

// global rate limiter for all routes
@Injectable()
export class RateLimiter implements NestMiddleware {
	constructor() {
		this.lastAccess = 0;
	}
	private lastAccess: number;

	use = (_req: FastifyRequest, res: FastifyReply["raw"], next: () => void): void => {
		const now = Date.now().valueOf();
		if (this.lastAccess + Number(process.env.RATE_LIMIT) > now) {
			res.writeHead(HttpStatus.TOO_MANY_REQUESTS, { 'content-type': 'application/json' })
			res.write("Rate limit")
			res.end()
			return;
		} else {
			this.lastAccess = now;
			next();
		}
	}
}