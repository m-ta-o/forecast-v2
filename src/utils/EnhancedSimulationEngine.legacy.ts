import { BusinessParameters, SimulationResults, MonthlyResults } from '@/types/business';
import { ScalingRule, ScalingRuleApplication } from '@/types/scalingRules';
import { ScalingRulesEngine } from './ScalingRulesEngine';

export class EnhancedSimulationEngine {
  static runSimulation(
    initialParams: BusinessParameters,
    months: number,
    includeRuleApplications: boolean = false,
    scalingRules: ScalingRule[] = []
  ): SimulationResults & { ruleApplications?: ScalingRuleApplication[] } {
    const monthly: MonthlyResults[] = [];
    const ruleApplications: ScalingRuleApplication[] = [];
    
    let currentParams = { ...initialParams };
    let totalCustomers = 0;
    let inventory = initialParams.startingInventoryUnits;
    let cumulativeCashFlow = initialParams.startingCash;
    
    // Track sales history for dynamic inventory management
    const salesHistory: number[] = [];
    
    const monthlyDiscountRate = Math.pow(1 + initialParams.discountRate / 100, 1/12) - 1;

    for (let month = 1; month <= months; month++) {
      // Apply scaling rules first (before monthly calculations)
      if (scalingRules.length > 0) {
        const cashBeforeRules = currentParams.startingCash;

        const simulationState = {
          totalRevenue: monthly.length > 0 ? monthly.reduce((sum, m) => sum + m.totalRevenue, 0) : 0,
          totalCustomers: totalCustomers,
          currentInventory: inventory
        };
        
        const { updatedParams, applications } = ScalingRulesEngine.applyScalingRules(
          currentParams,
          scalingRules,
          month,
          simulationState
        );
        
        currentParams = updatedParams;
        ruleApplications.push(...applications);

        // Check for cash injections by comparing before and after values of startingCash
        const cashAfterRules = currentParams.startingCash;
        const cashInjection = cashAfterRules - cashBeforeRules;
        if (cashInjection !== 0) {
          cumulativeCashFlow += cashInjection;
        }
      }

      // Run monthly calculations with potentially updated parameters
      const monthlyResult = this.calculateMonthlyResults(
        currentParams,
        month,
        totalCustomers,
        inventory,
        cumulativeCashFlow,
        monthlyDiscountRate,
        salesHistory
      );

      // Update state for next iteration
      totalCustomers = monthlyResult.totalCustomers;
      inventory = monthlyResult.inventory;
      cumulativeCashFlow = monthlyResult.cumulativeCashFlow;

      // Track sales history for dynamic inventory management
      salesHistory.push(monthlyResult.totalUnitsSold);
      // Keep only last 6 months of history
      if (salesHistory.length > 6) {
        salesHistory.shift();
      }

      monthly.push(monthlyResult);
    }

    // Calculate totals
    const totals = this.calculateTotals(monthly, initialParams);

    const result: SimulationResults & { ruleApplications?: ScalingRuleApplication[] } = {
      monthly,
      totals
    };

    if (includeRuleApplications) {
      result.ruleApplications = ruleApplications;
    }

    return result;
  }

