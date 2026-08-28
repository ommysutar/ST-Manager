import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { ProjectsModule } from "../projects/projects.module";
import { StudioDocumentsController } from "./studio-documents.controller";
import { StudioDocumentsRepository } from "./studio-documents.repository";
import { StudioDocumentsService } from "./studio-documents.service";

@Module({
  imports: [AuthModule, ProjectsModule],
  controllers: [StudioDocumentsController],
  providers: [StudioDocumentsService, StudioDocumentsRepository],
  exports: [StudioDocumentsRepository],
})
export class StudioDocumentsModule {}
