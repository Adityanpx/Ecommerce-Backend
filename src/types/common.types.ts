export interface ListQuery {
  page?: string;
  limit?: string;
  search?: string;
  sort?: string;
}

export type SortDirection = 'asc' | 'desc';

export interface AddressSnapshot {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
}
