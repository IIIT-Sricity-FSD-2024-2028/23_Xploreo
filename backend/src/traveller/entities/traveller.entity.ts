export enum Interest {
  ADVENTURE = 'Adventure',
  CULTURE = 'Culture',
  FOOD = 'Food',
  NATURE = 'Nature',
  HISTORY = 'History',
}

export class Traveller {
  userId!: string;
  fname!: string;
  lname!: string;
  email!: string;
  phno!: number;
  plang!: string[];
  bio!: string;
  interests!: Interest[];
  gender?: string;
  dob?: string;
  status?: 'active' | 'restricted';
  isDeleted?: boolean;
}
