import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJourney } from '@/contexts/JourneyContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight } from 'lucide-react';
import { ReverseCalculator } from '@/utils/reverseCalculator';
import { WizardMapper } from '@/utils/wizardMapper';
import { BusinessPath } from '@/types/wizard';

const Plan = () => {
  const navigate = useNavigate();
  const { wizardState, goalInput, setGoalInput, parameters, setParameters } = useJourney();

  // Auto-suggest revenue goals based on business goal and capital situation
  const getSuggestedGoals = () => {
    const { businessGoal, capitalSituation } = wizardState;

    // Different targets based on goal + capital situation
    if (businessGoal === 'profitability') {
      if (capitalSituation === 'bootstrapped') return { revenue: 300000, month: 18 };
      if (capitalSituation === 'small-seed') return { revenue: 500000, month: 18 };
      return { revenue: 1000000, month: 24 }; // series-a
    } else if (businessGoal === 'growth-funding') {
      if (capitalSituation === 'bootstrapped') return { revenue: 1000000, month: 24 };
      if (capitalSituation === 'small-seed') return { revenue: 2000000, month: 24 };
      return { revenue: 5000000, month: 36 }; // series-a
    } else { // lifestyle
      if (capitalSituation === 'bootstrapped') return { revenue: 200000, month: 12 };
      if (capitalSituation === 'small-seed') return { revenue: 400000, month: 18 };
      return { revenue: 800000, month: 24 }; // series-a
    }
  };

  const suggested = getSuggestedGoals();
  const [targetRevenue, setTargetRevenue] = useState(goalInput.targetRevenue || suggested.revenue);
  const [targetMonth, setTargetMonth] = useState(goalInput.targetRevenueMonth || suggested.month);
  const [paths, setPaths] = useState<BusinessPath[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [showPaths, setShowPaths] = useState(false);

  const handleCalculate = () => {
    const goal = {
      targetRevenue,
      targetRevenueMonth: targetMonth,
    };

    setGoalInput(goal);

    // Map wizard data to parameters (use ONLY wizard data, don't merge with old parameters)
    const wizardParams = WizardMapper.mapToBusinessParameters(wizardState);

    const calculatedPaths = ReverseCalculator.calculateRevenuePaths(goal, wizardParams);
    setPaths(calculatedPaths);
    setShowPaths(true);
  };

  const handleSelectPath = (pathId: string) => {
    setSelectedPath(pathId);
    const path = paths.find(p => p.id === pathId);
    if (path) {
      // First map wizard data to parameters
      const wizardParams = WizardMapper.mapToBusinessParameters(wizardState);

      // Then apply path-specific adjustments with goal input
      const goal = {
        targetRevenue,
        targetRevenueMonth: targetMonth,
      };
      const updatedParams = ReverseCalculator.applyPathToParameters(path, wizardParams, goal);

      console.log('Plan - Setting parameters:', updatedParams);
      console.log('Key values:', {
        organicTraffic: updatedParams.organicTrafficMonthly,
        marketingBudget: updatedParams.monthlyMarketingBudget,
        price: updatedParams.avgSellingPriceDTC,
        cogs: updatedParams.avgManufacturingCostPerUnit,
      });

      setParameters(updatedParams);
    }
  };

  const handleContinue = () => {
    // Navigate to review page
    navigate('/review');
  };

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      <header className="bg-gray-900 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-white text-xl font-bold">Plan</h1>
          <span className="text-sm text-gray-400">Revenue Goal Calculator</span>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Goal Input */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Revenue Goal</CardTitle>
              <p className="text-sm text-gray-400 mt-1">
                Suggested for <span className="text-gray-300">{wizardState.businessGoal === 'profitability' ? 'Profitability' : wizardState.businessGoal === 'growth-funding' ? 'Growth/Funding' : 'Lifestyle'}</span> goal
                {' '}with <span className="text-gray-300">{wizardState.capitalSituation === 'bootstrapped' ? 'bootstrapped' : wizardState.capitalSituation === 'small-seed' ? 'small seed' : 'Series A'}</span> capital
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-gray-300">Target Revenue</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <Input
                      type="number"
                      value={targetRevenue}
                      onChange={(e) => setTargetRevenue(Number(e.target.value))}
                      className="bg-gray-900 border-gray-700 text-white pl-7"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-gray-300">Target Month</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={targetMonth}
                      onChange={(e) => setTargetMonth(Number(e.target.value))}
                      className="bg-gray-900 border-gray-700 text-white pr-16"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">months</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleCalculate}
                className="mt-4 w-full bg-gray-700 hover:bg-gray-600"
              >
                Calculate Paths
              </Button>
            </CardContent>
          </Card>

          {/* Paths */}
          {showPaths && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {paths.map((path) => (
                  <Card
                    key={path.id}
                    className={`cursor-pointer transition-all ${
                      selectedPath === path.id
                        ? 'bg-gray-700 border-gray-600'
                        : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                    }`}
                    onClick={() => handleSelectPath(path.id)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-white text-base">{path.name}</CardTitle>
                      <p className="text-gray-400 text-sm">{path.description}</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Monthly Customers</span>
                        <span className="text-white">{path.monthlyCustomers.toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">LTV:CAC</span>
                        <span className="text-white">{path.ltvCacRatio.toFixed(2)}:1</span>
                      </div>

                      <div className="flex justify-between text-xs text-gray-500">
                        <span>LTV: ${path.ltv}</span>
                        <span>CAC: ${path.cac}</span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Monthly Marketing</span>
                        <span className="text-white">${(path.monthlyMarketing / 1000).toFixed(0)}K</span>
                      </div>

                      <div className="pt-2 border-t border-gray-700">
                        <div className="text-xs text-gray-500 mb-1">Channel Mix</div>
                        <div className="text-sm text-white">
                          {path.channelMix.dtc > 0 && `${path.channelMix.dtc}% DTC`}
                          {path.channelMix.dtc > 0 && path.channelMix.retail > 0 && ' • '}
                          {path.channelMix.retail > 0 && `${path.channelMix.retail}% Retail`}
                          {path.channelMix.retail > 0 && path.channelMix.amazon > 0 && ' • '}
                          {path.channelMix.amazon > 0 && `${path.channelMix.amazon}% Amazon`}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gray-700">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-400">Risk</span>
                          <span className="text-white">{path.risk}</span>
                        </div>
                        <p className="text-xs text-gray-500">{path.riskDescription}</p>
                        <div className="flex justify-between text-sm mt-2">
                          <span className="text-gray-400">Scalability</span>
                          <span className="text-white">{path.scalability}</span>
                        </div>
                      </div>

                      {path.id === 'blended' && (
                        <div className="pt-2 text-center">
                          <span className="text-xs text-gray-400">Recommended</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {selectedPath && (
                <div className="flex justify-end">
                  <Button
                    onClick={handleContinue}
                    className="bg-gray-700 hover:bg-gray-600"
                  >
                    Review Parameters
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Plan;