  private static calculateMonthlyResults(
    params: BusinessParameters,
    month: number,
    totalCustomers: number,
    inventory: number,
    cumulativeCashFlow: number,
    monthlyDiscountRate: number,
    salesHistory: number[] = []
  ): MonthlyResults {
    // Apply seasonality (higher in Q1, Q4 for fitness/New Year)
    const seasonalMultiplier = 1 + Math.sin((month - 1) * Math.PI / 6) * (params.seasonalityFactor - 1);
    
    // Customer acquisition by channel
    const organicTraffic = params.organicTrafficMonthly * Math.pow(1 + params.marketGrowthRate / 100, (month - 1) / 12);
    const organicCustomers = organicTraffic * (params.organicConversionRate / 100);
    
    const dtcAdBudget = params.monthlyMarketingBudget * (params.dtcPaidAdSpend / 100);
    const influencerBudget = params.monthlyMarketingBudget * (params.influencerMarketingSpend / 100);
    const retailTradeBudget = params.monthlyMarketingBudget * (params.retailTradeMarketingSpend / 100);
    
    // Estimate traffic and conversions from paid channels (CPC increases with market maturity)
    const baseCPC = 1.50;
    const cpcInflation = Math.pow(1.05, (month - 1) / 12); // 5% annual CPC inflation
    const currentCPC = baseCPC * cpcInflation;
    const paidTraffic = dtcAdBudget / currentCPC;
    const paidCustomers = paidTraffic * (params.paidAdConversionRate / 100);
    
    const influencerCustomers = influencerBudget / 15 * (params.influencerConversionRate / 100); // $15 per influenced customer
    // Referrals compound monthly based on active customer base
    const monthlyReferralRate = params.customerReferralRate / 100 / 12;
    const referralCustomers = totalCustomers * monthlyReferralRate;
    
    const newCustomers = (organicCustomers + paidCustomers + influencerCustomers + referralCustomers) * seasonalMultiplier;
    
    // Customer retention and churn calculation - Use consistent monthly retention
    // repeatPurchaseRate is interpreted as annual retention rate
    const annualRetentionRate = params.repeatPurchaseRate / 100; // 90% = 0.90
    const monthlyRetentionRate = Math.pow(annualRetentionRate, 1/12); // Proper compound conversion
    const monthlyChurnRate = 1 - monthlyRetentionRate;
    const churnedCustomers = totalCustomers * monthlyChurnRate;
    const activeCustomers = totalCustomers - churnedCustomers;
    totalCustomers = activeCustomers + newCustomers;
    
    // Validate channel mix adds to 100%
    const totalChannelMix = params.dtcChannelMix + params.retailChannelMix + params.amazonChannelMix;
    if (Math.abs(totalChannelMix - 100) > 0.1) {
      console.warn(`Channel mix doesn't sum to 100%: ${totalChannelMix}%`);
    }
    
    // Calculate purchases and channel distribution
    const purchasesThisMonth = newCustomers + (activeCustomers / params.purchaseFrequencyMonths);
    
    const dtcPurchases = purchasesThisMonth * (params.dtcChannelMix / 100);
    const retailPurchases = purchasesThisMonth * (params.retailChannelMix / 100);
    const amazonPurchases = purchasesThisMonth * (params.amazonChannelMix / 100);
    
    // Calculate units sold (considering multi-unit orders)
    const avgUnitsPerOrder = 1.4; // Supplements often sold in bundles
    const dtcUnitsSold = dtcPurchases * avgUnitsPerOrder;
    const retailUnitsSold = retailPurchases * avgUnitsPerOrder;
    const amazonUnitsSold = amazonPurchases * avgUnitsPerOrder;
    let totalUnitsSold = dtcUnitsSold + retailUnitsSold + amazonUnitsSold;
    
    // Check for stockouts - if inventory is insufficient, reduce sales proportionally
    if (inventory < totalUnitsSold) {
      const stockoutRatio = inventory / totalUnitsSold;
      totalUnitsSold = inventory; // Can't sell more than we have
      console.log(`Month ${month}: Stockout! Could only fulfill ${(stockoutRatio * 100).toFixed(1)}% of demand`);
    }
    
    // Revenue calculations by channel - FIXED: retail revenue is what YOU receive (wholesale), not what customers pay
    // Subscription portion of DTC sales (not additional revenue, but discounted DTC revenue)
    const subscriptionPortion = dtcPurchases * (params.subscriptionAdoptionRate / 100);
    const regularDtcPortion = dtcPurchases - subscriptionPortion;
    
    const dtcRevenue = (regularDtcPortion * params.avgSellingPriceDTC) + 
                      (subscriptionPortion * params.avgSellingPriceDTC * (1 - params.subscriptionDiscountPercentage / 100)) -
                      (dtcPurchases * params.dtcShippingCost); // Subtract shipping costs
    
    const retailRevenue = retailUnitsSold * params.avgWholesalePrice; // This is what you actually receive from retailers
    const amazonRevenue = amazonUnitsSold * params.avgSellingPriceDTC * (1 - params.amazonFeePercentage / 100);
    
    // Log revenue calculations for debugging
    console.log(`Month ${month} Revenue Debug:`, {
      dtcRevenue: `${regularDtcPortion} regular + ${subscriptionPortion} subscription = $${dtcRevenue}`,
      retailRevenue: `${retailUnitsSold} units * $${params.avgWholesalePrice} = $${retailRevenue}`,
      amazonRevenue,
      totalUnitsSold,
      retailUnitsSold
    });
    
    const totalRevenue = dtcRevenue + retailRevenue + amazonRevenue;
    
    // Cost calculations
    const cogs = totalUnitsSold * params.avgManufacturingCostPerUnit;
    const manufacturingCosts = Math.ceil(totalUnitsSold / params.unitsPerBatch) * params.qualityTestingCost;
    
    const marketingCosts = params.monthlyMarketingBudget + retailTradeBudget;
    
    const fulfillmentCosts = (dtcUnitsSold + amazonUnitsSold) * params.fulfillmentCostDTC + 
                            retailUnitsSold * params.fulfillmentCostRetail;
    
    // R&D costs as percentage of revenue
    const rdCosts = totalRevenue * (params.rdExpensePercentage / 100);
    
    const operationalCosts = params.monthlyFixedCosts + 
                            params.insuranceAndLegalCosts +
                            (totalUnitsSold * params.warehouseCostPerUnit) +
                            (totalRevenue * params.paymentProcessingFee / 100) +
                            rdCosts;
    
    const totalCosts = cogs + manufacturingCosts + marketingCosts + fulfillmentCosts + operationalCosts;
    
    // Profitability
    const grossProfit = totalRevenue - cogs;
    const grossMargin = grossProfit / totalRevenue * 100;
    const netProfit = totalRevenue - totalCosts;
    const netMargin = netProfit / totalRevenue * 100;
    
    // Log profit calculations for debugging
    console.log(`Month ${month} Profit Debug:`, {
      totalRevenue,
      totalCosts,
      netProfit,
      netMargin: `${netMargin.toFixed(1)}%`
    });
    
    // Inventory management
    inventory = inventory - totalUnitsSold;
    
    // Calculate expiration waste based on shelf life (24 months = 2% per month for 2.5% annual)
    const monthlyExpirationRate = (params.expirationWastePercentage / 100) / 12;
    // Scale expiration rate based on shelf life - shorter shelf life = higher monthly waste
    const shelfLifeAdjustment = 24 / params.productShelfLife; // 24 months is baseline
    const adjustedExpirationRate = monthlyExpirationRate * shelfLifeAdjustment;
    const expirationWaste = inventory * adjustedExpirationRate;
    inventory = inventory - expirationWaste;
    
    // Cash-based reorder logic
    let inventoryPurchaseCost = 0;
    const cashOperatingExpenses = manufacturingCosts + marketingCosts + fulfillmentCosts + operationalCosts;
    const cashFlowBeforeInventory = totalRevenue - cashOperatingExpenses;
    
    // Calculate total available cash after this month's operations (before inventory purchase)
    const availableCashThisMonth = cumulativeCashFlow + cashFlowBeforeInventory;

    // Calculate dynamic inventory parameters based on sales history
    const { dynamicMinInventory, dynamicReorderQuantity } = this.calculateDynamicInventoryParams(
      params, 
      salesHistory, 
      month
    );

    if (inventory < dynamicMinInventory) {
      const reorderCost = dynamicReorderQuantity * params.avgManufacturingCostPerUnit;
      
      // Allow partial reorders if cash is tight, or use credit line for inventory
      if (availableCashThisMonth >= reorderCost) {
        inventory += dynamicReorderQuantity;
        inventoryPurchaseCost = reorderCost;
        console.log(`Month ${month}: Dynamic reorder of ${dynamicReorderQuantity} units for $${reorderCost.toFixed(2)} (min: ${dynamicMinInventory})`);
      } else if (availableCashThisMonth >= reorderCost * 0.5) {
        // Partial reorder if we have at least 50% of needed cash
        const partialQuantity = Math.floor((availableCashThisMonth * 0.8) / params.avgManufacturingCostPerUnit);
        const partialCost = partialQuantity * params.avgManufacturingCostPerUnit;
        inventory += partialQuantity;
        inventoryPurchaseCost = partialCost;
        console.log(`Month ${month}: Partial dynamic reorder of ${partialQuantity} units for $${partialCost.toFixed(2)}`);
      } else {
        // Emergency partial reorder with whatever cash is available
        const emergencyQuantity = Math.floor(availableCashThisMonth * 0.9 / params.avgManufacturingCostPerUnit);
        if (emergencyQuantity > 0) {
          const emergencyCost = emergencyQuantity * params.avgManufacturingCostPerUnit;
          inventory += emergencyQuantity;
          inventoryPurchaseCost = emergencyCost;
          console.log(`Month ${month}: Emergency reorder of ${emergencyQuantity} units for $${emergencyCost.toFixed(2)} (cash constraint)`);
        } else {
          console.log(`Month ${month}: No reorder possible - insufficient cash ($${availableCashThisMonth.toFixed(2)})`);
        }
      }
    }
    
    const inventoryValue = inventory * params.avgManufacturingCostPerUnit;
    // Calculate inventory turnover using average inventory (beginning + ending / 2)
    const beginningInventory = inventory + totalUnitsSold;
    const avgInventory = (beginningInventory + inventory) / 2;
    const inventoryTurnover = avgInventory > 0 ? (totalUnitsSold / avgInventory) * 12 : 0;
    
    // Cash flow
    const operatingCashFlow = cashFlowBeforeInventory;
    const netCashFlow = operatingCashFlow - inventoryPurchaseCost;
    cumulativeCashFlow += netCashFlow;
    
    const workingCapital = inventoryValue + (totalRevenue * 0.1); // Assume 10% in receivables
    
    // Key metrics
    const customerAcquisitionCost = marketingCosts / (newCustomers || 1);
    const totalDirectOrders = dtcPurchases + amazonPurchases;
    const avgOrderValue = totalDirectOrders > 0 ? (dtcRevenue + amazonRevenue) / totalDirectOrders : 0;
    // Use proper LTV calculation (will be calculated in totals)
    const customerLifetimeValue = this.calculateSimpleLTV(avgOrderValue, annualRetentionRate, params.purchaseFrequencyMonths);
    const returnOnAdSpend = totalRevenue / marketingCosts;

    return {
      month,
      dtcRevenue,
      retailRevenue,
      amazonRevenue,
      subscriptionRevenue: subscriptionPortion * params.avgSellingPriceDTC * (1 - params.subscriptionDiscountPercentage / 100), // For reporting only
      totalRevenue,
      dtcUnitsSold,
      retailUnitsSold,
      amazonUnitsSold,
      totalUnitsSold,
      cogs,
      manufacturingCosts,
      marketingCosts,
      operationalCosts,
      fulfillmentCosts,
      totalCosts,
      grossProfit,
      grossMargin,
      netProfit,
      netMargin,
      newCustomers,
      totalCustomers,
      customerRetention: monthlyRetentionRate,
      inventory,
      inventoryValue,
      inventoryTurnover,
      operatingCashFlow,
      netCashFlow,
      cumulativeCashFlow,
      workingCapital,
      customerAcquisitionCost,
      customerLifetimeValue,
      returnOnAdSpend,
      inventoryPurchaseCost,
    };
  }

