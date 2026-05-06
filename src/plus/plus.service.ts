import { Injectable } from '@nestjs/common';
import { CreatePlusDto } from './dto/create-plus.dto';
import { UpdatePlusDto } from './dto/update-plus.dto';

@Injectable()
export class PlusService {
  create(createPlusDto: CreatePlusDto) {
    return 'This action adds a new plus';
  }

  findAll() {
    return `This action returns all plus`;
  }

  findOne(id: number) {
    return `This action returns a #${id} plus`;
  }

  update(id: number, updatePlusDto: UpdatePlusDto) {
    return `This action updates a #${id} plus`;
  }

  remove(id: number) {
    return `This action removes a #${id} plus`;
  }
}
