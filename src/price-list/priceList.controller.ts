import { Get, Post } from '@nestjs/common/decorators/http/request-mapping.decorator';
import { Body, Controller } from '@nestjs/common';
import { PriceListService } from './priceList.service';

@Controller('price-list')
export class PriceListController {
  constructor(private priceListService: PriceListService) {}

  //Get all subscriptions
  @Get()
  async GetAllPriceList() {
    return await this.priceListService.GetAllPriceList();
  }

  //create pricelist
  @Post()
  async CreatePriceList(
    @Body() body: any,
  ) {
    return await this.priceListService.CreatePriceList(body);
  }
}
