import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsModule } from './events/events.module';
import { RecommenderModule } from './recommender/recommender.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: Number(config.get<string>('DB_PORT', '5432')),
        username: config.get<string>('DB_USER', 'calendar'),
        password: config.get<string>('DB_PASSWORD', 'calendar'),
        database: config.get<string>('DB_NAME', 'calendar'),
        autoLoadEntities: true,
        // 개발 편의용: 엔티티 변경 시 스키마 자동 반영. 운영 환경에서는 migration 사용 권장.
        synchronize: config.get<string>('NODE_ENV') !== 'production',
      }),
    }),
    EventsModule,
    RecommenderModule,
  ],
})
export class AppModule {}
