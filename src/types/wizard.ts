export type MarketRegion = 'US' | 'AU' | 'UK' | 'CA' | 'EU' | 'OTHER';

export type CapitalSituation =
  | 'bootstrapped'
  | 'small-seed'
  | 'series-a';

export type BusinessGoal =
  | 'profitability'
  | 'growth-funding'
  | 'lifestyle';

export interface MarketResearch {
  avgRetailPrice: number;
  priceRange: { min: number; max: number };
  priceUnit: string;
  typicalCOGS: number;
  cogsRange: { min: number; max: number };
  grossMarginPercent: number;
  purchaseFrequencyMonths: number;
  competitorExamples: string[];
  marketInsights: string;
  currency: string;
}

export interface WizardState {
  marketRegions: MarketRegion[];
  productDescription: string;
  productFormat?: string; // Optional: product format (e.g., "capsules", "gummies", "powder", "liquid")
  pricingUnit?: string; // Optional: user-specified pricing unit (e.g., "per bottle", "per unit", "per serving")
  marketResearch: Record<MarketRegion, MarketResearch> | null;
  capitalSituation: CapitalSituation;
  businessGoal: BusinessGoal;
  completed: boolean;
}

export interface IndustryBenchmark {
  grossMarginMin: number;
  grossMarginMax: number;
  avgCAC: number;
  avgOrderValue: number;
  annualRetention: number;
  avgCOGS: number;
  avgSellingPrice: number;
  typicalChannelMix: {
    dtc: number;
    retail: number;
    amazon: number;
  };
}

export interface BusinessPath {
  id: string;
  name: string;
  description: string;
  monthlyCustomers: number;
  ltv: number;
  cac: number;
  ltvCacRatio: number;
  channelMix: {
    dtc: number;
    retail: number;
    amazon: number;
  };
  monthlyMarketing: number;
  risk: 'low' | 'medium' | 'high';
  riskDescription: string;
  scalability: 'low' | 'medium' | 'high';
}

export interface GoalInput {
  targetRevenue?: number;
  targetRevenueMonth?: number;
  targetProfit?: number;
  targetProfitMonth?: number;
  breakEvenMonth?: number;
  isMonthlyGoal?: boolean; // For revenue: true = monthly run rate, false/undefined = cumulative
  isProfitCumulative?: boolean; // For profit: true = cumulative, false = monthly run rate
  fundingGoal?: {
    amount: number;
    valuation: number;
  };
}
