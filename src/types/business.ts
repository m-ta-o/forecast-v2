export interface BusinessParameters {
  // Product & Manufacturing (6 params)
  avgManufacturingCostPerUnit: number;
  avgSellingPriceDTC: number;
  avgWholesalePrice: number;
  productShelfLife: number;
  unitsPerBatch: number;
  qualityTestingCost: number;

  // Sales Channels (6 params)
  dtcChannelMix: number;
  retailChannelMix: number;
  amazonChannelMix: number;
  dtcShippingCost: number;
  amazonFeePercentage: number;
  subscriptionDiscountPercentage: number;
  subscriptionAdoptionRate: number;

  // Marketing & Customer Acquisition (15 params)
  monthlyMarketingBudget: number;
  dtcPaidAdSpend: number;
  influencerMarketingSpend: number;
  retailTradeMarketingSpend: number;
  organicTrafficMonthly: number;
  organicConversionRate: number;
  paidAdConversionRate: number;
  influencerConversionRate: number;
  customerReferralRate: number;
  repeatPurchaseRate: number;
  purchaseFrequencyMonths: number;
  baseCostPerClick: number; // FIX 3.3: Was hardcoded at 1.50
  cpcAnnualInflation: number; // FIX 3.3: Was hardcoded at 5%
  influencerCostPerEngagement: number; // FIX 3.3: Was hardcoded at 15

  // Inventory & Operations (5 params)
  startingInventoryUnits: number;
  minimumInventoryLevel: number;
  reorderQuantity: number;
  expirationWastePercentage: number;
  warehouseCostPerUnit: number;
  fulfillmentCostDTC: number;
  fulfillmentCostRetail: number;

  // Financial & Overhead (4 params)
  startingCash: number;
  monthlyFixedCosts: number;
  paymentProcessingFee: number;
  insuranceAndLegalCosts: number;
  rdExpensePercentage: number;
  discountRate: number;

  // Growth & Market (2 params)
  marketGrowthRate: number;
  seasonalityFactor: number;

  // Model Assumptions (4 params) - FIX 3.3: Previously hardcoded
  avgUnitsPerOrder: number; // Was hardcoded at 1.4
  maxPurchasesPerYear: number; // Was hardcoded at 4
  maxCustomerLifespanYears: number; // Was hardcoded at 2.5
  ltvConservativeAdjustment: number; // Was hardcoded at 0.75
}

export interface MonthlyResults {
  month: number;
  
  // Revenue breakdown
  dtcRevenue: number;
  retailRevenue: number;
  amazonRevenue: number;
  subscriptionRevenue: number;
  totalRevenue: number;
  
  // Unit sales
  dtcUnitsSold: number;
  retailUnitsSold: number;
  amazonUnitsSold: number;
  totalUnitsSold: number;
  
  // Costs
  cogs: number;
  manufacturingCosts: number;
  marketingCosts: number;
  operationalCosts: number;
  fulfillmentCosts: number;
  totalCosts: number;
  
  // Profitability
  grossProfit: number;
  grossMargin: number;
  netProfit: number;
  netMargin: number;
  
  // Customer metrics
  newCustomers: number;
  totalCustomers: number;
  customerRetention: number;
  
  // Inventory
  inventory: number;
  inventoryValue: number;
  inventoryTurnover: number;
  
  // Cash flow
  operatingCashFlow: number;
  netCashFlow: number;
  cumulativeCashFlow: number;
  workingCapital: number;
  
  // Key metrics
  customerAcquisitionCost: number;
  customerLifetimeValue: number;
  returnOnAdSpend: number;
  inventoryPurchaseCost: number;
}

export interface SimulationResults {
  monthly: MonthlyResults[];
  totals: {
    totalRevenue: number;
    totalProfit: number;
    totalCustomers: number;
    averageOrderValue: number;
    customerLifetimeValue: number;
    customerAcquisitionCost: number;
    returnOnInvestment: number;
    inventoryTurnover: number;
    grossMargin: number;
    netMargin: number;
  };
}
