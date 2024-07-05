import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CampaignCreateDto } from '../dtos/campaignDto/CampaignCreateDto.dto';
import { CampaignSearchDto } from '../dtos/campaignDto/CampaignSearchDto.dto';
import { Campaign, CampaignDocument } from '../schemas/campaign.schema';

@Injectable()
export class CampaignRepository {
  constructor(
    @InjectModel(Campaign.name) private campaignModel: Model<CampaignDocument>,
  ) {}

  async createCampaign(
    campaignCreateDto: CampaignCreateDto,
  ): Promise<Campaign> {
    let newCampaign = new this.campaignModel(campaignCreateDto);
    return await newCampaign.save();
  }

  async updateCampaign(id: string, updateCampaign: any): Promise<Campaign> {
    return await this.campaignModel
      .findByIdAndUpdate({ _id: id }, updateCampaign, { new: true })
      .exec();
  }

  async getAllCampaignsEqual(): Promise<Campaign[]> {
    return await this.campaignModel
      .find({ $expr: { $eq: ['$required_cost', '$collected_cost'] } })
      .populate('donors')
      .populate('patient_id');
  }

  async getAllCampaignsNotEqual(): Promise<Campaign[]> {
    return await this.campaignModel
      .find({ $expr: { $ne: ['$required_cost', '$collected_cost'] } })
      .populate('donors')
      .populate('patient_id');
  }

  async getCampaignById(id: string): Promise<Campaign> {
    return await this.campaignModel.findById(id);
  }

  async campaignFilter(
    campaignSearchDto: CampaignSearchDto,
  ): Promise<Campaign[]> {
    if (campaignSearchDto.title) {
      return await this.campaignModel.find({
        title: campaignSearchDto.title,
      });
    }
  }

  async getGeneralCampaign(): Promise<any> {
    return await this.campaignModel.findOne({
      title: 'General Donations',
    });
  }

  async searchCampaign(
    campaignSearchDto: CampaignSearchDto,
  ): Promise<Campaign[]> {
    if (campaignSearchDto.title) {
      let filteredString = campaignSearchDto.title.replace(/\\|]|\[/g, '');

      return await this.campaignModel.find({
        title: { $regex: filteredString },
      });
    }
  }

  async deleteCampaign(id: string): Promise<Campaign> {
    return await this.campaignModel.findByIdAndDelete(id);
  }
}
