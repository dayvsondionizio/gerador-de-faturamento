export interface MonthlyBilling {
  month: string;
  value: number;
}

export interface BillingFormData {
  companyName: string;
  cnpj: string;
  address: string;
  city: string;
  periodStart: string;
  periodEnd: string;
  monthlyBilling: MonthlyBilling[];
  accountantName: string;
  accountantCrc: string;
  accountantCpf: string;
  reportDate: string;
  reportCity: string;
  logo?: string;
}
