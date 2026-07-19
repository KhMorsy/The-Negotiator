import type { JobType, Vendor } from "../types";

export interface VendorDirectory {
  findVendors(input: { geo: string; jobType: JobType; limit: number }): Promise<
    Vendor[]
  >;
}

