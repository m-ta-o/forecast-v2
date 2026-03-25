import { IndustryBenchmark, BusinessModelType } from '@/types/wizard';

export const industryBenchmarks: Record<BusinessModelType, IndustryBenchmark> = {
  supplement: {
    grossMarginMin: 65,
    grossMarginMax: 75,
    avgCAC: 35,
    avgOrderValue: 52,
    annualRetention: 88,
    avgCOGS: 6.50,
    avgSellingPrice: 29.99,
    typicalChannelMix: {
      dtc: 60,
      retail: 25,
      amazon: 15,
    },
  },
  'cpg-food': {
    grossMarginMin: 45,
    grossMarginMax: 60,
    avgCAC: 28,
    avgOrderValue: 38,
    annualRetention: 75,
    avgCOGS: 4.20,
    avgSellingPrice: 18.99,
    typicalChannelMix: {
      dtc: 30,
      retail: 50,
      amazon: 20,
    },
  },
  beauty: {
    grossMarginMin: 70,
    grossMarginMax: 85,
    avgCAC: 42,
    avgOrderValue: 68,
    annualRetention: 82,
    avgCOGS: 8.50,
    avgSellingPrice: 49.99,
    typicalChannelMix: {
      dtc: 70,
      retail: 20,
      amazon: 10,
    },
  },
  'fitness-equipment': {
    grossMarginMin: 40,
    grossMarginMax: 55,
    avgCAC: 65,
    avgOrderValue: 145,
    annualRetention: 65,
    avgCOGS: 45.00,
    avgSellingPrice: 129.99,
    typicalChannelMix: {
      dtc: 40,
      retail: 35,
      amazon: 25,
    },
  },
};
