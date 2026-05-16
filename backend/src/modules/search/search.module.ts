import { Module } from '@nestjs/common';

import { ElasticsearchService } from '@/modules/search/elasticsearch.service';
import { SearchSyncService } from '@/modules/search/search-sync.service';
import { SearchController } from '@/modules/search/search.controller';
import { SearchService } from '@/modules/search/search.service';

@Module({
  controllers: [SearchController],
  providers: [ElasticsearchService, SearchService, SearchSyncService],
  exports: [SearchSyncService],
})
export class SearchModule {}
