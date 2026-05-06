import { Test, TestingModule } from '@nestjs/testing';
import { ProyeccionController } from './proyeccion.controller';
import { ProyeccionService } from './proyeccion.service';

describe('ProyeccionController', () => {
  let controller: ProyeccionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProyeccionController],
      providers: [ProyeccionService],
    }).compile();

    controller = module.get<ProyeccionController>(ProyeccionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
