
import { supabase } from "@/integrations/supabase/client";
import { ParsedRule } from "@/types/scalingRules";

export class ScalingRulesParser {
  static async parseRule(ruleText: string): Promise<ParsedRule | null> {
    console.log("Attempting to parse rule with AI edge function:", ruleText);

    // We will now ONLY use the AI edge function.
    // If it fails, we want it to fail loudly so we can debug it.
    const { data, error } = await supabase.functions.invoke('parse-scaling-rules', {
      body: { ruleText },
    });

    if (error) {
      console.error('Error invoking parse-scaling-rules edge function:', error.message);
      // Returning null indicates a parsing failure.
      // The error is logged to the console for debugging.
      return null;
    }

    if (!data) {
      console.error('No data returned from parse-scaling-rules edge function.');
      return null;
    }
    
    if (!data.parsed) {
        console.log('AI indicated rule could not be parsed:', ruleText);
        return null;
    }

    console.log("AI parsing successful:", data);

    // The data structure from the function should match ParsedRule
    // but we construct it here for type safety.
    return {
      parameter: data.parameter,
      ruleType: data.ruleType,
      value: data.value,
      frequency: data.frequency || 'once',
      condition: data.condition,
      startMonth: data.startMonth
    };
  }
}
