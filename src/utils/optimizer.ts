import { BusinessParameters } from '@/types/business';
import { EnhancedSimulationEngine } from './EnhancedSimulationEngine';

export interface OptimizationConstraints {
  maxCAC?: number;
  minGrossMargin?: number;
  targetProfitabilityMonth?: number;
  fixedParameters?: string[]; // Parameters that shouldn't change
}

export interface OptimizationGoal {
  type: 'max-profit' | 'fastest-profitability' | 'max-valuation' | 'min-risk';
  targetMonth?: number;
}

export interface OptimizationResult {
  originalParams: Partial<BusinessParameters>;
  optimizedParams: Partial<BusinessParameters>;
  changes: Array<{ param: string; original: number; optimized: number; delta: number; deltaPercent: number }>;
  improvements: {
    originalProfit: number;
    optimizedProfit: number;
    profitIncrease: number;
    profitIncreasePercent: number;
    monthsToBreakEven: {
      original: number;
      optimized: number;
      improvement: number;
    };
  };
  iterations: number;
}

/**
 * Simple greedy optimization algorithm
 * Tests incremental changes to parameters and keeps improvements
 */
export class Optimizer {
  /**
   * Optimize parameters based on goal and constraints
   */
  static optimize(
    baseParams: BusinessParameters,
    goal: OptimizationGoal,
    constraints: OptimizationConstraints,
    maxIterations: number = 50
  ): OptimizationResult {
    let currentParams = { ...baseParams };
    let bestScore = this.scoreParameters(currentParams, goal);

    // Parameters to optimize (exclude fixed ones)
    const optimizableParams = [
      'dtcChannelMix',
      'retailChannelMix',
      'amazonChannelMix',
      'subscriptionAdoptionRate',
      'monthlyMarketingBudget',
      'dtcPaidAdSpend',
      'influencerMarketingSpend',
      'avgSellingPriceDTC',
      'dtcShippingCost',
      'customerReferralRate',
    ].filter(p => !constraints.fixedParameters?.includes(p));

    // Step sizes for each parameter type
    const stepSizes: Record<string, number> = {
      dtcChannelMix: 5,
      retailChannelMix: 5,
      amazonChannelMix: 5,
      subscriptionAdoptionRate: 5,
      monthlyMarketingBudget: 5000,
      dtcPaidAdSpend: 5,
      influencerMarketingSpend: 5,
      avgSellingPriceDTC: 2,
      dtcShippingCost: 0.5,
      customerReferralRate: 2,
    };

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      let improved = false;

      // Try incrementing each parameter
      for (const param of optimizableParams) {
        const testParams = { ...currentParams };
        const step = stepSizes[param] || 1;

        // Test increase
        (testParams as any)[param] = (currentParams as any)[param] + step;
        if (this.meetsConstraints(testParams, constraints)) {
          const score = this.scoreParameters(testParams, goal);
          if (score > bestScore) {
            currentParams = testParams;
            bestScore = score;
            improved = true;
            continue;
          }
        }

        // Test decrease
        (testParams as any)[param] = (currentParams as any)[param] - step;
        if (this.meetsConstraints(testParams, constraints)) {
          const score = this.scoreParameters(testParams, goal);
          if (score > bestScore) {
            currentParams = testParams;
            bestScore = score;
            improved = true;
          }
        }
      }

      // If no improvement found, we've reached local optimum
      if (!improved) break;
    }

    // Calculate improvements
    const originalResult = EnhancedSimulationEngine.runSimulation(baseParams, goal.targetMonth || 60);
    const optimizedResult = EnhancedSimulationEngine.runSimulation(currentParams, goal.targetMonth || 60);

    const originalProfit = originalResult.monthly.reduce((sum, m) => sum + m.netProfit, 0);
    const optimizedProfit = optimizedResult.monthly.reduce((sum, m) => sum + m.netProfit, 0);

