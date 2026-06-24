import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MlController } from './ml.controller';
import { MlService } from './services/ml.service';
import { TrainingService } from './services/training.service';
import { PredictionService } from './services/prediction.service';
import { AnomalyService } from './services/anomaly.service';
import { DatasetService } from './datasets/dataset.service';
import { TrainingJob } from './jobs/training.job';

@Module({
  imports: [PrismaModule],
  controllers: [MlController],
  providers: [
    MlService,
    TrainingService,
    PredictionService,
    AnomalyService,
    DatasetService,
    TrainingJob,
  ],
  exports: [MlService, PredictionService],
})
export class MlModule {}
