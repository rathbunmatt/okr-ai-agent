import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useConversationStore } from '../../store/conversationStore';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Save,
  Upload,
  Settings,
  Timer,
  Users,
  Target
} from 'lucide-react';

export function SessionManager() {
  const {
    sessionId,
    phase,
    isConnected,
    messages,
    objective,
    keyResults,
    qualityScores,
    resetSession,
    connectWebSocket,
    disconnectWebSocket
  } = useConversationStore();

  const [isSessionActive, setIsSessionActive] = useState(!!sessionId);
  const [sessionStartTime] = useState(Date.now());

  const handleStartSession = async () => {
    try {
      if (!isConnected) {
        await connectWebSocket();
      }
      setIsSessionActive(true);
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  const handlePauseSession = () => {
    setIsSessionActive(false);
    // Could implement session pausing logic here
  };

  const handleEndSession = () => {
    setIsSessionActive(false);
    disconnectWebSocket();
  };

  const handleResetSession = () => {
    if (confirm('Are you sure you want to reset this session? All progress will be lost.')) {
      resetSession();
      setIsSessionActive(false);
    }
  };

  const handleSaveSession = () => {
    // Session is auto-saved via the store
    alert('Session saved successfully!');
  };

  const handleExportSession = () => {
    const sessionData = {
      sessionId,
      timestamp: new Date().toISOString(),
      phase,
      objective,
      keyResults,
      qualityScores,
      messageCount: messages.length,
      duration: Date.now() - sessionStartTime
    };

    const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `okr-session-${sessionId || 'current'}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getSessionStatus = () => {
    if (!sessionId) return 'No Session';
    if (!isConnected) return 'Disconnected';
    if (isSessionActive) return 'Active';
    return 'Paused';
  };

  const getStatusColor = () => {
    const status = getSessionStatus();
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Paused': return 'bg-yellow-100 text-yellow-800';
      case 'Disconnected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const sessionProgress = {
    hasObjective: !!objective,
    hasKeyResults: keyResults.length > 0,
    qualityThreshold: qualityScores.overall >= 75
  };

  const progressCount = Object.values(sessionProgress).filter(Boolean).length;
  const progressPercentage = (progressCount / 3) * 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center space-x-2">
            <Timer className="h-5 w-5" />
            <span>Session Manager</span>
          </CardTitle>
          <Badge className={getStatusColor()}>
            {getSessionStatus()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Session Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="text-center">
            <div className="text-lg font-bold">{messages.length}</div>
            <div className="text-xs text-muted-foreground">Messages</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">{phase.replace('_', ' ')}</div>
            <div className="text-xs text-muted-foreground">Current Phase</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">{qualityScores.overall}/100</div>
            <div className="text-xs text-muted-foreground">Quality Score</div>
          </div>
        </div>

        {/* Progress Indicators */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span>Session Progress</span>
            <span>{progressCount}/3 milestones</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className={`flex items-center space-x-2 ${sessionProgress.hasObjective ? 'text-green-600' : 'text-muted-foreground'}`}>
              <Target className="h-3 w-3" />
              <span>Objective Created {sessionProgress.hasObjective && '✓'}</span>
            </div>
            <div className={`flex items-center space-x-2 ${sessionProgress.hasKeyResults ? 'text-green-600' : 'text-muted-foreground'}`}>
              <Users className="h-3 w-3" />
              <span>Key Results Added {sessionProgress.hasKeyResults && '✓'}</span>
            </div>
            <div className={`flex items-center space-x-2 ${sessionProgress.qualityThreshold ? 'text-green-600' : 'text-muted-foreground'}`}>
              <Settings className="h-3 w-3" />
              <span>Quality Threshold Met {sessionProgress.qualityThreshold && '✓'}</span>
            </div>
          </div>
        </div>

        {/* Session Controls */}
        <div className="flex flex-wrap gap-2">
          {!isSessionActive && !sessionId && (
            <Button onClick={handleStartSession} className="flex-1">
              <Play className="h-4 w-4 mr-1" />
              Start Session
            </Button>
          )}

          {isSessionActive && (
            <>
              <Button onClick={handlePauseSession} variant="outline" size="sm">
                <Pause className="h-4 w-4 mr-1" />
                Pause
              </Button>
              <Button onClick={handleEndSession} variant="outline" size="sm">
                <Square className="h-4 w-4 mr-1" />
                End
              </Button>
            </>
          )}

          {sessionId && (
            <>
              <Button onClick={handleSaveSession} variant="outline" size="sm">
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button onClick={handleExportSession} variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button onClick={handleResetSession} variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </>
          )}
        </div>

        {/* Connection Status */}
        <div className="text-xs text-muted-foreground border-t pt-2">
          <div className="flex justify-between items-center">
            <span>Connection Status:</span>
            <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
              {isConnected ? '● Connected' : '● Disconnected'}
            </span>
          </div>
          {sessionId && (
            <div className="flex justify-between items-center mt-1">
              <span>Session ID:</span>
              <span className="font-mono text-xs">{sessionId.substring(0, 8)}...</span>
            </div>
          )}
        </div>

        {/* Session Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-sm font-medium text-blue-800 mb-1">💡 Session Tips:</div>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Sessions auto-save as you progress</li>
            <li>• Quality improves through iterative refinement</li>
            <li>• Complete all milestones for best results</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}