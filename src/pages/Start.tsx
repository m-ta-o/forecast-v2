import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJourney } from '@/contexts/JourneyContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowRight, Loader2, Sparkles, TrendingUp, Target, HelpCircle } from 'lucide-react';
import { MarketRegion, CapitalSituation, BusinessGoal, MarketResearch } from '@/types/wizard';
import { WizardMapper } from '@/utils/wizardMapper';
import { ReverseCalculator } from '@/utils/reverseCalculator';

const Start = () => {
  const navigate = useNavigate();
  const { wizardState, setWizardState, goalInput, setGoalInput, parameters, setParameters } = useJourney();

  // Form state
  const [productDescription, setProductDescription] = useState('');
  const [productFormat, setProductFormat] = useState('');
  const [pricingUnit, setPricingUnit] = useState('');
  const [marketRegions, setMarketRegions] = useState<MarketRegion[]>([]);
  const [capitalSituation, setCapitalSituation] = useState<CapitalSituation>('bootstrapped');
  const [businessGoal, setBusinessGoal] = useState<BusinessGoal>('profitability');
  const [goalType, setGoalType] = useState<'revenue' | 'profit'>('profit');
  const [revenueGoalType, setRevenueGoalType] = useState<'cumulative' | 'monthly'>('cumulative');
  const [profitGoalType, setProfitGoalType] = useState<'cumulative' | 'monthly'>('cumulative');
  const [goalAmount, setGoalAmount] = useState(100000);
  const [targetMonth, setTargetMonth] = useState(24);

  // Process state
  const [isProcessing, setIsProcessing] = useState(false);
  const [researchComplete, setResearchComplete] = useState(false);
  const [marketResearch, setMarketResearch] = useState<Record<MarketRegion, MarketResearch> | null>(null);
  const [calculatedParameters, setCalculatedParameters] = useState<any>(null);
  const [calculatedGoal, setCalculatedGoal] = useState<{
    targetRevenue: number;
    targetProfit?: number;
    targetMonth: number;
  } | null>(null);
  const [parameterReasons, setParameterReasons] = useState<Record<string, string>>({});

  // UI state
  const [showResearch, setShowResearch] = useState(false);
  const [showParameters, setShowParameters] = useState(false);
  const [suggestions, setSuggestions] = useState<{
    suggestedFormats: string[];
    suggestedUnits: string[];
    reasoning: string;
  } | null>(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Restore form state from context when component mounts
  useEffect(() => {
    if (wizardState.productDescription) {
      setProductDescription(wizardState.productDescription);
    }
    if (wizardState.productFormat) {
      setProductFormat(wizardState.productFormat);
    }
    if (wizardState.pricingUnit) {
      setPricingUnit(wizardState.pricingUnit);
    }
    if (wizardState.marketRegions.length > 0) {
      setMarketRegions(wizardState.marketRegions);
    }
    if (wizardState.capitalSituation) {
      setCapitalSituation(wizardState.capitalSituation);
    }
    if (wizardState.businessGoal) {
      setBusinessGoal(wizardState.businessGoal);
    }
    if (wizardState.marketResearch) {
      setMarketResearch(wizardState.marketResearch);
      setResearchComplete(true);
    }

    // Restore parameters if available
    if (parameters && Object.keys(parameters).length > 0) {
      setCalculatedParameters(parameters);
      setShowParameters(true);
    }

    // Restore goal UI state from localStorage
    try {
      const savedGoalState = localStorage.getItem('wizard-goal-state');
      if (savedGoalState) {
        const parsed = JSON.parse(savedGoalState);
        if (parsed.goalType) setGoalType(parsed.goalType);
        if (parsed.revenueGoalType) setRevenueGoalType(parsed.revenueGoalType);
        if (parsed.profitGoalType) setProfitGoalType(parsed.profitGoalType);
        if (parsed.goalAmount) setGoalAmount(parsed.goalAmount);
        if (parsed.targetMonth) setTargetMonth(parsed.targetMonth);
      }
    } catch (e) {
      console.error('Failed to restore goal state from localStorage:', e);
    }
  }, []); // Only run once on mount

  const getSuggestedGoal = () => {
    const isProfit = goalType === 'profit';
    const multiplier = isProfit ? 0.25 : 1;

    if (businessGoal === 'profitability') {
      if (capitalSituation === 'bootstrapped') return Math.round(300000 * multiplier);
      if (capitalSituation === 'small-seed') return Math.round(500000 * multiplier);
      return Math.round(1000000 * multiplier);
    } else if (businessGoal === 'growth-funding') {
      if (capitalSituation === 'bootstrapped') return Math.round(1000000 * multiplier);
      if (capitalSituation === 'small-seed') return Math.round(2000000 * multiplier);
      return Math.round(5000000 * multiplier);
    } else {
      if (capitalSituation === 'bootstrapped') return Math.round(200000 * multiplier);
      if (capitalSituation === 'small-seed') return Math.round(400000 * multiplier);
      return Math.round(800000 * multiplier);
    }
  };

  const getCurrencySymbol = (region: MarketRegion): string => {
    switch (region) {
      case 'US': return '$';
      case 'AU': return 'A$';
      case 'UK': return '£';
      case 'CA': return 'C$';
      case 'EU': return '€';
      default: return '$';
    }
  };

  const getCurrencyCode = (region: MarketRegion): string => {
    switch (region) {
      case 'US': return 'USD';
      case 'AU': return 'AUD';
      case 'UK': return 'GBP';
      case 'CA': return 'CAD';
      case 'EU': return 'EUR';
      default: return 'USD';
    }
  };

  const handleGetSuggestions = async () => {
    if (!productDescription || productDescription.trim().length < 10) {
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const response = await fetch('/api/suggest-format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productDescription }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data);
      }
    } catch (error) {
      console.error('Failed to get suggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const conductMarketResearch = async (): Promise<Record<MarketRegion, MarketResearch> | null> => {
    try {
      const results: Record<string, MarketResearch> = {};

      const promises = marketRegions.map(async (region) => {
        const currency = getCurrencyCode(region);

        try {
          const response = await fetch('/api/market-research', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productDescription,
              region,
              productFormat: productFormat || undefined,
              pricingUnit: pricingUnit || undefined,
            }),
          });

          if (!response.ok) throw new Error('API request failed');

          const data = await response.json();
          return { region, data: { ...data, currency } };
        } catch (error) {
          console.error(`Market research failed for ${region}:`, error);
          return {
            region,
            data: {
              avgRetailPrice: 45,
              priceRange: { min: 30, max: 70 },
              priceUnit: 'per 30-day supply',
              typicalCOGS: 12,
              cogsRange: { min: 8, max: 18 },
              grossMarginPercent: 70,
              purchaseFrequencyMonths: 2,
              competitorExamples: ['API unavailable - using defaults'],
              marketInsights: 'Unable to connect to research API. Using default estimates.',
              currency,
            }
          };
        }
      });

      const responses = await Promise.all(promises);
      responses.forEach(({ region, data }) => {
        results[region] = data;
      });

      return results as Record<MarketRegion, MarketResearch>;
    } catch (error) {
      console.error('Market research failed:', error);
      return null;
    }
  };

  const handleRunCalculation = async () => {
    setIsProcessing(true);

    const research = await conductMarketResearch();
    if (!research) {
      setIsProcessing(false);
      return;
    }

    setMarketResearch(research);
    setResearchComplete(true);

    const wizardState = {
      productDescription,
      productFormat,
      pricingUnit,
      marketRegions,
      capitalSituation,
      businessGoal,
      marketResearch: research,
      completed: true,
    };

    setWizardState(wizardState);

    const baseParams = WizardMapper.mapToBusinessParameters(wizardState);

    let goalInput: any;
    let targetRevenue: number;

    if (goalType === 'profit') {
      // Handle cumulative vs monthly profit goal
      let monthlyProfit: number;

      if (profitGoalType === 'cumulative') {
        // Cumulative profit: divide by months to get average monthly profit
        monthlyProfit = Math.round(goalAmount / targetMonth);
        console.log(`Cumulative profit goal: $${goalAmount.toLocaleString()} over ${targetMonth} months = $${monthlyProfit.toLocaleString()}/month average`);
      } else {
        // Monthly profit run rate
        monthlyProfit = goalAmount;
        console.log(`Monthly profit goal: $${goalAmount.toLocaleString()}/month by month ${targetMonth}`);
      }

      goalInput = {
        targetProfit: profitGoalType === 'cumulative' ? goalAmount : monthlyProfit,
        targetProfitMonth: targetMonth,
        isProfitCumulative: profitGoalType === 'cumulative',
      };

      // For revenue calculation, always use monthly profit (what we need per month)
      const profitReqs = ReverseCalculator.calculateProfitRequirements(
        {
          targetProfit: monthlyProfit,
          targetProfitMonth: targetMonth,
          isProfitCumulative: profitGoalType === 'cumulative',
        },
        baseParams
      );
      targetRevenue = profitReqs.requiredRevenue;

      console.log('Profit goal calculation:', {
        targetProfit: monthlyProfit,
        requiredRevenue: targetRevenue,
        assumptions: 'Gross margin 70%, Operating costs 45%'
      });

      goalInput.targetRevenue = targetRevenue;
      goalInput.targetRevenueMonth = targetMonth;

      setCalculatedGoal({
        targetRevenue,
        targetProfit: profitGoalType === 'cumulative' ? goalAmount : monthlyProfit,
        targetMonth,
      });
    } else {
      // For cumulative revenue, convert to monthly target
      // For monthly revenue, use as-is
      if (revenueGoalType === 'cumulative') {
        // Average monthly revenue needed to hit cumulative target
        targetRevenue = Math.round(goalAmount / targetMonth);
        console.log(`Cumulative revenue goal: $${goalAmount.toLocaleString()} over ${targetMonth} months = $${targetRevenue.toLocaleString()}/month average`);
      } else {
        // Monthly run rate goal
        targetRevenue = goalAmount;
        console.log(`Monthly revenue goal: $${goalAmount.toLocaleString()}/month by month ${targetMonth}`);
      }

      goalInput = {
        targetRevenue,
        targetRevenueMonth: targetMonth,
        isMonthlyGoal: revenueGoalType === 'monthly', // Flag to distinguish goal types
      };

      setCalculatedGoal({
        targetRevenue: revenueGoalType === 'cumulative' ? goalAmount : targetRevenue, // Store original goal amount
        targetMonth,
      });
    }

    setGoalInput(goalInput);

    // SKIP GOAL-SEEKING - just use base parameters with adjusted marketing budget
    console.log('Calculating parameters based on goals...');

    // Simple heuristic: set marketing budget based on revenue goal
    const estimatedMarketingBudget = Math.min(
      targetRevenue * 0.3, // 30% of target revenue
      50000 // Cap at $50K/month
    );

    const finalParams = {
      ...baseParams,
      monthlyMarketingBudget: estimatedMarketingBudget,
      organicTrafficMonthly: Math.round(estimatedMarketingBudget * 0.5),
    };

    console.log('Parameters calculated:', finalParams);

    // Generate explanations for why each parameter was calculated
    const capitalLabel = capitalSituation === 'bootstrapped' ? 'Bootstrap ($50K)' :
                         capitalSituation === 'small-seed' ? 'Seed ($500K)' : 'Series A ($2M)';
    const goalTypeLabel = goalType === 'profit'
      ? (profitGoalType === 'cumulative'
          ? `$${goalAmount.toLocaleString()} total profit`
          : `$${goalAmount.toLocaleString()}/month profit`)
      : (revenueGoalType === 'cumulative'
          ? `$${goalAmount.toLocaleString()} total revenue`
          : `$${goalAmount.toLocaleString()}/month revenue`);

    const reasons: Record<string, string> = {
      avgSellingPriceDTC: `From ${marketRegions[0]} market research`,
      avgManufacturingCostPerUnit: `From market research, auto-corrected to achieve 70%+ margin`,
      avgWholesalePrice: `2.2x COGS, capped at 70% of retail`,
      dtcChannelMix: `Blended growth strategy for ${capitalLabel}`,
      retailChannelMix: `Blended growth strategy for ${capitalLabel}`,
      amazonChannelMix: `Blended growth strategy for ${capitalLabel}`,
      monthlyMarketingBudget: `Calculated to acquire enough customers to reach ${goalTypeLabel} in ${targetMonth} months`,
      organicTrafficMonthly: `Traffic needed to generate ${Math.round(finalParams.organicTrafficMonthly! * (finalParams.organicConversionRate || 2.8) / 100)} customers/month at ${finalParams.organicConversionRate}% conversion`,
      organicConversionRate: `Industry average for supplements`,
      monthlyFixedCosts: `Scaled for ${capitalLabel} business size`,
      startingInventoryUnits: `${((finalParams.startingInventoryUnits || 0) / (goalAmount / targetMonth / (finalParams.avgSellingPriceDTC || 1))).toFixed(1)} months of initial supply`,
      startingCash: `Starting capital from ${capitalLabel}`,
    };

    setParameterReasons(reasons);

    // Store ALL parameters, not just the ones we display
    setCalculatedParameters(finalParams);
    setParameters(finalParams);

    // Save goal UI state to localStorage for restoration
    try {
      localStorage.setItem('wizard-goal-state', JSON.stringify({
        goalType,
        revenueGoalType,
        profitGoalType,
        goalAmount,
        targetMonth,
      }));
    } catch (e) {
      console.error('Failed to save goal state to localStorage:', e);
    }

    setIsProcessing(false);
    setShowResearch(true);
    setShowParameters(true);
  };

  const canRun = () => {
    return (
      productDescription.trim().length > 10 &&
      marketRegions.length > 0 &&
      goalAmount > 0 &&
      targetMonth > 0
    );
  };

  return (
    <div className="h-screen bg-neutral-50 flex flex-col overflow-hidden">
      {/* Compact Header */}
      <header className="border-b border-neutral-200 bg-white px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">Business Forecast</h1>
            <p className="text-xs text-neutral-500 mt-0.5">Configure parameters</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-indigo-800 bg-indigo-50/60 px-3 py-1.5 rounded-md">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Physical products only</span>
          </div>
          {researchComplete && (
            <Button
              onClick={() => navigate('/')}
              variant="ghost"
              size="sm"
              className="text-xs"
            >
              Dashboard →
            </Button>
          )}
        </div>
      </header>

      {/* Dashboard Layout */}
      <main className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-[380px_1fr] gap-6 h-full">
          {/* Left Column - Product */}
          <div className="space-y-4">
            <div className="bg-white border border-neutral-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-semibold text-neutral-900">PRODUCT</Label>
                <Button
                  type="button"
                  onClick={handleGetSuggestions}
                  disabled={productDescription.trim().length < 10 || isLoadingSuggestions}
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-indigo-600 hover:text-indigo-700 px-2"
                >
                  {isLoadingSuggestions ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                </Button>
              </div>
              <Textarea
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="e.g., Organic protein powder for CrossFit athletes..."
                className="text-sm h-20 resize-none border-neutral-300 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
              />
              {suggestions && (
                <div className="p-2 bg-indigo-50/50 border border-indigo-100 rounded text-xs text-indigo-800">
                  {suggestions.reasoning}
                </div>
              )}

              <div className="space-y-2">
                <Input
                  value={productFormat}
                  onChange={(e) => setProductFormat(e.target.value)}
                  placeholder="Format (optional)"
                  className="text-sm h-8 border-neutral-300 focus:border-indigo-400"
                />
                {suggestions && suggestions.suggestedFormats.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {suggestions.suggestedFormats.map((format) => (
                      <button
                        key={format}
                        onClick={() => setProductFormat(format)}
                        className="px-2 py-0.5 text-xs border border-neutral-300 hover:border-indigo-400 hover:bg-indigo-50 rounded"
                      >
                        {format}
                      </button>
                    ))}
                  </div>
                )}
                <Input
                  value={pricingUnit}
                  onChange={(e) => setPricingUnit(e.target.value)}
                  placeholder="Pricing unit (optional)"
                  className="text-sm h-8 border-neutral-300 focus:border-indigo-400"
                />
                {suggestions && suggestions.suggestedUnits.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {suggestions.suggestedUnits.map((unit) => (
                      <button
                        key={unit}
                        onClick={() => setPricingUnit(unit)}
                        className="px-2 py-0.5 text-xs border border-neutral-300 hover:border-indigo-400 hover:bg-indigo-50 rounded"
                      >
                        {unit}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-lg p-4 space-y-2">
              <Label className="text-xs font-semibold text-neutral-900">MARKETS</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'US', label: 'US', currency: 'USD' },
                  { value: 'AU', label: 'AU', currency: 'AUD' },
                  { value: 'UK', label: 'UK', currency: 'GBP' },
                  { value: 'CA', label: 'CA', currency: 'CAD' },
                  { value: 'EU', label: 'EU', currency: 'EUR' },
                  { value: 'OTHER', label: 'Other', currency: 'USD' },
                ].map(option => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-2 p-2 border rounded cursor-pointer text-xs ${
                      marketRegions.includes(option.value as MarketRegion)
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-neutral-300 hover:border-indigo-300'
                    }`}
                  >
                    <Checkbox
                      checked={marketRegions.includes(option.value as MarketRegion)}
                      onCheckedChange={(checked) => {
                        setMarketRegions(checked
                          ? [...marketRegions, option.value as MarketRegion]
                          : marketRegions.filter(r => r !== option.value));
                      }}
                    />
                    <span className="font-medium">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Strategy & Goals */}
          <div className="space-y-4">
            {/* Capital & Goal - Side by Side */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border border-neutral-200 rounded-lg p-4 space-y-2">
                <Label className="text-xs font-semibold text-neutral-900">CAPITAL</Label>
                <RadioGroup value={capitalSituation} onValueChange={(v) => setCapitalSituation(v as CapitalSituation)}>
                  {[
                    { value: 'bootstrapped', label: 'Bootstrap', amount: '$50K' },
                    { value: 'small-seed', label: 'Seed', amount: '$500K' },
                    { value: 'series-a', label: 'Series A', amount: '$2M' },
                  ].map(option => (
                    <label
                      key={option.value}
                      className={`flex items-center gap-2 p-2 border rounded cursor-pointer text-xs ${
                        capitalSituation === option.value
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-neutral-300 hover:border-indigo-300'
                      }`}
                    >
                      <RadioGroupItem value={option.value} id={option.value} className="w-3 h-3" />
                      <div>
                        <div className="font-semibold text-neutral-900">{option.amount}</div>
                        <div className="text-neutral-600">{option.label}</div>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              <div className="bg-white border border-neutral-200 rounded-lg p-4 space-y-2">
                <Label className="text-xs font-semibold text-neutral-900">OBJECTIVE</Label>
                <RadioGroup value={businessGoal} onValueChange={(v) => setBusinessGoal(v as BusinessGoal)}>
                  {[
                    { value: 'profitability', label: 'Profitability' },
                    { value: 'growth-funding', label: 'Growth' },
                    { value: 'lifestyle', label: 'Lifestyle' },
                  ].map(option => (
                    <label
                      key={option.value}
                      className={`flex items-center gap-2 p-2 border rounded cursor-pointer text-xs ${
                        businessGoal === option.value
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-neutral-300 hover:border-indigo-300'
                      }`}
                    >
                      <RadioGroupItem value={option.value} id={option.value} className="w-3 h-3" />
                      <span className="font-semibold text-neutral-900">{option.label}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
            </div>

            {/* Target Goal */}
            <div className="bg-white border border-neutral-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-neutral-900">TARGET GOAL</Label>
                <span className="text-xs text-neutral-500">Suggested: ${getSuggestedGoal().toLocaleString()}</span>
              </div>

              <RadioGroup value={goalType} onValueChange={(v) => setGoalType(v as 'revenue' | 'profit')}>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'profit', label: 'Profit' },
                    { value: 'revenue', label: 'Revenue' },
                  ].map(option => (
                    <label
                      key={option.value}
                      className={`flex items-center gap-2 p-2 border rounded cursor-pointer text-xs ${
                        goalType === option.value
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-neutral-300 hover:border-indigo-300'
                      }`}
                    >
                      <RadioGroupItem value={option.value} id={`${option.value}-goal`} className="w-3 h-3" />
                      <span className="font-semibold">{option.label}</span>
                    </label>
                  ))}
                </div>
              </RadioGroup>

              {goalType === 'revenue' && (
                <RadioGroup value={revenueGoalType} onValueChange={(v) => setRevenueGoalType(v as 'cumulative' | 'monthly')}>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'cumulative', label: 'Total Revenue', desc: 'Cumulative over timeline' },
                      { value: 'monthly', label: 'Monthly Revenue', desc: 'Run rate by month' },
                    ].map(option => (
                      <label
                        key={option.value}
                        className={`flex items-center gap-2 p-2 border rounded cursor-pointer text-xs ${
                          revenueGoalType === option.value
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-neutral-300 hover:border-indigo-300'
                        }`}
                      >
                        <RadioGroupItem value={option.value} id={`${option.value}-revenue`} className="w-3 h-3" />
                        <div>
                          <div className="font-semibold">{option.label}</div>
                          <div className="text-[10px] text-neutral-500">{option.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </RadioGroup>
              )}

              {goalType === 'profit' && (
                <RadioGroup value={profitGoalType} onValueChange={(v) => setProfitGoalType(v as 'cumulative' | 'monthly')}>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'cumulative', label: 'Total Profit', desc: 'Cumulative over timeline' },
                      { value: 'monthly', label: 'Monthly Profit', desc: 'Run rate by month' },
                    ].map(option => (
                      <label
                        key={option.value}
                        className={`flex items-center gap-2 p-2 border rounded cursor-pointer text-xs ${
                          profitGoalType === option.value
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-neutral-300 hover:border-indigo-300'
                        }`}
                      >
                        <RadioGroupItem value={option.value} id={`${option.value}-profit`} className="w-3 h-3" />
                        <div>
                          <div className="font-semibold">{option.label}</div>
                          <div className="text-[10px] text-neutral-500">{option.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </RadioGroup>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-neutral-600 mb-1 block">
                    {goalType === 'profit'
                      ? (profitGoalType === 'cumulative' ? 'Total Profit' : 'Monthly Profit')
                      : (revenueGoalType === 'cumulative' ? 'Total Revenue' : 'Monthly Revenue')}
                  </Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500 text-xs">$</span>
                    <Input
                      type="number"
                      value={goalAmount}
                      onChange={(e) => setGoalAmount(Number(e.target.value))}
                      className="pl-6 h-8 text-sm border-neutral-300 focus:border-indigo-400"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-neutral-600 mb-1 block">Timeline</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={targetMonth}
                      onChange={(e) => setTargetMonth(Number(e.target.value))}
                      className="pr-12 h-8 text-sm border-neutral-300 focus:border-indigo-400"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 text-xs">mo</span>
                  </div>
                </div>
              </div>

              {goalType === 'profit' ? (
                profitGoalType === 'cumulative' ? (
                  <div className="bg-amber-50/60 border border-amber-200/60 rounded p-2 text-xs text-amber-900">
                    Total profit across all {targetMonth} months
                  </div>
                ) : (
                  <div className="bg-amber-50/60 border border-amber-200/60 rounded p-2 text-xs text-amber-900">
                    Monthly profit run rate at month {targetMonth} ({goalAmount ? `$${(goalAmount * 12).toLocaleString()}/yr` : ''})
                  </div>
                )
              ) : revenueGoalType === 'cumulative' ? (
                <div className="bg-blue-50/60 border border-blue-200/60 rounded p-2 text-xs text-blue-900">
                  Total revenue across all {targetMonth} months
                </div>
              ) : (
                <div className="bg-purple-50/60 border border-purple-200/60 rounded p-2 text-xs text-purple-900">
                  Monthly run rate at month {targetMonth} ({goalAmount ? `$${(goalAmount * 12).toLocaleString()}/yr` : ''})
                </div>
              )}
            </div>

            {/* Calculate Button */}
            <Button
              onClick={handleRunCalculation}
              disabled={!canRun() || isProcessing}
              className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Target className="w-4 h-4 mr-2" />
                  Calculate
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Results */}
        {researchComplete && marketResearch && calculatedParameters && (
          <div className="grid grid-cols-[380px_1fr] gap-6 mt-6">
            <div></div>
            <div className="space-y-3">
              {/* Market Insights */}
              <div className="bg-white border border-neutral-200 rounded-lg p-4">
                <h2 className="text-sm font-semibold text-neutral-900 mb-3">Market Research</h2>
                {marketRegions.map(region => {
                  const research = marketResearch[region];
                  if (!research) return null;
                  return (
                    <div key={region} className="mb-3 last:mb-0">
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-xs font-bold text-neutral-900">{region} Market</span>
                        <span className="text-xs text-neutral-500">{research.priceUnit}</span>
                      </div>
                      <div className="bg-neutral-50 rounded p-2 mb-2">
                        <div className="grid grid-cols-3 gap-3 text-xs mb-2">
                          <div>
                            <div className="text-neutral-600">Retail Price</div>
                            <div className="font-semibold text-neutral-900">{getCurrencySymbol(region)}{research.avgRetailPrice.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-neutral-600">Mfg Cost</div>
                            <div className="font-semibold text-neutral-900">{getCurrencySymbol(region)}{research.typicalCOGS.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-neutral-600">Margin</div>
                            <div className="font-semibold text-emerald-700">{research.grossMarginPercent}%</div>
                          </div>
                        </div>
                        <div className="text-xs text-neutral-600 leading-relaxed">
                          {research.marketInsights}
                        </div>
                      </div>
                      {research.competitorExamples && research.competitorExamples.length > 0 && (
                        <div className="text-xs">
                          <div className="text-neutral-600 mb-1">Competitors:</div>
                          <div className="space-y-0.5">
                            {research.competitorExamples.slice(0, 3).map((example, i) => (
                              <div key={i} className="text-neutral-700">{example}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Goal Breakdown */}
              {calculatedGoal && calculatedGoal.targetProfit && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h2 className="text-sm font-semibold text-amber-900 mb-2">Profit Goal Calculation</h2>
                  <div className="text-xs text-amber-900 space-y-1">
                    <div className="flex justify-between">
                      <span>
                        {profitGoalType === 'cumulative'
                          ? `Total profit over ${calculatedGoal.targetMonth} months:`
                          : `Monthly profit at month ${calculatedGoal.targetMonth}:`}
                      </span>
                      <span className="font-semibold">${calculatedGoal.targetProfit.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>
                        {profitGoalType === 'cumulative'
                          ? `Monthly revenue needed (average):`
                          : `Monthly revenue needed:`}
                      </span>
                      <span className="font-semibold">${calculatedGoal.targetRevenue.toLocaleString()}</span>
                    </div>
                    {profitGoalType === 'cumulative' && (
                      <div className="text-xs text-amber-700 mt-2 pt-2 border-t border-amber-200">
                        <div className="font-medium mb-1">Calculation breakdown:</div>
                        <div>${calculatedGoal.targetProfit.toLocaleString()} total profit ÷ {calculatedGoal.targetMonth} months = ${Math.round(calculatedGoal.targetProfit / calculatedGoal.targetMonth).toLocaleString()}/month</div>
                        <div className="mt-1">${Math.round(calculatedGoal.targetProfit / calculatedGoal.targetMonth).toLocaleString()}/month ÷ 25% net margin = ${calculatedGoal.targetRevenue.toLocaleString()}/month revenue</div>
                        <div className="mt-1 text-amber-600">Total revenue over {calculatedGoal.targetMonth} months: ${(calculatedGoal.targetRevenue * calculatedGoal.targetMonth).toLocaleString()}</div>
                      </div>
                    )}
                    <div className="text-xs text-amber-800 mt-2 pt-2 border-t border-amber-200">
                      Assumes 70% gross margin, 45% operating costs (25% net margin)
                    </div>
                  </div>
                </div>
              )}

              {/* Model Parameters - Editable */}
              <TooltipProvider>
                <div className="bg-white border border-neutral-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-neutral-900">Simulation Parameters</h2>
                    <span className="text-xs text-neutral-500">Hover over ? for explanations</span>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-xs mb-4">
                    <div>
                      <div className="font-semibold text-neutral-700 mb-2">Pricing</div>
                      <div className="space-y-2">
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <Label className="text-xs text-neutral-600">DTC Price</Label>
                            {parameterReasons.avgSellingPriceDTC && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="w-3 h-3 text-neutral-400 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p className="text-xs">{parameterReasons.avgSellingPriceDTC}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-neutral-500">$</span>
                          <Input
                            type="number"
                            value={calculatedParameters.avgSellingPriceDTC || 0}
                            onChange={(e) => setCalculatedParameters({
                              ...calculatedParameters,
                              avgSellingPriceDTC: Number(e.target.value)
                            })}
                            className="h-7 text-xs pl-5"
                            step="0.01"
                          />
                        </div>
                        </div>
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <Label className="text-xs text-neutral-600">COGS</Label>
                          {parameterReasons.avgManufacturingCostPerUnit && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-3 h-3 text-neutral-400 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-xs">{parameterReasons.avgManufacturingCostPerUnit}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-neutral-500">$</span>
                          <Input
                            type="number"
                            value={calculatedParameters.avgManufacturingCostPerUnit || 0}
                            onChange={(e) => setCalculatedParameters({
                              ...calculatedParameters,
                              avgManufacturingCostPerUnit: Number(e.target.value)
                            })}
                            className="h-7 text-xs pl-5"
                            step="0.01"
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <Label className="text-xs text-neutral-600">Wholesale</Label>
                          {parameterReasons.avgWholesalePrice && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-3 h-3 text-neutral-400 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-xs">{parameterReasons.avgWholesalePrice}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-neutral-500">$</span>
                          <Input
                            type="number"
                            value={calculatedParameters.avgWholesalePrice || 0}
                            onChange={(e) => setCalculatedParameters({
                              ...calculatedParameters,
                              avgWholesalePrice: Number(e.target.value)
                            })}
                            className="h-7 text-xs pl-5"
                            step="0.01"
                          />
                        </div>
                      </div>
                      <div className="text-xs text-neutral-600 flex justify-between pt-1">
                        <span>Margin</span>
                        <span className="font-semibold text-emerald-700">
                          {calculatedParameters.avgSellingPriceDTC && calculatedParameters.avgManufacturingCostPerUnit
                            ? Math.round(((calculatedParameters.avgSellingPriceDTC - calculatedParameters.avgManufacturingCostPerUnit) / calculatedParameters.avgSellingPriceDTC) * 100)
                            : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-neutral-700 mb-2">Channels</div>
                    <div className="space-y-2">
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <Label className="text-xs text-neutral-600">DTC %</Label>
                          {parameterReasons.dtcChannelMix && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-3 h-3 text-neutral-400 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-xs">{parameterReasons.dtcChannelMix}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <Input
                          type="number"
                          value={calculatedParameters.dtcChannelMix || 0}
                          onChange={(e) => setCalculatedParameters({
                            ...calculatedParameters,
                            dtcChannelMix: Number(e.target.value)
                          })}
                          className="h-7 text-xs"
                          max="100"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <Label className="text-xs text-neutral-600">Retail %</Label>
                          {parameterReasons.retailChannelMix && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-3 h-3 text-neutral-400 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-xs">{parameterReasons.retailChannelMix}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <Input
                          type="number"
                          value={calculatedParameters.retailChannelMix || 0}
                          onChange={(e) => setCalculatedParameters({
                            ...calculatedParameters,
                            retailChannelMix: Number(e.target.value)
                          })}
                          className="h-7 text-xs"
                          max="100"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <Label className="text-xs text-neutral-600">Amazon %</Label>
                          {parameterReasons.amazonChannelMix && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-3 h-3 text-neutral-400 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-xs">{parameterReasons.amazonChannelMix}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <Input
                          type="number"
                          value={calculatedParameters.amazonChannelMix || 0}
                          onChange={(e) => setCalculatedParameters({
                            ...calculatedParameters,
                            amazonChannelMix: Number(e.target.value)
                          })}
                          className="h-7 text-xs"
                          max="100"
                        />
                      </div>
                      <div className="text-xs text-neutral-600 flex justify-between pt-1">
                        <span>Total</span>
                        <span className={`font-semibold ${
                          (calculatedParameters.dtcChannelMix || 0) + (calculatedParameters.retailChannelMix || 0) + (calculatedParameters.amazonChannelMix || 0) === 100
                            ? 'text-emerald-700'
                            : 'text-red-600'
                        }`}>
                          {(calculatedParameters.dtcChannelMix || 0) + (calculatedParameters.retailChannelMix || 0) + (calculatedParameters.amazonChannelMix || 0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-neutral-700 mb-2">Marketing</div>
                    <div className="space-y-2">
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <Label className="text-xs text-neutral-600">Budget/mo</Label>
                          {parameterReasons.monthlyMarketingBudget && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-3 h-3 text-neutral-400 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-xs">{parameterReasons.monthlyMarketingBudget}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-neutral-500">$</span>
                          <Input
                            type="number"
                            value={calculatedParameters.monthlyMarketingBudget || 0}
                            onChange={(e) => setCalculatedParameters({
                              ...calculatedParameters,
                              monthlyMarketingBudget: Number(e.target.value)
                            })}
                            className="h-7 text-xs pl-5"
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <Label className="text-xs text-neutral-600">Traffic/mo</Label>
                          {parameterReasons.organicTrafficMonthly && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-3 h-3 text-neutral-400 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-xs">{parameterReasons.organicTrafficMonthly}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <Input
                          type="number"
                          value={calculatedParameters.organicTrafficMonthly || 0}
                          onChange={(e) => setCalculatedParameters({
                            ...calculatedParameters,
                            organicTrafficMonthly: Number(e.target.value)
                          })}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <Label className="text-xs text-neutral-600">Conv Rate %</Label>
                          {parameterReasons.organicConversionRate && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-3 h-3 text-neutral-400 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-xs">{parameterReasons.organicConversionRate}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <Input
                          type="number"
                          value={calculatedParameters.organicConversionRate || 0}
                          onChange={(e) => setCalculatedParameters({
                            ...calculatedParameters,
                            organicConversionRate: Number(e.target.value)
                          })}
                          className="h-7 text-xs"
                          step="0.1"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-neutral-700 mb-2">Operations</div>
                    <div className="space-y-2">
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <Label className="text-xs text-neutral-600">Fixed/mo</Label>
                          {parameterReasons.monthlyFixedCosts && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-3 h-3 text-neutral-400 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-xs">{parameterReasons.monthlyFixedCosts}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-neutral-500">$</span>
                          <Input
                            type="number"
                            value={calculatedParameters.monthlyFixedCosts || 0}
                            onChange={(e) => setCalculatedParameters({
                              ...calculatedParameters,
                              monthlyFixedCosts: Number(e.target.value)
                            })}
                            className="h-7 text-xs pl-5"
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <Label className="text-xs text-neutral-600">Start Inv</Label>
                          {parameterReasons.startingInventoryUnits && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-3 h-3 text-neutral-400 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-xs">{parameterReasons.startingInventoryUnits}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <Input
                          type="number"
                          value={calculatedParameters.startingInventoryUnits || 0}
                          onChange={(e) => setCalculatedParameters({
                            ...calculatedParameters,
                            startingInventoryUnits: Number(e.target.value)
                          })}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <Label className="text-xs text-neutral-600">Start Cash</Label>
                          {parameterReasons.startingCash && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-3 h-3 text-neutral-400 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-xs">{parameterReasons.startingCash}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-neutral-500">$</span>
                          <Input
                            type="number"
                            value={calculatedParameters.startingCash || 0}
                            onChange={(e) => setCalculatedParameters({
                              ...calculatedParameters,
                              startingCash: Number(e.target.value)
                            })}
                            className="h-7 text-xs pl-5"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-indigo-50 border border-indigo-200 rounded p-3 text-xs text-indigo-900 mb-3">
                  <div className="font-semibold mb-1">Model will simulate:</div>
                  <div className="text-indigo-800">
                    {calculatedGoal?.targetMonth || targetMonth}-month forecast to reach ${(calculatedGoal?.targetRevenue || goalAmount).toLocaleString()} revenue
                    {calculatedGoal?.targetProfit && ` (to achieve $${calculatedGoal.targetProfit.toLocaleString()} profit)`}
                  </div>
                </div>
                <Button
                  onClick={() => {
                    console.log('Running simulation with parameters:', calculatedParameters);
                    setParameters(calculatedParameters);
                    // Small delay to ensure context updates before navigation
                    setTimeout(() => navigate('/'), 50);
                  }}
                  size="sm"
                  className="w-full h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm"
                >
                  Run Simulation <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </div>
            </TooltipProvider>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Start;
