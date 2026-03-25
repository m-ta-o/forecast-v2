
export interface ScalingRuleCondition {
  triggerParameter: string;
  operator: '>=' | '<=' | '==' | '>' | '<' | '!=';
  threshold: number;
}

export interface ParsedRule {
  parameter: string;
  ruleType: 'percentage_increase' | 'percentage_decrease' | 'fixed_increase' | 'fixed_decrease' | 'compound_growth' | 'set_value';
  value: number;
  frequency: 'monthly' | 'quarterly' | 'yearly' | 'once';
  condition?: ScalingRuleCondition;
  startMonth?: number;
}

export interface ScalingRule {
  id: string;
  text: string;
  parameter: string;
  ruleType: string;
  value: number;
  frequency: string;
  condition?: ScalingRuleCondition;
  isActive: boolean;
  parsed: boolean;
  triggered?: boolean;
  startMonth?: number;
  lastApplied?: number;
}

export interface ScalingRuleApplication {
  ruleId: string;
  month: number;
  parameter: string;
  oldValue: number;
  newValue: number;
  description: string;
  triggerType: 'time' | 'condition';
  conditionMet?: string;
}
