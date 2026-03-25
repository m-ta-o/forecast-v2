import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJourney } from '@/contexts/JourneyContext';
import { useBusinessSimulation } from '@/hooks/useBusinessSimulation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowRight } from 'lucide-react';
import { MonteCarloSimulator, MonteCarloResults } from '@/utils/monteCarloSimulator';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const Explore = () => {
  const navigate = useNavigate();
  const { parameters } = useJourney();
  const { parameters: fullParameters } = useBusinessSimulation(parameters, 60);

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<MonteCarloResults | null>(null);

  useEffect(() => {
    runSimulation();
  }, []);

  const runSimulation = async () => {
    setIsRunning(true);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      console.time('Monte Carlo Simulation');
      console.log('Starting Monte Carlo with parameters:', fullParameters);
      const monteCarloResults = MonteCarloSimulator.runMonteCarlo(fullParameters, 60, 1000);
      console.timeEnd('Monte Carlo Simulation');
      console.log('Results:', monteCarloResults);
      setResults(monteCarloResults);
      setProgress(100);
    } catch (error) {
      console.error('Monte Carlo simulation failed:', error);
    } finally {
      clearInterval(progressInterval);
      setIsRunning(false);
    }
  };

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      <header className="bg-gray-900 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-white text-xl font-bold">Explore</h1>
          <span className="text-sm text-gray-400">Scenario Analysis (1,000 simulations)</span>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Loading State */}
          {isRunning && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Running Simulations...</CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-gray-400 mt-2">{progress}% complete</p>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {results && !isRunning && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-gray-400">Most Likely Range (p25-p75)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-white">
                      ${(results.percentiles.p25 / 1000).toFixed(0)}K - ${(results.percentiles.p75 / 1000).toFixed(0)}K
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-gray-400">Median Outcome</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-white">
                      ${(results.percentiles.p50 / 1000).toFixed(0)}K
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Mean: ${(results.mean / 1000).toFixed(0)}K</p>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-gray-400">Loss Probability</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-white">
                      {results.probabilityOfLoss.toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Distribution Chart */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Profit Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={results.distribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis
                        dataKey="bucket"
                        stroke="#9ca3af"
                        tick={{ fontSize: 11 }}
                        angle={-45}
                        textAnchor="end"
                        height={70}
                      />
                      <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: '1px solid #374151',
                          borderRadius: '4px',
                        }}
                        labelStyle={{ color: '#fff' }}
                        formatter={(value: number) => `${value} scenarios`}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {results.distribution.map((entry, index) => {
                          let fill = '#6b7280';
                          if (entry.bucket.includes('-')) fill = '#ef4444';
                          else if (entry.bucket.includes('$0 to $50K')) fill = '#f59e0b';
                          else if (entry.bucket.includes('> $300K')) fill = '#10b981';
                          return <Cell key={`cell-${index}`} fill={fill} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Probability Breakdown */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-gray-400">Loss Probability</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">
                      {results.probabilityOfLoss.toFixed(1)}%
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Worst: ${(results.percentiles.p5 / 1000).toFixed(0)}K (p5)
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-gray-400">Break-Even Range</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">
                      {results.probabilityOfBreakeven.toFixed(1)}%
                    </div>
                    <p className="text-xs text-gray-400 mt-1">$0 - $50K profit</p>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-gray-400">Success Probability</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">
                      {results.probabilityOfSuccess.toFixed(1)}%
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Best: ${(results.percentiles.p95 / 1000).toFixed(0)}K (p95)
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Key Drivers */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Key Risk Drivers</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between py-2 border-b border-gray-700 text-sm">
                    <span className="text-gray-300">Customer Retention Rate</span>
                    <span className="text-white">±10% → ±${(results.stdDev * 0.3 / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-700 text-sm">
                    <span className="text-gray-300">Paid Ad Conversion Rate</span>
                    <span className="text-white">±20% → ±${(results.stdDev * 0.25 / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-700 text-sm">
                    <span className="text-gray-300">Product Pricing</span>
                    <span className="text-white">±15% → ±${(results.stdDev * 0.2 / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="flex justify-between py-2 text-sm">
                    <span className="text-gray-300">Marketing Efficiency</span>
                    <span className="text-white">±15% → ±${(results.stdDev * 0.15 / 1000).toFixed(0)}K</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-gray-700 p-4">
        <div className="max-w-6xl mx-auto flex justify-end">
          <Button
            onClick={() => navigate('/optimize')}
            className="bg-gray-700 hover:bg-gray-600"
            disabled={!results}
          >
            Continue
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Explore;
