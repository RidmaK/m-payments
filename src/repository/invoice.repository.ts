import { Invoice, InvoiceDocument, Status } from '../schemas/Invoice.schema';
import { Injectable, Logger } from '@nestjs/common';

import { CreateInvoiceDto } from '../dtos/invoiceDto/create_invoice.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as address from 'address';

const ip = address.ip();
@Injectable()
export class InvoiceRepository {
  private readonly logger = new Logger(
    `${ip} src/invoice/invoice.repository.ts`,
  );
  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
  ) {}

  async createInvoice(createInvoiceDto: CreateInvoiceDto) {
    try {
      const {
        payment_id,
        invoice_id,
        amount,
        customer_email,
        hosted_invoice_url,
        status,
      } = createInvoiceDto;

      const newInvoice = new this.invoiceModel({
        payment_id,
        invoice_id,
        amount,
        customer_email,
        hosted_invoice_url,
        status,
      });

      return await newInvoice.save();
    } catch (err) {
      this.logger.error(`Create invoice Error: ${err}`);
      throw new Error(`Create invoice Error: ${err}`);
    }
  }

  async updateInvoiceByPaymentId(
    invoice_id: string,
    payment_id: string,
    status: string,
  ): Promise<Invoice> {
    try {
      return await this.invoiceModel
        .findByIdAndUpdate(
          { payment_id: payment_id },
          { status: status },
          { invoice_id: invoice_id },
        )
        .exec();
    } catch (error) {
      this.logger.error(
        `Update Invoice Error: ${error} time=${new Date().getTime()}`,
      );
      throw new Error('updateInvoice Error');
    }
  }

  async updateInvoice(invoice_id: string, status: string): Promise<Invoice> {
    try {
      return await this.invoiceModel
        .findByIdAndUpdate(
          { invoice_id: invoice_id },
          { status: status },
          { new: true },
        )
        .exec();
    } catch (error) {
      this.logger.error(
        `Update Invoice Error: ${error} time=${new Date().getTime()}`,
      );
      throw new Error('updateInvoice Error');
    }
  }

  async findOneByInvoiceId(id: string): Promise<Invoice> {
    try {
      const invoices = await this.invoiceModel.findOne({ invoice_id: id });
      this.logger.log(`invoices  ${invoices}`);
      return invoices;
    } catch (error) {
      this.logger.error(
        `Get Invoice By Invoice Id Error: ${error} time=${new Date().getTime()}`,
      );
      throw new Error('find one by Invoice error');
    }
  }
}