    const originalBreakEven = this.findBreakEvenMonth(originalResult.monthly);
    const optimizedBreakEven = this.findBreakEvenMonth(optimizedResult.monthly);

    // Track changes
    const changes: OptimizationResult['changes'] = [];
    optimizableParams.forEach(param => {
      const original = (baseParams as any)[param];
      const optimized = (currentParams as any)[param];
      if (Math.abs(optimized - original) > 0.01) {
        changes.push({
          param,
          original,
          optimized,
          delta: optimized - original,
          deltaPercent: ((optimized - original) / original) * 100,
        });
      }
    });

    return {
      originalParams: baseParams,
      optimizedParams: currentParams,
      changes,
      improvements: {
        originalProfit,
        optimizedProfit,
        profitIncrease: optimizedProfit - originalProfit,
        profitIncreasePercent: ((optimizedProfit - originalProfit) / Math.abs(originalProfit)) * 100,
        monthsToBreakEven: {
          original: originalBreakEven,
          optimized: optimizedBreakEven,
          improvement: originalBreakEven - optimizedBreakEven,
        },
      },
      iterations: maxIterations,
    };
  }

  /**
   * Score parameters based on optimization goal
   */
  private static scoreParameters(params: BusinessParameters, goal: OptimizationGoal): number {
    const result = EnhancedSimulationEngine.runSimulation(params, goal.targetMonth || 60);

    switch (goal.type) {
      case 'max-profit':
        return result.monthly.reduce((sum, m) => sum + m.netProfit, 0);

      case 'fastest-profitability': {
        const breakEvenMonth = this.findBreakEvenMonth(result.monthly);
        return breakEvenMonth === -1 ? -10000 : -(breakEvenMonth); // Negative because we want minimum
      }

      case 'max-valuation': {
        // ARR × 5 multiple
        const lastMonthRevenue = result.monthly[result.monthly.length - 1].totalRevenue;
        const arr = lastMonthRevenue * 12;
        return arr * 5;
      }

      case 'min-risk': {
        // Minimize variance in monthly profit
        const profits = result.monthly.map(m => m.netProfit);
        const mean = profits.reduce((sum, p) => sum + p, 0) / profits.length;
        const variance = profits.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / profits.length;
        return -Math.sqrt(variance); // Negative because lower variance is better
      }

      default:
        return 0;
    }
  }

  /**
   * Check if parameters meet constraints
   */
  private static meetsConstraints(params: BusinessParameters, constraints: OptimizationConstraints): boolean {
    // Channel mix must sum to 100
    const channelSum = params.dtcChannelMix + params.retailChannelMix + params.amazonChannelMix;
    if (Math.abs(channelSum - 100) > 1) return false;

    // Marketing allocation must sum to 100
    const marketingSum = params.dtcPaidAdSpend + params.influencerMarketingSpend + params.retailTradeMarketingSpend;
    if (Math.abs(marketingSum - 100) > 1) return false;

    // Check max CAC
    if (constraints.maxCAC) {
      const result = EnhancedSimulationEngine.runSimulation(params, 12);
      const avgCAC = result.monthly.reduce((sum, m) => sum + m.customerAcquisitionCost, 0) / result.monthly.length;
      if (avgCAC > constraints.maxCAC) return false;
    }

    // Check min gross margin
    if (constraints.minGrossMargin) {
      const result = EnhancedSimulationEngine.runSimulation(params, 12);
      const avgGrossMargin = result.monthly.reduce((sum, m) => sum + m.grossMargin, 0) / result.monthly.length;
      if (avgGrossMargin < constraints.minGrossMargin) return false;
    }

    return true;
  }

  /**
   * Find month where cumulative profit becomes positive
   */
  private static findBreakEvenMonth(monthly: any[]): number {
    let cumulativeProfit = 0;
    for (let i = 0; i < monthly.length; i++) {
      cumulativeProfit += monthly[i].netProfit;
      if (cumulativeProfit >= 0) {
        return i + 1;
      }
    }
    return -1; // Never breaks even
  }
}
