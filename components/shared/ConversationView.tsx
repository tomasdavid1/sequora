'use client';

import React, { useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Send, AlertTriangle } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    toolCalls?: Array<{
      name?: string;
      tool?: string;
      parameters?: any;
    }>;
    decisionHint?: {
      action?: string;
      severity?: string;
      flagType?: string;
      matchedPattern?: string;
      reason?: string;
    };
    confidence_score?: number;
    detected_intent?: string;
    parsedResponse?: any;
  };
}

interface ConversationViewProps {
  messages: Message[];
  loading?: boolean;
  showEscalations?: boolean;
  showMetadata?: boolean;
  showMessageInput?: boolean;
  currentInput?: string;
  onInputChange?: (value: string) => void;
  onSendMessage?: (message: string) => void;
  placeholder?: string;
  emptyMessage?: string;
}

export function ConversationView({
  messages,
  loading = false,
  showEscalations = true,
  showMetadata = false,
  showMessageInput = true,
  currentInput = '',
  onInputChange,
  onSendMessage,
  placeholder = 'Type a message...',
  emptyMessage = 'No messages yet'
}: ConversationViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const getSeverityColor = (severity?: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL': return 'bg-red-600 text-white';
      case 'HIGH': return 'bg-orange-500 text-white';
      case 'MODERATE': return 'bg-yellow-500 text-white';
      case 'LOW': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const handleSend = () => {
    if (currentInput.trim() && onSendMessage) {
      onSendMessage(currentInput);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !loading ? (
          <div className="text-center py-12 text-gray-500">
            <p>{emptyMessage}</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    {message.role === 'assistant' && <Bot className="w-4 h-4" />}
                    <span className="text-xs opacity-70">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                    
                    {/* Escalation badges (toggleable) */}
                    {showEscalations && message.role === 'assistant' && message.metadata?.toolCalls && (
                      <>
                        {message.metadata.toolCalls.some((t) => (t.tool || t.name) === 'handoff_to_nurse') && (
                          <Badge className="text-xs bg-red-500 text-white">🚨 Escalated</Badge>
                        )}
                        {message.metadata.toolCalls.some((t) => (t.tool || t.name) === 'raise_flag') && (
                          <Badge className="text-xs bg-orange-500 text-white">⚠️ Flag Raised</Badge>
                        )}
                      </>
                    )}
                  </div>
                  
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  
                  {/* Inline Flag Alert */}
                  {showEscalations && message.role === 'assistant' && message.metadata?.decisionHint?.action === 'FLAG' && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <span className="font-semibold text-sm text-red-900">
                          {message.metadata.decisionHint.severity === 'CRITICAL' ? '🚨 CRITICAL FLAG' : '⚠️ FLAG RAISED'}
                        </span>
                      </div>
                      <div className="text-xs space-y-1 text-gray-700">
                        <div><strong>Rule:</strong> {message.metadata.decisionHint.flagType}</div>
                        <div>
                          <strong>Severity:</strong>{' '}
                          <Badge className={getSeverityColor(message.metadata.decisionHint.severity)}>
                            {message.metadata.decisionHint.severity}
                          </Badge>
                        </div>
                        {message.metadata.decisionHint.matchedPattern && (
                          <div className="bg-yellow-50 px-2 py-1 rounded border border-yellow-200">
                            <strong>Matched Pattern:</strong> "{message.metadata.decisionHint.matchedPattern}"
                          </div>
                        )}
                        {message.metadata.decisionHint.reason && (
                          <div><strong>Reason:</strong> {message.metadata.decisionHint.reason}</div>
                        )}
                        {message.metadata.toolCalls && message.metadata.toolCalls.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-red-200">
                            <strong>Action Taken:</strong>
                            {message.metadata.toolCalls.map((tool, idx) => (
                              <div key={idx} className="ml-2 text-emerald-700">
                                → {tool.tool || tool.name}: {tool.parameters?.reason || tool.parameters?.flagType || 'Escalated'}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Optional Metadata Display */}
                  {showMetadata && message.metadata && message.role === 'assistant' && (
                    <div className="mt-3 pt-3 border-t border-gray-300">
                      {(message.metadata.decisionHint || 
                        message.metadata.toolCalls ||
                        message.metadata.confidence_score ||
                        message.metadata.detected_intent) && (
                        <div className="space-y-2">
                          {/* Decision Hint */}
                          {message.metadata.decisionHint && (
                            <div>
                              <Badge variant="outline" className="text-xs">
                                Decision: {message.metadata.decisionHint.action}
                              </Badge>
                            </div>
                          )}
                          
                          {/* Tool Calls */}
                          {message.metadata.toolCalls && message.metadata.toolCalls.length > 0 && (
                            <div>
                              <div className="text-xs font-medium text-gray-700 mb-1">🔧 Tools Used:</div>
                              {message.metadata.toolCalls.map((tool, index) => (
                                <div key={index} className="text-xs bg-white border border-gray-200 p-2 rounded mb-1">
                                  <div className="font-medium text-blue-700">{tool.tool || tool.name}</div>
                                  {tool.parameters && Object.keys(tool.parameters).length > 0 && (
                                    <pre className="text-gray-600 mt-1 text-[10px] overflow-x-auto">
                                      {JSON.stringify(tool.parameters, null, 2)}
                                    </pre>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Detected Intent */}
                          {message.metadata.detected_intent && (
                            <div className="text-xs">
                              <span className="text-gray-600">Intent:</span>{' '}
                              <span className="font-medium">{message.metadata.detected_intent}</span>
                            </div>
                          )}
                          
                          {/* Confidence Score */}
                          {message.metadata.confidence_score && (
                            <div className="text-xs">
                              <span className="text-gray-600">Confidence:</span>{' '}
                              <span className="font-medium">{(message.metadata.confidence_score * 100).toFixed(0)}%</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Loading Indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-2">
                  <Bot className="w-4 h-4" />
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      {/* Message Input (toggleable for nurses) */}
      {showMessageInput && (
        <div className="border-t border-gray-200 p-4 flex-shrink-0">
          <div className="flex gap-2">
            <Input
              value={currentInput}
              onChange={(e) => onInputChange?.(e.target.value)}
              placeholder={placeholder}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              disabled={loading}
            />
            <Button 
              onClick={handleSend} 
              disabled={loading || !currentInput.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

