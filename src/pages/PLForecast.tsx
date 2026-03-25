
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { PLForecastReport } from '@/components/PLForecastReport';
import { useBusinessSimulation } from '@/hooks/useBusinessSimulation';

const PLForecast = () => {
  const { results } = useBusinessSimulation();

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 p-4 sm:p-6 lg:p-8">
      <header className="sticky top-0 bg-gray-900/80 backdrop-blur-sm z-10 -mx-4 -mt-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-2 mb-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <Button asChild variant="ghost" size="sm" className="text-gray-300 hover:bg-gray-700 hover:text-white">
            <Link to="/"><ChevronLeft className="mr-2 h-4 w-4" />Back to Dashboard</Link>
          </Button>
          <h1 className="text-lg font-bold text-white">P&L Forecast Report</h1>
          <div className="w-40"></div>
        </div>
      </header>
      
      <PLForecastReport results={results} />
    </div>
  );
};

export default PLForecast;
