import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useConversationStore } from '../../store/conversationStore';
import {
  History,
  Download,
  Trash2,
  Clock,
  MessageSquare,
  Target,
  BarChart3,
  RefreshCw
} from 'lucide-react';

interface SessionHistoryItem {
  id: string;
  timestamp: Date;
  objective?: string;
  keyResultsCount: number;
  qualityScore: number;
  phase: string;
  messageCount: number;
  duration: number;
}

export function SessionHistory() {
  const { sessionId, messages, objective, keyResults, qualityScores, phase } = useConversationStore();
  const [sessions, setSessions] = useState<SessionHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load session history from localStorage
  useEffect(() => {
    loadSessionHistory();
  }, []);

  // Auto-save current session
  useEffect(() => {
    if (sessionId && (objective || keyResults.length > 0)) {
      saveCurrentSession();
    }
  }, [sessionId, objective, keyResults, qualityScores, phase, messages]);

  const loadSessionHistory = () => {
    try {
      const stored = localStorage.getItem('okr-session-history');
      if (stored) {
        const parsed = JSON.parse(stored);
        setSessions(parsed.map((session: any) => ({
          ...session,
          timestamp: new Date(session.timestamp)
        })));
      }
    } catch (error) {
      console.error('Failed to load session history:', error);
    }
  };

  const saveCurrentSession = () => {
    if (!sessionId) return;

    const currentSession: SessionHistoryItem = {
      id: sessionId,
      timestamp: new Date(),
      objective: objective?.text,
      keyResultsCount: keyResults.length,
      qualityScore: qualityScores.overall,
      phase,
      messageCount: messages.length,
      duration: Date.now() - parseInt(sessionId.split('_')[1]) // Rough calculation
    };

    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== sessionId);
      const updated = [currentSession, ...filtered].slice(0, 10); // Keep last 10 sessions

      try {
        localStorage.setItem('okr-session-history', JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to save session history:', error);
      }

      return updated;
    });
  };

  const deleteSession = (sessionId: string) => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== sessionId);
      try {
        localStorage.setItem('okr-session-history', JSON.stringify(filtered));
      } catch (error) {
        console.error('Failed to delete session:', error);
      }
      return filtered;
    });
  };

  const exportSession = async (session: SessionHistoryItem) => {
    setIsLoading(true);
    try {
      // Create export data
      const exportData = {
        sessionId: session.id,
        timestamp: session.timestamp.toISOString(),
        objective: session.objective,
        keyResultsCount: session.keyResultsCount,
        qualityScore: session.qualityScore,
        phase: session.phase,
        messageCount: session.messageCount,
        duration: session.duration,
        exported: new Date().toISOString()
      };

      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `okr-session-${session.id}-${session.timestamp.toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearAllSessions = () => {
    setSessions([]);
    localStorage.removeItem('okr-session-history');
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    if (minutes < 1) return '<1m';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'discovery': return 'bg-blue-100 text-blue-800';
      case 'refinement': return 'bg-yellow-100 text-yellow-800';
      case 'kr_discovery': return 'bg-purple-100 text-purple-800';
      case 'validation': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold flex items-center space-x-2">
          <History className="h-5 w-5" />
          <span>Session History</span>
        </h2>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadSessionHistory}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {sessions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllSessions}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium text-muted-foreground mb-2">No Session History</h3>
            <p className="text-sm text-muted-foreground">
              Your OKR development sessions will appear here. Continue working to build your history.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <Card key={session.id} className={session.id === sessionId ? 'border-blue-500 bg-blue-50/50' : ''}>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                  {/* Session Info */}
                  <div className="lg:col-span-5 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Badge className={getPhaseColor(session.phase)}>
                        {session.phase.replace('_', ' ')}
                      </Badge>
                      {session.id === sessionId && (
                        <Badge variant="outline" className="text-blue-600">Current</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {session.timestamp.toLocaleDateString()} at {session.timestamp.toLocaleTimeString()}
                    </div>
                    {session.objective && (
                      <div className="text-sm">
                        <span className="font-medium">Objective:</span> {session.objective.substring(0, 60)}...
                      </div>
                    )}
                  </div>

                  {/* Metrics */}
                  <div className="lg:col-span-5 grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Quality</div>
                      <div className={`font-medium ${getQualityColor(session.qualityScore)}`}>
                        {session.qualityScore}/100
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Key Results</div>
                      <div className="font-medium flex items-center justify-center">
                        <Target className="h-3 w-3 mr-1" />
                        {session.keyResultsCount}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Messages</div>
                      <div className="font-medium flex items-center justify-center">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        {session.messageCount}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Duration</div>
                      <div className="font-medium flex items-center justify-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDuration(session.duration)}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="lg:col-span-2 flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportSession(session)}
                      disabled={isLoading}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {session.id !== sessionId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteSession(session.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Session Statistics */}
      {sessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Session Statistics</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div className="space-y-1">
                <div className="text-2xl font-bold">{sessions.length}</div>
                <div className="text-xs text-muted-foreground">Total Sessions</div>
              </div>

              <div className="space-y-1">
                <div className="text-2xl font-bold">
                  {Math.round(sessions.reduce((sum, s) => sum + s.qualityScore, 0) / sessions.length)}
                </div>
                <div className="text-xs text-muted-foreground">Avg Quality Score</div>
              </div>

              <div className="space-y-1">
                <div className="text-2xl font-bold">
                  {Math.round(sessions.reduce((sum, s) => sum + s.messageCount, 0) / sessions.length)}
                </div>
                <div className="text-xs text-muted-foreground">Avg Messages</div>
              </div>

              <div className="space-y-1">
                <div className="text-2xl font-bold">
                  {sessions.filter(s => s.phase === 'completed').length}
                </div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}