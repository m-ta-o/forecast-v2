
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BusinessParameters, SimulationResults } from '@/types/business';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface ProfitSensitivityCardProps {
  parameters: BusinessParameters;
  results: SimulationResults;
}

interface SensitivityData {
  parameter: string;
  impactPercentage: number;
  increaseHelpsProfit: boolean;
}

export function ProfitSensitivityCard({ parameters, results }: ProfitSensitivityCardProps) {
  const currentProfit = results.totals.totalProfit;
  
  console.log('Sensitivity Analysis Debug:', {
    currentProfit,
    totalRevenue: results.totals.totalRevenue,
    isProfitPositive: currentProfit > 0,
    isProfitSignificant: Math.abs(currentProfit) > 1000
  });
  
  // Calculate sensitivity for key parameters (10% variation)
  const calculateSensitivity = (): SensitivityData[] => {
    const variationPercent = 0.1; // 10% variation
    
    // Safety check: if profit is zero, negative, or very small, we can't calculate meaningful sensitivity
    if (Math.abs(currentProfit) < 100) {
      console.warn('Profit too small for meaningful sensitivity analysis:', currentProfit);
      return [];
    }
    
    // Get basic metrics for calculations
    const totalUnitsSold = results.monthly.reduce((sum, m) => sum + m.totalUnitsSold, 0);
    const dtcUnitsSold = results.monthly.reduce((sum, m) => sum + m.dtcUnitsSold, 0);
    const months = results.monthly.length;
    
    return [
      {
        parameter: `Selling Price (DTC) ($${parameters.avgSellingPriceDTC.toFixed(2)})`,
        // Higher price = more revenue per DTC unit
        impactPercentage: (dtcUnitsSold * parameters.avgSellingPriceDTC * variationPercent / Math.abs(currentProfit)) * 100,
        increaseHelpsProfit: true
      },
      {
        parameter: `Manufacturing Cost ($${parameters.avgManufacturingCostPerUnit.toFixed(2)})`,
        // Higher manufacturing cost = less profit
        impactPercentage: (totalUnitsSold * parameters.avgManufacturingCostPerUnit * variationPercent / Math.abs(currentProfit)) * 100,
        increaseHelpsProfit: false
      },
      {
        parameter: `Marketing Budget ($${parameters.monthlyMarketingBudget.toLocaleString()})`,
        // Higher marketing = higher costs but potentially more customers
        impactPercentage: (parameters.monthlyMarketingBudget * months * variationPercent / Math.abs(currentProfit)) * 100,
        increaseHelpsProfit: false
      },
      {
        parameter: `Monthly Fixed Costs ($${parameters.monthlyFixedCosts.toLocaleString()})`,
        // Higher fixed costs = less profit
        impactPercentage: (parameters.monthlyFixedCosts * months * variationPercent / Math.abs(currentProfit)) * 100,
        increaseHelpsProfit: false
      },
      {
        parameter: `Organic Conversion Rate (${parameters.organicConversionRate.toFixed(1)}%)`,
        // Higher conversion = more sales (estimate impact on revenue)
        impactPercentage: (results.totals.totalRevenue * 0.15 * variationPercent / Math.abs(currentProfit)) * 100,
        increaseHelpsProfit: true
      },
      {
        parameter: `Wholesale Price ($${parameters.avgWholesalePrice.toFixed(2)})`,
        // Higher wholesale price = more revenue per retail unit
        impactPercentage: ((totalUnitsSold - dtcUnitsSold) * parameters.avgWholesalePrice * variationPercent / Math.abs(currentProfit)) * 100,
        increaseHelpsProfit: true
      }
    ].filter(item => !isNaN(item.impactPercentage) && isFinite(item.impactPercentage));
  };

  const sensitivityData = calculateSensitivity();
  
  // Sort by absolute impact (highest first)
  const sortedData = sensitivityData
    .filter(d => d.impactPercentage > 0) // Remove any with zero impact
    .sort((a, b) => Math.abs(b.impactPercentage) - Math.abs(a.impactPercentage));

  const maxImpact = Math.max(...sortedData.map(d => Math.abs(d.impactPercentage)));

  // Show error state if we can't calculate sensitivity
  if (sortedData.length === 0) {
    return (
      <Card className="bg-gray-800 border-gray-700 h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-lg">Profit Sensitivity Analysis</CardTitle>
          <p className="text-gray-400 text-sm">
            Impact of 10% parameter changes on total profit
          </p>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center space-y-2">
            <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto" />
            <div className="text-white text-sm font-medium">Analysis Unavailable</div>
            <div className="text-gray-400 text-xs max-w-48">
              {currentProfit <= 0 
                ? "Business is losing money - improve profitability first"
                : "Profit margin too small for meaningful sensitivity analysis"
              }
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700 h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-lg">Profit Sensitivity Analysis</CardTitle>
        <p className="text-gray-400 text-sm">
          Impact of 10% parameter changes on total profit
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedData.map((item, index) => {
          const barWidth = (Math.abs(item.impactPercentage) / maxImpact) * 100;
          const isPositive = item.increaseHelpsProfit;
          
          return (
            <div key={index} className="space-y-1">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    {isPositive ? (
                      <TrendingUp className="h-3 w-3 text-green-400" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-400" />
                    )}
                    <span className="text-white text-sm font-medium">{item.parameter}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                    {Math.abs(item.impactPercentage).toFixed(1)}%
                  </div>
                </div>
              </div>
              
              {/* Single horizontal bar */}
              <div className="w-full bg-gray-700 rounded-full h-1.5">
                <div 
                  className={`h-1.5 rounded-full ${isPositive ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
        
        <div className="pt-2 border-t border-gray-700">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <TrendingUp className="h-3 w-3 text-green-400" />
                <span>Increase helps profit</span>
              </div>
              <div className="flex items-center space-x-1">
                <TrendingDown className="h-3 w-3 text-red-400" />
                <span>Increase hurts profit</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
