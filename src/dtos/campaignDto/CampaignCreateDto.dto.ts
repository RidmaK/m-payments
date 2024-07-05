import { CampaignStatus } from "src/schemas/campaign.schema";

export class CampaignCreateDto {
  tile: string;
  image_url: string;
  donors: string[];
  required_cost: number;
  collected_cost: number;
  status: CampaignStatus;
  is_general: boolean;
  patient_name: string;
  patient_age: number;
  patient_cause: string;
  patient_occupation: string;
  patient_limb_requirement: string;
}
