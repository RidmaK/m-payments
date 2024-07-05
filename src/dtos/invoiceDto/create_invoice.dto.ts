import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  isNumber,
} from 'class-validator';
export class CreateInvoiceDto {
  @IsString()
  @IsNotEmpty({ message: 'Please add payment' })
  @IsOptional()
  payment_id: string;

  @IsString()
  @IsOptional()
  invoice_id?: string | null;

  @IsNotEmpty({ message: 'Please add amount' })
  @IsNumber()
  amount: number;

  @IsString()
  @IsOptional()
  customer_email?: string | null;
  
  @IsString()
  @IsOptional()
  hosted_invoice_url?: string | null;

  @IsString()
  @IsNotEmpty({ message: 'Please add status' })
  status: string;
}
