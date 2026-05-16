import { Client } from '@elastic/elasticsearch';
import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ElasticsearchService {
  private readonly client: Client;
  private readonly logger = new Logger(ElasticsearchService.name);

  constructor(configService: ConfigService) {
    this.client = new Client({
      node: configService.get<string>('ELASTICSEARCH_URL', 'http://localhost:9200'),
      headers: {
        accept: 'application/vnd.elasticsearch+json; compatible-with=8',
        'content-type': 'application/vnd.elasticsearch+json; compatible-with=8',
      },
    });
  }

  async isAvailable() {
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      this.logger.warn(`Elasticsearch unavailable: ${String(error)}`);
      return false;
    }
  }

  async createIndex(name: string, mapping: Record<string, unknown>) {
    const exists = await this.client.indices.exists({ index: name });

    if (exists) {
      return;
    }

    await this.client.indices.create({
      index: name,
      ...mapping,
    });
  }

  async indexDocument(index: string, id: number | string, body: Record<string, unknown>) {
    await this.client.index({
      index,
      id: String(id),
      document: body,
      refresh: true,
    });
  }

  async bulkIndex(
    index: string,
    documents: Array<{ id: number | string; body: Record<string, unknown> }>,
  ) {
    if (documents.length === 0) {
      return;
    }

    const operations = documents.flatMap((document) => [
      {
        index: {
          _index: index,
          _id: String(document.id),
        },
      },
      document.body,
    ]);

    const response = await this.client.bulk({
      refresh: true,
      operations,
    });

    if (response.errors) {
      this.logger.warn(`Bulk index completed with errors for index ${index}.`);
    }
  }

  async search<TDocument = Record<string, unknown>>(
    index: string | string[],
    query: Record<string, unknown>,
  ) {
    return this.client.search<TDocument>({
      index,
      ...query,
    });
  }

  async deleteDocument(index: string, id: number | string) {
    try {
      await this.client.delete({
        index,
        id: String(id),
        refresh: true,
      });
    } catch (error) {
      this.logger.warn(`Failed to delete ${index}/${id}: ${String(error)}`);
    }
  }

  async deleteIndex(name: string) {
    const exists = await this.client.indices.exists({ index: name });

    if (exists) {
      await this.client.indices.delete({ index: name });
    }
  }
}
