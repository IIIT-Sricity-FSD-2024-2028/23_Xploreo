export class Guide {
  userId!: string;
  fname!: string;
  lname!: string;
  email!: string;
  phone!: number;
  location!: string;
  prof_title!: string;
  years_exp!: number;
  bio!: string;
  lang_spoken!: string[];
  certifications!: string[];
  bank_name!: string;
  bank_acc_num_end!: number;
  iban!: string;
  pricePerDay?: number;
  rating?: number;
  totalRatings?: number;
  avatar?: string;
}
