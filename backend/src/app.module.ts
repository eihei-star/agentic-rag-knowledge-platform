import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MongooseModule } from "@nestjs/mongoose";
import { MailerModule } from "@nestjs-modules/mailer";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { DocumentModule } from "./document/document.module";
import { DocumentEntity } from "./document/entities/document.entity";
import { DocumentReviewEntity } from "./document/entities/document-review.entity";
import { AuthModule } from "./auth/auth.module";
import { UserEntity } from "./user/entities/user.entity";
import { RoleEntity } from "./user/entities/role.entity";
import { UserRoleEntity } from "./user/entities/user-role.entity";
import { PermissionEntity } from "./user/entities/permission.entity";
import { RolePermissionEntity } from "./user/entities/role-permission.entity";
import { UserPermissionEntity } from "./user/entities/user-permission.entity";
import { TeamEntity } from "./team/entities/team.entity";
import { TeamMemberEntity } from "./team/entities/team-member.entity";
import { TeamModule } from "./team/team.module";
import { RedisModule } from "./redis/redis.module";
import { MqModule } from "./mq/mq.module";
import { PipelineModule } from "./pipeline/pipeline.module";
import { StorageModule } from "./storage/storage.module";
import { SearchModule } from "./search/search.module";
import { AiModule } from "./ai/ai.module";
import { GraphModule } from "./graph/graph.module";
import { AiSessionEntity } from "./ai/entities/ai-session.entity";
import { AiMessageEntity } from "./ai/entities/ai-message.entity";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule,
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>("MAIL_HOST"),
          port: Number(configService.get<string>("MAIL_PORT")),
          secure: configService.get<string>("MAIL_SECURE") === "true",
          auth: {
            user: configService.get<string>("MAIL_USER"),
            pass: configService.get<string>("MAIL_PASS"),
          },
        },
        defaults: {
          from: configService.get<string>("MAIL_FROM"),
        },
      }),
    }),
    PipelineModule,
    MqModule,
    StorageModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres" as const,
        host: config.get<string>("POSTGRES_HOST", "localhost"),
        port: config.get<number>("POSTGRES_PORT", 5432),
        username: config.get<string>("POSTGRES_USER", "user"),
        password: config.get<string>("POSTGRES_PASSWORD", "123456"),
        database: config.get<string>("POSTGRES_DB", "knowledge_hub"),
        entities: [
          DocumentEntity,
          DocumentReviewEntity,
          UserEntity,
          RoleEntity,
          UserRoleEntity,
          PermissionEntity,
          RolePermissionEntity,
          UserPermissionEntity,
          TeamEntity,
          TeamMemberEntity,
          AiSessionEntity,
          AiMessageEntity,
        ],
        synchronize: false,
      }),
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>(
          "MONGO_URI",
          "mongodb://mongo_user:mongo_pass123@localhost:27017/knowledge_hub?authSource=admin",
        ),
      }),
    }),
    DocumentModule,
    AuthModule,
    TeamModule,
    SearchModule,
    AiModule,
    GraphModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
