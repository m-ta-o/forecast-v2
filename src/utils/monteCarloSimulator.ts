import { BusinessParameters, SimulationResults } from '@/types/business';
import { EnhancedSimulationEngine } from './EnhancedSimulationEngine';

export interface MonteCarloResults {
  outcomes: number[]; // Array of final profits from each run
  percentiles: {
    p5: number;   // 5th percentile (worst case)
    p25: number;  // 25th percentile
    p50: number;  // 50th percentile (median)
    p75: number;  // 75th percentile
    p95: number;  // 95th percentile (best case)
  };
  mean: number;
  stdDev: number;
  probabilityOfLoss: number; // % chance of negative profit
  probabilityOfBreakeven: number; // % chance of 0-50K profit
  probabilityOfSuccess: number; // % chance of >200K profit
  distribution: { bucket: string; count: number }[];
}

/**
 * Monte Carlo simulator - runs simulation many times with parameter variance
 */
export class MonteCarloSimulator {
  /**
   * Run simulation N times with variance in key parameters
   */
  static runMonteCarlo(
    baseParams: BusinessParameters,
    simMonths: number,
    iterations: number = 1000
  ): MonteCarloResults {
    const outcomes: number[] = [];

    // Define variance for key parameters (±%)
    const variances = {
      repeatPurchaseRate: 0.10,      // ±10%
      paidAdConversionRate: 0.20,    // ±20%
      organicConversionRate: 0.15,   // ±15%
      avgSellingPriceDTC: 0.15,      // ±15%
      avgManufacturingCostPerUnit: 0.10, // ±10%
      monthlyMarketingBudget: 0.15,  // ±15%
    };

    let errorCount = 0;
    for (let i = 0; i < iterations; i++) {
      // Create variant parameters
      const variantParams = { ...baseParams };

      // Apply random variance to each parameter
      Object.keys(variances).forEach((key) => {
        const variance = variances[key as keyof typeof variances];
        const randomFactor = 1 + (Math.random() * 2 - 1) * variance; // ±variance%
        (variantParams as any)[key] = (baseParams as any)[key] * randomFactor;
      });

      // Run simulation
      try {
        const result = EnhancedSimulationEngine.runSimulation(variantParams, simMonths);
        const totalProfit = result.monthly.reduce((sum, m) => sum + m.netProfit, 0);
        outcomes.push(totalProfit);
      } catch (error) {
        // If simulation fails, push 0 (worst case)
        if (errorCount === 0) {
          console.error('First Monte Carlo simulation error:', error);
          console.log('Failed parameters:', variantParams);
        }
        errorCount++;
        outcomes.push(0);
      }
    }

    if (errorCount > 0) {
      console.warn(`${errorCount} out of ${iterations} simulations failed`);
    }

    // Sort outcomes
    outcomes.sort((a, b) => a - b);

    // Calculate percentiles
    const percentiles = {
      p5: outcomes[Math.floor(iterations * 0.05)],
      p25: outcomes[Math.floor(iterations * 0.25)],
      p50: outcomes[Math.floor(iterations * 0.50)],
      p75: outcomes[Math.floor(iterations * 0.75)],
      p95: outcomes[Math.floor(iterations * 0.95)],
    };

    // Calculate mean and standard deviation
    const mean = outcomes.reduce((sum, val) => sum + val, 0) / iterations;
    const variance = outcomes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / iterations;
    const stdDev = Math.sqrt(variance);

    // Calculate probabilities
    const probabilityOfLoss = outcomes.filter(o => o < 0).length / iterations * 100;
    const probabilityOfBreakeven = outcomes.filter(o => o >= 0 && o < 50000).length / iterations * 100;
    const probabilityOfSuccess = outcomes.filter(o => o > 200000).length / iterations * 100;

    // Create distribution buckets
    const buckets = [
      { label: '< -$50K', min: -Infinity, max: -50000 },
      { label: '-$50K to $0', min: -50000, max: 0 },
      { label: '$0 to $50K', min: 0, max: 50000 },
      { label: '$50K to $100K', min: 50000, max: 100000 },
      { label: '$100K to $200K', min: 100000, max: 200000 },
      { label: '$200K to $300K', min: 200000, max: 300000 },
      { label: '> $300K', min: 300000, max: Infinity },
    ];

    const distribution = buckets.map(bucket => ({
      bucket: bucket.label,
      count: outcomes.filter(o => o >= bucket.min && o < bucket.max).length,
    }));

    return {
      outcomes,
      percentiles,
      mean,
      stdDev,
      probabilityOfLoss,
      probabilityOfBreakeven,
      probabilityOfSuccess,
      distribution,
    };
  }
}
