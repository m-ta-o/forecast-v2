import { useNavigate } from 'react-router-dom';
import { useJourney } from '@/contexts/JourneyContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, ArrowLeft } from 'lucide-react';

const Review = () => {
  const navigate = useNavigate();
  const { parameters, goalInput } = useJourney();

  if (!parameters || Object.keys(parameters).length === 0) {
    // No parameters set, redirect back to plan
    navigate('/plan');
    return null;
  }

  // Calculate gross margin
  const price = parameters.avgSellingPriceDTC || 0;
  const cogs = parameters.avgManufacturingCostPerUnit || 0;
  const grossMargin = price > 0 ? ((price - cogs) / price) * 100 : 0;

  const sections = [
    {
      title: 'Product & Pricing',
      icon: '🏷️',
      items: [
        {
          label: 'DTC Price',
          value: `$${parameters.avgSellingPriceDTC?.toFixed(2) || 'N/A'}`,
          reason: 'From market research',
        },
        {
          label: 'Wholesale Price',
          value: `$${parameters.avgWholesalePrice?.toFixed(2) || 'N/A'}`,
          reason: '2.2x COGS (max 70% of retail)',
        },
        {
          label: 'Manufacturing Cost (COGS)',
          value: `$${parameters.avgManufacturingCostPerUnit?.toFixed(2) || 'N/A'}`,
          reason: 'Auto-corrected to 70% gross margin',
        },
        {
          label: 'Purchase Frequency',
          value: `Every ${parameters.purchaseFrequencyMonths || 'N/A'} months`,
          reason: 'From market research',
        },
      ],
    },
    {
      title: 'Channel Mix',
      icon: '📊',
      items: [
        {
          label: 'Direct-to-Consumer (DTC)',
          value: `${parameters.dtcChannelMix || 0}%`,
          reason: 'From selected growth path',
        },
        {
          label: 'Retail/Wholesale',
          value: `${parameters.retailChannelMix || 0}%`,
          reason: 'From selected growth path',
        },
        {
          label: 'Amazon/Marketplace',
          value: `${parameters.amazonChannelMix || 0}%`,
          reason: 'From selected growth path',
        },
      ],
    },
    {
      title: 'Marketing & Acquisition',
      icon: '📢',
      items: [
        {
          label: 'Monthly Marketing Budget',
          value: `$${(parameters.monthlyMarketingBudget || 0).toLocaleString()}`,
          reason: 'Calculated to reach revenue goal',
        },
        {
          label: 'Paid Ads Spend',
          value: `${parameters.dtcPaidAdSpend || 0}%`,
          reason: 'Primary acquisition channel',
        },
        {
          label: 'Influencer Marketing',
          value: `${parameters.influencerMarketingSpend || 0}%`,
          reason: 'Brand awareness & credibility',
        },
        {
          label: 'Retail Trade Marketing',
          value: `${parameters.retailTradeMarketingSpend || 0}%`,
          reason: 'Support retail partnerships',
        },
        {
          label: 'Organic Traffic/Month',
          value: `${(parameters.organicTrafficMonthly || 0).toLocaleString()} visitors`,
          reason: 'Needed to hit revenue target',
        },
        {
          label: 'Organic Conversion Rate',
          value: `${parameters.organicConversionRate || 0}%`,
          reason: 'Industry average for supplements',
        },
        {
          label: 'Paid Ad Conversion Rate',
          value: `${parameters.paidAdConversionRate || 0}%`,
          reason: 'Optimized campaigns',
        },
      ],
    },
    {
      title: 'Financial & Capital',
      icon: '💰',
      items: [
        {
          label: 'Starting Cash',
          value: `$${(parameters.startingCash || 0).toLocaleString()}`,
          reason: 'Based on capital situation',
        },
        {
          label: 'Monthly Fixed Costs',
          value: `$${(parameters.monthlyFixedCosts || 0).toLocaleString()}`,
          reason: 'Scaled to business size',
        },
      ],
    },
    {
      title: 'Inventory & Operations',
      icon: '📦',
      items: [
        {
          label: 'Starting Inventory',
          value: `${(parameters.startingInventoryUnits || 0).toLocaleString()} units`,
          reason: 'Based on revenue goal and timeline',
        },
        {
          label: 'Minimum Stock Level',
          value: `${(parameters.minimumInventoryLevel || 0).toLocaleString()} units`,
          reason: 'Safety stock for operations',
        },
        {
          label: 'Reorder Quantity',
          value: `${(parameters.reorderQuantity || 0).toLocaleString()} units`,
          reason: 'Optimized batch size',
        },
        {
          label: 'Gross Margin',
          value: `${grossMargin.toFixed(1)}%`,
          reason: 'Auto-optimized for profitability',
        },
      ],
    },
  ];

  const handleApprove = () => {
    navigate('/');
  };

  const handleBack = () => {
    navigate('/plan');
  };

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      <header className="bg-gray-900 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-white text-xl font-bold">Review Parameters</h1>
          <span className="text-sm text-gray-400">
            Target: ${(goalInput.targetRevenue || 0).toLocaleString()} in {goalInput.targetRevenueMonth || 0} months
          </span>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Review Your Business Model</CardTitle>
              <p className="text-sm text-gray-400 mt-2">
                These parameters have been calculated based on your market research, revenue goals, and selected growth path.
              </p>
            </CardHeader>
          </Card>

          {sections.map((section) => (
            <Card key={section.title} className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <span>{section.icon}</span>
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {section.items.map((item) => (
                    <div
                      key={item.label}
                      className="flex justify-between items-start py-2 border-b border-gray-700 last:border-0"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-200">{item.label}</div>
                        <div className="text-xs text-gray-500 mt-1">{item.reason}</div>
                      </div>
                      <div className="text-base font-semibold text-white ml-4">{item.value}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-700 p-4 bg-gray-900">
        <div className="max-w-5xl mx-auto flex justify-between">
          <Button
            onClick={handleBack}
            variant="outline"
            className="bg-gray-800 border-gray-700 hover:bg-gray-700 text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Plan
          </Button>
          <Button onClick={handleApprove} className="bg-gray-700 hover:bg-gray-600">
            Apply & View Forecast
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Review;
