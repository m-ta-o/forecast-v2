
import { BusinessParameters } from "@/types/business";
import { ScalingRule, ScalingRuleApplication, ScalingRuleCondition } from "@/types/scalingRules";

export class ScalingRulesEngine {
  static applyScalingRules(
    params: Record<keyof BusinessParameters, number>,
    scalingRules: ScalingRule[],
    currentMonth: number,
    simulationState?: {
      totalRevenue?: number;
      totalCustomers?: number;
      currentInventory?: number;
    }
  ): { 
    updatedParams: Record<keyof BusinessParameters, number>; 
    applications: ScalingRuleApplication[] 
  } {
    const updatedParams = { ...params };
    const applications: ScalingRuleApplication[] = [];

    for (const rule of scalingRules) {
      if (!rule.isActive || !rule.parsed) continue;

      const shouldApply = this.shouldApplyRule(rule, currentMonth, simulationState);
      
      if (shouldApply) {
        const application = this.applyRule(rule, updatedParams, currentMonth);
        if (application) {
          applications.push(application);
          
          // Mark conditional rules as triggered to prevent re-application
          if (rule.condition && rule.frequency === 'once') {
            rule.triggered = true;
          }
          
          // Update last applied month
          rule.lastApplied = currentMonth;
        }
      }
    }

    return { updatedParams, applications };
  }

  private static shouldApplyRule(
    rule: ScalingRule,
    currentMonth: number,
    simulationState?: {
      totalRevenue?: number;
      totalCustomers?: number;
      currentInventory?: number;
    }
  ): boolean {
    // Skip if already triggered (for one-time conditional rules)
    if (rule.triggered && rule.frequency === 'once') {
      return false;
    }

    // Handle conditional rules
    if (rule.condition) {
      const conditionMet = this.evaluateCondition(rule.condition, simulationState);
      if (!conditionMet) return false;
      
      // For one-time rules, apply immediately when condition is met
      if (rule.frequency === 'once') return true;
    }

    // Handle time-based rules
    const startMonth = rule.startMonth || 1;
    if (currentMonth < startMonth) return false;

    // Check if it's time to apply based on frequency
    const monthsSinceStart = currentMonth - startMonth;
    const lastApplied = rule.lastApplied || 0;

    switch (rule.frequency) {
      case 'monthly':
        return currentMonth > lastApplied;
      case 'quarterly':
        return monthsSinceStart % 3 === 0 && currentMonth > lastApplied;
      case 'yearly':
        return monthsSinceStart % 12 === 0 && currentMonth > lastApplied;
      case 'once':
        return !rule.lastApplied;
      default:
        return false;
    }
  }

  private static evaluateCondition(
    condition: ScalingRuleCondition,
    simulationState?: {
      totalRevenue?: number;
      totalCustomers?: number;
      currentInventory?: number;
    }
  ): boolean {
    if (!simulationState) return false;

    let currentValue: number;
    switch (condition.triggerParameter) {
      case 'totalRevenue':
        currentValue = simulationState.totalRevenue || 0;
        break;
      case 'totalCustomers':
        currentValue = simulationState.totalCustomers || 0;
        break;
      case 'currentInventory':
        currentValue = simulationState.currentInventory || 0;
        break;
      default:
        return false;
    }

    switch (condition.operator) {
      case '>=':
        return currentValue >= condition.threshold;
      case '<=':
        return currentValue <= condition.threshold;
      case '>':
        return currentValue > condition.threshold;
      case '<':
        return currentValue < condition.threshold;
      case '==':
        return currentValue === condition.threshold;
      case '!=':
        return currentValue !== condition.threshold;
      default:
        return false;
    }
  }

  private static applyRule(
    rule: ScalingRule,
    params: Record<keyof BusinessParameters, number>,
    currentMonth: number
  ): ScalingRuleApplication | null {
    const paramKey = rule.parameter as keyof BusinessParameters;
    const oldValue = params[paramKey];
    
    if (typeof oldValue !== 'number') return null;

    let newValue: number;
    let description: string;

    switch (rule.ruleType) {
      case 'percentage_increase':
        newValue = oldValue * (1 + rule.value / 100);
        description = `Increased ${paramKey} by ${rule.value}%`;
        break;
      case 'percentage_decrease':
        newValue = oldValue * (1 - rule.value / 100);
        description = `Decreased ${paramKey} by ${rule.value}%`;
        break;
      case 'fixed_increase':
        newValue = oldValue + rule.value;
        description = `Increased ${paramKey} by ${rule.value}`;
        break;
      case 'fixed_decrease':
        newValue = oldValue - rule.value;
        description = `Decreased ${paramKey} by ${rule.value}`;
        break;
      case 'compound_growth':
        newValue = oldValue * Math.pow(1 + rule.value / 100, 1);
        description = `Applied ${rule.value}% compound growth to ${paramKey}`;
        break;
      case 'set_value':
        newValue = rule.value;
        description = `Set ${paramKey} to ${rule.value}`;
        break;
      default:
        return null;
    }

    // Ensure non-negative values for most parameters
    if (newValue < 0 && !['netProfit', 'operatingCashFlow'].includes(paramKey)) {
      newValue = 0;
    }

    params[paramKey] = newValue;

    return {
      ruleId: rule.id,
      month: currentMonth,
      parameter: paramKey,
      oldValue,
      newValue,
      description,
      triggerType: rule.condition ? 'condition' : 'time',
      conditionMet: rule.condition ? 
        `${rule.condition.triggerParameter} ${rule.condition.operator} ${rule.condition.threshold}` : 
        undefined
    };
  }
}
