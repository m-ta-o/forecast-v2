
import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ReportSection } from '@/components/ReportSection';
import { ReportRow } from '@/components/ReportRow';
import { formatCurrency, formatPercentage, formatNumber, formatParentheses } from '@/utils/formatters';
import { MonthlyResults, SimulationResults } from '@/types/business';
import { BusinessChart } from '@/components/BusinessChart';

export const PLForecastReport = ({ results }: { results: SimulationResults }) => {
  const annualData = useMemo(() => {
    if (!results?.monthly || results.monthly.length === 0) return [];

    const years: Record<string, any> = {};
    const maxYears = 5;

    results.monthly.forEach((monthData, index) => {
      const yearIndex = Math.floor(index / 12);
      if (yearIndex >= maxYears) return;

      const yearKey = `Y${yearIndex + 1}`;
      if (!years[yearKey]) {
        years[yearKey] = {
          totalRevenue: 0, cogs: 0, operationalCosts: 0, marketingCosts: 0,
          netProfit: 0, inventoryPurchaseCost: 0, operatingCashFlow: 0,
          newCustomers: 0,
          monthlyData: [],
        };
      }

      years[yearKey].totalRevenue += monthData.totalRevenue;
      years[yearKey].cogs += monthData.cogs;
      years[yearKey].operationalCosts += monthData.operationalCosts;
      years[yearKey].marketingCosts += monthData.marketingCosts;
      years[yearKey].netProfit += monthData.netProfit;
      years[yearKey].inventoryPurchaseCost += monthData.inventoryPurchaseCost || 0;
      years[yearKey].operatingCashFlow += monthData.operatingCashFlow;
      years[yearKey].newCustomers += monthData.newCustomers;
      years[yearKey].monthlyData.push(monthData);
    });

    return Object.keys(years).map(yearKey => {
      const data = years[yearKey];
      const monthly: MonthlyResults[] = data.monthlyData;
      
      const lastMonth = monthly[monthly.length - 1];
      const firstMonth = monthly[0];
      const prevYearLastMonthTotalCustomers = results.monthly[(firstMonth.month - 2)]?.totalCustomers || 0;
      
      const churnedCustomers = (prevYearLastMonthTotalCustomers + data.newCustomers) - lastMonth.totalCustomers;
      
      const grossProfit = data.totalRevenue - data.cogs;
      const totalOpex = data.operationalCosts + data.marketingCosts;
      const ebitda = grossProfit - totalOpex;

      const avgCustomers = (lastMonth.totalCustomers + prevYearLastMonthTotalCustomers) / 2;

      return {
        year: yearKey,
        totalRevenue: data.totalRevenue,
        cogs: data.cogs,
        grossProfit,
        grossMargin: data.totalRevenue > 0 ? (grossProfit / data.totalRevenue) * 100 : 0,
        gaExpenses: data.operationalCosts,
        smExpenses: data.marketingCosts,
        rdExpenses: 0,
        totalOpex,
        ebitda,
        ebitdaMargin: data.totalRevenue > 0 ? (ebitda / data.totalRevenue) * 100 : 0,
        netIncome: data.netProfit,
        netMargin: data.totalRevenue > 0 ? (data.netProfit / data.totalRevenue) * 100 : 0,
        cash: lastMonth.cumulativeCashFlow,
        inventoryUnits: lastMonth.inventory,
        inventoryValue: lastMonth.inventoryValue,
        inventoryPurchaseCost: data.inventoryPurchaseCost,
        operatingCashFlow: data.operatingCashFlow,
        freeCashFlow: data.operatingCashFlow - data.inventoryPurchaseCost,
        totalCustomers: lastMonth.totalCustomers,
        newCustomers: data.newCustomers,
        churnedCustomers: churnedCustomers,
        netCustomerGrowth: data.newCustomers - churnedCustomers,
        arpc: avgCustomers > 0 ? data.totalRevenue / avgCustomers : 0,
        cac: data.newCustomers > 0 ? data.marketingCosts / data.newCustomers : 0,
      };
    });
  }, [results]);

  const cashFlowChartData = useMemo(() => {
    if (!results?.monthly) return [];
    return results.monthly.map(m => ({
      month: m.month,
      netCashFlow: m.netCashFlow,
      operatingCashFlow: m.operatingCashFlow,
      cumulativeCashFlow: m.cumulativeCashFlow,
    }));
  }, [results.monthly]);

  if (annualData.length === 0) {
    return <div className="p-4 text-white">Generating P&L forecast...</div>;
  }
  
  const yearHeaders = annualData.map(y => y.year);

  const renderRow = (label: string, key: keyof typeof annualData[0], format: Function, indent = false, isNegative = false, isMuted = false) => {
    return (
      <ReportRow
        label={label}
        values={annualData.map(y => format(y[key]))}
        indent={indent}
        isMuted={isMuted}
      />
    );
  };
  
  const renderMarginRow = (label: string, key: keyof typeof annualData[0]) => (
     <ReportRow
        label={label}
        values={annualData.map(y => formatPercentage(y[key] as number))}
        indent={true}
        isMuted={true}
      />
  );

  return (
    <Card className="bg-gray-800/50 border-gray-700 text-white shadow-none">
      <CardContent className="p-4">
        <ReportRow label="" values={yearHeaders} isHeader />

        <ReportSection title="Profit & Loss Statement">
          {renderRow("Total Revenue", "totalRevenue", formatCurrency)}
          {renderRow("Cost of Goods Sold", "cogs", formatParentheses, true)}
          <ReportRow label="Gross Profit" values={annualData.map(y => formatCurrency(y.grossProfit))} isSubtotal />
          {renderMarginRow("Gross Margin", "grossMargin")}
        </ReportSection>

        <ReportSection title="Operating Expenses">
          {renderRow("General & Administrative", "gaExpenses", formatParentheses, true)}
          {renderRow("Sales & Marketing", "smExpenses", formatParentheses, true)}
          {renderRow("Research & Development", "rdExpenses", formatParentheses, true)}
          <ReportRow label="Total Operating Expenses" values={annualData.map(y => formatParentheses(y.totalOpex))} isSubtotal />
          <ReportRow label="Operating Income (EBITDA)" values={annualData.map(y => formatCurrency(y.ebitda))} isSubtotal />
          {renderMarginRow("EBITDA Margin", "ebitdaMargin")}
        </ReportSection>
        
        <ReportSection title="Net Income">
          <ReportRow label="Net Income" values={annualData.map(y => formatCurrency(y.netIncome))} isTotal />
          {renderMarginRow("Net Margin", "netMargin")}
        </ReportSection>

        <ReportSection title="Balance Sheet Highlights">
          {renderRow("Cash on Hand", "cash", formatCurrency)}
          {renderRow("Inventory (Units)", "inventoryUnits", formatNumber)}
          {renderRow("Inventory Value", "inventoryValue", formatCurrency)}
        </ReportSection>

        <ReportSection title="Cash Flow Highlights">
          {renderRow("Inventory Purchases", "inventoryPurchaseCost", formatParentheses)}
          {renderRow("Operating Cash Flow", "operatingCashFlow", formatCurrency)}
          {renderRow("Free Cash Flow", "freeCashFlow", formatCurrency)}
        </ReportSection>

        <ReportSection title="Key Business Metrics">
          {renderRow("Total Customers", "totalCustomers", formatNumber)}
          {renderRow("New Customer Acquisitions", "newCustomers", formatNumber, true)}
          {renderRow("Customer Churn", "churnedCustomers", (v) => formatParentheses(v), true)}
          <ReportRow label="Net Customer Growth" values={annualData.map(y => formatNumber(y.netCustomerGrowth))} isSubtotal />
          {renderRow("Avg. Revenue Per Customer (ARPC)", "arpc", formatCurrency)}
          {renderRow("Customer Acquisition Cost (CAC)", "cac", formatCurrency)}
        </ReportSection>
      </CardContent>
      <CardContent className="p-4 mt-4">
        <BusinessChart
          title="Monthly Cash Flow"
          data={cashFlowChartData}
          lines={[
            { key: 'operatingCashFlow', name: 'Operating Cash Flow', color: '#82ca9d' },
            { key: 'netCashFlow', name: 'Net Cash Flow', color: '#8884d8' },
            { key: 'cumulativeCashFlow', name: 'Cash on Hand', color: '#ffc658' },
          ]}
        />
      </CardContent>
    </Card>
  );
};
