import { WizardState, MarketResearch } from '@/types/wizard';
import { BusinessParameters } from '@/types/business';

/**
 * Maps wizard data (market research + selections) to BusinessParameters
 */
export class WizardMapper {
  /**
   * Convert market research and wizard selections into full BusinessParameters
   */
  static mapToBusinessParameters(
    wizardState: WizardState,
    primaryMarket?: string // Which market to use as primary
  ): Partial<BusinessParameters> {
    if (!wizardState.marketResearch) {
      return {};
    }

    // Use primary market or first available
    const marketKey = primaryMarket || wizardState.marketRegions[0];
    const research: MarketResearch = wizardState.marketResearch[marketKey as keyof typeof wizardState.marketResearch];

    if (!research) {
      return {};
    }

    // Map research data to parameters
    // VALIDATE AND AUTO-CORRECT MARGINS
    let finalPrice = research.avgRetailPrice;
    let finalCOGS = research.typicalCOGS;

    // Calculate gross margin
    const rawMargin = (finalPrice - finalCOGS) / finalPrice;

    console.log('WizardMapper - Before correction:', { finalPrice, finalCOGS, rawMargin });

    // If margin is below 60%, adjust COGS to hit 70% margin (viable supplement business)
    if (rawMargin < 0.60) {
      // Keep price, reduce COGS to achieve 70% margin
      finalCOGS = finalPrice * 0.30; // 70% margin = 30% COGS
      console.log('WizardMapper - CORRECTED COGS to:', finalCOGS);
    }

    // Wholesale pricing: Should be 2-2.5x COGS (minimum), giving retailers room for 2x markup
    const calculatedWholesale = finalCOGS * 2.2;
    // But never more than 70% of retail (retailers need margin)
    const maxWholesale = finalPrice * 0.7;
    const wholesalePrice = Math.min(calculatedWholesale, maxWholesale);

    const params: Partial<BusinessParameters> = {
      // Pricing from market research (auto-corrected for viable margins)
      avgSellingPriceDTC: finalPrice,
      avgManufacturingCostPerUnit: finalCOGS,
      avgWholesalePrice: wholesalePrice,

      // Purchase behavior from research
      purchaseFrequencyMonths: research.purchaseFrequencyMonths,

      // Capital-based settings
      startingCash: this.getStartingCash(wizardState.capitalSituation),
      monthlyMarketingBudget: this.getMonthlyMarketingBudget(wizardState.capitalSituation, wizardState.businessGoal),
      monthlyFixedCosts: this.getMonthlyFixedCosts(wizardState.capitalSituation),

      // Default channel mix (can be overridden by path selection)
      dtcChannelMix: 60,
      retailChannelMix: 25,
      amazonChannelMix: 15,

      // Retention based on market maturity
      repeatPurchaseRate: 85, // Conservative default, will improve with product quality

      // Product & Manufacturing defaults
      productShelfLife: 24,
      unitsPerBatch: 5000,
      qualityTestingCost: 8000,

      // Shipping & Fulfillment
      dtcShippingCost: 6.99,
      amazonFeePercentage: 15,
      subscriptionDiscountPercentage: 8,
      subscriptionAdoptionRate: 35,

      // Inventory
      startingInventoryUnits: 10000,
      minimumInventoryLevel: 5000,
      reorderQuantity: 10000,
      expirationWastePercentage: 2.5,
      warehouseCostPerUnit: 0.85,
      fulfillmentCostDTC: 3.50,
      fulfillmentCostRetail: 1.75,

      // Financial
      paymentProcessingFee: 2.9,
      insuranceAndLegalCosts: 6000,
      rdExpensePercentage: 5,
      discountRate: 10,

      // Growth & Market
      marketGrowthRate: 12,
      seasonalityFactor: 1.15,

      // Model Assumptions
      avgUnitsPerOrder: 1.4,
      maxPurchasesPerYear: 4,
      maxCustomerLifespanYears: 2.5,
      ltvConservativeAdjustment: 0.75,
      baseCostPerClick: 1.50,
      cpcAnnualInflation: 5,
      influencerCostPerEngagement: 15,
    };

    return params;
  }

  /**
   * Get starting cash based on capital situation
   * (Note: This is conservative - will be adjusted by goal if needed)
   */
  private static getStartingCash(capitalSituation: string): number {
    switch (capitalSituation) {
      case 'bootstrapped':
        return 50000;
      case 'small-seed':
        return 500000; // Fixed: was 250000, now matches UI label
      case 'series-a':
        return 2000000; // Fixed: was 1000000, now matches UI label
      default:
        return 100000;
    }
  }

  /**
   * Get monthly marketing budget based on capital and goals
   */
  private static getMonthlyMarketingBudget(capitalSituation: string, businessGoal: string): number {
    const base = {
      bootstrapped: 5000,
      'small-seed': 25000,
      'series-a': 75000,
    }[capitalSituation] || 15000;

    // Adjust for goal
    if (businessGoal === 'growth-funding') {
      return base * 1.5; // More aggressive
    } else if (businessGoal === 'lifestyle') {
      return base * 0.6; // More conservative
    }

    return base; // profitability goal
  }

  /**
   * Get monthly fixed costs based on capital situation
   */
  private static getMonthlyFixedCosts(capitalSituation: string): number {
    switch (capitalSituation) {
      case 'bootstrapped':
        return 8000; // Minimal team, home office
      case 'small-seed':
        return 25000; // Small team, basic office
      case 'series-a':
        return 60000; // Full team, professional setup
      default:
        return 15000;
    }
  }
}
