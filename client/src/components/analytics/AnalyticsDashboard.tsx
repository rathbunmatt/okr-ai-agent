/**
 * AnalyticsDashboard Component - Comprehensive analytics visualization
 *
 * Displays real-time metrics, trends, learning insights, and feedback
 * summaries for the OKR AI Agent analytics system.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { useConversationStore } from '../../store/conversationStore';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  Activity,
  TrendingUp,
  Users,
  MessageSquare,
  Clock,
  Target,
  Brain,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  Calendar,
  Zap,
  BarChart3,
  MessageCircle,
  Lightbulb
} from 'lucide-react';

// Types
interface AnalyticsSummary {
  overview: {
    totalConversations: number;
    totalUsers: number;
    averageQualityScore: number;
    successRate: number;
    avgResponseTime: number;
    activeExperiments: number;
  };
  trends: {
    conversationsOverTime: Array<{
      date: string;
      count: number;
      qualityScore: number;
    }>;
    phaseDistribution: Array<{
      phase: string;
      count: number;
      avgDuration: number;
    }>;
    userSegments: Array<{
      segment: string;
      count: number;
      successRate: number;
    }>;
  };
  performance: {
    responseTimeDistribution: Array<{
      range: string;
      count: number;
    }>;
    errorRates: Array<{
      type: string;
      rate: number;
      trend: 'up' | 'down' | 'stable';
    }>;
    systemMetrics: {
      cpuUsage: number;
      memoryUsage: number;
      diskUsage: number;
      networkLatency: number;
    };
  };
  learning: {
    recentInsights: Array<{
      id: string;
      type: 'success_pattern' | 'failure_mode' | 'optimization' | 'user_preference';
      description: string;
      confidence: number;
      impact: 'high' | 'medium' | 'low';
      implementedAt?: string;
    }>;
    abTestResults: Array<{
      id: string;
      name: string;
      status: 'running' | 'completed' | 'paused';
      variant_a_performance: number;
      variant_b_performance: number;
      significance: number;
      recommendation: string;
    }>;
  };
  feedback: {
    averageRating: number;
    totalResponses: number;
    sentimentDistribution: Array<{
      sentiment: 'positive' | 'neutral' | 'negative';
      count: number;
      percentage: number;
    }>;
    commonThemes: Array<{
      theme: string;
      frequency: number;
      sentiment: 'positive' | 'negative';
    }>;
  };
}

interface AnalyticsDashboardProps {
  refreshInterval?: number;
  onDataUpdate?: (data: AnalyticsSummary) => void;
  showSystemMetrics?: boolean;
}

const COLORS = {
  primary: '#3b82f6',
  secondary: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  success: '#22c55e',
  muted: '#6b7280'
};

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export function AnalyticsDashboard({
  refreshInterval = 30000,
  onDataUpdate,
  showSystemMetrics = false
}: AnalyticsDashboardProps = {}) {
  const { messages, qualityScores, context, objective, keyResults, phase } = useConversationStore();

  // Comprehensive analytics state
  const [analyticsData, setAnalyticsData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [currentTab, setCurrentTab] = useState<'session' | 'system'>('session');

  // Calculate session analytics (existing functionality)
  const sessionDuration = context.sessionMetrics?.duration || 0;
  const messageCount = messages.length;
  const avgQualityProgression = context.sessionMetrics?.qualityProgression || [];
  const improvementRate = avgQualityProgression.length > 1
    ? ((avgQualityProgression[avgQualityProgression.length - 1] - avgQualityProgression[0]) / avgQualityProgression[0]) * 100
    : 0;

  const completionMetrics = {
    objective: objective ? 100 : 0,
    keyResults: (keyResults.length / 3) * 100, // Assuming 3 KRs target
    overallQuality: qualityScores.overall
  };

  const phaseProgress = {
    discovery: phase === 'discovery' ? 100 : 100,
    refinement: ['refinement', 'kr_discovery', 'validation', 'completed'].includes(phase) ? 100 : 0,
    kr_discovery: ['kr_discovery', 'validation', 'completed'].includes(phase) ? 100 : 0,
    validation: ['validation', 'completed'].includes(phase) ? 100 : 0,
    completed: phase === 'completed' ? 100 : 0
  };

  // System analytics functions
  const fetchSystemAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/summary?timeRange=${selectedTimeRange}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setAnalyticsData(data);
      setLastUpdated(new Date());
      onDataUpdate?.(data);
    } catch (error) {
      console.error('Failed to fetch system analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedTimeRange, onDataUpdate]);

  useEffect(() => {
    if (showSystemMetrics) {
      fetchSystemAnalytics();
    }
  }, [fetchSystemAnalytics, showSystemMetrics]);

  useEffect(() => {
    if (!autoRefresh || !showSystemMetrics) return;

    const interval = setInterval(fetchSystemAnalytics, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchSystemAnalytics, refreshInterval, autoRefresh, showSystemMetrics]);

  // Utility functions
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatPercentage = (num: number): string => `${(num * 100).toFixed(1)}%`;

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'success_pattern': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failure_mode': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'optimization': return <Zap className="h-4 w-4 text-blue-600" />;
      case 'user_preference': return <Users className="h-4 w-4 text-purple-600" />;
      default: return <Brain className="h-4 w-4 text-gray-600" />;
    }
  };

  const getImpactBadgeColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Loading state for system analytics
  if (loading && !analyticsData && showSystemMetrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-lg">Loading analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Mode Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          {showSystemMetrics && (
            <p className="text-gray-600 mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>

        <div className="flex items-center gap-4">
          {showSystemMetrics && (
            <>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <select
                  value={selectedTimeRange}
                  onChange={(e) => setSelectedTimeRange(e.target.value as any)}
                  className="border rounded px-3 py-1"
                >
                  <option value="1h">Last Hour</option>
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </select>
              </div>

              <Button
                onClick={() => setAutoRefresh(!autoRefresh)}
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                Auto-refresh
              </Button>

              <Button onClick={fetchSystemAnalytics} size="sm" disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Mode Selection */}
      <Tabs defaultValue={showSystemMetrics ? "system" : "session"} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="session">Current Session</TabsTrigger>
          {showSystemMetrics && <TabsTrigger value="system">System Analytics</TabsTrigger>}
        </TabsList>

        {/* Current Session Tab */}
        <TabsContent value="session" className="space-y-4">
          {/* Session Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <div>
                    <div className="text-2xl font-bold">{Math.round(sessionDuration / 60)}m</div>
                    <p className="text-xs text-muted-foreground">Session Duration</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <MessageCircle className="h-4 w-4 text-green-500" />
                  <div>
                    <div className="text-2xl font-bold">{messageCount}</div>
                    <p className="text-xs text-muted-foreground">Messages Exchanged</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  <div>
                    <div className="text-2xl font-bold">{improvementRate > 0 ? '+' : ''}{improvementRate.toFixed(1)}%</div>
                    <p className="text-xs text-muted-foreground">Quality Improvement</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4 text-red-500" />
                  <div>
                    <div className="text-2xl font-bold">{qualityScores.overall}/100</div>
                    <p className="text-xs text-muted-foreground">Overall Quality</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Tracking */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Progress Tracking</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Objective Development</span>
                    <span className="text-sm">{completionMetrics.objective}%</span>
                  </div>
                  <Progress value={completionMetrics.objective} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Key Results ({keyResults.length}/3)</span>
                    <span className="text-sm">{Math.round(completionMetrics.keyResults)}%</span>
                  </div>
                  <Progress value={completionMetrics.keyResults} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Quality Score</span>
                    <span className="text-sm">{completionMetrics.overallQuality}%</span>
                  </div>
                  <Progress value={completionMetrics.overallQuality} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Phase Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Development Phases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(phaseProgress).map(([phaseName, progress]) => (
                  <div key={phaseName} className="flex items-center space-x-3">
                    <div className="w-24 text-sm capitalize">{phaseName.replace('_', ' ')}</div>
                    <div className="flex-1">
                      <Progress value={progress} className="h-2" />
                    </div>
                    <div className="w-12 text-right text-sm">
                      {progress === 100 && <CheckCircle className="h-4 w-4 text-green-500 inline" />}
                      {progress === 0 && <div className="w-4 h-4 rounded-full border-2 border-gray-300 inline-block" />}
                      {progress > 0 && progress < 100 && <div className="w-4 h-4 rounded-full bg-blue-500 inline-block" />}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quality Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lightbulb className="h-5 w-5" />
                <span>Quality Insights</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Strengths</h4>
                  {Object.entries(qualityScores.dimensions)
                    .filter(([_, score]) => score >= 75)
                    .map(([dimension, score]) => (
                      <div key={dimension} className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm capitalize">{dimension.replace('_', ' ')}</span>
                        <Badge variant="secondary" className="ml-auto">{score}/100</Badge>
                      </div>
                    ))}
                  {Object.entries(qualityScores.dimensions).filter(([_, score]) => score >= 75).length === 0 && (
                    <p className="text-sm text-muted-foreground">Continue working to develop strengths</p>
                  )}
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Areas for Improvement</h4>
                  {Object.entries(qualityScores.dimensions)
                    .filter(([_, score]) => score < 75)
                    .map(([dimension, score]) => (
                      <div key={dimension} className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm capitalize">{dimension.replace('_', ' ')}</span>
                        <Badge variant="outline" className="ml-auto">{score}/100</Badge>
                      </div>
                    ))}
                  {Object.entries(qualityScores.dimensions).filter(([_, score]) => score < 75).length === 0 && (
                    <p className="text-sm text-muted-foreground">All dimensions are strong!</p>
                  )}
                </div>
              </div>

              {qualityScores.feedback.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-medium text-sm mb-2">Latest Feedback</h4>
                  <ul className="space-y-1">
                    {qualityScores.feedback.slice(0, 3).map((feedback, index) => (
                      <li key={index} className="text-sm text-muted-foreground">• {feedback}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Analytics Tab */}
        {showSystemMetrics && analyticsData && (
          <TabsContent value="system" className="space-y-4">
            {/* Key Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-blue-500" />
                    <span className="text-sm text-gray-600">Conversations</span>
                  </div>
                  <div className="text-2xl font-bold mt-1">
                    {formatNumber(analyticsData.overview.totalConversations)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-500" />
                    <span className="text-sm text-gray-600">Users</span>
                  </div>
                  <div className="text-2xl font-bold mt-1">
                    {formatNumber(analyticsData.overview.totalUsers)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-500" />
                    <span className="text-sm text-gray-600">Quality Score</span>
                  </div>
                  <div className="text-2xl font-bold mt-1">
                    {analyticsData.overview.averageQualityScore.toFixed(1)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm text-gray-600">Success Rate</span>
                  </div>
                  <div className="text-2xl font-bold mt-1">
                    {formatPercentage(analyticsData.overview.successRate)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-500" />
                    <span className="text-sm text-gray-600">Avg Response</span>
                  </div>
                  <div className="text-2xl font-bold mt-1">
                    {formatDuration(analyticsData.overview.avgResponseTime)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-500" />
                    <span className="text-sm text-gray-600">Experiments</span>
                  </div>
                  <div className="text-2xl font-bold mt-1">
                    {analyticsData.overview.activeExperiments}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* System Analytics Tabs */}
            <Tabs defaultValue="trends" className="space-y-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="trends">Trends</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="learning">Learning</TabsTrigger>
                <TabsTrigger value="feedback">Feedback</TabsTrigger>
                <TabsTrigger value="experiments">A/B Tests</TabsTrigger>
              </TabsList>

              {/* Trends */}
              <TabsContent value="trends" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Conversation Volume & Quality</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={analyticsData.trends.conversationsOverTime}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip />
                          <Legend />
                          <Bar yAxisId="left" dataKey="count" fill={COLORS.primary} name="Conversations" />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="qualityScore"
                            stroke={COLORS.secondary}
                            strokeWidth={2}
                            name="Quality Score"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Phase Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={analyticsData.trends.phaseDistribution}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ phase, count }) => `${phase}: ${count}`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                          >
                            {analyticsData.trends.phaseDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Performance */}
              <TabsContent value="performance" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>System Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>CPU Usage</span>
                        <span>{analyticsData.performance.systemMetrics.cpuUsage}%</span>
                      </div>
                      <Progress value={analyticsData.performance.systemMetrics.cpuUsage} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Memory Usage</span>
                        <span>{analyticsData.performance.systemMetrics.memoryUsage}%</span>
                      </div>
                      <Progress value={analyticsData.performance.systemMetrics.memoryUsage} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Learning Insights */}
              <TabsContent value="learning" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Learning Insights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analyticsData.learning.recentInsights.map((insight) => (
                        <div key={insight.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              {getInsightIcon(insight.type)}
                              <div>
                                <p className="font-medium">{insight.description}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge className={getImpactBadgeColor(insight.impact)}>
                                    {insight.impact} impact
                                  </Badge>
                                  <span className="text-sm text-gray-500">
                                    Confidence: {formatPercentage(insight.confidence)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Feedback */}
              <TabsContent value="feedback" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Feedback Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {analyticsData.feedback.averageRating.toFixed(1)}
                      </div>
                      <div className="text-sm text-gray-600">
                        Average Rating ({formatNumber(analyticsData.feedback.totalResponses)} responses)
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* A/B Tests */}
              <TabsContent value="experiments" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>A/B Test Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analyticsData.learning.abTestResults.map((test) => (
                        <div key={test.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-medium">{test.name}</h3>
                              <Badge variant={
                                test.status === 'completed' ? 'default' :
                                test.status === 'running' ? 'secondary' : 'outline'
                              }>
                                {test.status}
                              </Badge>
                            </div>
                          </div>

                          <div className="bg-gray-50 rounded p-3">
                            <div className="text-sm font-medium mb-1">Recommendation</div>
                            <div className="text-sm text-gray-700">{test.recommendation}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}