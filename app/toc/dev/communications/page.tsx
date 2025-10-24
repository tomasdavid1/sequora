'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Phone, Send, RefreshCw, Eye, CheckCircle, XCircle } from 'lucide-react';
import { CommunicationMessage, ContactChannel, MessageStatus } from '@/types';

interface MockMessage {
  id: string;
  to: string;
  message: string;
  channel: ContactChannel;
  status: string;
  sent_at: string;
  provider_message_id: string;
  patient_id?: string;
  episode_id?: string;
}

export default function MockCommunicationsPage() {
  const [messages, setMessages] = useState<MockMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState({
    to: '',
    message: '',
    channel: 'SMS' as 'SMS' | 'VOICE',
    patientId: '',
    episodeId: ''
  });

  // Fetch mock messages
  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/toc/mock-sms');
      const data = await response.json();
      setMessages(data.mockSmsMessages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  // Send mock SMS
  const sendMockSMS = async () => {
    if (!newMessage.to || !newMessage.message) return;

    setLoading(true);
    try {
      const response = await fetch('/api/toc/mock-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: newMessage.to,
          message: newMessage.message,
          patientId: newMessage.patientId || null,
          episodeId: newMessage.episodeId || null
        })
      });

      const result = await response.json();
      if (result.success) {
        setNewMessage({ to: '', message: '', channel: 'SMS', patientId: '', episodeId: '' });
        fetchMessages();
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
    } finally {
      setLoading(false);
    }
  };

  // Send mock voice call
  const sendMockVoice = async () => {
    if (!newMessage.to) return;

    setLoading(true);
    try {
      const response = await fetch('/api/toc/mock-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: newMessage.to,
          patientId: newMessage.patientId || null,
          episodeId: newMessage.episodeId || null,
          script: newMessage.message || 'Default TOC check-in script',
          condition: 'HF'
        })
      });

      const result = await response.json();
      if (result.success) {
        setNewMessage({ to: '', message: '', channel: 'SMS', patientId: '', episodeId: '' });
        fetchMessages();
      }
    } catch (error) {
      console.error('Error sending voice call:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'SENT': { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      'DELIVERED': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      'FAILED': { color: 'bg-red-100 text-red-800', icon: XCircle },
      'COMPLETED': { color: 'bg-green-100 text-green-800', icon: CheckCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['SENT'];
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Mock Communications Dashboard</h1>
        <Button onClick={fetchMessages} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="send" className="space-y-6">
        <TabsList>
          <TabsTrigger value="send">Send Mock Message</TabsTrigger>
          <TabsTrigger value="history">Message History</TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Send Mock Communication</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="+1234567890"
                    value={newMessage.to}
                    onChange={(e) => setNewMessage(prev => ({ ...prev, to: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="channel">Channel</Label>
                  <Select 
                    value={newMessage.channel} 
                    onValueChange={(value: 'SMS' | 'VOICE') => setNewMessage(prev => ({ ...prev, channel: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SMS">SMS</SelectItem>
                      <SelectItem value="VOICE">Voice Call</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="patientId">Patient ID (Optional)</Label>
                  <Input
                    id="patientId"
                    placeholder="Patient UUID"
                    value={newMessage.patientId}
                    onChange={(e) => setNewMessage(prev => ({ ...prev, patientId: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="episodeId">Episode ID (Optional)</Label>
                  <Input
                    id="episodeId"
                    placeholder="Episode UUID"
                    value={newMessage.episodeId}
                    onChange={(e) => setNewMessage(prev => ({ ...prev, episodeId: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="message">Message/Script</Label>
                <Textarea
                  id="message"
                  placeholder="Enter your message or voice call script..."
                  value={newMessage.message}
                  onChange={(e) => setNewMessage(prev => ({ ...prev, message: e.target.value }))}
                  rows={4}
                />
              </div>

              <div className="flex gap-2">
                {newMessage.channel === 'SMS' ? (
                  <Button onClick={sendMockSMS} disabled={loading || !newMessage.to || !newMessage.message}>
                    <Send className="w-4 h-4 mr-2" />
                    {loading ? 'Sending...' : 'Send Mock SMS'}
                  </Button>
                ) : (
                  <Button onClick={sendMockVoice} disabled={loading || !newMessage.to}>
                    <Phone className="w-4 h-4 mr-2" />
                    {loading ? 'Initiating...' : 'Start Mock Voice Call'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Mock Communication History</CardTitle>
            </CardHeader>
            <CardContent>
              {messages.length > 0 ? (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {message.channel === 'SMS' ? (
                            <MessageSquare className="w-4 h-4 text-green-500" />
                          ) : (
                            <Phone className="w-4 h-4 text-blue-500" />
                          )}
                          <span className="font-medium">{message.to}</span>
                          <Badge variant="outline">{message.channel}</Badge>
                          {getStatusBadge(message.status)}
                        </div>
                        <span className="text-sm text-gray-500">
                          {formatDate(message.sent_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{message.message}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>ID: {message.provider_message_id}</span>
                        {message.patient_id && <span>• Patient: {message.patient_id}</span>}
                        {message.episode_id && <span>• Episode: {message.episode_id}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No mock communications yet. Send your first message!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

