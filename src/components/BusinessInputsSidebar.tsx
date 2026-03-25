
import { useState } from "react";
import { ParameterInput } from "./ParameterInput";
import { ParameterSection } from "./ParameterSection";
import { BusinessParameters } from "@/types/business";
import { ScalingRule } from "@/types/scalingRules";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface BusinessInputsSidebarProps {
  parameters: BusinessParameters;
  onParameterChange: (key: keyof BusinessParameters, value: number) => void;
  scalingRules: Record<string, ScalingRule[]>;
  onScalingRulesChange: (sectionTitle: string, rules: ScalingRule[]) => void;
  recentlyUpdated: Set<string>;
}

export function BusinessInputsSidebar({
  parameters,
  onParameterChange,
  scalingRules,
  onScalingRulesChange,
  recentlyUpdated
}: BusinessInputsSidebarProps) {
  const [isOfferingExpanded, setIsOfferingExpanded] = useState(false);

  const productManufacturingParams = [{
    key: 'avgManufacturingCostPerUnit' as keyof BusinessParameters,
    label: 'Avg Manufacturing Cost Per Unit',
    prefix: '$',
    min: 0
  }, {
    key: 'avgSellingPriceDTC' as keyof BusinessParameters,
    label: 'Avg Selling Price DTC',
    prefix: '$',
    min: 0
  }, {
    key: 'avgWholesalePrice' as keyof BusinessParameters,
    label: 'Avg Wholesale Price',
    prefix: '$',
    min: 0
  }, {
    key: 'productShelfLife' as keyof BusinessParameters,
    label: 'Product Shelf Life',
    suffix: 'months',
    min: 1,
    step: 1
  }, {
    key: 'unitsPerBatch' as keyof BusinessParameters,
    label: 'Units Per Batch',
    min: 1,
    step: 1
  }, {
    key: 'qualityTestingCost' as keyof BusinessParameters,
    label: 'Quality Testing Cost',
    prefix: '$',
    min: 0
  }];
  const salesChannelsParams = [{
    key: 'dtcChannelMix' as keyof BusinessParameters,
    label: 'DTC Channel Mix',
    suffix: '%',
    min: 0,
    max: 100
  }, {
    key: 'retailChannelMix' as keyof BusinessParameters,
    label: 'Retail Channel Mix',
    suffix: '%',
    min: 0,
    max: 100
  }, {
    key: 'amazonChannelMix' as keyof BusinessParameters,
    label: 'Amazon Channel Mix',
    suffix: '%',
    min: 0,
    max: 100
  }, {
    key: 'dtcShippingCost' as keyof BusinessParameters,
    label: 'DTC Shipping Cost',
    prefix: '$',
    min: 0
  }, {
    key: 'amazonFeePercentage' as keyof BusinessParameters,
    label: 'Amazon Fee Percentage',
    suffix: '%',
    min: 0,
    max: 100
  }, {
    key: 'subscriptionDiscountPercentage' as keyof BusinessParameters,
    label: 'Subscription Discount Percentage',
    suffix: '%',
    min: 0,
    max: 100
  }, {
    key: 'subscriptionAdoptionRate' as keyof BusinessParameters,
    label: 'Subscription Adoption Rate',
    suffix: '%',
    min: 0,
    max: 100
  }];
  const marketingParams = [{
    key: 'monthlyMarketingBudget' as keyof BusinessParameters,
    label: 'Monthly Marketing Budget',
    prefix: '$',
    min: 0,
    step: 100
  }, {
    key: 'dtcPaidAdSpend' as keyof BusinessParameters,
    label: 'DTC Paid Ad Spend',
    suffix: '%',
    min: 0,
    max: 100
  }, {
    key: 'influencerMarketingSpend' as keyof BusinessParameters,
    label: 'Influencer Marketing Spend',
    suffix: '%',
    min: 0,
    max: 100
  }, {
    key: 'retailTradeMarketingSpend' as keyof BusinessParameters,
    label: 'Retail Trade Marketing Spend',
    suffix: '%',
    min: 0,
    max: 100
  }, {
    key: 'organicTrafficMonthly' as keyof BusinessParameters,
    label: 'Organic Traffic Monthly',
    suffix: 'visits',
    min: 0,
    step: 100
  }, {
    key: 'organicConversionRate' as keyof BusinessParameters,
    label: 'Organic Conversion Rate',
    suffix: '%',
    min: 0,
    max: 100
  }, {
    key: 'paidAdConversionRate' as keyof BusinessParameters,
    label: 'Paid Ad Conversion Rate',
    suffix: '%',
    min: 0,
    max: 100
  }, {
    key: 'influencerConversionRate' as keyof BusinessParameters,
    label: 'Influencer Conversion Rate',
    suffix: '%',
    min: 0,
    max: 100
  }, {
    key: 'customerReferralRate' as keyof BusinessParameters,
    label: 'Customer Referral Rate',
    suffix: '%',
    min: 0,
    max: 100
  }, {
    key: 'repeatPurchaseRate' as keyof BusinessParameters,
    label: 'Repeat Purchase Rate',
    suffix: '%',
    min: 0,
    max: 100
  }, {
    key: 'purchaseFrequencyMonths' as keyof BusinessParameters,
    label: 'Purchase Frequency Months',
    suffix: 'months',
    min: 1,
    step: 0.5
  }];
  const inventoryParams = [{
    key: 'startingInventoryUnits' as keyof BusinessParameters,
    label: 'Starting Inventory Units',
    suffix: 'units',
    min: 0,
    step: 1
  }, {
    key: 'minimumInventoryLevel' as keyof BusinessParameters,
    label: 'Minimum Inventory Level',
    suffix: 'units',
    min: 0,
    step: 100
  }, {
    key: 'reorderQuantity' as keyof BusinessParameters,
    label: 'Reorder Quantity',
    suffix: 'units',
    min: 0,
    step: 100
  }, {
    key: 'expirationWastePercentage' as keyof BusinessParameters,
    label: 'Expiration Waste Percentage',
    suffix: '%',
    min: 0,
    max: 100
  }, {
    key: 'warehouseCostPerUnit' as keyof BusinessParameters,
    label: 'Warehouse Cost Per Unit',
    prefix: '$',
    min: 0
  }, {
    key: 'fulfillmentCostDTC' as keyof BusinessParameters,
    label: 'Fulfillment Cost DTC',
    prefix: '$',
    min: 0
  }, {
    key: 'fulfillmentCostRetail' as keyof BusinessParameters,
    label: 'Fulfillment Cost Retail',
    prefix: '$',
    min: 0
  }];
  const financialParams = [{
    key: 'startingCash' as keyof BusinessParameters,
    label: 'Starting Cash',
    prefix: '$',
    min: 0,
    step: 1000
  }, {
    key: 'monthlyFixedCosts' as keyof BusinessParameters,
    label: 'Monthly Fixed Costs',
    prefix: '$',
    min: 0,
    step: 100
  }, {
    key: 'paymentProcessingFee' as keyof BusinessParameters,
    label: 'Payment Processing Fee',
    suffix: '%',
    min: 0,
    max: 100
  }, {
    key: 'insuranceAndLegalCosts' as keyof BusinessParameters,
    label: 'Insurance and Legal Costs',
    prefix: '$',
    min: 0,
    step: 100
  }, {
    key: 'rdExpensePercentage' as keyof BusinessParameters,
    label: 'R&D Expense Percentage',
    suffix: '%',
    min: 0,
    max: 100
  }, {
    key: 'discountRate' as keyof BusinessParameters,
    label: 'Discount Rate',
    suffix: '%',
    min: 0,
    max: 100
  }];
  const growthParams = [{
    key: 'marketGrowthRate' as keyof BusinessParameters,
    label: 'Market Growth Rate',
    suffix: '%',
    min: 0,
    max: 100
  }, {
    key: 'seasonalityFactor' as keyof BusinessParameters,
    label: 'Seasonality Factor',
    min: 0.5,
    max: 2,
    step: 0.1
  }];

  return <div className="w-80 bg-gray-900 border-r border-gray-700 flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center overflow-hidden">
            <img src="/lovable-uploads/5c6feeef-ad19-4318-8f6b-bc9551bcbcd1.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-white font-bold text-xl">Forecast</h1>
            
          </div>
        </div>
      </div>

      {/* Parameters with proper scrolling */}
      <ScrollArea className="h-full">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Model Inputs</h2>
            <span className="text-blue-400 text-sm font-medium">28 parameters</span>
          </div>
        </div>

        <div className="px-4 pb-6">
          <div className="space-y-0">
            {/* Offering Section */}
            <div className="border-b border-gray-700">
              <Button
                variant="ghost"
                onClick={() => setIsOfferingExpanded(!isOfferingExpanded)}
                className="w-full justify-between p-4 h-auto text-left hover:bg-gray-800"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">🎯</span>
                  <div>
                    <h3 className="font-medium text-white">Offering</h3>
                    <p className="text-sm text-gray-400">Product showcase</p>
                  </div>
                </div>
                {isOfferingExpanded ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </Button>

              {isOfferingExpanded && (
                <div className="px-4 pb-4">
                  <div className="flex justify-center">
                    <img 
                      src="/lovable-uploads/598c5912-b096-4517-9060-74494f2b22ca.png" 
                      alt="Edge Brain Health Gummies" 
                      className="max-w-full h-auto rounded-lg shadow-lg"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Product & Manufacturing */}
            <ParameterSection title="Product & Manufacturing" icon="🏭" parameters={productManufacturingParams} values={parameters} onParameterChange={onParameterChange} recentlyUpdated={recentlyUpdated} scalingRules={scalingRules["Product & Manufacturing"] || []} onScalingRulesChange={rules => onScalingRulesChange("Product & Manufacturing", rules)} />

            {/* Sales Channels */}
            <ParameterSection title="Sales Channels" icon="🛒" parameters={salesChannelsParams} values={parameters} onParameterChange={onParameterChange} recentlyUpdated={recentlyUpdated} scalingRules={scalingRules["Sales Channels"] || []} onScalingRulesChange={rules => onScalingRulesChange("Sales Channels", rules)} />

            {/* Marketing & Customer Acquisition */}
            <ParameterSection title="Marketing & Customer Acquisition" icon="📈" parameters={marketingParams} values={parameters} onParameterChange={onParameterChange} recentlyUpdated={recentlyUpdated} scalingRules={scalingRules["Marketing & Customer Acquisition"] || []} onScalingRulesChange={rules => onScalingRulesChange("Marketing & Customer Acquisition", rules)} />

            {/* Inventory & Operations */}
            <ParameterSection title="Inventory & Operations" icon="📦" parameters={inventoryParams} values={parameters} onParameterChange={onParameterChange} recentlyUpdated={recentlyUpdated} scalingRules={scalingRules["Inventory & Operations"] || []} onScalingRulesChange={rules => onScalingRulesChange("Inventory & Operations", rules)} />

            {/* Financial & Overhead */}
            <ParameterSection title="Financial & Overhead" icon="💰" parameters={financialParams} values={parameters} onParameterChange={onParameterChange} recentlyUpdated={recentlyUpdated} scalingRules={scalingRules["Financial & Overhead"] || []} onScalingRulesChange={rules => onScalingRulesChange("Financial & Overhead", rules)} />

            {/* Growth & Market */}
            <ParameterSection title="Growth & Market" icon="📊" parameters={growthParams} values={parameters} onParameterChange={onParameterChange} recentlyUpdated={recentlyUpdated} scalingRules={scalingRules["Growth & Market"] || []} onScalingRulesChange={rules => onScalingRulesChange("Growth & Market", rules)} />
          </div>
        </div>
      </ScrollArea>
    </div>;
}
