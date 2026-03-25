import { BusinessParameters } from '@/types/business';
import { BusinessPath, GoalInput } from '@/types/wizard';
import { EnhancedSimulationEngine } from '@/utils/EnhancedSimulationEngine';

/**
 * Reverse calculator: Given goals, calculate what parameters are needed
 * Uses goal-seeking (binary search) to find parameters that achieve targets
 */
export class ReverseCalculator {
  /**
   * Goal-seeking: Find marketing budget that achieves the target
   * Uses binary search + actual simulation engine
   * Now ASYNC to prevent UI freezing
   */
  static async goalSeek(
    goalInput: GoalInput,
    baseParams: Partial<BusinessParameters>,
    onProgress?: (iteration: number, total: number, achieved: number, target: number) => void
  ): Promise<Partial<BusinessParameters>> {
    const targetMonth = goalInput.targetRevenueMonth || goalInput.targetProfitMonth || 24;

    // Determine what we're optimizing for
    const isRevenueGoal = !!goalInput.targetRevenue;
    const isProfitGoal = !!goalInput.targetProfit;
    const isCumulative = goalInput.isMonthlyGoal !== true && goalInput.isProfitCumulative !== false;

    console.log('Goal-seeking for:', {
      type: isRevenueGoal ? 'revenue' : 'profit',
      cumulative: isCumulative,
      target: isRevenueGoal ? goalInput.targetRevenue : goalInput.targetProfit,
      month: targetMonth
    });

    // Binary search parameters
    let minBudget = 100; // $100/month minimum
    let maxBudget = 500000; // $500K/month maximum
    const tolerance = 0.05; // 5% tolerance
    const maxIterations = 10; // Reduced from 20 to prevent long freezes

    let bestParams = baseParams;
    let bestResult = 0;
    let iteration = 0;

    // Helper to yield to UI thread
    const delay = () => new Promise(resolve => setTimeout(resolve, 0));

    while (iteration < maxIterations) {
      const tryBudget = (minBudget + maxBudget) / 2;

      // Create test parameters with this marketing budget
      const testParams: BusinessParameters = {
        ...baseParams as BusinessParameters,
        monthlyMarketingBudget: tryBudget,
        // Organic traffic scales with budget (rough heuristic)
        organicTrafficMonthly: Math.round(tryBudget * 0.5), // 1 visitor per $2 spent
      };

      // Run ACTUAL simulation
      const result = EnhancedSimulationEngine.simulate(testParams, targetMonth);

      // Calculate what we achieved
      let achieved: number;
      let target: number;

      if (isRevenueGoal) {
        if (isCumulative) {
          // Cumulative revenue: sum all months up to target
          achieved = result.monthly.slice(0, targetMonth).reduce((sum, m) => sum + m.totalRevenue, 0);
          target = (goalInput.targetRevenue || 0) * targetMonth; // targetRevenue is monthly average for cumulative
        } else {
          // Monthly revenue at target month
          achieved = result.monthly[targetMonth - 1]?.totalRevenue || 0;
          target = goalInput.targetRevenue || 0;
        }
      } else {
        if (isCumulative) {
          // Cumulative profit: sum all months up to target
          achieved = result.monthly.slice(0, targetMonth).reduce((sum, m) => sum + m.netProfit, 0);
          target = (goalInput.targetProfit || 0) * targetMonth; // targetProfit is monthly average for cumulative
        } else {
          // Monthly profit at target month
          achieved = result.monthly[targetMonth - 1]?.netProfit || 0;
          target = goalInput.targetProfit || 0;
        }
      }

      const ratio = achieved / target;

      console.log(`Iteration ${iteration + 1}/${maxIterations}: Budget $${tryBudget.toLocaleString()}, Achieved $${achieved.toLocaleString()}, Target $${target.toLocaleString()}, Ratio ${(ratio * 100).toFixed(1)}%`);

      // Call progress callback if provided
      if (onProgress) {
        onProgress(iteration + 1, maxIterations, achieved, target);
      }

      // Check if we're within tolerance
      if (Math.abs(ratio - 1) < tolerance) {
        console.log('✓ Goal achieved within tolerance!');
        return testParams;
      }

      // Update best result
      if (Math.abs(ratio - 1) < Math.abs(bestResult / target - 1)) {
        bestParams = testParams;
        bestResult = achieved;
      }

      // Adjust search range
      if (achieved < target) {
        // Too low, need more budget
        minBudget = tryBudget;
      } else {
        // Too high, need less budget
        maxBudget = tryBudget;
      }

      iteration++;

      // Yield to UI thread after each iteration
      await delay();
    }

    console.warn(`Goal-seeking did not converge after ${maxIterations} iterations. Using best result: ${(bestResult / (isRevenueGoal ? goalInput.targetRevenue! : goalInput.targetProfit!) * 100).toFixed(1)}% of target`);
    return bestParams;
  }
  /**
   * Detect goal size and return appropriate strategy parameters
   */
  private static getGoalStrategy(targetRevenue: number, targetMonth: number): {
    size: 'micro' | 'small' | 'medium' | 'large';
    maxCAC: number;
    targetLTVCACRatio: number;
    description: string;
  } {
    // Micro: < $250K - Bootstrapped, minimal spend
    if (targetRevenue < 250000) {
      return {
        size: 'micro',
        maxCAC: 25, // Very conservative
        targetLTVCACRatio: 8, // Need strong unit economics
        description: 'Bootstrapped approach with minimal marketing spend'
      };
    }

    // Small: $250K - $500K - Small seed or strong bootstrap
    if (targetRevenue < 500000) {
      return {
        size: 'small',
        maxCAC: 40,
        targetLTVCACRatio: 6,
        description: 'Conservative growth with controlled marketing spend'
      };
    }

    // Medium: $500K - $2M - Funded growth
    if (targetRevenue < 2000000) {
      return {
        size: 'medium',
        maxCAC: 60,
        targetLTVCACRatio: 5,
        description: 'Balanced growth with moderate marketing investment'
      };
    }

    // Large: > $2M - Aggressive funded growth
    return {
      size: 'large',
      maxCAC: 100,
      targetLTVCACRatio: 4,
      description: 'Aggressive growth with substantial marketing investment'
    };
  }

