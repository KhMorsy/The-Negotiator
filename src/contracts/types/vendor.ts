export interface Vendor {
  id: string;
  name: string;
  phone: string;
  rating: number;
  reviewCount: number;
  insuredBonded: boolean;
  hasGuarantee: boolean;
  source: "places" | "yelp" | "fake";
}

