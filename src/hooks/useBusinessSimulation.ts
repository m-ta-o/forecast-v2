
import { useMemo } from 'react';
import { BusinessParameters } from '@/types/business';
import { ScalingRule } from '@/types/scalingRules';
import { EnhancedSimulationEngine } from '@/utils/EnhancedSimulationEngine';

const defaultParameters: BusinessParameters = {
  // Product & Manufacturing - Optimize pricing for better margins
  avgManufacturingCostPerUnit: 6.50,
  avgSellingPriceDTC: 29.99,
  avgWholesalePrice: 14.88,
  productShelfLife: 24,
  unitsPerBatch: 5000,
  qualityTestingCost: 8000,

  // Sales Channels - Focus on higher-margin DTC and subscription
  dtcChannelMix: 60,
  retailChannelMix: 25,
  amazonChannelMix: 15,
  dtcShippingCost: 6.99,
  amazonFeePercentage: 15,
  subscriptionDiscountPercentage: 8, // Reduce discount to improve margins
  subscriptionAdoptionRate: 35, // Increase subscription adoption

  // Marketing & Customer Acquisition - Moderate corporate marketing budget
  monthlyMarketingBudget: 75000,
  dtcPaidAdSpend: 60,
  influencerMarketingSpend: 20,
  retailTradeMarketingSpend: 20,
  organicTrafficMonthly: 25000,
  organicConversionRate: 2.8,
  paidAdConversionRate: 4.5,
  influencerConversionRate: 6.2,
  customerReferralRate: 18, // Increase referrals with better product
  repeatPurchaseRate: 90, // 10% churn = 90% retention
  purchaseFrequencyMonths: 2,
  baseCostPerClick: 1.50, // FIX 3.3: Average CPC for supplement industry
  cpcAnnualInflation: 5, // FIX 3.3: 5% annual CPC inflation (industry average)
  influencerCostPerEngagement: 15, // FIX 3.3: Cost per engagement for micro-influencers

  // Inventory & Operations - Conservative but professional approach
  startingInventoryUnits: 25000,
  minimumInventoryLevel: 10000,
  reorderQuantity: 30000,
  expirationWastePercentage: 2.5,
  warehouseCostPerUnit: 0.85,
  fulfillmentCostDTC: 3.50,
  fulfillmentCostRetail: 1.75,

  // Financial & Overhead - Moderate corporate resources
  startingCash: 800000,
  monthlyFixedCosts: 25000,
  paymentProcessingFee: 2.9,
  insuranceAndLegalCosts: 6000,
  rdExpensePercentage: 5,
  discountRate: 10,

  // Growth & Market - Steady growth expectations
  marketGrowthRate: 12,
  seasonalityFactor: 1.15,

  // Model Assumptions - FIX 3.3: Previously hardcoded values now parametrized
  avgUnitsPerOrder: 1.4, // Supplements often sold in bundles
  maxPurchasesPerYear: 4, // Cap at 4 purchases/year (realistic for supplements)
  maxCustomerLifespanYears: 2.5, // Realistic cap on customer lifespan
  ltvConservativeAdjustment: 0.75, // 75% of theoretical LTV (conservative)
};

export function useBusinessSimulation(
  parameters: Partial<BusinessParameters> = {},
  simulationMonths: number = 60,
  scalingRules: ScalingRule[] = []
) {
  const params = { ...defaultParameters, ...parameters };

  const results = useMemo(() => {
    return EnhancedSimulationEngine.runSimulation(
      params, 
      simulationMonths, 
      true, // include rule applications
      scalingRules
    );
  }, [params, simulationMonths, scalingRules]);

  return { parameters: params, results };
}