  private static calculateTotals(monthly: MonthlyResults[], params: BusinessParameters) {
    const totalRevenue = monthly.reduce((sum, month) => sum + month.totalRevenue, 0);
    const totalProfit = monthly.reduce((sum, month) => sum + month.netProfit, 0);
    const totalCustomersCount = Math.max(...monthly.map(m => m.totalCustomers));
    // Calculate AOV consistently
    const totalDirectOrders = monthly.reduce((sum, month) => {
      const dtcOrders = month.dtcUnitsSold / 1.4; // Divide by avg units per order
      const amazonOrders = month.amazonUnitsSold / 1.4;
      return sum + dtcOrders + amazonOrders;
    }, 0);
    const totalDirectRevenue = monthly.reduce((sum, month) => sum + month.dtcRevenue + month.amazonRevenue, 0);
    const avgOrderValue = totalDirectOrders > 0 ? totalDirectRevenue / totalDirectOrders : 0;
    const totalMarketingCosts = monthly.reduce((sum, month) => sum + month.marketingCosts, 0);
    const totalNewCustomers = monthly.reduce((sum, month) => sum + month.newCustomers, 0);
    
    // Calculate proper Customer Lifetime Value using cohort-based approach
    const customerLifetimeValue = this.calculateProperLTV(monthly, params);
    const customerAcquisitionCost = totalMarketingCosts / totalNewCustomers || 0;
    const returnOnInvestment = (monthly.reduce((sum, month) => sum + month.netProfit, 0) / params.startingCash) * 100;
    const avgInventoryTurnover = monthly.reduce((sum, month) => sum + month.inventoryTurnover, 0) / monthly.length;
    const avgGrossMargin = monthly.reduce((sum, month) => sum + month.grossMargin, 0) / monthly.length;
    const avgNetMargin = monthly.reduce((sum, month) => sum + month.netMargin, 0) / monthly.length;

    return {
      totalRevenue,
      totalProfit,
      totalCustomers: totalCustomersCount,
      averageOrderValue: avgOrderValue,
      customerLifetimeValue,
      customerAcquisitionCost,
      returnOnInvestment,
      inventoryTurnover: avgInventoryTurnover,
      grossMargin: avgGrossMargin,
      netMargin: avgNetMargin,
    };
  }