  /**
   * Calculate paths to achieve revenue goal
   */
  static calculateRevenuePaths(
    goalInput: GoalInput,
    baseParams: Partial<BusinessParameters>
  ): BusinessPath[] {
    const targetRevenue = goalInput.targetRevenue || 500000;
    const targetMonth = goalInput.targetRevenueMonth || 18;

    // Use actual parameters from wizard
    const avgUnitsPerOrder = baseParams.avgUnitsPerOrder || 1.4;
    const purchaseFrequency = baseParams.purchaseFrequencyMonths || 3;
    const avgPrice = baseParams.avgSellingPriceDTC || 30;
    const repeatRate = (baseParams.repeatPurchaseRate || 90) / 100;

    // Get goal-appropriate strategy
    const strategy = this.getGoalStrategy(targetRevenue, targetMonth);

    // Calculate customers needed for TOTAL cumulative revenue
    const purchasesPerYear = 12 / purchaseFrequency;
    const avgPurchasesPerCustomerByTarget = (purchasesPerYear * targetMonth) / 12;
    const totalCustomersNeeded = Math.round(targetRevenue / (avgPrice * avgPurchasesPerCustomerByTarget));
    const customersNeededPerMonth = Math.round(totalCustomersNeeded / targetMonth);

    // Calculate baseline LTV (customer lifetime value)
    const avgLifespanYears = 2; // Assume 2 year average customer lifespan
    const lifetimeValue = avgPrice * purchasesPerYear * avgLifespanYears * repeatRate;

    // Path A: High-Volume, Lower Margin
    // Strategy: Lower prices (10% discount), higher volume, DTC + Amazon focus
    const pathA_price = avgPrice * 0.9;
    const pathA_ltv = pathA_price * purchasesPerYear * avgLifespanYears * repeatRate;
    const pathA_customersNeeded = customersNeededPerMonth;
    const pathA_cac = Math.min(pathA_price * 1.2, strategy.maxCAC * 0.8); // Aggressive but capped
    const pathA_marketing = Math.round(pathA_customersNeeded * pathA_cac);

    const pathA: BusinessPath = {
      id: 'high-volume',
      name: 'High-Volume, Lower Margin',
      description: 'Aggressive customer acquisition with competitive pricing',
      monthlyCustomers: pathA_customersNeeded,
      ltv: Math.round(pathA_ltv),
      cac: Math.round(pathA_cac),
      ltvCacRatio: pathA_ltv / pathA_cac,
      channelMix: { dtc: 50, retail: 0, amazon: 50 },
      monthlyMarketing: pathA_marketing,
      risk: 'medium',
      riskDescription: strategy.size === 'micro' || strategy.size === 'small'
        ? `Requires $${Math.round(pathA_marketing).toLocaleString()}/mo marketing spend`
        : `Requires consistent $${Math.round(pathA_marketing / 1000)}K/mo marketing spend`,
      scalability: strategy.size === 'micro' ? 'medium' : 'high',
    };

    // Path B: Premium, Lower Volume
    // Strategy: Higher prices (+40%), premium positioning, DTC + Retail focus
    const pathB_price = avgPrice * 1.4;
    const pathB_ltv = pathB_price * purchasesPerYear * avgLifespanYears * repeatRate * 1.1; // 10% better retention
    const pathB_customersNeeded = Math.round(customersNeededPerMonth * 0.7); // Fewer customers at higher price
    const pathB_cac = Math.min(pathB_price * 1.5, strategy.maxCAC); // Premium allows higher CAC
    const pathB_marketing = Math.round(pathB_customersNeeded * pathB_cac);

    const pathB: BusinessPath = {
      id: 'premium',
      name: 'Premium, Lower Volume',
      description: 'Premium positioning with subscription focus',
      monthlyCustomers: pathB_customersNeeded,
      ltv: Math.round(pathB_ltv),
      cac: Math.round(pathB_cac),
      ltvCacRatio: pathB_ltv / pathB_cac,
      channelMix: {
        dtc: baseParams.dtcChannelMix ? Math.min(baseParams.dtcChannelMix + 20, 85) : 80,
        retail: baseParams.retailChannelMix || 20,
        amazon: 0
      },
      monthlyMarketing: pathB_marketing,
      risk: 'low',
      riskDescription: strategy.size === 'large'
        ? 'Lower spend, but harder to scale past $5M'
        : 'Lower spend, but harder to scale past $1M',
      scalability: 'medium',
    };

    // Path C: Blended (Recommended) - Uses wizard selections
    // Strategy: Balanced approach using base pricing and channel mix
    const pathC_ltv = lifetimeValue;
    const pathC_customersNeeded = customersNeededPerMonth;
    const pathC_cac = Math.min(avgPrice * 1.5, strategy.maxCAC); // Cap based on goal size
    const pathC_marketing = Math.round(pathC_customersNeeded * pathC_cac);

    const pathC: BusinessPath = {
      id: 'blended',
      name: 'Blended Approach',
      description: strategy.description,
      monthlyCustomers: pathC_customersNeeded,
      ltv: Math.round(pathC_ltv),
      cac: Math.round(pathC_cac),
      ltvCacRatio: pathC_ltv / pathC_cac,
      channelMix: {
        dtc: baseParams.dtcChannelMix || 65,
        retail: baseParams.retailChannelMix || 20,
        amazon: baseParams.amazonChannelMix || 15
      },
      monthlyMarketing: pathC_marketing,
      risk: 'medium',
      riskDescription: `Based on ${strategy.size} business model`,
      scalability: strategy.size === 'large' ? 'very-high' : strategy.size === 'medium' ? 'high' : 'medium',
    };

    return [pathA, pathB, pathC];
  }

