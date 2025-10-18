export interface ChargePoint {
  code: string;
  name: string;
  no_of_connectors: number;
  location: {
    city: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  status: string;
  pricing: {
    time_based: {
      rate: number;
      unit: string;
    };
    energy_based: {
      rate: number;
      unit: string;
    };
  };
  connectors: {
    id: string;
    type: string;
    power_kw: number;
    status: string;
  }[];
}
