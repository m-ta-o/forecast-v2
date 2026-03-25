import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJourney } from '@/contexts/JourneyContext';
import { useBusinessSimulation } from '@/hooks/useBusinessSimulation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ArrowRight } from 'lucide-react';
import { Optimizer, OptimizationGoal, OptimizationConstraints, OptimizationResult } from '@/utils/optimizer';

const Optimize = () => {
  const navigate = useNavigate();
  const { parameters, setParameters } = useJourney();
  const { parameters: fullParameters } = useBusinessSimulation(parameters, 60);

  const [goal, setGoal] = useState<OptimizationGoal['type']>('fastest-profitability');
  const [maxCAC, setMaxCAC] = useState(45);
  const [minGrossMargin, setMinGrossMargin] = useState(65);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);

  const handleOptimize = async () => {
    setIsOptimizing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));

    const optimizationGoal: OptimizationGoal = {
      type: goal,
      targetMonth: 24,
    };

    const constraints: OptimizationConstraints = {
      maxCAC,
      minGrossMargin,
      fixedParameters: ['startingCash', 'avgManufacturingCostPerUnit'],
    };

    try {
      const optimizationResult = Optimizer.optimize(
        fullParameters,
        optimizationGoal,
        constraints,
        100
      );
      setResult(optimizationResult);
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleApply = () => {
    if (result) {
      setParameters(result.optimizedParams);
      navigate('/');
    }
  };

  const formatParamName = (param: string): string => {
    return param
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      <header className="bg-gray-900 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-white text-xl font-bold">Optimize</h1>
          <span className="text-sm text-gray-400">Parameter Optimization</span>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Configuration */}
            <div className="lg:col-span-1 space-y-4">
              {/* Goal Selection */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Goal</CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={goal} onValueChange={(v) => setGoal(v as OptimizationGoal['type'])}>
                    <div className="space-y-2">
                      <div className="flex items-start space-x-2 p-2 rounded border border-gray-700 hover:bg-gray-700/50 cursor-pointer">
                        <RadioGroupItem value="fastest-profitability" id="fastest-prof" />
                        <Label htmlFor="fastest-prof" className="cursor-pointer flex-1">
                          <div className="text-white text-sm">Fastest Profitability</div>
                          <div className="text-xs text-gray-500">Break-even ASAP</div>
                        </Label>
                      </div>

                      <div className="flex items-start space-x-2 p-2 rounded border border-gray-700 hover:bg-gray-700/50 cursor-pointer">
                        <RadioGroupItem value="max-profit" id="max-profit" />
                        <Label htmlFor="max-profit" className="cursor-pointer flex-1">
                          <div className="text-white text-sm">Maximum Profit</div>
                          <div className="text-xs text-gray-500">Total profit (Year 2)</div>
                        </Label>
                      </div>

                      <div className="flex items-start space-x-2 p-2 rounded border border-gray-700 hover:bg-gray-700/50 cursor-pointer">
                        <RadioGroupItem value="max-valuation" id="max-val" />
                        <Label htmlFor="max-val" className="cursor-pointer flex-1">
                          <div className="text-white text-sm">Maximum Valuation</div>
                          <div className="text-xs text-gray-500">ARR × 5</div>
                        </Label>
                      </div>

                      <div className="flex items-start space-x-2 p-2 rounded border border-gray-700 hover:bg-gray-700/50 cursor-pointer">
                        <RadioGroupItem value="min-risk" id="min-risk" />
                        <Label htmlFor="min-risk" className="cursor-pointer flex-1">
                          <div className="text-white text-sm">Minimize Risk</div>
                          <div className="text-xs text-gray-500">Predictable outcomes</div>
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              {/* Constraints */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Constraints</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm text-gray-300">Max CAC</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <Input
                        type="number"
                        value={maxCAC}
                        onChange={(e) => setMaxCAC(Number(e.target.value))}
                        className="bg-gray-900 border-gray-700 text-white pl-7"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-gray-300">Min Gross Margin</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={minGrossMargin}
                        onChange={(e) => setMinGrossMargin(Number(e.target.value))}
                        className="bg-gray-900 border-gray-700 text-white pr-7"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Run Button */}
              <Button
                onClick={handleOptimize}
                disabled={isOptimizing}
                className="w-full bg-gray-700 hover:bg-gray-600"
              >
                {isOptimizing ? 'Optimizing...' : 'Run Optimization'}
              </Button>
            </div>

            {/* Right: Results */}
            <div className="lg:col-span-2">
              {!result && !isOptimizing && (
                <Card className="bg-gray-800 border-gray-700 h-full flex items-center justify-center">
                  <CardContent className="text-center p-12">
                    <p className="text-gray-400">Select goal and run optimization</p>
                  </CardContent>
                </Card>
              )}

              {isOptimizing && (
                <Card className="bg-gray-800 border-gray-700 h-full flex items-center justify-center">
                  <CardContent className="text-center p-12">
                    <p className="text-white mb-2">Running optimization...</p>
                    <p className="text-gray-400 text-sm">Testing parameter combinations</p>
                  </CardContent>
                </Card>
              )}

              {result && !isOptimizing && (
                <div className="space-y-4">
                  {/* Impact Summary */}
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white">Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-400 mb-1">Profit Increase</div>
                          <div className="text-2xl font-bold text-white">
                            +${(result.improvements.profitIncrease / 1000).toFixed(0)}K
                          </div>
                          <div className="text-xs text-gray-500">
                            ({result.improvements.profitIncreasePercent > 0 ? '+' : ''}
                            {result.improvements.profitIncreasePercent.toFixed(1)}%)
                          </div>
                        </div>

                        <div>
                          <div className="text-sm text-gray-400 mb-1">Break-Even</div>
                          <div className="text-2xl font-bold text-white">
                            Month {result.improvements.monthsToBreakEven.optimized}
                          </div>
                          <div className="text-xs text-gray-500">
                            {result.improvements.monthsToBreakEven.improvement > 0 ? '-' : '+'}
                            {Math.abs(result.improvements.monthsToBreakEven.improvement)} months
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Parameter Changes */}
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white">Recommended Changes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {result.changes.slice(0, 7).map((change, idx) => (
                          <div key={idx} className="flex justify-between py-2 border-b border-gray-700 last:border-0 text-sm">
                            <span className="text-gray-300">{formatParamName(change.param)}</span>
                            <div className="text-right">
                              <span className="text-white">
                                {change.original.toFixed(1)} → {change.optimized.toFixed(1)}
                              </span>
                              <span className="text-gray-500 text-xs ml-2">
                                ({change.deltaPercent > 0 ? '+' : ''}{change.deltaPercent.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end gap-3">
                    <Button
                      onClick={() => setResult(null)}
                      variant="outline"
                      className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                    >
                      Run Again
                    </Button>
                    <Button
                      onClick={handleApply}
                      className="bg-gray-700 hover:bg-gray-600"
                    >
                      Apply & Continue
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Optimize;
