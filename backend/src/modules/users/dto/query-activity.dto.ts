import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

import { QueryUserListDto } from '@/modules/users/dto/query-user-list.dto';

export class QueryActivityDto extends QueryUserListDto {
  @ApiPropertyOptional({ example: 'RATE' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  type?: string;
}
