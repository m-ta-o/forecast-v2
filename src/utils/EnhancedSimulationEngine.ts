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
    
    // Track sales history for dynamic inventory management (with month for deseasonalization)
    const salesHistory: Array<{ units: number; month: number }> = [];
    
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

      // Track sales history for dynamic inventory management (with month for deseasonalization)
      salesHistory.push({ units: monthlyResult.totalUnitsSold, month: month });
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
    salesHistory: Array<{ units: number; month: number }> = []
  ): MonthlyResults {
    // FIX 3.4: Apply seasonality with corrected phase shift
    // Shift by π/6 so peaks occur at months 1-2 (Q1 New Year) and 9-10 (Q3 summer prep)
    // Previously peaked at months 4 and 10 (wrong for fitness/supplement seasonality)
    const seasonalMultiplier = 1 + Math.sin(((month - 1) * Math.PI / 6) + (Math.PI / 6)) * (params.seasonalityFactor - 1);
    
    // Customer acquisition by channel
    const organicTraffic = params.organicTrafficMonthly * Math.pow(1 + params.marketGrowthRate / 100, (month - 1) / 12);
    const organicCustomers = organicTraffic * (params.organicConversionRate / 100);
    
    const dtcAdBudget = params.monthlyMarketingBudget * (params.dtcPaidAdSpend / 100);
    const influencerBudget = params.monthlyMarketingBudget * (params.influencerMarketingSpend / 100);
    const retailTradeBudget = params.monthlyMarketingBudget * (params.retailTradeMarketingSpend / 100);
    
    // FIX 3.3: Use parametrized CPC values instead of hardcoded
    // Estimate traffic and conversions from paid channels (CPC increases with market maturity)
    const baseCPC = params.baseCostPerClick;
    const cpcInflation = Math.pow(1 + params.cpcAnnualInflation / 100, (month - 1) / 12);
    const currentCPC = baseCPC * cpcInflation;
    const paidTraffic = dtcAdBudget / currentCPC;
    const paidCustomers = paidTraffic * (params.paidAdConversionRate / 100);
    
    // FIX 3.3: Use parametrized influencer cost instead of hardcoded $15
    const influencerCustomers = influencerBudget / params.influencerCostPerEngagement * (params.influencerConversionRate / 100);
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
    
    // FIX 3.1: CRITICAL - Purchase frequency using probabilistic model
    // OLD: activeCustomers / purchaseFrequencyMonths assumed perfect uniform distribution
    // This overstated repeat revenue by 2-5x because it assumed customers buy like clockwork
    // NEW: Each customer has probability of purchasing = 1/frequency
    // Example: 3-month frequency = 33.3% chance of buying this month (not guaranteed 1/3 buy)
    const monthlyPurchaseProbability = 1 / params.purchaseFrequencyMonths;
    const repeatPurchases = activeCustomers * monthlyPurchaseProbability;
    const purchasesThisMonth = newCustomers + repeatPurchases;
    
    const dtcPurchases = purchasesThisMonth * (params.dtcChannelMix / 100);
    const retailPurchases = purchasesThisMonth * (params.retailChannelMix / 100);
    const amazonPurchases = purchasesThisMonth * (params.amazonChannelMix / 100);
    
    // FIX 3.3: Use parametrized avgUnitsPerOrder instead of hardcoded 1.4
    const avgUnitsPerOrder = params.avgUnitsPerOrder;
    let dtcUnitsSold = dtcPurchases * avgUnitsPerOrder;
    let retailUnitsSold = retailPurchases * avgUnitsPerOrder;
    let amazonUnitsSold = amazonPurchases * avgUnitsPerOrder;
    let totalUnitsSold = dtcUnitsSold + retailUnitsSold + amazonUnitsSold;

    // FIX 2.1: Check for stockouts and reduce ALL channel units proportionally
    // Previously only totalUnitsSold was capped, causing revenue/cost mismatches
    if (inventory < totalUnitsSold) {
      const stockoutRatio = inventory / totalUnitsSold;
      dtcUnitsSold = dtcUnitsSold * stockoutRatio;
      retailUnitsSold = retailUnitsSold * stockoutRatio;
      amazonUnitsSold = amazonUnitsSold * stockoutRatio;
      totalUnitsSold = inventory; // Can't sell more than we have
      console.log(`Month ${month}: Stockout! Could only fulfill ${(stockoutRatio * 100).toFixed(1)}% of demand`);
    }
    
    // Revenue calculations by channel - FIXED: retail revenue is what YOU receive (wholesale), not what customers pay
    // Subscription portion of DTC sales (not additional revenue, but discounted DTC revenue)
    const subscriptionPortion = dtcPurchases * (params.subscriptionAdoptionRate / 100);
    const regularDtcPortion = dtcPurchases - subscriptionPortion;
    
    // FIX 1.3 REVISED: Agent B found shipping is per ORDER, not per UNIT
    // Customers ordering multiple units pay ONE shipping fee per order
    // Original formula was correct - using purchases (orders), not units
    const dtcRevenue = (regularDtcPortion * params.avgSellingPriceDTC) +
                      (subscriptionPortion * params.avgSellingPriceDTC * (1 - params.subscriptionDiscountPercentage / 100)) -
                      (dtcPurchases * params.dtcShippingCost); // Shipping per order
    
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
    // FIX 1.5: QA costs calculated here only for sold units, but inventory reorders also need QA
    // We'll add the reorder QA costs after inventory purchase logic (see line ~285)
    let manufacturingCosts = Math.ceil(totalUnitsSold / params.unitsPerBatch) * params.qualityTestingCost;
    
    // FIX 1.1: retailTradeBudget is already allocated from monthlyMarketingBudget (line 113)
    // Don't double-count it
    const marketingCosts = params.monthlyMarketingBudget;
    
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
    // FIX 1.2: Gross profit should include direct fulfillment costs per standard accounting
    const grossProfit = totalRevenue - cogs - fulfillmentCosts;
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
    // ROLLBACK Fix 1.4: Agent B (Auditor) found this mixes cash/accrual accounting
    // COGS is accrual (cost when SOLD), inventoryPurchaseCost is cash (cost when BOUGHT)
    // Including both double-counts inventory costs. Keep original formula.
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
      // FIX 1.5: Include QA costs in total reorder cost (manufacturing + QA)
      const unitCost = params.avgManufacturingCostPerUnit;
      const qaCostPerUnit = params.qualityTestingCost / params.unitsPerBatch;
      const totalUnitCost = unitCost + qaCostPerUnit;
      const reorderCost = dynamicReorderQuantity * totalUnitCost;

      // Allow partial reorders if cash is tight, or use credit line for inventory
      if (availableCashThisMonth >= reorderCost) {
        inventory += dynamicReorderQuantity;
        const qaCost = Math.ceil(dynamicReorderQuantity / params.unitsPerBatch) * params.qualityTestingCost;
        // FIX 1.5: Include QA costs in inventoryPurchaseCost so they're deducted from cash flow
        inventoryPurchaseCost = (dynamicReorderQuantity * unitCost) + qaCost;
        manufacturingCosts += qaCost;
        console.log(`Month ${month}: Dynamic reorder of ${dynamicReorderQuantity} units for $${inventoryPurchaseCost.toFixed(2)} (including $${qaCost.toFixed(2)} QA, min: ${dynamicMinInventory})`);
      } else if (availableCashThisMonth >= reorderCost * 0.3) {
        // FIX 2.2: Partial reorder if we have at least 30% of needed cash (was 50%)
        // Use 90% of available cash (was 80%) - more aggressive to prevent stockouts
        const partialQuantity = Math.floor((availableCashThisMonth * 0.9) / totalUnitCost);
        const qaCost = Math.ceil(partialQuantity / params.unitsPerBatch) * params.qualityTestingCost;
        inventory += partialQuantity;
        // FIX 1.5: Include QA costs in inventoryPurchaseCost
        inventoryPurchaseCost = (partialQuantity * unitCost) + qaCost;
        manufacturingCosts += qaCost;
        console.log(`Month ${month}: Partial dynamic reorder of ${partialQuantity} units for $${inventoryPurchaseCost.toFixed(2)} (including $${qaCost.toFixed(2)} QA)`);
      } else {
        // Emergency partial reorder with whatever cash is available
        const emergencyQuantity = Math.floor(availableCashThisMonth * 0.9 / totalUnitCost);
        if (emergencyQuantity > 0) {
          const qaCost = Math.ceil(emergencyQuantity / params.unitsPerBatch) * params.qualityTestingCost;
          inventory += emergencyQuantity;
          // FIX 1.5: Include QA costs in inventoryPurchaseCost
          inventoryPurchaseCost = (emergencyQuantity * unitCost) + qaCost;
          manufacturingCosts += qaCost;
          console.log(`Month ${month}: Emergency reorder of ${emergencyQuantity} units for $${inventoryPurchaseCost.toFixed(2)} (including $${qaCost.toFixed(2)} QA, cash constraint)`);
        } else {
          console.log(`Month ${month}: No reorder possible - insufficient cash ($${availableCashThisMonth.toFixed(2)})`);
        }
      }
    }

    // FIX 1.5: Recalculate totalCosts and netProfit AFTER manufacturingCosts is updated with reorder QA
    const totalCostsFinal = cogs + manufacturingCosts + marketingCosts + fulfillmentCosts + operationalCosts;
    const netProfitFinal = totalRevenue - totalCostsFinal;
    const netMarginFinal = netProfitFinal / totalRevenue * 100;

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
    const customerLifetimeValue = this.calculateSimpleLTV(avgOrderValue, annualRetentionRate, params.purchaseFrequencyMonths, params);
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
      totalCosts: totalCostsFinal,  // Use final value after reorder QA costs
      grossProfit,
      grossMargin,
      netProfit: netProfitFinal,    // Use final value after reorder QA costs
      netMargin: netMarginFinal,    // Use final value after reorder QA costs
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
    
    // FIX 3.3: Use parametrized caps instead of hardcoded values
    const purchaseFrequencyPerYear = Math.min(12 / params.purchaseFrequencyMonths, params.maxPurchasesPerYear);

    const subscriptionRate = params.subscriptionAdoptionRate / 100;
    const subscriptionDiscount = params.subscriptionDiscountPercentage / 100;

    // Calculate realistic customer lifespan with parametrized cap
    const theoreticalLifespanYears = 1 / churnRate;
    const avgCustomerLifespanYears = Math.min(theoreticalLifespanYears, params.maxCustomerLifespanYears);
    
    // Calculate weighted average order value (accounting for subscriptions)
    const weightedAOV = (avgOrderValue * (1 - subscriptionRate)) + 
                        (avgOrderValue * (1 - subscriptionDiscount) * subscriptionRate);
    
    // Calculate purchases over customer lifetime
    const lifetimePurchases = avgCustomerLifespanYears * purchaseFrequencyPerYear;
    
    // Calculate LTV = Average Order Value × Purchase Frequency × Customer Lifespan
    const calculatedLTV = weightedAOV * lifetimePurchases;

    // FIX 3.3: Use parametrized conservative adjustment instead of hardcoded 0.75
    const finalLTV = calculatedLTV * params.ltvConservativeAdjustment;
    
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

  // FIX 3.2: Make LTV calculation consistent with calculateProperLTV
  // Apply same formulas to ensure monthly and total LTV converge
  private static calculateSimpleLTV(
    avgOrderValue: number,
    annualRetentionRate: number,
    purchaseFrequencyMonths: number,
    params: BusinessParameters
  ): number {
    const churnRate = 1 - annualRetentionRate;
    // FIX 3.3: Use parametrized caps instead of hardcoded values
    const lifespanYears = Math.min(1 / churnRate, params.maxCustomerLifespanYears);
    const purchaseFrequencyPerYear = Math.min(12 / purchaseFrequencyMonths, params.maxPurchasesPerYear);
    const lifetimePurchases = lifespanYears * purchaseFrequencyPerYear;

    // FIX 3.2: Apply subscription discount like calculateProperLTV does
    const subscriptionRate = params.subscriptionAdoptionRate / 100;
    const subscriptionDiscount = params.subscriptionDiscountPercentage / 100;
    const weightedAOV = (avgOrderValue * (1 - subscriptionRate)) +
                        (avgOrderValue * (1 - subscriptionDiscount) * subscriptionRate);

    // FIX 3.3: Use parametrized conservative adjustment
    return weightedAOV * lifetimePurchases * params.ltvConservativeAdjustment;
  }

  // Helper function to calculate seasonal multiplier for deseasonalization
  private static getSeasonalMultiplier(month: number, seasonalityFactor: number): number {
    // Same formula as in calculateMonthlyResults
    return 1 + Math.sin(((month - 1) * Math.PI / 6) + (Math.PI / 6)) * (seasonalityFactor - 1);
  }

  private static calculateDynamicInventoryParams(
    params: BusinessParameters,
    salesHistory: Array<{ units: number; month: number }>,
    month: number
  ): { dynamicMinInventory: number; dynamicReorderQuantity: number } {

    // FIX 2.3: Gradually transition from static to dynamic inventory management
    // Month 1: Use static values (no sales history)
    if (salesHistory.length === 0) {
      return {
        dynamicMinInventory: params.minimumInventoryLevel,
        dynamicReorderQuantity: params.reorderQuantity
      };
    }

    // Months 2-3: Blend static and dynamic values based on available history
    if (salesHistory.length < 3) {
      const weight = salesHistory.length / 3; // 0.33 for month 2, 0.67 for month 3

      // Deseasonalize sales before averaging
      const deseasonalizedSales = salesHistory.map(entry => {
        const seasonalMultiplier = this.getSeasonalMultiplier(entry.month, params.seasonalityFactor);
        return entry.units / seasonalMultiplier;
      });

      const avgActualSales = deseasonalizedSales.reduce((a, b) => a + b, 0) / deseasonalizedSales.length;

      const dynamicMin = avgActualSales * 1.5; // 1.5 months safety stock
      const dynamicReorder = avgActualSales * 2; // 2 months reorder quantity (reduced from 3)

      return {
        dynamicMinInventory: Math.round((params.minimumInventoryLevel * (1 - weight)) + (dynamicMin * weight)),
        dynamicReorderQuantity: Math.round((params.reorderQuantity * (1 - weight)) + (dynamicReorder * weight))
      };
    }

    // Month 4+: Seasonal-aware dynamic inventory with exponential smoothing

    // Step 1: Deseasonalize all sales history
    const deseasonalizedSales = salesHistory.map(entry => {
      const seasonalMultiplier = this.getSeasonalMultiplier(entry.month, params.seasonalityFactor);
      return entry.units / seasonalMultiplier;
    });

    // Step 2: Apply exponential smoothing to get trend (α = 0.3 for moderate smoothing)
    const alpha = 0.3;
    let smoothedValue = deseasonalizedSales[0];
    const smoothedSales: number[] = [smoothedValue];

    for (let i = 1; i < deseasonalizedSales.length; i++) {
      smoothedValue = alpha * deseasonalizedSales[i] + (1 - alpha) * smoothedValue;
      smoothedSales.push(smoothedValue);
    }

    // Step 3: Calculate growth rate from smoothed trend (more conservative)
    const firstHalf = smoothedSales.slice(0, Math.floor(smoothedSales.length / 2));
    const secondHalf = smoothedSales.slice(Math.floor(smoothedSales.length / 2));

    const firstHalfAvg = firstHalf.reduce((sum, sales) => sum + sales, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, sales) => sum + sales, 0) / secondHalf.length;

    // Cap growth rate at 20% instead of 50% to prevent overcorrection
    const growthRate = secondHalfAvg > firstHalfAvg ?
      Math.min((secondHalfAvg - firstHalfAvg) / firstHalfAvg, 0.2) :
      Math.max((secondHalfAvg - firstHalfAvg) / firstHalfAvg, -0.2); // Allow 20% decline too

    // Step 4: Project future sales (deseasonalized)
    const avgDeseasonalizedSales = smoothedSales[smoothedSales.length - 1]; // Use most recent smoothed value
    const projectedDeseasonalizedSales = avgDeseasonalizedSales * (1 + growthRate);

    // Step 5: Calculate safety stock based on demand variability
    const salesVariance = deseasonalizedSales.reduce((sum, sale) => {
      return sum + Math.pow(sale - avgDeseasonalizedSales, 2);
    }, 0) / deseasonalizedSales.length;
    const salesStdDev = Math.sqrt(salesVariance);

    // Safety stock = 1.5 standard deviations (covers ~93% of demand variation)
    const safetyStock = salesStdDev * 1.5;

    // Step 6: Set inventory parameters (more conservative)
    // Min inventory = 1 month projected sales + safety stock
    const dynamicMinInventory = Math.round(projectedDeseasonalizedSales + safetyStock);

    // Reorder quantity = 2 months of projected sales (reduced from 3 to dampen oscillations)
    const dynamicReorderQuantity = Math.round(projectedDeseasonalizedSales * 2);

    console.log(`Month ${month} Dynamic Inventory (Seasonal-Aware):`, {
      avgDeseasonalizedSales: avgDeseasonalizedSales.toFixed(0),
      salesStdDev: salesStdDev.toFixed(0),
      safetyStock: safetyStock.toFixed(0),
      growthRate: (growthRate * 100).toFixed(1) + '%',
      projectedDeseasonalizedSales: projectedDeseasonalizedSales.toFixed(0),
      dynamicMinInventory,
      dynamicReorderQuantity,
      rawHistory: salesHistory.map(e => e.units).join(', ')
    });

    return { dynamicMinInventory, dynamicReorderQuantity };
  }
}
