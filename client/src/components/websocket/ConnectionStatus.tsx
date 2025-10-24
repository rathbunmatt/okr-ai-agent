import React from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Wifi,
  WifiOff,
  AlertCircle,
  Loader2,
  Activity,
  Clock
} from 'lucide-react';
import { useWebSocketHealth } from '../../hooks/useWebSocket';
import { useConversationStore } from '../../store/conversationStore';

interface ConnectionStatusProps {
  showDetails?: boolean;
  className?: string;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  showDetails = false,
  className = ''
}) => {
  const { status, isHealthy, latency, reconnectAttempts, error } = useWebSocketHealth();
  const { isConnected, connectWebSocket, disconnectWebSocket } = useConversationStore();

  const getStatusConfig = () => {
    switch (status) {
      case 'healthy':
        return {
          icon: <Wifi className="h-4 w-4" />,
          label: 'Connected',
          color: 'bg-green-100 text-green-800 border-green-200',
          bgColor: 'bg-green-50'
        };
      case 'slow':
        return {
          icon: <Activity className="h-4 w-4" />,
          label: 'Slow Connection',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          bgColor: 'bg-yellow-50'
        };
      case 'unstable':
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          label: 'Unstable',
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          bgColor: 'bg-orange-50'
        };
      case 'error':
        return {
          icon: <WifiOff className="h-4 w-4" />,
          label: 'Error',
          color: 'bg-red-100 text-red-800 border-red-200',
          bgColor: 'bg-red-50'
        };
      case 'disconnected':
      default:
        return {
          icon: <WifiOff className="h-4 w-4" />,
          label: 'Disconnected',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          bgColor: 'bg-gray-50'
        };
    }
  };

  const config = getStatusConfig();

  const handleReconnect = async () => {
    try {
      if (isConnected) {
        disconnectWebSocket();
        // Wait a moment before reconnecting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      await connectWebSocket();
    } catch (error) {
      console.error('Reconnection failed:', error);
    }
  };

  if (!showDetails) {
    return (
      <div className={`inline-flex items-center space-x-2 ${className}`}>
        <Badge className={`${config.color} border`}>
          {config.icon}
          <span className="ml-1">{config.label}</span>
        </Badge>
        {latency > 0 && (
          <span className="text-xs text-gray-500">
            {latency}ms
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`p-3 rounded-lg border ${config.bgColor} border-gray-200 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {config.icon}
          <span className="font-medium text-sm">{config.label}</span>
        </div>

        <div className="flex items-center space-x-2">
          {latency > 0 && (
            <div className="flex items-center space-x-1 text-xs text-gray-600">
              <Clock className="h-3 w-3" />
              <span>{latency}ms</span>
            </div>
          )}

          {!isConnected && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReconnect}
              className="text-xs px-2 py-1 h-6"
            >
              <Loader2 className="h-3 w-3 mr-1" />
              Reconnect
            </Button>
          )}
        </div>
      </div>

      {showDetails && (
        <div className="space-y-1 text-xs text-gray-600">
          {reconnectAttempts > 0 && (
            <p>Reconnection attempts: {reconnectAttempts}</p>
          )}

          {error && (
            <p className="text-red-600">Error: {error}</p>
          )}

          <div className="flex items-center space-x-4">
            <span>Status: {status}</span>
            {isHealthy && <span className="text-green-600">✓ Healthy</span>}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;

/**
 * Compact connection indicator for header/toolbar
 */
export const ConnectionIndicator: React.FC<{ className?: string }> = ({ className }) => {
  const { isHealthy } = useWebSocketHealth();
  const { isConnected } = useConversationStore();

  if (!isConnected) {
    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        <div className="w-2 h-2 rounded-full bg-red-400" />
        <span className="text-xs text-gray-500">Offline</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-green-400' : 'bg-yellow-400'}`} />
      <span className="text-xs text-gray-500">
        {isHealthy ? 'Connected' : 'Issues'}
      </span>
    </div>
  );
};

/**
 * Auto-reconnect component that handles connection recovery
 */
export const AutoReconnect: React.FC = () => {
  const { status } = useWebSocketHealth();
  const { connectWebSocket, isConnected } = useConversationStore();

  React.useEffect(() => {
    // Auto-reconnect when disconnected
    if (status === 'disconnected' && !isConnected) {
      const timer = setTimeout(() => {
        connectWebSocket().catch(console.error);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [status, isConnected, connectWebSocket]);

  return null; // No UI, just background functionality
};