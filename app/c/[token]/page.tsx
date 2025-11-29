'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ConversationView } from '@/components/shared/ConversationView';
import { AlertTriangle, CheckCircle2, Clock, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: any;
}

interface PatientSession {
  valid: boolean;
  session?: {
    magicLinkId: string;
    patient: {
      id: string;
      firstName: string;
      lastName: string;
      educationLevel: string;
      languageCode: string;
    };
    episode: {
      id: string;
      conditionCode: string;
      riskLevel: string;
      medications: any[];
    };
    purpose: string;
    expiresAt: string;
    agentInteractionId?: string;
  };
  error?: string;
}

export default function PatientChatPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const token = params.token as string;

  const [validating, setValidating] = useState(true);
  const [session, setSession] = useState<PatientSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [interactionId, setInteractionId] = useState<string | null>(null);

  // Validate magic link token on mount
  useEffect(() => {
    validateToken();
  }, [token]);

  async function validateToken() {
    try {
      setValidating(true);
      
      const response = await fetch(`/api/magic-link/validate/${token}`);
      const data = await response.json();

      if (!response.ok || !data.valid) {
        setSession({ valid: false, error: data.error || 'Invalid or expired link' });
        return;
      }

      setSession(data);
      setInteractionId(data.session.agentInteractionId || null);

      // Load existing conversation if there is one
      if (data.session.agentInteractionId) {
        await loadExistingConversation(data.session.agentInteractionId);
      }

    } catch (error) {
      console.error('❌ [PatientChat] Error validating token:', error);
      setSession({ 
        valid: false, 
        error: 'Could not validate your link. Please try again or contact support.' 
      });
    } finally {
      setValidating(false);
    }
  }

  async function loadExistingConversation(interactionId: string) {
    try {
      const response = await fetch(`/api/toc/interactions/${interactionId}`);
      if (!response.ok) return;

      const data = await response.json();
      
      if (data.messages && Array.isArray(data.messages)) {
        const chatMessages: ChatMessage[] = data.messages.map((msg: any) => ({
          id: msg.id,
          role: (msg.role === 'user' || msg.role === 'PATIENT') ? 'user' : 'assistant',
          content: msg.content,
          timestamp: new Date(msg.timestamp || msg.created_at || Date.now())
        }));
        setMessages(chatMessages);
      }
    } catch (error) {
      console.error('❌ [PatientChat] Error loading conversation:', error);
    }
  }

  async function sendMessage(input: string) {
    if (!input.trim() || loading || !session?.session) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/toc/agents/core/interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: session.session.patient.id,
          episodeId: session.session.episode.id,
          patientInput: input,
          condition: session.session.episode.conditionCode,
          interactionType: 'WEB',
          interactionId: interactionId || undefined
        })
      });

      const result = await response.json();

      if (response.status !== 200 || result.error) {
        console.error('❌ [PatientChat] API error:', result.error);
        toast({
          title: "Error",
          description: result.error || "Failed to send message. Please try again.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Track interaction ID for subsequent messages
      if (result.interactionId && !interactionId) {
        setInteractionId(result.interactionId);
      }

      const responseMessage = result.message || result.aiResponse || result.response;
      if (!responseMessage) {
        toast({
          title: "Error",
          description: "No response received. Please try again.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseMessage,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Show toast if conversation ended
      if (result.shouldEndInteraction) {
        toast({
          title: "Check-in Complete",
          description: "Thank you for checking in! You can close this window.",
          variant: "default"
        });
      }

    } catch (error) {
      console.error('❌ [PatientChat] Error sending message:', error);
      toast({
        title: "Error",
        description: "Could not send your message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  // Show validation loading
  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
              <p className="text-gray-600">Validating your secure link...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error if invalid link
  if (!session?.valid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Invalid Link
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                {session?.error || 'This link is invalid or has expired.'}
              </AlertDescription>
            </Alert>
            <p className="text-sm text-gray-600">
              If you need a new link, please contact your care team or check your text messages for a fresh link.
            </p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.close()}
            >
              Close Window
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Valid session - show chat interface
  const { patient, episode, expiresAt, purpose } = session.session!;
  const expiresDate = new Date(expiresAt);
  const now = new Date();
  const hoursRemaining = Math.max(0, Math.floor((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60)));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Sequora Health</h1>
              <p className="text-sm text-gray-600">Secure Patient Portal</p>
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              <span className="text-xs">Secure</span>
            </Badge>
          </div>
        </div>
      </div>

      {/* Welcome Message */}
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                  Welcome, {patient.firstName}!
                </h2>
                <p className="text-sm text-gray-700 mb-3">
                  This is your secure check-in for your {episode.conditionCode} care plan. 
                  Please answer the questions below honestly so we can provide you with the best care.
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Link expires in {hoursRemaining}h</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    <span>HIPAA Compliant</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chat Interface */}
      <div className="container mx-auto px-4 pb-8 max-w-4xl">
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-green-600 text-white">
            <CardTitle className="text-lg">
              {purpose === 'check-in' ? '📋 Daily Check-in' : '💬 Care Conversation'}
            </CardTitle>
            <p className="text-sm text-blue-100 mt-1">
              Chat with your care team below
            </p>
          </CardHeader>
          
          <CardContent className="p-0 h-[500px] md:h-[600px]">
            <ConversationView
              messages={messages}
              loading={loading}
              showEscalations={false}
              showMetadata={false}
              showMessageInput={true}
              currentInput={currentInput}
              onInputChange={setCurrentInput}
              onSendMessage={sendMessage}
              placeholder="Type your message here..."
              emptyMessage="Start the conversation by typing a message below"
            />
          </CardContent>
        </Card>

        {/* Footer Info */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>
            Your responses are securely encrypted and only shared with your care team.
            <br />
            Need immediate help? Call 911 or go to the nearest emergency room.
          </p>
        </div>
      </div>
    </div>
  );
}

