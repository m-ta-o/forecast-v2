import { ParsedRule } from "@/types/scalingRules";

export class ScalingRulesParser {
  static async parseRule(ruleText: string): Promise<ParsedRule | null> {
    const text = ruleText.toLowerCase().trim();

    // Find parameter - default to marketing budget
    let parameter = 'monthlyMarketingBudget';
    if (text.includes('marketing') || text.includes('budget')) parameter = 'monthlyMarketingBudget';
    if (text.includes('price') || text.includes('selling')) parameter = 'avgSellingPriceDTC';
    if (text.includes('inventory') || text.includes('stock')) parameter = 'minimumInventoryLevel';
    if (text.includes('fixed cost') || text.includes('operating cost')) parameter = 'monthlyFixedCosts';

    // Detect frequency
    let frequency: 'once' | 'monthly' | 'quarterly' | 'yearly' = 'monthly'; // Default to monthly
    if (text.includes('quarter')) frequency = 'quarterly';
    if (text.includes('year') || text.includes('annual')) frequency = 'yearly';
    if (text.includes('once') || text.includes('one time')) frequency = 'once';

    // Find percentage value - match any number followed by %
    const percentMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);

    if (percentMatch) {
      const value = parseFloat(percentMatch[1]);
      // Check if it's a decrease or increase (default to increase)
      const isDecrease = /decrease|reduce|lower|less|cut|drop/.test(text);

      return {
        parameter,
        ruleType: isDecrease ? 'percentage_decrease' : 'percentage_increase',
        value,
        frequency,
        condition: undefined,
        startMonth: undefined
      };
    }

    // Try absolute dollar values: $5000 or 5000
    const dollarMatch = text.match(/\$?\s*(\d+(?:,\d{3})*(?:\.\d+)?)/);
    if (dollarMatch) {
      const value = parseFloat(dollarMatch[1].replace(/,/g, ''));

      // Check if it's setting a value or adding/subtracting
      if (text.includes('set') || text.includes('to ')) {
        return {
          parameter,
          ruleType: 'set_value',
          value,
          frequency,
          condition: undefined,
          startMonth: undefined
        };
      }

      const isDecrease = /decrease|reduce|lower|less|cut|drop/.test(text);
      return {
        parameter,
        ruleType: isDecrease ? 'fixed_decrease' : 'fixed_increase',
        value,
        frequency,
        condition: undefined,
        startMonth: undefined
      };
    }

    // If we couldn't parse anything, return null
    return null;
  }
}
