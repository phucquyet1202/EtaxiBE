/* eslint-disable @typescript-eslint/no-floating-promises */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ⚙️ Cấu hình Swagger
  const config = new DocumentBuilder()
    .setTitle('E-Taxi API') // 🔹 Tên tài liệu
    .setDescription('API documentation for E-Taxi system') // 🔹 Mô tả
    .setVersion('1.0.0') // 🔹 Phiên bản
    .addBearerAuth() // 🔹 Thêm xác thực JWT (nếu có)
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // 🔹 Đường dẫn truy cập Swagger UI
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true }, // Giữ lại token khi reload
  });

  await app.listen(process.env.PORT ?? 8080);
  console.log(
    `🚀 Server running on: http://localhost:${process.env.PORT ?? 8080}`,
  );
  console.log(
    `📚 Swagger docs: http://localhost:${process.env.PORT ?? 8080}/api/docs`,
  );
}

bootstrap();