  private static calculateProperLTV(monthly: MonthlyResults[], params: BusinessParameters): number {
    // Calculate proper LTV using customer behavior modeling
    const avgOrderValue = monthly.reduce((sum, month) => {
      const directOrders = (month.dtcUnitsSold / 1.4) + (month.amazonUnitsSold / 1.4);
      const directRevenue = month.dtcRevenue + month.amazonRevenue;
      return sum + (directOrders > 0 ? directRevenue / directOrders : 0);
    }, 0) / monthly.length;

    // Model customer lifetime using business parameters consistently
    const annualRetentionRate = params.repeatPurchaseRate / 100; // 90% = 0.90
    const churnRate = 1 - annualRetentionRate; // 10% annual churn
    
    // Realistic purchase frequency (3-4 times per year for supplements)
    const purchaseFrequencyPerYear = Math.min(12 / params.purchaseFrequencyMonths, 4); // Cap at 4 purchases/year
    
    const subscriptionRate = params.subscriptionAdoptionRate / 100;
    const subscriptionDiscount = params.subscriptionDiscountPercentage / 100;
    
    // Calculate realistic customer lifespan (cap at 2.5 years max)
    const theoreticalLifespanYears = 1 / churnRate;
    const avgCustomerLifespanYears = Math.min(theoreticalLifespanYears, 2.5); // Realistic cap
    
    // Calculate weighted average order value (accounting for subscriptions)
    const weightedAOV = (avgOrderValue * (1 - subscriptionRate)) + 
                        (avgOrderValue * (1 - subscriptionDiscount) * subscriptionRate);
    
    // Calculate purchases over customer lifetime
    const lifetimePurchases = avgCustomerLifespanYears * purchaseFrequencyPerYear;
    
    // Calculate LTV = Average Order Value × Purchase Frequency × Customer Lifespan
    const calculatedLTV = weightedAOV * lifetimePurchases;
    
    // Apply a conservative adjustment factor for business model reality
    const conservativeAdjustment = 0.75; // 75% of theoretical maximum
    
    const finalLTV = calculatedLTV * conservativeAdjustment;
    
    console.log('LTV Calculation Debug:', {
      avgOrderValue: avgOrderValue.toFixed(2),
      annualRetentionRate: (annualRetentionRate * 100).toFixed(1) + '%',
      avgCustomerLifespanYears: avgCustomerLifespanYears.toFixed(2),
      purchaseFrequencyPerYear: purchaseFrequencyPerYear.toFixed(1),
      lifetimePurchases: lifetimePurchases.toFixed(1),
      weightedAOV: weightedAOV.toFixed(2),
      calculatedLTV: calculatedLTV.toFixed(2),
      finalLTV: finalLTV.toFixed(2)
    });
    
    return finalLTV;
  }

