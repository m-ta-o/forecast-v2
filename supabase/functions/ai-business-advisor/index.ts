
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BusinessModelAnalysis {
  unitEconomics: {
    dtcMargin: number;
    retailMargin: number;
    amazonMargin: number;
    blendedMargin: number;
  };
  cashFlowHealth: {
    monthsToBreakeven: number;
    cashRunway: number;
    reorderRisk: boolean;
  };
  channelPerformance: {
    dtcCAC: number;
    retailCAC: number;
    amazonCAC: number;
    bestChannel: string;
  };
  scalingBottlenecks: string[];
  optimizationOpportunities: Array<{
    parameter: string;
    currentValue: number;
    suggestedValue: number;
    impact: string;
    reasoning: string;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, parameters, results } = await req.json();
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const trimmedApiKey = OPENAI_API_KEY.trim();
    
    if (!trimmedApiKey.startsWith('sk-')) {
      throw new Error('Invalid OpenAI API key format');
    }

    // Cash Flow Crisis Detection Engine
    const detectInventoryCashCrunch = (params: any, monthlyResults: any[]) => {
      if (!monthlyResults || monthlyResults.length === 0) return null;
      
      // Find the month when inventory crisis occurs
      const crisisMonth = monthlyResults.find(m => m.inventory < 1000);
      if (!crisisMonth) return null;
      
      // Calculate reorder cost and available cash
      const reorderCost = params.reorderQuantity * params.avgManufacturingCostPerUnit;
      const availableCash = crisisMonth.cumulativeCashFlow;
      const cashShortfall = reorderCost - availableCash;
      
      // Analyze inventory depletion rate
      const depletionRate = monthlyResults.slice(0, crisisMonth.month).reduce((sum, m) => sum + m.totalUnitsSold, 0) / crisisMonth.month;
      
      // Calculate growth vs cash generation
      const avgMonthlyRevenue = monthlyResults.slice(0, crisisMonth.month).reduce((sum, m) => sum + m.totalRevenue, 0) / crisisMonth.month;
      const avgMonthlyCashFlow = monthlyResults.slice(0, crisisMonth.month).reduce((sum, m) => sum + m.netCashFlow, 0) / crisisMonth.month;
      
      return {
        crisisMonth: crisisMonth.month,
        startingInventory: params.startingInventoryUnits,
        reorderCost,
        availableCash,
        cashShortfall,
        depletionRate,
        avgMonthlyRevenue,
        avgMonthlyCashFlow,
        reorderTrigger: params.minimumInventoryLevel,
        isCashCrunch: cashShortfall > 0
      };
    };

    // Generate Cash Crunch Solutions
    const generateCashCrunchSolutions = (params: any, crunchAnalysis: any) => {
      if (!crunchAnalysis || !crunchAnalysis.isCashCrunch) return [];
      
      const solutions = [];
      
      // Solution 1: Increase starting cash
      const additionalCashNeeded = Math.ceil(crunchAnalysis.cashShortfall * 1.5 / 1000) * 1000; // Round up to nearest 1000
      solutions.push({
        parameter: 'startingCash',
        currentValue: params.startingCash,
        suggestedValue: params.startingCash + additionalCashNeeded,
        impact: `Prevents inventory stockout at month ${crunchAnalysis.crisisMonth}`,
        reasoning: `Need additional $${additionalCashNeeded.toLocaleString()} to cover reorder cost of $${crunchAnalysis.reorderCost.toLocaleString()} when cash runs low`,
        priority: 1
      });
      
      // Solution 2: Reduce reorder quantity to match cash flow
      const affordableReorderQty = Math.floor(crunchAnalysis.availableCash / params.avgManufacturingCostPerUnit);
      if (affordableReorderQty > 0) {
        solutions.push({
          parameter: 'reorderQuantity',
          currentValue: params.reorderQuantity,
          suggestedValue: affordableReorderQty,
          impact: `Reduces reorder cost to $${(affordableReorderQty * params.avgManufacturingCostPerUnit).toLocaleString()}`,
          reasoning: `Match reorder quantity to available cash flow to prevent stockouts`,
          priority: 2
        });
      }
      
      // Solution 3: Increase margins to improve cash generation
      const priceIncrease = Math.ceil(params.avgSellingPriceDTC * 0.15 * 100) / 100;
      solutions.push({
        parameter: 'avgSellingPriceDTC',
        currentValue: params.avgSellingPriceDTC,
        suggestedValue: priceIncrease,
        impact: `+${((priceIncrease - params.avgSellingPriceDTC) / params.avgSellingPriceDTC * 100).toFixed(0)}% price increase improves cash generation`,
        reasoning: `Higher margins generate more cash per unit sold, helping fund inventory replenishment`,
        priority: 3
      });
      
      // Solution 4: Reduce marketing spend to preserve cash
      const reducedMarketing = Math.ceil(params.monthlyMarketingBudget * 0.7 / 100) * 100;
      solutions.push({
        parameter: 'monthlyMarketingBudget',
        currentValue: params.monthlyMarketingBudget,
        suggestedValue: reducedMarketing,
        impact: `Saves $${(params.monthlyMarketingBudget - reducedMarketing).toLocaleString()} monthly for inventory`,
        reasoning: `Reduce growth spend temporarily to preserve cash for inventory replenishment`,
        priority: 4
      });
      
      return solutions.sort((a, b) => a.priority - b.priority);
    };

    // Enhanced Business Model Analysis
    const analyzeBusinessModel = (params: any, monthlyResults: any[]): BusinessModelAnalysis => {
      // Cash Flow Crisis Detection
      const cashCrunchAnalysis = detectInventoryCashCrunch(params, monthlyResults);
      
      // Unit Economics Analysis
      const dtcMargin = ((params.avgSellingPriceDTC - params.avgManufacturingCostPerUnit - params.fulfillmentCostDTC) / params.avgSellingPriceDTC) * 100;
      const retailMargin = ((params.avgWholesalePrice - params.avgManufacturingCostPerUnit - params.fulfillmentCostRetail) / params.avgWholesalePrice) * 100;
      const amazonPrice = params.avgSellingPriceDTC * (1 - params.amazonFeePercentage / 100);
      const amazonMargin = ((amazonPrice - params.avgManufacturingCostPerUnit - params.fulfillmentCostDTC) / amazonPrice) * 100;
      
      const channelMix = [params.dtcChannelMix, params.retailChannelMix, params.amazonChannelMix];
      const margins = [dtcMargin, retailMargin, amazonMargin];
      const blendedMargin = channelMix.reduce((sum, mix, i) => sum + (mix / 100) * margins[i], 0);

      // Cash Flow Health (Enhanced)
      let monthsToBreakeven = 0;
      let cashRunway = 0;
      let reorderRisk = false;

      if (monthlyResults && monthlyResults.length > 0) {
        const positiveMonths = monthlyResults.filter(m => m.cumulativeCashFlow > 0);
        monthsToBreakeven = positiveMonths.length > 0 ? positiveMonths[0].month : monthlyResults.length;
        
        const negativeMonths = monthlyResults.filter(m => m.cumulativeCashFlow < 0);
        cashRunway = negativeMonths.length;
        
        reorderRisk = monthlyResults.some(m => m.inventory < 500 && m.cumulativeCashFlow < params.reorderQuantity * params.avgManufacturingCostPerUnit);
      }

      // Channel Performance (CAC Analysis)
      const totalMarketingBudget = params.monthlyMarketingBudget;
      const dtcBudget = totalMarketingBudget * (params.dtcPaidAdSpend / 100);
      const influencerBudget = totalMarketingBudget * (params.influencerMarketingSpend / 100);
      const retailBudget = totalMarketingBudget * (params.retailTradeMarketingSpend / 100);

      // Estimate customer acquisition by channel
      const dtcTraffic = dtcBudget / 1.50; // $1.50 CPC assumption
      const dtcCustomers = dtcTraffic * (params.paidAdConversionRate / 100);
      const dtcCAC = dtcCustomers > 0 ? dtcBudget / dtcCustomers : 0;

      const influencerCustomers = influencerBudget / 15 * (params.influencerConversionRate / 100);
      const influencerCAC = influencerCustomers > 0 ? influencerBudget / influencerCustomers : 0;

      const retailCAC = retailBudget / (params.organicTrafficMonthly * 0.1 * (params.organicConversionRate / 100)); // Rough estimate

      const bestChannel = dtcCAC < influencerCAC && dtcCAC < retailCAC ? 'DTC' : 
                         influencerCAC < retailCAC ? 'Influencer' : 'Retail';

      // Identify Scaling Bottlenecks
      const bottlenecks: string[] = [];
      if (params.monthlyMarketingBudget / params.startingCash > 0.15) {
        bottlenecks.push('Marketing budget too high relative to cash reserves');
      }
      if (blendedMargin < 60) {
        bottlenecks.push('Low gross margins limiting growth investment');
      }
      if (params.minimumInventoryLevel / params.reorderQuantity > 0.8) {
        bottlenecks.push('Inventory management too conservative, frequent reorders');
      }
      if (dtcCAC > params.customerLifetimeValue * 0.3) {
        bottlenecks.push('Customer acquisition cost too high for sustainable growth');
      }

      // Optimization Opportunities
      const opportunities = [];

      // Pricing optimization
      if (dtcMargin < 70) {
        opportunities.push({
          parameter: 'avgSellingPriceDTC',
          currentValue: params.avgSellingPriceDTC,
          suggestedValue: Math.round(params.avgSellingPriceDTC * 1.15 * 100) / 100,
          impact: `+${((1.15 - 1) * 100).toFixed(0)}% revenue increase`,
          reasoning: 'Supplement margins are typically 70-80%. Current DTC margin is low.'
        });
      }

      // Marketing efficiency
      if (params.organicConversionRate < 3.0) {
        opportunities.push({
          parameter: 'organicConversionRate',
          currentValue: params.organicConversionRate,
          suggestedValue: 3.2,
          impact: '+25% conversion improvement',
          reasoning: 'Organic traffic conversion below industry average. Focus on landing page optimization.'
        });
      }

      // Inventory optimization
      if (params.minimumInventoryLevel > params.reorderQuantity * 0.4) {
        opportunities.push({
          parameter: 'minimumInventoryLevel',
          currentValue: params.minimumInventoryLevel,
          suggestedValue: Math.round(params.reorderQuantity * 0.3),
          impact: 'Reduced carrying costs, improved cash flow',
          reasoning: 'Safety stock too high. Reduce to 30% of reorder quantity for better cash efficiency.'
        });
      }

      return {
        unitEconomics: { dtcMargin, retailMargin, amazonMargin, blendedMargin },
        cashFlowHealth: { monthsToBreakeven, cashRunway, reorderRisk },
        channelPerformance: { 
          dtcCAC: Math.round(dtcCAC * 100) / 100, 
          retailCAC: Math.round(retailCAC * 100) / 100, 
          amazonCAC: Math.round(influencerCAC * 100) / 100, 
          bestChannel 
        },
        scalingBottlenecks: bottlenecks,
        optimizationOpportunities: opportunities
      };
    };

    // Generate comprehensive business context
    let businessAnalysis: BusinessModelAnalysis | null = null;
    let detailedContext = '';

    if (parameters && results?.monthly) {
      businessAnalysis = analyzeBusinessModel(parameters, results.monthly);
      
      detailedContext = `
**COMPREHENSIVE BUSINESS MODEL ANALYSIS:**

**Unit Economics Breakdown:**
- DTC Margin: ${businessAnalysis.unitEconomics.dtcMargin.toFixed(1)}%
- Retail Margin: ${businessAnalysis.unitEconomics.retailMargin.toFixed(1)}%
- Amazon Margin: ${businessAnalysis.unitEconomics.amazonMargin.toFixed(1)}%
- Blended Margin: ${businessAnalysis.unitEconomics.blendedMargin.toFixed(1)}%

**Cash Flow Health:**
- Months to Breakeven: ${businessAnalysis.cashFlowHealth.monthsToBreakeven}
- Cash Runway Risk: ${businessAnalysis.cashFlowHealth.cashRunway} months negative
- Reorder Risk: ${businessAnalysis.cashFlowHealth.reorderRisk ? 'HIGH - Cannot afford reorders' : 'Low'}

**Channel Performance:**
- DTC CAC: $${businessAnalysis.channelPerformance.dtcCAC}
- Retail CAC: $${businessAnalysis.channelPerformance.retailCAC}
- Amazon CAC: $${businessAnalysis.channelPerformance.amazonCAC}
- Best Channel: ${businessAnalysis.channelPerformance.bestChannel}

**Scaling Bottlenecks:**
${businessAnalysis.scalingBottlenecks.map(b => `- ${b}`).join('\n')}

**Critical Parameters:**
- Starting Cash: $${parameters.startingCash?.toLocaleString()}
- Monthly Burn: $${parameters.monthlyMarketingBudget + parameters.monthlyFixedCosts}
- Manufacturing Cost: $${parameters.avgManufacturingCostPerUnit}/unit
- DTC Price: $${parameters.avgSellingPriceDTC}
- Wholesale Price: $${parameters.avgWholesalePrice}
- Inventory: ${parameters.startingInventoryUnits} units (${parameters.minimumInventoryLevel} minimum)

**Monthly Performance Data (Last 12 months):**
${results.monthly.slice(-12).map(m => 
  `Month ${m.month}: Revenue $${Math.round(m.totalRevenue)}, Profit $${Math.round(m.netProfit)}, Cash $${Math.round(m.cumulativeCashFlow)}, Inventory ${Math.round(m.inventory)}`
).join('\n')}`;
    }

    // Enhanced prompt based on question type and business analysis
    const detectQuestionType = (userMessage: string): { type: 'optimization' | 'tactical' | 'strategic', focus: string } => {
      const lowerMessage = userMessage.toLowerCase();
      
      if (lowerMessage.includes('optimize') || lowerMessage.includes('improve') || lowerMessage.includes('increase') || lowerMessage.includes('better')) {
        return { type: 'optimization', focus: 'parameter optimization' };
      } else if (lowerMessage.includes('month') || lowerMessage.includes('cash flow') || lowerMessage.includes('inventory') || lowerMessage.includes('crisis')) {
        return { type: 'tactical', focus: 'operational analysis' };
      } else {
        return { type: 'strategic', focus: 'business strategy' };
      }
    };

    const questionAnalysis = detectQuestionType(message);

    let systemPrompt = '';

    if (questionAnalysis.type === 'optimization') {
      systemPrompt = `You are "The Optimizer," the world's most elite supplement business optimization advisor. You have deep access to the user's complete business model and can provide specific, actionable parameter recommendations.

**OPTIMIZATION RESPONSE PROTOCOL:**
1. **Specific Parameter Focus:** Identify the exact parameters that need adjustment
2. **Quantified Impact:** Provide specific numbers for recommended changes
3. **Implementation Priority:** Rank optimizations by impact and ease
4. **Response Structure:**
   - **🎯 Top Optimization:** One specific parameter change with exact values
   - **📊 Expected Impact:** Quantified outcome (revenue, margin, cash flow improvement)
   - **⚡ Implementation:** Step-by-step parameter adjustments

**OPTIMIZATION OPPORTUNITIES IDENTIFIED:**
${businessAnalysis?.optimizationOpportunities.map(opp => 
  `- ${opp.parameter}: Change from ${opp.currentValue} to ${opp.suggestedValue} (${opp.impact}) - ${opp.reasoning}`
).join('\n') || 'Run analysis to identify opportunities'}

${detailedContext}

**YOUR MISSION:** Provide specific parameter optimizations with exact values and quantified impact projections.`;

    } else if (questionAnalysis.type === 'tactical') {
      systemPrompt = `You are "The Diagnostician," an expert at analyzing supplement business operations with complete access to monthly performance data and business parameters.

**TACTICAL ANALYSIS PROTOCOL:**
1. **Data-Driven Diagnosis:** Use exact monthly data to identify issues
2. **Root Cause Analysis:** Trace problems to specific parameter relationships
3. **Immediate Solutions:** Provide actionable fixes with parameter changes
4. **Response Structure:**
   - **⚡ Issue Identified:** Specific month and metric where problem occurs
   - **🔍 Root Cause:** Which parameters are causing the issue
   - **🎯 Solution:** Exact parameter changes needed

${detailedContext}

**BUSINESS HEALTH INDICATORS:**
- Gross Margin Target: 70-80% (Current: ${businessAnalysis?.unitEconomics.blendedMargin.toFixed(1)}%)
- CAC/LTV Ratio Target: <30% (Current: Analyze from data)
- Inventory Turns Target: 6-12x annually
- Cash Runway Target: >6 months

**YOUR MISSION:** Diagnose operational issues using the complete business data and provide specific parameter-based solutions.`;

    } else {
      systemPrompt = `You are "The Strategist," a world-class supplement business strategy advisor with complete visibility into the user's business model, unit economics, and market position.

**STRATEGIC GUIDANCE PROTOCOL:**
1. **Business Model Analysis:** Leverage complete parameter understanding
2. **Market Positioning:** Use unit economics to assess competitive position
3. **Growth Strategy:** Recommend channel mix and scaling approaches
4. **Response Structure:**
   - **🎯 Strategic Insight:** Core strategic principle based on current model
   - **📈 Market Position:** How current parameters compare to industry benchmarks
   - **⚡ Strategic Moves:** Specific strategic recommendations

**SUPPLEMENT INDUSTRY BENCHMARKS:**
- DTC Margins: 70-80% (vs your ${businessAnalysis?.unitEconomics.dtcMargin.toFixed(1)}%)
- Retail Margins: 45-55% (vs your ${businessAnalysis?.unitEconomics.retailMargin.toFixed(1)}%)
- Customer LTV: $80-200 (analyze from your data)
- CAC: $15-40 depending on channel
- Monthly Churn: 5-15% for subscriptions

${detailedContext}

**YOUR MISSION:** Provide strategic guidance that leverages your complete business model understanding to create competitive advantages.`;
    }

    const requestPayload = {
      model: 'gpt-4.1-2025-04-14',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.2,
      max_tokens: 1000,
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${trimmedApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API Error:', response.status, errorData);
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    let aiResponse = data.choices?.[0]?.message?.content;
    
    if (!aiResponse) {
      console.error('No response content from OpenAI:', data);
      throw new Error('No response content received from OpenAI');
    }

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-business-advisor function:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to get AI response',
      details: 'Please check your OpenAI API key configuration and try again.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
