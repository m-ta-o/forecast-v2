import { useState, useRef, useEffect } from "react";
import { Send, X, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BusinessParameters, SimulationResults } from "@/types/business";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { FormattedMessage } from "./FormattedMessage";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatProps {
  parameters: BusinessParameters;
  results: SimulationResults;
}

export function AIChat({ parameters, results }: AIChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = `${Math.min(scrollHeight, 128)}px`;
    }
  }, [inputMessage]);

  // Enhanced conversation starters based on actual business analysis
  const getSmartConversationStarters = () => {
    const starters = [];
    
    // Calculate current margins for dynamic suggestions
    const dtcMargin = ((parameters.avgSellingPriceDTC - parameters.avgManufacturingCostPerUnit - parameters.fulfillmentCostDTC) / parameters.avgSellingPriceDTC) * 100;
    const monthlyBurn = parameters.monthlyMarketingBudget + parameters.monthlyFixedCosts;
    const cashRunway = parameters.startingCash / monthlyBurn;
    
    // Dynamic starters based on current business state
    if (dtcMargin < 70) {
      starters.push(`My DTC margin is ${dtcMargin.toFixed(1)}% - how do I optimize pricing to reach 75% margins?`);
    }
    
    if (cashRunway < 6) {
      starters.push(`I have ${cashRunway.toFixed(1)} months of cash runway - what parameters should I adjust immediately?`);
    }
    
    if (parameters.monthlyMarketingBudget > parameters.startingCash * 0.15) {
      starters.push(`My marketing spend is ${((parameters.monthlyMarketingBudget/parameters.startingCash)*100).toFixed(0)}% of my cash - is this too aggressive?`);
    }
    
    // Always include these strategic starters
    starters.push(
      "Analyze my unit economics - which channel should I focus on?",
      "What's my biggest bottleneck preventing 10x growth?",
      "Compare my margins to supplement industry benchmarks",
      "Which 3 parameters should I optimize first for maximum impact?"
    );
    
    return starters.slice(0, 4); // Return top 4 starters
  };

  const conversationStarters = getSmartConversationStarters();

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-business-advisor', {
        body: {
          message: messageText,
          parameters: parameters,
          results: results
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to get AI response');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const aiResponse: Message = {
        role: 'assistant',
        content: data.response || 'I apologize, but I encountered an issue generating a response. Please try again.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiResponse]);

    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: Message = {
        role: 'assistant',
        content: 'I apologize, but I\'m having trouble connecting to my analysis engine right now. Please check your connection and try again. If the issue persists, there might be a configuration issue with the AI service.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "AI Service Error",
        description: "Unable to get AI response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    await sendMessage(inputMessage);
  };

  const handleStarterClick = async (starter: string) => {
    await sendMessage(starter);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-xl z-50 transition-all duration-300"
      >
        <Brain className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[600px] max-h-[calc(100vh-3rem)] bg-gray-900 border-gray-700 shadow-2xl z-50 flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-white text-lg">AI Business Advisor</CardTitle>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-gray-400">Deep analysis of your business model & parameters</p>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col space-y-4 min-h-0">
        {/* Enhanced Conversation Starters */}
        {messages.length === 0 && (
          <div className="space-y-2 flex-shrink-0">
            <p className="text-xs font-medium text-blue-400 uppercase tracking-wide">Smart Analysis</p>
            <div className="space-y-2">
              {conversationStarters.map((starter, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleStarterClick(starter)}
                  className="w-full text-left justify-start h-auto p-2 text-xs bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-blue-500 transition-colors whitespace-normal"
                  disabled={isLoading}
                >
                  {starter}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="space-y-4 pr-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white text-sm'
                        : 'bg-gray-800 text-gray-100 border border-gray-700'
                    }`}
                  >
                    {message.role === 'user' ? (
                      message.content
                    ) : (
                      <FormattedMessage content={message.content} />
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 text-gray-100 border border-gray-700 p-3 rounded-lg text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-xs text-gray-400">Analyzing your business model...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Input */}
        <div className="flex items-end space-x-2 flex-shrink-0">
          <Textarea
            ref={textareaRef}
            rows={1}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ask about your parameters, margins, cash flow..."
            className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500 resize-none overflow-y-auto min-h-10"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="bg-blue-600 hover:bg-blue-700 transition-all"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
