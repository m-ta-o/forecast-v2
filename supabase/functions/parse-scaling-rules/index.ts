
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const businessParameters = [
  'numberOfSKUs', 'avgManufacturingCostPerUnit', 'avgSellingPriceDTC', 'avgWholesalePrice',
  'productShelfLife', 'unitsPerBatch', 'manufacturingLeadTime', 'qualityTestingCost',
  'dtcChannelMix', 'retailChannelMix', 'amazonChannelMix', 'dtcConversionRate',
  'dtcShippingCost', 'retailSlottingFees', 'retailMargin', 'amazonFeePercentage',
  'subscriptionDiscountPercentage', 'subscriptionAdoptionRate', 'monthlyMarketingBudget',
  'dtcPaidAdSpend', 'influencerMarketingSpend', 'retailTradeMarketingSpend',
  'organicTrafficMonthly', 'organicConversionRate', 'paidAdConversionRate',
  'influencerConversionRate', 'customerReferralRate', 'averageOrderValue',
  'repeatPurchaseRate', 'purchaseFrequencyMonths', 'startingInventoryUnits',
  'safetyStockMonths', 'inventoryCarryingCostPercentage', 'expirationWastePercentage',
  'warehouseCostPerUnit', 'fulfillmentCostDTC', 'fulfillmentCostRetail',
  'returnRatePercentage', 'startingCash', 'monthlyFixedCosts', 'paymentProcessingFee',
  'insuranceAndLegalCosts', 'rdExpensePercentage', 'corporateTaxRate', 'discountRate',
  'marketGrowthRate', 'seasonalityFactor', 'competitiveGrowthImpact', 'minimumInventoryLevel', 'reorderQuantity'
];

serve(async (req) => {
  console.log(`Received request: ${req.method} ${req.url}`);
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS preflight request.");
    return new Response(null, { headers: corsHeaders });
  }

  // Health check endpoint
  if (req.method === 'GET' && new URL(req.url).pathname.endsWith('/health')) {
    console.log("Health check endpoint hit.");
    return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }

  try {
    if (!openAIApiKey || typeof openAIApiKey !== 'string' || !openAIApiKey.trim().startsWith('sk-')) {
      const errorMessage = 'Server configuration error: The OPENAI_API_KEY is missing, empty, or invalid. Please ensure it is set correctly in your project secrets and starts with "sk-".';
      console.error(errorMessage);
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const trimmedApiKey = openAIApiKey.trim();

    const { ruleText } = await req.json();
    console.log("Received ruleText:", ruleText);

    if (!ruleText || typeof ruleText !== 'string') {
      return new Response(JSON.stringify({ error: 'Rule text is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are an expert financial rule parser for a business simulation. Your task is to convert natural language rules into a structured JSON format.

**Parsing Guidelines:**

1.  **Investment/Funding:**
    *   Recognize terms like "investment", "invest", "capital injection", "funding", "cash injection".
    *   These rules should ALWAYS map to:
        *   \`"parameter": "startingCash"\`
        *   \`"ruleType": "fixed_increase"\`
    *   Example: "Add 20k investment" -> \`{ "parameter": "startingCash", "ruleType": "fixed_increase", "value": 20000, "frequency": "once" }\`
    *   Example: "Cash injection of $20k at the 1yr mark" -> \`{ "parameter": "startingCash", "ruleType": "fixed_increase", "value": 20000, "frequency": "once", "startMonth": 12 }\`

2.  **Time-Based Triggers:**
    *   Recognize phrases indicating a specific start time.
    *   Map them to a \`startMonth\` property. The simulation starts at month 1.
    *   "at month 6" -> \`{ "startMonth": 6 }\`
    *   "at the one year mark" / "after 1 year" / "at year 1" / "at the 1yr mark" -> \`{ "startMonth": 12 }\`
    *   "at year 2" -> \`{ "startMonth": 24 }\`
    *   If a time-based trigger is present, the \`frequency\` should typically be \`"once"\`.

3.  **Numeric Values:**
    *   Correctly interpret suffixes like 'k' for thousands (e.g., '20k' becomes 20000).

4.  **Set Value:**
    *   Recognize phrases like "set price to 55".
    *   Map this to \`"ruleType": "set_value"\`.
    *   Example: "set price to $55" -> \`{ "parameter": "avgSellingPriceDTC", "ruleType": "set_value", "value": 55, "frequency": "once" }\`

5.  **Parameters & Metrics:**
    *   Use only the provided list of parameters for the \`parameter\` and \`triggerParameter\` fields.
    *   Available parameters: ${businessParameters.join(', ')}
    *   Available metrics for conditions: totalRevenue, totalCustomers, currentInventory

**JSON Output Format:**

Return ONLY a single, valid JSON object in the following structure. Do NOT include any explanations or markdown formatting.

{
  "parameter": "exact_parameter_name_from_list",
  "ruleType": "percentage_increase" | "percentage_decrease" | "fixed_increase" | "fixed_decrease" | "set_value",
  "value": number,
  "frequency": "monthly" | "quarterly" | "yearly" | "once",
  "startMonth": number,
  "condition": {
    "triggerParameter": "parameter_or_metric_from_list",
    "operator": ">=" | "<=" | "==" | ">" | "<",
    "threshold": number
  }
}

*   Omit fields like "condition" and "startMonth" if they are not present in the rule.
*   If a rule is impossible to parse, return \`{"parsed": false}\`.`;

    const headers = {
      'Authorization': `Bearer ${trimmedApiKey}`,
      'Content-Type': 'application/json'
    };
    
    console.log("Calling OpenAI API to parse rule:", ruleText);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Parse this rule: "${ruleText}"` }
        ],
        temperature: 0,
        max_tokens: 300,
        response_format: { type: "json_object" },
      }),
    });
    
    console.log(`OpenAI API response status: ${response.status}`);

    if (!response.ok) {
        const errorBody = await response.text();
        console.error('OpenAI API error:', response.status, errorBody);
        throw new Error(`OpenAI API request failed with status ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0]) {
      console.error('Invalid OpenAI response structure:', data);
      throw new Error('Invalid OpenAI response');
    }

    const content = data.choices[0].message.content.trim();
    console.log('AI Response content:', content);

    try {
      const parsedRule = JSON.parse(content);
      
      if (parsedRule.parsed === false) {
        console.log("AI indicated rule could not be parsed.");
        return new Response(JSON.stringify({ parsed: false }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Basic validation
      if (!parsedRule.parameter || !parsedRule.ruleType || typeof parsedRule.value !== 'number') {
         console.warn('Parsed rule failed validation:', parsedRule);
        return new Response(JSON.stringify({ parsed: false }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // If startMonth is detected, ensure frequency is 'once' if it's not a recurring rule
      if (parsedRule.startMonth && !parsedRule.frequency) {
          parsedRule.frequency = 'once';
      }

      console.log("Successfully parsed rule:", parsedRule);
      return new Response(JSON.stringify({
        parsed: true,
        ...parsedRule
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Raw content:', content);
      return new Response(JSON.stringify({ parsed: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in parse-scaling-rules function:', error.message);
    return new Response(JSON.stringify({ 
      error: error.message,
      parsed: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

