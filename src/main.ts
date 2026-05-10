import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { createGlobalValidationPipe } from "./common/validation.pipe";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api");
  app.useGlobalPipes(createGlobalValidationPipe());

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