  /**
   * Calculate parameters needed to achieve profit goal
   */
  static calculateProfitRequirements(
    goalInput: GoalInput,
    baseParams: Partial<BusinessParameters>
  ): {
    requiredRevenue: number;
    requiredGrossMargin: number;
    maxOperatingCosts: number;
    recommendations: string[];
  } {
    const targetProfit = goalInput.targetProfit || 100000;
    const targetMonth = goalInput.targetProfitMonth || 24;

    // Assume 70% gross margin (supplement industry)
    const grossMargin = 0.70;
    const requiredRevenue = targetProfit / (grossMargin - 0.45); // 45% operating costs
    const requiredGrossMargin = grossMargin * 100;
    const maxOperatingCosts = requiredRevenue * 0.45;

    const recommendations: string[] = [];

    if (requiredRevenue > 1000000) {
      recommendations.push('Revenue target requires strong multi-channel strategy');
      recommendations.push('Consider raising additional capital for marketing');
    }

    if (grossMargin < 0.65) {
      recommendations.push('Improve gross margin through better pricing or lower COGS');
    }

    recommendations.push(`Target ${Math.round(requiredRevenue / targetMonth / 1000)}K monthly revenue by month ${targetMonth}`);
    recommendations.push(`Keep monthly operating costs below $${Math.round(maxOperatingCosts / targetMonth / 1000)}K`);

    return {
      requiredRevenue,
      requiredGrossMargin,
      maxOperatingCosts,
      recommendations,
    };
  }

