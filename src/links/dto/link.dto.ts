import { IsNotEmpty, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
export class LinkDto {
	@IsNotEmpty()
	@IsUrl({ require_protocol: true }, { message: 'URL must be a valid http or https address.' })
	url: string;

	@IsOptional()
	@IsString()
	@MinLength(6, { message: 'Slug must be at least 6 characters long if provided.' })
	slug?: string;

	@IsOptional()
	@Type(() => Date)
	expiresAt?: Date;
}
