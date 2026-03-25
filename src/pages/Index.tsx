import { useState, useEffect } from "react";
import { useBusinessSimulation } from "@/hooks/useBusinessSimulation";
import { useJourney } from "@/contexts/JourneyContext";
import { BusinessInputsSidebar } from "@/components/BusinessInputsSidebar";
import KPICard from "@/components/KPICard";
import { BusinessChart } from "@/components/BusinessChart";
import { AIChat } from "@/components/AIChat";
import { ProfitSensitivityCard } from "@/components/ProfitSensitivityCard";
import { BusinessParameters } from "@/types/business";
import { ScalingRule } from "@/types/scalingRules";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Download, Upload, User, LogOut, FileText, BookOpen, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { PLForecastReport } from "@/components/PLForecastReport";
const Index = () => {
  const { parameters: journeyParameters, setParameters: setJourneyParameters, goalInput } = useJourney();
  const [simulationPeriod, setSimulationPeriod] = useState<number>(60);
  const [parameters, setParametersLocal] = useState<Partial<BusinessParameters>>(journeyParameters || {});
  const [scalingRules, setScalingRules] = useState<Record<string, ScalingRule[]>>({});
  const [savedFormulations, setSavedFormulations] = useState<any[]>([]);
  const [recentlyUpdated, setRecentlyUpdated] = useState<Set<string>>(new Set());

  // Initialize from journey context if available
  useEffect(() => {
    if (journeyParameters && Object.keys(journeyParameters).length > 0) {
      console.log('Dashboard received parameters from journey:', journeyParameters);
      setParametersLocal(journeyParameters);
    }
  }, [journeyParameters]);

  // Wrapper to sync both local and context state
  const setParameters = (params: Partial<BusinessParameters>) => {
    setParametersLocal(params);
    setJourneyParameters(params);
  };

  // Flatten scaling rules for simulation
  const allScalingRules = Object.values(scalingRules).flat();
  const {
    parameters: fullParameters,
    results
  } = useBusinessSimulation(parameters, simulationPeriod, allScalingRules);
  const handleParameterChange = (key: keyof BusinessParameters, value: number) => {
    // Create new parameters object directly (not using function updater)
    const newParams = {
      ...parameters,
      [key]: value
    };
    setParameters(newParams);

    // Track recently updated parameters
    setRecentlyUpdated(prev => new Set(prev).add(key));
    // Clear the highlight after 2 seconds
    setTimeout(() => {
      setRecentlyUpdated(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }, 2000);
  };
  const handleScalingRulesChange = (sectionTitle: string, rules: ScalingRule[]) => {
    setScalingRules(prev => ({
      ...prev,
      [sectionTitle]: rules
    }));
  };
  const handleSaveFormulation = () => {
    const name = prompt("Enter a name for this supplement business model:");
    if (name) {
      const newFormulation = {
        id: Date.now(),
        name,
        parameters: fullParameters,
        scalingRules: allScalingRules,
        createdAt: new Date()
      };
      setSavedFormulations(prev => [...prev, newFormulation]);
      console.log("Saved supplement model:", newFormulation);
    }
  };
  const handleLoadFormulation = (formulation: any) => {
    setParameters(formulation.parameters);
    if (formulation.scalingRules) {
      // Group scaling rules by section (for now, put all in first section)
      const firstSection = "Product & Manufacturing";
      setScalingRules({
        [firstSection]: formulation.scalingRules || []
      });
    }
  };
  const handleExport = () => {
    const data = {
      parameters: fullParameters,
      scalingRules: allScalingRules,
      results,
      exportDate: new Date(),
      businessType: 'supplement'
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'supplement-business-forecast.json';
    a.click();
  };

  // Calculate NPV (Net Present Value)
  const calculateNPV = () => {
    const discountRate = fullParameters.discountRate / 100;
    const monthlyDiscountRate = Math.pow(1 + discountRate, 1 / 12) - 1;
    let npv = -fullParameters.startingCash; // Initial investment is negative

    results.monthly.forEach(month => {
      const discountFactor = Math.pow(1 + monthlyDiscountRate, -month.month);
      npv += month.netCashFlow * discountFactor;
    });
    return npv;
  };

  // Prepare chart data for supplement business
  const chartData = results.monthly.map(month => ({
    month: month.month,
    dtcRevenue: month.dtcRevenue,
    retailRevenue: month.retailRevenue,
    amazonRevenue: month.amazonRevenue,
    totalRevenue: month.totalRevenue,
    grossProfit: month.grossProfit,
    netProfit: month.netProfit,
    totalCustomers: month.totalCustomers,
    inventory: month.inventory,
    marketingCosts: month.marketingCosts,
    operationalCosts: month.operationalCosts,
    cumulativeCashFlow: month.cumulativeCashFlow,
    cogs: month.cogs,
    operatingCashFlow: month.operatingCashFlow,
    netCashFlow: month.netCashFlow
  }));

  // Check goal achievement if goal exists
  const goalAchievement = goalInput && (goalInput.targetRevenue || goalInput.targetProfit) ? (() => {
    const targetMonth = goalInput.targetRevenueMonth || goalInput.targetProfitMonth;
    if (!targetMonth || targetMonth > results.monthly.length) return null;

    // Check PROFIT goals first (they also have targetRevenue set as a calculated value)
    if (goalInput.targetProfit) {
      const isProfitCumulative = goalInput.isProfitCumulative !== false; // Default to cumulative if not specified

      if (isProfitCumulative) {
        // Cumulative profit goal: targetProfit is total profit over targetMonth months
        const cumulativeProfit = results.monthly
          .slice(0, targetMonth)
          .reduce((sum, month) => sum + month.netProfit, 0);

        const cumulativeTarget = goalInput.targetProfit;
        const percentOfGoal = (cumulativeProfit / cumulativeTarget) * 100;

        return {
          type: 'profit',
          target: cumulativeTarget,
          actual: cumulativeProfit,
          month: targetMonth,
          achieved: cumulativeProfit >= cumulativeTarget,
          percentOfGoal,
          isProfitCumulative: true,
        };
      } else {
        // Monthly profit run rate: Compare monthly profit at target month vs targetProfit
        const monthlyProfit = results.monthly[targetMonth - 1]?.netProfit || 0;
        const targetProfit = goalInput.targetProfit;
        const percentOfGoal = (monthlyProfit / targetProfit) * 100;

        return {
          type: 'profit',
          target: targetProfit,
          actual: monthlyProfit,
          month: targetMonth,
          achieved: monthlyProfit >= targetProfit,
          percentOfGoal,
          isProfitCumulative: false,
        };
      }
    } else if (goalInput.targetRevenue) {
      // Pure revenue goals (no profit target)
      const isMonthlyGoal = goalInput.isMonthlyGoal === true;

      if (isMonthlyGoal) {
        // Monthly revenue goal: Compare monthly revenue at target month vs targetRevenue
        const monthlyRevenue = results.monthly[targetMonth - 1]?.totalRevenue || 0;
        const targetRevenue = goalInput.targetRevenue;
        const percentOfGoal = (monthlyRevenue / targetRevenue) * 100;

        return {
          type: 'revenue',
          target: targetRevenue,
          actual: monthlyRevenue,
          month: targetMonth,
          achieved: monthlyRevenue >= targetRevenue,
          percentOfGoal,
          isMonthlyGoal: true,
        };
      } else {
        // Cumulative revenue goal: targetRevenue is monthly average, multiply by months for total
        const cumulativeRevenue = results.monthly
          .slice(0, targetMonth)
          .reduce((sum, month) => sum + month.totalRevenue, 0);

        const cumulativeTarget = goalInput.targetRevenue * targetMonth;
        const percentOfGoal = (cumulativeRevenue / cumulativeTarget) * 100;

        return {
          type: 'revenue',
          target: cumulativeTarget,
          actual: cumulativeRevenue,
          month: targetMonth,
          achieved: cumulativeRevenue >= cumulativeTarget,
          percentOfGoal,
          isMonthlyGoal: false,
        };
      }
    }
    return null;
  })() : null;
  return <div className="h-screen bg-gray-900 flex">
      {/* Left Sidebar - Parameter Inputs */}
      <BusinessInputsSidebar parameters={fullParameters} onParameterChange={handleParameterChange} scalingRules={scalingRules} onScalingRulesChange={handleScalingRulesChange} recentlyUpdated={recentlyUpdated} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header - Fixed Height */}
        <header className="bg-gray-900 border-b border-gray-700 p-4 h-16">
          <div className="flex items-center justify-between h-full">
            <div>
              <h1 className="text-white text-xl font-bold">Health Supplement Revenue Simulation</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Formulation Manager */}
              <div className="flex items-center space-x-2">
                <Button asChild variant="outline" size="sm" className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
                  <Link to="/start">
                    <Sparkles className="h-4 w-4 mr-1" />
                    Guided Setup
                  </Link>
                </Button>
              </div>

              {/* Simulation Period */}
              <div className="flex items-center space-x-2">
                <span className="text-gray-400 text-sm">Simulation Period:</span>
                <Select value={simulationPeriod.toString()} onValueChange={value => setSimulationPeriod(parseInt(value))}>
                  <SelectTrigger className="w-32 bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="12" className="text-white hover:bg-gray-700">1 Year</SelectItem>
                    <SelectItem value="24" className="text-white hover:bg-gray-700">2 Years</SelectItem>
                    <SelectItem value="36" className="text-white hover:bg-gray-700">3 Years</SelectItem>
                    <SelectItem value="60" className="text-white hover:bg-gray-700">5 Years</SelectItem>
                    <SelectItem value="120" className="text-white hover:bg-gray-700">10 Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            {/* Goal Achievement Banner */}
            {goalAchievement && (
              <Card className={`${
                goalAchievement.achieved
                  ? 'bg-emerald-900/20 border-emerald-600'
                  : 'bg-amber-900/20 border-amber-600'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-lg font-semibold ${
                        goalAchievement.achieved ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {goalAchievement.achieved ? '✓ Goal Achieved' : '⚠ Goal Not Met'}
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">
                        {goalAchievement.type === 'revenue'
                          ? (goalAchievement.isMonthlyGoal
                              ? `Monthly Revenue at Month ${goalAchievement.month}`
                              : `Cumulative Revenue (Months 1-${goalAchievement.month})`)
                          : (goalAchievement.isProfitCumulative !== false
                              ? `Cumulative Profit (Months 1-${goalAchievement.month})`
                              : `Monthly Profit at Month ${goalAchievement.month}`)
                        }
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-baseline gap-3">
                        <div>
                          <div className="text-xs text-gray-400">Target</div>
                          <div className="text-xl font-bold text-white">
                            ${goalAchievement.target.toLocaleString()}
                          </div>
                        </div>
                        <div className="text-2xl text-gray-600">→</div>
                        <div>
                          <div className="text-xs text-gray-400">Actual</div>
                          <div className={`text-xl font-bold ${
                            goalAchievement.achieved ? 'text-emerald-400' : 'text-amber-400'
                          }`}>
                            ${goalAchievement.actual.toLocaleString()}
                          </div>
                        </div>
                        <div className={`ml-4 px-3 py-1 rounded ${
                          goalAchievement.achieved ? 'bg-emerald-600' : 'bg-amber-600'
                        }`}>
                          <div className="text-sm font-semibold text-white">
                            {goalAchievement.percentOfGoal.toFixed(0)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* KPI Grid */}
            <div className="grid grid-cols-4 gap-4">
              <KPICard title="Total Revenue" value={results.totals.totalRevenue} prefix="$" />
              <KPICard title="Net Profit" value={results.totals.totalProfit} prefix="$" />
              <KPICard title="Customer LTV" value={results.totals.customerLifetimeValue} prefix="$" />
              <KPICard title="Customer CAC" value={results.totals.customerAcquisitionCost} prefix="$" />
              <KPICard title="Total Customers" value={results.totals.totalCustomers} />
              <KPICard title="NPV" value={calculateNPV()} prefix="$" />
              <KPICard title="Gross Margin" value={results.totals.grossMargin} suffix="%" />
              <Sheet>
                <SheetTrigger asChild className="col-span-1">
                  <KPICard title="P&L Forecast" value="View Report" className="hover:bg-gray-700 cursor-pointer h-full" />
                </SheetTrigger>
                <SheetContent side="right" className="bg-gray-900 border-gray-800 text-white w-full sm:w-[90vw] sm:max-w-[1400px] p-0 flex flex-col">
                  <SheetHeader className="p-4 border-b border-gray-700">
                    <SheetTitle className="text-white">P&L Forecast Report</SheetTitle>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto p-4">
                    <PLForecastReport results={results} />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-2 gap-6">
              <BusinessChart
                title="Revenue by Channel"
                description="DTC (retail price) | Retail (wholesale) | Amazon (retail - fees)"
                data={chartData}
                lines={[{
                  key: 'dtcRevenue',
                  name: 'DTC Revenue',
                  color: '#3B82F6'
                }, {
                  key: 'retailRevenue',
                  name: 'Retail Revenue',
                  color: '#10B981'
                }, {
                  key: 'amazonRevenue',
                  name: 'Amazon Revenue',
                  color: '#F59E0B'
                }]}
              />
              
              <BusinessChart
                title="Profitability Trend"
                description="Gross = Revenue - COGS - Fulfillment | Net = Gross - Marketing - OpEx"
                data={chartData}
                lines={[{
                  key: 'grossProfit',
                  name: 'Gross Profit',
                  color: '#10B981'
                }, {
                  key: 'netProfit',
                  name: 'Net Profit',
                  color: '#8B5CF6'
                }]}
              />
              
              <BusinessChart
                title="Customer Growth"
                description="Total = Previous + New - Churn | Churn = (1 - Retention Rate) × Active Customers"
                data={chartData}
                lines={[{
                  key: 'totalCustomers',
                  name: 'Total Customers',
                  color: '#06B6D4'
                }]}
              />
              
              <BusinessChart
                title="Inventory Management"
                description="Reorder when: Inventory < Dynamic Min (based on 3-month avg sales × 1.5) | Stockouts reduce sales proportionally"
                data={chartData}
                lines={[{
                  key: 'inventory',
                  name: 'Inventory Units',
                  color: '#84CC16'
                }]}
              />
              
              <BusinessChart
                title="Cost Analysis"
                description="COGS (materials + manufacturing) | Marketing (ads + influencers + trade) | OpEx (software + facilities + salaries)"
                data={chartData}
                lines={[{
                  key: 'cogs',
                  name: 'COGS',
                  color: '#D97706'
                }, {
                  key: 'marketingCosts',
                  name: 'Marketing Costs',
                  color: '#F59E0B'
                }, {
                  key: 'operationalCosts',
                  name: 'Operational Costs',
                  color: '#EF4444'
                }]}
              />

              <BusinessChart
                title="Cash Flow Analysis"
                description="Operating CF = Revenue - OpEx | Net CF = Operating CF - Inventory Purchases | Cash on Hand = Cumulative Net CF"
                data={chartData}
                lines={[{
                  key: 'operatingCashFlow',
                  name: 'Operating CF',
                  color: '#22C55E'
                }, {
                  key: 'netCashFlow',
                  name: 'Net CF',
                  color: '#3B82F6'
                }, {
                  key: 'cumulativeCashFlow',
                  name: 'Cash on Hand',
                  color: '#ffc658'
                }]}
              />
              
              <div className="col-span-2">
                <ProfitSensitivityCard parameters={fullParameters} results={results} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Chat Component */}
      <AIChat parameters={fullParameters} results={results} />
    </div>;
};
export default Index;