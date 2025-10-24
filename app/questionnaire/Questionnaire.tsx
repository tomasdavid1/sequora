'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, ArrowRight, ArrowLeft, Target, Award, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { signUpWithoutConfirmation } from '@/lib/auth-utils';
import { useRouter } from 'next/navigation';

interface Question {
  id: string;
  text: string;
  category: string;
  possibleValues: number[];
}

interface Section {
  category: string;
  questions: Question[];
}

const valueLabels = {
  0: 'Never',
  2: 'Occasionally', 
  4: 'Often',
  6: 'Regularly',
  8: 'Always'
};

const getAnswerText = (value: number, possibleValues: number[]) => {
  if (possibleValues.length === 2) {
    return value === 0 ? 'No' : 'Yes';
  }
  return valueLabels[value as keyof typeof valueLabels] || value.toString();
};

const getCategoryDisplayName = (category: string) => {
  const categoryNames = {
    'foodReactions': 'Food Reactions',
    'foreignObjects': 'Foreign Objects',
    'environmentalToxins': 'Environmental Toxins',
    'metabolicDysfunction': 'Metabolic Dysfunction',
    'gutDysbiosis': 'Gut Dysbiosis',
    'nervousSystem': 'Nervous System',
    'stealthInfections': 'Stealth Infections',
    'oralHealth': 'Oral Health'
  };
  return categoryNames[category as keyof typeof categoryNames] || category;
};

