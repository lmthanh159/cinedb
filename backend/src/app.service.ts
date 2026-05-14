import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getRoot() {
    return {
      name: 'CineDB API',
      version: '0.1.0',
      docs: '/api/docs',
      health: '/api/v1/health',
    };
  }
}

