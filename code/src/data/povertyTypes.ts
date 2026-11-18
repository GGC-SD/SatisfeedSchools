export interface PovertyTractDoc {
  geoid: string;
  name: string;
  state: string;
  county: string;
  tract: string;
  totalPopulation: number;
  belowPoverty: number;
  povertyRate: number;
  period: string;
  source: string;
}

export interface SchoolPovertyFields {
  povertyRate: number;
  povertyPeriod: string;
  povertyTractGeoid: string;
  povertySource: string;
  povertyTotalPopulation: number;
  povertyBelowCount: number;
}