export default function Questionnaire() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<Section[]>([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Account creation modal state
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  // Loading modal state
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  
  const loadingMessages = [
    "We're creating your account...",
    "We're gathering information...", 
    "We're almost done creating your personalized program..."
  ];

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch('/api/questions');
        const data = await response.json();
        setSections(data.sections || []);
      } catch (error) {
        console.error('Error fetching questions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  // Progress loading messages
  useEffect(() => {
    if (showLoadingModal && loadingStep < loadingMessages.length - 1) {
      const timer = setTimeout(() => {
        setLoadingStep(prev => prev + 1);
      }, 2500); // Change message every 2.5 seconds
      return () => clearTimeout(timer);
    }
  }, [showLoadingModal, loadingStep, loadingMessages.length]);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    // Check authentication status without redirecting
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // User is authenticated, proceed directly
        await submitQuestionnaire(session.user.id, session.user.email || '', true);
      } else {
        // User is not authenticated, show account creation modal
        setShowAccountModal(true);
        }
      } catch (error) {
      console.error('Error checking auth status:', error);
      // If auth check fails, show account creation modal
      setShowAccountModal(true);
    }
  };

  const validateEmail = (email: string) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const handleCreateAccountAndSubmit = async () => {
    // Reset errors
    setEmailError('');
    setPasswordError('');
    
    // Validate email
    if (!email.trim()) {
      setEmailError('Email is required');
      return;
    }
    
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    
    // Validate password
    if (!password.trim()) {
      setPasswordError('Password is required');
      return;
    }

    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    setIsCreatingAccount(true);
    
    // Close account modal and show loading modal
    setShowAccountModal(false);
    setShowLoadingModal(true);
    setLoadingStep(0);

    try {
      console.log('Creating account and submitting questionnaire...');
      
      // Create user account using existing signup function
      const { data, error } = await signUpWithoutConfirmation(email, password, {
        name: 'Assessment User',
      });

      if (error) {
        console.error('Account creation error:', error);
        
        if (error.message.includes('User already registered')) {
          // Try to sign in instead
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
          });

          if (signInError) {
            setShowLoadingModal(false);
            setPasswordError('Account exists but password is incorrect. Please try again.');
            setShowAccountModal(true);
            return;
          }
          
          console.log('Signed in existing user, proceeding with submission...');
          await submitQuestionnaire(signInData.user.id, signInData.user.email || '', true);
        } else {
          throw error;
        }
      } else if (data.user) {
        console.log('✅ [Questionnaire] Account created successfully, proceeding with submission...');
        console.log('✅ [Questionnaire] Created user ID:', data.user.id);
        console.log('✅ [Questionnaire] Created user email:', data.user.email);
        
        // Verify the user is actually signed in by checking the session
        const { data: sessionData } = await supabase.auth.getSession();
        console.log('🔍 [Questionnaire] Current session after signup:', {
          sessionUserId: sessionData.session?.user?.id,
          sessionUserEmail: sessionData.session?.user?.email,
          createdUserId: data.user.id,
          createdUserEmail: data.user.email,
          idsMatch: sessionData.session?.user?.id === data.user.id,
          emailsMatch: sessionData.session?.user?.email === data.user.email
        });
        
        // If session doesn't match, explicitly sign in the user
        if (!sessionData.session || sessionData.session.user.id !== data.user.id) {
          console.log('Session mismatch detected, signing in user manually...');
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
          });
          
          if (signInError) {
            console.error('Failed to sign in after account creation:', signInError);
            setShowLoadingModal(false);
            setPasswordError('Account created but sign-in failed. Please try logging in manually.');
            setShowAccountModal(true);
            return;
          }
          
          console.log('Successfully signed in after account creation:', signInData.user.id);
          
          // Small delay to ensure session is fully established
          await new Promise(resolve => setTimeout(resolve, 500));
          
          await submitQuestionnaire(signInData.user.id, signInData.user.email || '', true);
        } else {
          await submitQuestionnaire(data.user.id, data.user.email || '', true);
        }
      } else {
        throw new Error('Account creation failed - no user data returned');
      }

    } catch (error) {
      console.error('Account creation failed:', error);
      setShowLoadingModal(false);
      setEmailError(`Failed to create account: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setShowAccountModal(true);
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const submitQuestionnaire = async (userId: string, userEmail: string, isAuthenticated: boolean) => {
    setIsSubmitting(true);
    try {
      console.log('Submitting questionnaire:', { userId, userEmail, isAuthenticated });
      
      // Submit questionnaire answers
      const response = await fetch('/api/questionnaire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId,
          email: userEmail,
          isAuthenticated,
          answers: Object.entries(answers).map(([questionId, value]) => ({
            questionId,
            answer: value.toString()
          }))
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Submission failed: ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      
      // Processing complete - redirect to dashboard (user is now logged in)
      setTimeout(async () => {
        setShowLoadingModal(false);
        
        // Check session one more time before redirect
        const { data: finalSessionData } = await supabase.auth.getSession();
        console.log('🔍 [Questionnaire] Final session before redirect to dashboard:', {
          userId: finalSessionData.session?.user?.id,
          userEmail: finalSessionData.session?.user?.email,
          hasSession: !!finalSessionData.session
        });
        
        console.log('✅ [Questionnaire] Questionnaire submitted successfully, redirecting to dashboard');
        router.push('/dashboard');
      }, 1000); // Brief delay to show final message

    } catch (error) {
      console.error('Error submitting questionnaire:', error);
      setShowLoadingModal(false);
      alert('Failed to submit questionnaire. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center">Loading questions...</div>
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center">No questions available.</div>
      </div>
    );
  }

  // Results are now handled by redirect to login after submission

  const currentSection = sections[currentSectionIndex];
  const currentQuestion = currentSection?.questions[currentQuestionIndex];
  const totalQuestions = sections.reduce((total, section) => total + section.questions.length, 0);
  const answeredQuestions = Object.keys(answers).length;
  const progress = (answeredQuestions / totalQuestions) * 100;

  // Early submission logic - allow after just 3 questions for testing
  const minimumQuestionsForSubmission = 3; // Allow submission after just 3 questions
  const canSubmitEarly = answeredQuestions >= minimumQuestionsForSubmission;

  const handleAnswer = (value: number) => {
    if (!currentQuestion) return;
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: value
    }));
    // Auto-advance to next question after a short delay
    setTimeout(() => {
      goToNext();
    }, 300); // Small delay for visual feedback
  };

  const goToNext = () => {
    if (!currentSection) return;
    
    if (currentQuestionIndex < currentSection.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else if (currentSectionIndex < sections.length - 1) {
      setCurrentSectionIndex(prev => prev + 1);
      setCurrentQuestionIndex(0);
    }
  };

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else if (currentSectionIndex > 0) {
      setCurrentSectionIndex(prev => prev - 1);
      const prevSection = sections[currentSectionIndex - 1];
      setCurrentQuestionIndex(prevSection.questions.length - 1);
    }
  };

  const isLastQuestion = currentSectionIndex === sections.length - 1 && 
                        currentQuestionIndex === currentSection.questions.length - 1;

  const canGoNext = currentQuestion && answers[currentQuestion.id] !== undefined;
  const canGoPrevious = currentSectionIndex > 0 || currentQuestionIndex > 0;

  // Calculate section completion stats
  const sectionStats = sections.map(section => {
    const sectionAnswers = section.questions.filter(q => answers[q.id] !== undefined).length;
    return {
      category: section.category,
      completed: sectionAnswers,
      total: section.questions.length,
      percentage: Math.round((sectionAnswers / section.questions.length) * 100)
    };
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Health Assessment</h1>
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Progress: {answeredQuestions} of {totalQuestions} questions</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
        </div>

        {/* Early Submission Notice */}
        {canSubmitEarly && !isLastQuestion && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-green-800">Ready to Submit (Testing Mode)</h3>
                <p className="text-xs text-green-600">
                  You've answered {answeredQuestions} questions (minimum 3). You can submit now for quick testing or continue for more comprehensive results.
                </p>
              </div>
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <Send className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Submitting...' : 'Submit Now'}
              </Button>
                </div>
              </div>
        )}
            </div>

      {currentQuestion && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">
              Section: {getCategoryDisplayName(currentSection.category)} 
              <span className="text-sm font-normal text-gray-600 ml-2">
                Question {currentQuestionIndex + 1} of {currentSection.questions.length}
              </span>
              </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <p className="text-lg mb-4">{currentQuestion.text}</p>
              
              <div className="space-y-3">
                {currentQuestion.possibleValues.map((value) => (
                <Button
                  key={value}
                  variant={answers[currentQuestion.id] === value ? "default" : "outline"}
                    className="w-full justify-start text-left p-4 h-auto"
                    onClick={() => handleAnswer(value)}
                  >
                    <div className="flex items-center">
                    {answers[currentQuestion.id] === value && (
                        <CheckCircle className="w-5 h-5 mr-3" />
                    )}
                      <span>{getAnswerText(value, currentQuestion.possibleValues)}</span>
                  </div>
                </Button>
              ))}
            </div>
            </div>
            
            <div className="flex justify-between">
            <Button
              variant="outline"
                onClick={goToPrevious}
                disabled={!canGoPrevious}
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

              <Button
                onClick={isLastQuestion ? handleSubmit : goToNext}
                disabled={!canGoNext || isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : (isLastQuestion ? 'Complete Assessment' : 'Next')}
                {!isLastQuestion && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
                    </div>
          </CardContent>
        </Card>
      )}

      {/* Section Progress Cards */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Target className="w-5 h-5 mr-2 text-blue-600" />
              Progress Overview
                      </CardTitle>
          </CardHeader>
          <CardContent>
                    <div className="space-y-2">
              {sectionStats.map((stat, index) => (
                <div key={stat.category} className="flex justify-between items-center">
                  <span className="text-sm font-medium capitalize">
                    {getCategoryDisplayName(stat.category)}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      {stat.completed}/{stat.total}
                    </span>
                    <Badge 
                      variant={stat.percentage === 100 ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {stat.percentage}%
                    </Badge>
                    </div>
                  </div>
              ))}
                </div>
                </CardContent>
            </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Award className="w-5 h-5 mr-2 text-green-600" />
              Assessment Summary
                      </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Total Questions:</span>
                <span className="text-sm font-bold">{totalQuestions}</span>
                    </div>
                    <div className="flex justify-between">
                <span className="text-sm font-medium">Completed:</span>
                <span className="text-sm font-bold text-green-600">{answeredQuestions}</span>
                  </div>
                    <div className="flex justify-between">
                <span className="text-sm font-medium">Remaining:</span>
                <span className="text-sm font-bold text-blue-600">{totalQuestions - answeredQuestions}</span>
                </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Min. for Submit:</span>
                <span className="text-sm font-bold text-orange-600">{minimumQuestionsForSubmission}</span>
                  </div>
              <div className="pt-2 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{Math.round(progress)}%</div>
                  <div className="text-xs text-gray-600">Complete</div>
                  {canSubmitEarly && (
                    <Badge className="mt-1 bg-green-100 text-green-700">
                      Ready to Submit
                    </Badge>
                  )}
                    </div>
                    </div>
                  </div>
                </CardContent>
            </Card>
          </div>

      {/* Account Creation Modal */}
      <Dialog open={showAccountModal} onOpenChange={setShowAccountModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Send className="w-8 h-8 text-primary" />
                </div>
              </div>
              <DialogTitle className="text-center text-xl">
              Create Account
              </DialogTitle>
            <p className="text-center text-muted-foreground">
              Enter your email and password to create an account and receive your personalized treatment plan.
            </p>
            </DialogHeader>
            <div className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateAccountAndSubmit()}
                  className={emailError ? 'border-red-500' : ''}
                autoFocus
                />
                {emailError && (
                  <p className="text-sm text-red-600">{emailError}</p>
                )}
              </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                type="password"
                placeholder="Password"
                        value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateAccountAndSubmit()}
                        className={passwordError ? 'border-red-500' : ''}
                      />
                      {passwordError && (
                        <p className="text-sm text-red-600">{passwordError}</p>
                      )}
                    </div>
            <div className="flex flex-col gap-3">
                    <Button 
                onClick={handleCreateAccountAndSubmit}
                disabled={!email || !password || isCreatingAccount}
                      className="w-full"
                    >
                {isCreatingAccount ? 'Creating Account...' : 'Create Account & Submit'}
                    </Button>
                    <Button 
                variant="outline" 
                onClick={() => setShowAccountModal(false)}
                className="w-full"
              >
                Cancel
                    </Button>
                  </div>
            </div>
          </DialogContent>
        </Dialog>

      {/* Loading Modal */}
      <Dialog open={showLoadingModal} onOpenChange={() => {}}>
        <DialogContent className="max-w-md text-center" onPointerDownOutside={(e) => e.preventDefault()}>
              <div className="flex items-center justify-center mb-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
                </div>
          <p className="text-lg font-medium">{loadingMessages[loadingStep]}</p>
          <p className="text-sm text-muted-foreground">
            This might take a few moments to complete.
          </p>
          </DialogContent>
        </Dialog>
    </div>
  );
} 