  // Simple LTV calculation for monthly results
  private static calculateSimpleLTV(avgOrderValue: number, annualRetentionRate: number, purchaseFrequencyMonths: number): number {
    const churnRate = 1 - annualRetentionRate;
    const lifespanYears = Math.min(1 / churnRate, 2.5); // Cap at 2.5 years
    const purchaseFrequencyPerYear = Math.min(12 / purchaseFrequencyMonths, 4); // Cap at 4 purchases/year
    const lifetimePurchases = lifespanYears * purchaseFrequencyPerYear;
    return avgOrderValue * lifetimePurchases * 0.75; // Conservative adjustment
  }

  private static calculateDynamicInventoryParams(
    params: BusinessParameters, 
    salesHistory: number[], 
    month: number
  ): { dynamicMinInventory: number; dynamicReorderQuantity: number } {
    
    // For first few months, use static values
    if (month <= 3 || salesHistory.length < 3) {
      return {
        dynamicMinInventory: params.minimumInventoryLevel,
        dynamicReorderQuantity: params.reorderQuantity
      };
    }

    // Calculate average monthly sales from history
    const avgMonthlySales = salesHistory.reduce((sum, sales) => sum + sales, 0) / salesHistory.length;
    
    // Calculate growth trend (comparing first half vs second half of history)
    const firstHalf = salesHistory.slice(0, Math.floor(salesHistory.length / 2));
    const secondHalf = salesHistory.slice(Math.floor(salesHistory.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, sales) => sum + sales, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, sales) => sum + sales, 0) / secondHalf.length;
    
    // Calculate growth rate (but cap it for safety)
    const growthRate = secondHalfAvg > firstHalfAvg ? 
      Math.min((secondHalfAvg - firstHalfAvg) / firstHalfAvg, 0.5) : 0; // Cap at 50% growth
    
    // Project future sales considering growth
    const projectedMonthlySales = avgMonthlySales * (1 + growthRate);
    
    // Dynamic minimum inventory: 1.5 months of projected sales
    const dynamicMinInventory = Math.round(projectedMonthlySales * 1.5);
    
    // Dynamic reorder quantity: 3 months of projected sales
    const dynamicReorderQuantity = Math.round(projectedMonthlySales * 3);
    
    console.log(`Month ${month} Dynamic Inventory:`, {
      avgMonthlySales: avgMonthlySales.toFixed(0),
      growthRate: (growthRate * 100).toFixed(1) + '%',
      projectedMonthlySales: projectedMonthlySales.toFixed(0),
      dynamicMinInventory,
      dynamicReorderQuantity,
      staticMin: params.minimumInventoryLevel,
      staticReorder: params.reorderQuantity
    });
    
    return { dynamicMinInventory, dynamicReorderQuantity };
  }
}
