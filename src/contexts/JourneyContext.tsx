import React, { createContext, useContext, useState, ReactNode } from 'react';
import { WizardState, GoalInput } from '@/types/wizard';
import { BusinessParameters } from '@/types/business';

interface JourneyContextType {
  wizardState: WizardState;
  setWizardState: (state: Partial<WizardState>) => void;
  goalInput: GoalInput;
  setGoalInput: (goal: Partial<GoalInput>) => void;
  parameters: Partial<BusinessParameters>;
  setParameters: (params: Partial<BusinessParameters>) => void;
  resetJourney: () => void;
}

const defaultWizardState: WizardState = {
  marketRegions: [],
  productDescription: '',
  marketResearch: null,
  capitalSituation: 'small-seed',
  businessGoal: 'growth-funding',
  completed: false,
};

const JourneyContext = createContext<JourneyContextType | undefined>(undefined);

export function JourneyProvider({ children }: { children: ReactNode }) {
  const [wizardState, setWizardStateInternal] = useState<WizardState>(defaultWizardState);
  const [goalInput, setGoalInputInternal] = useState<GoalInput>({});
  const [parameters, setParametersInternal] = useState<Partial<BusinessParameters>>({});

  const setWizardState = (state: Partial<WizardState>) => {
    setWizardStateInternal(prev => ({ ...prev, ...state }));
  };

  const setGoalInput = (goal: Partial<GoalInput>) => {
    setGoalInputInternal(prev => ({ ...prev, ...goal }));
  };

  const setParameters = (params: Partial<BusinessParameters>) => {
    setParametersInternal(prev => ({ ...prev, ...params }));
  };

  const resetJourney = () => {
    setWizardStateInternal(defaultWizardState);
    setGoalInputInternal({});
    setParametersInternal({});
  };

  return (
    <JourneyContext.Provider
      value={{
        wizardState,
        setWizardState,
        goalInput,
        setGoalInput,
        parameters,
        setParameters,
        resetJourney,
      }}
    >
      {children}
    </JourneyContext.Provider>
  );
}

export function useJourney() {
  const context = useContext(JourneyContext);
  if (!context) {
    throw new Error('useJourney must be used within JourneyProvider');
  }
  return context;
}
