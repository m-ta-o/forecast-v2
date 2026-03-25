
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from 'lucide-react';

interface ChartDataPoint {
  month: number;
  [key: string]: number;
}

interface BusinessChartProps {
  title: string;
  description?: string;
  data: ChartDataPoint[];
  lines: Array<{
    key: string;
    name: string;
    color: string;
  }>;
  height?: number;
}

export function BusinessChart({ title, description, data, lines, height = 300 }: BusinessChartProps) {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-white text-lg">{title}</CardTitle>
          {description && (
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-4 h-4 text-gray-400 cursor-help hover:text-gray-300" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm bg-gray-900 border-gray-700">
                  <p className="text-sm text-gray-200">{description}</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="month" 
              stroke="#9CA3AF"
              fontSize={12}
            />
            <YAxis 
              stroke="#9CA3AF"
              fontSize={12}
              tickFormatter={(value) => {
                if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                return value.toString();
              }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#FFFFFF'
              }}
              formatter={(value: number) => [
                value >= 1000000 ? `${(value / 1000000).toFixed(2)}M` :
                value >= 1000 ? `${(value / 1000).toFixed(0)}K` :
                value.toFixed(0),
                ''
              ]}
            />
            <Legend />
            {lines.map((line) => (
              <Line
                key={line.key}
                type="monotone"
                dataKey={line.key}
                stroke={line.color}
                name={line.name}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