  /**
   * Calculate break-even requirements
   */
  static calculateBreakEven(
    goalInput: GoalInput,
    baseParams: Partial<BusinessParameters>
  ): {
    monthlyRevenue: number;
    monthlyCustomers: number;
    requiredCAC: number;
    timeline: string;
  } {
    const targetMonth = goalInput.breakEvenMonth || 12;
    const monthlyFixed = baseParams.monthlyFixedCosts || 25000;
    const monthlyMarketing = baseParams.monthlyMarketingBudget || 35000;
    const totalMonthlyCosts = monthlyFixed + monthlyMarketing;

    // Assume 70% gross margin
    const grossMargin = 0.70;
    const monthlyRevenue = totalMonthlyCosts / grossMargin;

    // Assume $50 AOV, 3 purchases/year
    const aov = 50;
    const purchasesPerYear = 4;
    const monthlyCustomers = Math.round(monthlyRevenue / aov / (purchasesPerYear / 12));

    const requiredCAC = monthlyMarketing / monthlyCustomers;

    return {
      monthlyRevenue,
      monthlyCustomers,
      requiredCAC,
      timeline: `${targetMonth} months`,
    };
  }

  /**
   * Apply path to parameters - calculates ALL parameters needed to hit target
   * Scales EVERYTHING based on goal size
   */
  static applyPathToParameters(
    path: BusinessPath,
    baseParams: Partial<BusinessParameters>,
    goalInput: GoalInput
  ): Partial<BusinessParameters> {
    const targetRevenue = goalInput.targetRevenue || 500000;
    const targetMonth = goalInput.targetRevenueMonth || 18;

    // Get goal-appropriate strategy
    const strategy = this.getGoalStrategy(targetRevenue, targetMonth);

    // Use base pricing from market research
    const avgPrice = baseParams.avgSellingPriceDTC || 30;
    const cogs = baseParams.avgManufacturingCostPerUnit || 6.5;
    const purchaseFrequency = baseParams.purchaseFrequencyMonths || 3;

    // Calculate customers needed to generate target TOTAL revenue by target month
    const purchasesPerYear = 12 / purchaseFrequency;
    const avgPurchasesPerCustomerByTarget = (purchasesPerYear * targetMonth) / 12;

    // Total customers needed to hit cumulative revenue target
    const totalCustomersNeeded = Math.round(targetRevenue / (avgPrice * avgPurchasesPerCustomerByTarget));

    // Spread acquisition evenly over target period
    const customersNeededPerMonth = Math.round(totalCustomersNeeded / targetMonth);

    // Calculate total units needed over the period
    const avgUnitsPerOrder = 1.4;
    const totalUnitsNeeded = Math.round(totalCustomersNeeded * avgUnitsPerOrder * avgPurchasesPerCustomerByTarget);
    const monthlyUnitsNeeded = Math.round(totalUnitsNeeded / targetMonth);

    // Scale inventory based on goal size
    let startingInventory: number;
    let minimumInventory: number;
    let reorderQuantity: number;

    if (strategy.size === 'micro') {
      // Micro: Start with 2-3 months inventory
      startingInventory = Math.round(monthlyUnitsNeeded * 2.5);
      minimumInventory = Math.round(monthlyUnitsNeeded * 1.5);
      reorderQuantity = Math.round(monthlyUnitsNeeded * 2);
    } else if (strategy.size === 'small') {
      // Small: Start with 3-4 months inventory
      startingInventory = Math.round(monthlyUnitsNeeded * 3.5);
      minimumInventory = Math.round(monthlyUnitsNeeded * 2);
      reorderQuantity = Math.round(monthlyUnitsNeeded * 3);
    } else if (strategy.size === 'medium') {
      // Medium: Start with 4-6 months inventory
      startingInventory = Math.round(monthlyUnitsNeeded * 5);
      minimumInventory = Math.round(monthlyUnitsNeeded * 2.5);
      reorderQuantity = Math.round(monthlyUnitsNeeded * 4);
    } else {
      // Large: Start with 6+ months inventory
      startingInventory = Math.round(monthlyUnitsNeeded * 6);
      minimumInventory = Math.round(monthlyUnitsNeeded * 3);
      reorderQuantity = Math.round(monthlyUnitsNeeded * 5);
    }

    // Scale fixed costs based on goal size
    let monthlyFixedCosts: number;
    if (strategy.size === 'micro') {
      monthlyFixedCosts = Math.min(baseParams.monthlyFixedCosts || 8000, 8000);
    } else if (strategy.size === 'small') {
      monthlyFixedCosts = Math.min(baseParams.monthlyFixedCosts || 15000, 15000);
    } else if (strategy.size === 'medium') {
      monthlyFixedCosts = baseParams.monthlyFixedCosts || 25000;
    } else {
      monthlyFixedCosts = baseParams.monthlyFixedCosts || 60000;
    }

    // Assume 40% come from paid ads, 30% organic, 20% influencer, 10% referral
    const paidCustomersPerMonth = Math.round(customersNeededPerMonth * 0.40);
    const organicCustomersPerMonth = Math.round(customersNeededPerMonth * 0.30);
    const influencerCustomersPerMonth = Math.round(customersNeededPerMonth * 0.20);

    // Calculate traffic needed (assuming conversion rates)
    const paidConversionRate = 4.5; // 4.5%
    const organicConversionRate = 2.8; // 2.8%
    const influencerConversionRate = 6.2; // 6.2%

    const organicTrafficNeeded = Math.round(organicCustomersPerMonth / (organicConversionRate / 100));

    // Use path's CAC (which is now goal-aware from calculateRevenuePaths)
    const monthlyMarketing = path.monthlyMarketing;

    const dtcAdSpendPercent = 60;
    const influencerSpendPercent = 20;
    const retailSpendPercent = 20;

    // Return COMPLETE parameters - don't rely on defaults
    return {
      ...baseParams,
      // Channel mix from path
      dtcChannelMix: path.channelMix.dtc,
      retailChannelMix: path.channelMix.retail,
      amazonChannelMix: path.channelMix.amazon,

      // Marketing budget - calculated to hit revenue goal (scaled by goal size)
      monthlyMarketingBudget: monthlyMarketing,
      dtcPaidAdSpend: dtcAdSpendPercent,
      influencerMarketingSpend: influencerSpendPercent,
      retailTradeMarketingSpend: retailSpendPercent,

      // Traffic & acquisition - scaled to goal
      organicTrafficMonthly: organicTrafficNeeded,
      organicConversionRate: organicConversionRate,
      paidAdConversionRate: paidConversionRate,
      influencerConversionRate: influencerConversionRate,

      // Inventory - scaled to goal size
      startingInventoryUnits: startingInventory,
      minimumInventoryLevel: minimumInventory,
      reorderQuantity: reorderQuantity,

      // Fixed costs - scaled to goal size
      monthlyFixedCosts: monthlyFixedCosts,

      // Important: Set customer referral rate explicitly (don't use default 18%)
      customerReferralRate: 10, // Conservative 10% for small business

      // Keep pricing from baseParams (already corrected by WizardMapper)
      // baseParams includes: avgSellingPriceDTC, avgManufacturingCostPerUnit, avgWholesalePrice, etc.
    };
  }
}
