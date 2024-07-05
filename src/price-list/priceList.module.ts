import { Module } from '@nestjs/common';
import { PriceListService } from './priceList.service';
import { PriceListController } from './priceList.controller';
import { PriceListRepository } from './priceList.repository';
import { HttpModule } from '@nestjs/axios';
import { PriceList, PriceListSchema } from './schemas/priceList.schema';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: PriceList.name,
        schema: PriceListSchema,
      },
    ]),
    HttpModule,
  ],
  providers: [PriceListService, PriceListRepository],
  controllers: [PriceListController],
})
export class PriceListModule {}
