
import { useState } from "react";
import { ChevronDown, ChevronUp, Info, Check, AlertCircle, Edit2, Trash2, Play, Pause } from "lucide-react";
import { ParameterInput } from "./ParameterInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BusinessParameters } from "@/types/business";
import { ScalingRule } from "@/types/scalingRules";
import { ScalingRulesParser } from "@/utils/ScalingRulesParser";

interface ParameterConfig {
  key: keyof BusinessParameters;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  tooltip?: string;
}

interface ParameterSectionProps {
  title: string;
  icon: string;
  parameters: ParameterConfig[];
  values: BusinessParameters;
  onParameterChange: (key: keyof BusinessParameters, value: number) => void;
  recentlyUpdated: Set<string>;
  scalingRules?: ScalingRule[];
  onScalingRulesChange?: (rules: ScalingRule[]) => void;
}

export function ParameterSection({ 
  title, 
  icon, 
  parameters, 
  values, 
  onParameterChange,
  recentlyUpdated,
  scalingRules = [],
  onScalingRulesChange
}: ParameterSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newRule, setNewRule] = useState("");
  const [isParsingRule, setIsParsingRule] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const handleAddRule = async () => {
    if (!newRule.trim() || !onScalingRulesChange) return;

    setIsParsingRule(true);
    
    try {
      const parsedRule = await ScalingRulesParser.parseRule(newRule);
      
      const newScalingRule: ScalingRule = {
        id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: newRule.trim(),
        parameter: parsedRule?.parameter || 'monthlyMarketingBudget',
        ruleType: parsedRule?.ruleType || 'percentage_increase',
        value: parsedRule?.value || 0,
        frequency: parsedRule?.frequency || 'once',
        condition: parsedRule?.condition,
        startMonth: parsedRule?.startMonth,
        isActive: true,
        parsed: parsedRule !== null
      };

      onScalingRulesChange([...scalingRules, newScalingRule]);
      setNewRule("");
    } catch (error) {
      console.error('Error adding rule:', error);
    } finally {
      setIsParsingRule(false);
    }
  };

  const handleEditRule = async (ruleId: string) => {
    if (!onScalingRulesChange || !editingText.trim()) return;

    setIsParsingRule(true);
    
    try {
      const parsedRule = await ScalingRulesParser.parseRule(editingText);
      
      const updatedRules = scalingRules.map(rule => 
        rule.id === ruleId 
          ? {
              ...rule,
              text: editingText.trim(),
              parameter: parsedRule?.parameter || rule.parameter,
              ruleType: parsedRule?.ruleType || rule.ruleType,
              value: parsedRule?.value || rule.value,
              frequency: parsedRule?.frequency || rule.frequency,
              condition: parsedRule?.condition,
              startMonth: parsedRule?.startMonth,
              parsed: parsedRule !== null
            }
          : rule
      );
      
      onScalingRulesChange(updatedRules);
      setEditingRuleId(null);
      setEditingText("");
    } catch (error) {
      console.error('Error updating rule:', error);
    } finally {
      setIsParsingRule(false);
    }
  };

  const handleRemoveRule = (ruleId: string) => {
    if (!onScalingRulesChange) return;
    onScalingRulesChange(scalingRules.filter(rule => rule.id !== ruleId));
  };

  const handleToggleRule = (ruleId: string) => {
    if (!onScalingRulesChange) return;
    const updatedRules = scalingRules.map(rule => 
      rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule
    );
    onScalingRulesChange(updatedRules);
  };

  const startEditing = (rule: ScalingRule) => {
    setEditingRuleId(rule.id);
    setEditingText(rule.text);
  };

  const cancelEditing = () => {
    setEditingRuleId(null);
    setEditingText("");
  };

  const getRuleDisplayText = (rule: ScalingRule) => {
    if (!rule.parsed) return rule.text;

    let baseText: string;
    if (rule.ruleType === 'set_value') {
      baseText = `set ${rule.parameter} to ${rule.value}`;
    } else {
      const actionText = rule.ruleType.replace(/_/g, ' ');
      const valueText = rule.ruleType.includes('percentage') ? `${rule.value}%` : `${rule.value}`;
      baseText = `${actionText} ${rule.parameter} by ${valueText}`;
    }
    
    let timingText = '';
    if (rule.startMonth) {
      timingText = ` at month ${rule.startMonth}`;
    } else if (rule.frequency !== 'once') {
      timingText = ` ${rule.frequency}`;
    }
    
    const conditionText = rule.condition ? 
      ` when ${rule.condition.triggerParameter} ${rule.condition.operator} ${rule.condition.threshold}` : '';
    
    return baseText + timingText + conditionText;
  };

  return (
    <div className="border-b border-gray-700">
      <Button
        variant="ghost"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full justify-between p-4 h-auto text-left hover:bg-gray-800"
      >
        <div className="flex items-center space-x-3">
          <span className="text-lg">{icon}</span>
          <div>
            <h3 className="font-medium text-white">{title}</h3>
            <p className="text-sm text-gray-400">
              {parameters.length} parameters
              {scalingRules.length > 0 && ` • ${scalingRules.length} rule${scalingRules.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </Button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {parameters.map((param) => (
            <div key={param.key} className="relative">
              <div className="flex items-center space-x-2">
                <div className="flex-1">
                  <ParameterInput
                    label={param.label}
                    value={values[param.key]}
                    onChange={(value) => onParameterChange(param.key, value)}
                    min={param.min}
                    max={param.max}
                    step={param.step}
                    prefix={param.prefix}
                    unit={param.suffix}
                    className={recentlyUpdated.has(param.key) ? "ring-2 ring-blue-500" : ""}
                  />
                </div>
                {param.tooltip && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-gray-400 hover:text-gray-300" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">{param.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          ))}

          {onScalingRulesChange && (
            <div className="mt-6 space-y-3">
              <h4 className="text-sm font-medium text-gray-300">Dynamic Scaling Rules</h4>
              
              {/* Add new rule */}
              <div className="flex space-x-2">
                <Input
                  placeholder="e.g., Increase marketing budget by 20% when customers > 1000"
                  value={newRule}
                  onChange={(e) => setNewRule(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white text-xs"
                  onKeyPress={(e) => e.key === 'Enter' && !isParsingRule && handleAddRule()}
                  disabled={isParsingRule}
                />
                <Button 
                  onClick={handleAddRule}
                  disabled={!newRule.trim() || isParsingRule}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isParsingRule ? "..." : "Add"}
                </Button>
              </div>

              {/* Display existing rules */}
              <div className="space-y-2">
                {scalingRules.map((rule) => (
                  <Card key={rule.id} className={`bg-gray-800 border-gray-700 p-3 ${!rule.isActive ? 'opacity-50' : ''}`}>
                    <div className="space-y-2">
                      {editingRuleId === rule.id ? (
                        <div className="flex space-x-2">
                          <Input
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="bg-gray-700 border-gray-600 text-white text-xs"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && !isParsingRule) handleEditRule(rule.id);
                              if (e.key === 'Escape') cancelEditing();
                            }}
                            disabled={isParsingRule}
                          />
                          <Button
                            onClick={() => handleEditRule(rule.id)}
                            disabled={isParsingRule}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Save
                          </Button>
                          <Button
                            onClick={cancelEditing}
                            variant="outline"
                            size="sm"
                            className="border-gray-600"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {rule.parsed ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <AlertCircle className="h-3 w-3 text-red-500" />
                              )}
                              <span className="text-xs text-gray-300 flex-1">
                                {rule.parsed ? getRuleDisplayText(rule) : rule.text}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleRule(rule.id)}
                                className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                              >
                                {rule.isActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditing(rule)}
                                className="h-6 w-6 p-0 text-gray-400 hover:text-blue-400"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveRule(rule.id)}
                                className="h-6 w-6 p-0 text-gray-400 hover:text-red-400"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          {!rule.parsed && (
                            <div className="text-xs text-red-400 mt-1">
                              Failed to parse rule. Click edit to fix.
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              {scalingRules.length === 0 && (
                <div className="text-xs text-gray-500 text-center py-4">
                  No scaling rules defined. Add rules to dynamically adjust parameters during simulation.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
