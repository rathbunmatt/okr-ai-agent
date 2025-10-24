# Integration Examples

Practical code examples for integrating with the OKR AI Agent API across different programming languages and frameworks.

## JavaScript/Node.js Integration

### Basic API Client Setup

```javascript
// okr-api-client.js
class OKRApiClient {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.token = null;
  }

  async authenticate(email, password) {
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.statusText}`);
    }

    const data = await response.json();
    this.token = data.token;
    return data;
  }

  async makeRequest(endpoint, options = {}) {
    if (!this.token) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const defaultOptions = {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    };

    const response = await fetch(url, { ...defaultOptions, ...options });

    if (response.status === 401) {
      this.token = null;
      throw new Error('Token expired. Please re-authenticate.');
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API Error: ${error.error.message}`);
    }

    return await response.json();
  }

  // Conversations
  async createConversation(conversationData) {
    return await this.makeRequest('/api/conversations', {
      method: 'POST',
      body: JSON.stringify(conversationData)
    });
  }

  async getConversations(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return await this.makeRequest(`/api/conversations?${queryString}`);
  }

  async sendMessage(conversationId, content, metadata = {}) {
    return await this.makeRequest(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, metadata })
    });
  }

  async provideFeedback(conversationId, messageId, feedback) {
    return await this.makeRequest(`/api/conversations/${conversationId}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ message_id: messageId, ...feedback })
    });
  }
}

// Usage example
async function example() {
  const client = new OKRApiClient('https://yourdomain.com', 'your-api-key');

  try {
    // Authenticate
    await client.authenticate('user@example.com', 'password');

    // Create new conversation
    const conversation = await client.createConversation({
      industry: 'technology',
      role: 'product_manager',
      context: 'Building a new mobile app for customer engagement'
    });

    console.log('Conversation created:', conversation.conversation.id);

    // Send a message
    const response = await client.sendMessage(
      conversation.conversation.id,
      'I need help creating OKRs for increasing user engagement in our mobile app.'
    );

    console.log('AI Response:', response.ai_response.content);

    // Provide positive feedback
    await client.provideFeedback(
      conversation.conversation.id,
      response.ai_response.id,
      {
        rating: 'positive',
        feedback_type: 'quality',
        comment: 'Very helpful suggestions!'
      }
    );

  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

### React Hook for OKR Conversations

```javascript
// hooks/useOKRConversation.js
import { useState, useEffect, useCallback } from 'react';

export function useOKRConversation(apiClient) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createConversation = useCallback(async (conversationData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.createConversation(conversationData);
      setConversation(response.conversation);
      setMessages([response.initial_message]);
      return response.conversation;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  const sendMessage = useCallback(async (content) => {
    if (!conversation) {
      throw new Error('No active conversation');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.sendMessage(conversation.id, content);

      setMessages(prev => [
        ...prev,
        response.message,
        response.ai_response
      ]);

      return response.ai_response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [conversation, apiClient]);

  const provideFeedback = useCallback(async (messageId, feedback) => {
    if (!conversation) return;

    try {
      await apiClient.provideFeedback(conversation.id, messageId, feedback);
    } catch (err) {
      console.error('Feedback error:', err);
    }
  }, [conversation, apiClient]);

  return {
    conversation,
    messages,
    loading,
    error,
    createConversation,
    sendMessage,
    provideFeedback
  };
}

// Usage in React component
function OKRChat() {
  const [apiClient] = useState(() => new OKRApiClient('https://yourdomain.com'));
  const {
    conversation,
    messages,
    loading,
    error,
    createConversation,
    sendMessage,
    provideFeedback
  } = useOKRConversation(apiClient);

  const handleStartConversation = async () => {
    await createConversation({
      industry: 'technology',
      role: 'product_manager',
      context: 'Q4 planning for mobile app development'
    });
  };

  const handleSendMessage = async (content) => {
    await sendMessage(content);
  };

  return (
    <div className="okr-chat">
      {!conversation ? (
        <button onClick={handleStartConversation} disabled={loading}>
          Start OKR Conversation
        </button>
      ) : (
        <div className="chat-interface">
          <div className="messages">
            {messages.map(message => (
              <div key={message.id} className={`message ${message.type}`}>
                <p>{message.content}</p>
                {message.type === 'ai_response' && (
                  <div className="feedback-buttons">
                    <button
                      onClick={() => provideFeedback(message.id, { rating: 'positive' })}
                    >
                      👍
                    </button>
                    <button
                      onClick={() => provideFeedback(message.id, { rating: 'negative' })}
                    >
                      👎
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <MessageInput onSendMessage={handleSendMessage} disabled={loading} />
        </div>
      )}
      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

## Python Integration

### Python SDK Client

```python
# okr_client.py
import requests
import json
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import time

class OKRApiClient:
    def __init__(self, base_url: str, api_key: Optional[str] = None):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.token = None
        self.token_expires = None
        self.session = requests.Session()

    def authenticate(self, email: str, password: str) -> Dict:
        """Authenticate and obtain JWT token"""
        response = self.session.post(
            f"{self.base_url}/api/auth/login",
            json={"email": email, "password": password}
        )
        response.raise_for_status()

        data = response.json()
        self.token = data['token']
        # Assume token expires in 1 hour
        self.token_expires = datetime.now() + timedelta(hours=1)

        # Set default authorization header
        self.session.headers.update({
            'Authorization': f'Bearer {self.token}'
        })

        return data

    def _ensure_authenticated(self):
        """Ensure we have a valid token"""
        if not self.token or datetime.now() >= self.token_expires:
            raise Exception("Token expired or missing. Please authenticate.")

    def _make_request(self, method: str, endpoint: str, **kwargs) -> Dict:
        """Make authenticated API request with retry logic"""
        self._ensure_authenticated()

        url = f"{self.base_url}{endpoint}"

        # Retry logic for rate limiting
        max_retries = 3
        backoff_delay = 1

        for attempt in range(max_retries):
            response = self.session.request(method, url, **kwargs)

            if response.status_code == 429:  # Rate limited
                if attempt < max_retries - 1:
                    time.sleep(backoff_delay)
                    backoff_delay *= 2
                    continue
                else:
                    raise Exception("Rate limit exceeded after retries")

            if response.status_code == 401:  # Unauthorized
                self.token = None
                raise Exception("Authentication expired. Please re-authenticate.")

            response.raise_for_status()
            return response.json()

    # Conversation methods
    def create_conversation(self, conversation_data: Dict) -> Dict:
        """Create a new OKR conversation"""
        return self._make_request('POST', '/api/conversations', json=conversation_data)

    def get_conversations(self, limit: int = 20, offset: int = 0, **filters) -> Dict:
        """Get user's conversation history"""
        params = {'limit': limit, 'offset': offset, **filters}
        return self._make_request('GET', '/api/conversations', params=params)

    def get_conversation(self, conversation_id: str) -> Dict:
        """Get specific conversation details"""
        return self._make_request('GET', f'/api/conversations/{conversation_id}')

    def send_message(self, conversation_id: str, content: str, metadata: Optional[Dict] = None) -> Dict:
        """Send message to conversation"""
        payload = {'content': content}
        if metadata:
            payload['metadata'] = metadata

        return self._make_request(
            'POST',
            f'/api/conversations/{conversation_id}/messages',
            json=payload
        )

    def provide_feedback(self, conversation_id: str, message_id: str,
                        rating: str, feedback_type: str = 'quality',
                        comment: Optional[str] = None) -> Dict:
        """Provide feedback on AI response"""
        payload = {
            'message_id': message_id,
            'rating': rating,
            'feedback_type': feedback_type
        }
        if comment:
            payload['comment'] = comment

        return self._make_request(
            'POST',
            f'/api/conversations/{conversation_id}/feedback',
            json=payload
        )

    # Templates methods
    def get_templates(self, industry: Optional[str] = None, role: Optional[str] = None) -> Dict:
        """Get OKR templates"""
        params = {}
        if industry:
            params['industry'] = industry
        if role:
            params['role'] = role

        return self._make_request('GET', '/api/templates', params=params)

    # Analytics methods
    def get_dashboard_analytics(self) -> Dict:
        """Get user dashboard analytics"""
        return self._make_request('GET', '/api/analytics/dashboard')

    def get_quality_trends(self, period: str = 'month') -> Dict:
        """Get quality score trends"""
        return self._make_request('GET', '/api/analytics/quality-trends',
                                 params={'period': period})

# Usage example
def example_usage():
    client = OKRApiClient('https://yourdomain.com')

    try:
        # Authenticate
        auth_result = client.authenticate('user@example.com', 'password')
        print(f"Authenticated as: {auth_result['user']['name']}")

        # Create conversation
        conversation_data = {
            'industry': 'technology',
            'role': 'engineering_manager',
            'context': 'Planning Q1 engineering goals for our team of 15 engineers'
        }

        conversation = client.create_conversation(conversation_data)
        conv_id = conversation['conversation']['id']
        print(f"Created conversation: {conv_id}")

        # Send message
        response = client.send_message(
            conv_id,
            "We want to improve our deployment frequency and reduce bugs in production."
        )
        print(f"AI Response: {response['ai_response']['content'][:100]}...")

        # Provide feedback
        client.provide_feedback(
            conv_id,
            response['ai_response']['id'],
            'positive',
            'quality',
            'Great engineering-focused suggestions!'
        )
        print("Feedback provided successfully")

        # Get analytics
        analytics = client.get_dashboard_analytics()
        print(f"Quality score: {analytics['dashboard']['user_stats']['average_quality_score']}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    example_usage()
```

### Django Integration Example

```python
# django_okr_integration.py
from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
from .okr_client import OKRApiClient

class OKRService:
    def __init__(self):
        self.client = OKRApiClient(settings.OKR_API_BASE_URL)

    def get_authenticated_client(self, user):
        """Get authenticated client for user"""
        # Assume user has stored OKR API credentials
        client = OKRApiClient(settings.OKR_API_BASE_URL)

        # Use stored token or authenticate
        if hasattr(user, 'okr_token') and user.okr_token:
            client.token = user.okr_token
            client.session.headers.update({
                'Authorization': f'Bearer {client.token}'
            })
        else:
            # Handle authentication with stored credentials
            # This is simplified - implement proper credential management
            pass

        return client

# Views
@login_required
@require_http_methods(["POST"])
@csrf_exempt
def create_okr_conversation(request):
    """Create new OKR conversation"""
    try:
        data = json.loads(request.body)

        service = OKRService()
        client = service.get_authenticated_client(request.user)

        conversation = client.create_conversation({
            'industry': data.get('industry'),
            'role': data.get('role'),
            'context': data.get('context')
        })

        # Store conversation ID for user
        # UserOKRConversation.objects.create(
        #     user=request.user,
        #     conversation_id=conversation['conversation']['id'],
        #     title=conversation['conversation']['title']
        # )

        return JsonResponse(conversation)

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@login_required
@require_http_methods(["POST"])
@csrf_exempt
def send_okr_message(request, conversation_id):
    """Send message to OKR conversation"""
    try:
        data = json.loads(request.body)

        service = OKRService()
        client = service.get_authenticated_client(request.user)

        response = client.send_message(
            conversation_id,
            data.get('content'),
            data.get('metadata', {})
        )

        return JsonResponse(response)

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@login_required
def get_okr_analytics(request):
    """Get user's OKR analytics"""
    try:
        service = OKRService()
        client = service.get_authenticated_client(request.user)

        analytics = client.get_dashboard_analytics()
        return JsonResponse(analytics)

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)
```

## PHP Integration

### PHP SDK Client

```php
<?php
// OKRApiClient.php
class OKRApiClient {
    private $baseUrl;
    private $token;
    private $httpClient;

    public function __construct($baseUrl, $apiKey = null) {
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->httpClient = new \GuzzleHttp\Client([
            'timeout' => 30,
            'headers' => [
                'Content-Type' => 'application/json'
            ]
        ]);
    }

    public function authenticate($email, $password) {
        $response = $this->httpClient->post($this->baseUrl . '/api/auth/login', [
            'json' => [
                'email' => $email,
                'password' => $password
            ]
        ]);

        $data = json_decode($response->getBody(), true);
        $this->token = $data['token'];

        return $data;
    }

    private function makeRequest($method, $endpoint, $options = []) {
        if (!$this->token) {
            throw new Exception('Not authenticated');
        }

        $defaultOptions = [
            'headers' => [
                'Authorization' => 'Bearer ' . $this->token,
                'Content-Type' => 'application/json'
            ]
        ];

        $options = array_merge_recursive($defaultOptions, $options);

        $response = $this->httpClient->request($method, $this->baseUrl . $endpoint, $options);

        return json_decode($response->getBody(), true);
    }

    public function createConversation($conversationData) {
        return $this->makeRequest('POST', '/api/conversations', [
            'json' => $conversationData
        ]);
    }

    public function getConversations($params = []) {
        $queryString = http_build_query($params);
        return $this->makeRequest('GET', '/api/conversations?' . $queryString);
    }

    public function sendMessage($conversationId, $content, $metadata = []) {
        return $this->makeRequest('POST', "/api/conversations/$conversationId/messages", [
            'json' => [
                'content' => $content,
                'metadata' => $metadata
            ]
        ]);
    }

    public function provideFeedback($conversationId, $messageId, $feedback) {
        return $this->makeRequest('POST', "/api/conversations/$conversationId/feedback", [
            'json' => array_merge(['message_id' => $messageId], $feedback)
        ]);
    }
}

// Usage example
try {
    $client = new OKRApiClient('https://yourdomain.com');

    // Authenticate
    $authResult = $client->authenticate('user@example.com', 'password');
    echo "Authenticated as: " . $authResult['user']['name'] . "\n";

    // Create conversation
    $conversation = $client->createConversation([
        'industry' => 'technology',
        'role' => 'product_manager',
        'context' => 'Planning product roadmap for Q2'
    ]);

    $conversationId = $conversation['conversation']['id'];
    echo "Created conversation: $conversationId\n";

    // Send message
    $response = $client->sendMessage(
        $conversationId,
        'Help me create OKRs for improving user retention in our SaaS product.'
    );

    echo "AI Response: " . substr($response['ai_response']['content'], 0, 100) . "...\n";

    // Provide feedback
    $client->provideFeedback(
        $conversationId,
        $response['ai_response']['id'],
        [
            'rating' => 'positive',
            'feedback_type' => 'quality',
            'comment' => 'Very relevant suggestions for our product!'
        ]
    );

    echo "Feedback provided successfully\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
```

## Ruby Integration

### Ruby SDK Client

```ruby
# okr_api_client.rb
require 'net/http'
require 'json'
require 'uri'

class OKRApiClient
  attr_accessor :base_url, :token

  def initialize(base_url, api_key = nil)
    @base_url = base_url.chomp('/')
    @api_key = api_key
    @token = nil
  end

  def authenticate(email, password)
    uri = URI("#{@base_url}/api/auth/login")

    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = uri.scheme == 'https'

    request = Net::HTTP::Post.new(uri)
    request['Content-Type'] = 'application/json'
    request.body = { email: email, password: password }.to_json

    response = http.request(request)
    raise "Authentication failed: #{response.message}" unless response.code == '200'

    data = JSON.parse(response.body)
    @token = data['token']
    data
  end

  private

  def make_request(method, endpoint, body = nil, params = {})
    raise 'Not authenticated' unless @token

    uri = URI("#{@base_url}#{endpoint}")
    uri.query = URI.encode_www_form(params) unless params.empty?

    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = uri.scheme == 'https'

    request = case method
              when :get then Net::HTTP::Get.new(uri)
              when :post then Net::HTTP::Post.new(uri)
              when :put then Net::HTTP::Put.new(uri)
              when :delete then Net::HTTP::Delete.new(uri)
              end

    request['Authorization'] = "Bearer #{@token}"
    request['Content-Type'] = 'application/json'
    request.body = body.to_json if body

    response = http.request(request)

    case response.code
    when '401'
      @token = nil
      raise 'Token expired. Please re-authenticate.'
    when '429'
      raise 'Rate limit exceeded'
    end

    raise "API Error: #{response.message}" unless response.code.start_with?('2')

    JSON.parse(response.body)
  end

  public

  def create_conversation(conversation_data)
    make_request(:post, '/api/conversations', conversation_data)
  end

  def get_conversations(params = {})
    make_request(:get, '/api/conversations', nil, params)
  end

  def send_message(conversation_id, content, metadata = {})
    payload = { content: content }
    payload[:metadata] = metadata unless metadata.empty?

    make_request(:post, "/api/conversations/#{conversation_id}/messages", payload)
  end

  def provide_feedback(conversation_id, message_id, feedback)
    payload = feedback.merge(message_id: message_id)
    make_request(:post, "/api/conversations/#{conversation_id}/feedback", payload)
  end

  def get_templates(filters = {})
    make_request(:get, '/api/templates', nil, filters)
  end

  def get_dashboard_analytics
    make_request(:get, '/api/analytics/dashboard')
  end
end

# Usage example
begin
  client = OKRApiClient.new('https://yourdomain.com')

  # Authenticate
  auth_result = client.authenticate('user@example.com', 'password')
  puts "Authenticated as: #{auth_result['user']['name']}"

  # Create conversation
  conversation = client.create_conversation({
    industry: 'technology',
    role: 'engineering_manager',
    context: 'Planning sprint goals for our development team'
  })

  conversation_id = conversation['conversation']['id']
  puts "Created conversation: #{conversation_id}"

  # Send message
  response = client.send_message(
    conversation_id,
    'We need to improve our code quality and reduce technical debt.'
  )

  puts "AI Response: #{response['ai_response']['content'][0..100]}..."

  # Provide feedback
  client.provide_feedback(
    conversation_id,
    response['ai_response']['id'],
    {
      rating: 'positive',
      feedback_type: 'quality',
      comment: 'Great technical recommendations!'
    }
  )

  puts "Feedback provided successfully"

rescue => e
  puts "Error: #{e.message}"
end
```

## Webhook Integration

### Handling Webhooks

```javascript
// webhook-handler.js
const express = require('express');
const crypto = require('crypto');
const app = express();

// Webhook signature verification
function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload, 'utf8');
  const computedSignature = hmac.digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(computedSignature, 'hex')
  );
}

// Webhook endpoint
app.post('/webhooks/okr-events', express.raw({ type: 'application/json' }), (req, res) => {
  const payload = req.body;
  const signature = req.headers['x-okr-signature'];
  const webhookSecret = process.env.OKR_WEBHOOK_SECRET;

  // Verify signature
  if (!verifyWebhookSignature(payload, signature, webhookSecret)) {
    return res.status(401).send('Invalid signature');
  }

  const event = JSON.parse(payload);

  // Handle different event types
  switch (event.type) {
    case 'conversation.completed':
      handleConversationCompleted(event.data);
      break;
    case 'feedback.received':
      handleFeedbackReceived(event.data);
      break;
    case 'quality_score.updated':
      handleQualityScoreUpdated(event.data);
      break;
    default:
      console.log('Unknown event type:', event.type);
  }

  res.status(200).send('OK');
});

function handleConversationCompleted(data) {
  console.log('Conversation completed:', data.conversation_id);
  // Update internal systems, send notifications, etc.
}

function handleFeedbackReceived(data) {
  console.log('Feedback received:', data.rating);
  // Analytics tracking, quality monitoring, etc.
}

function handleQualityScoreUpdated(data) {
  console.log('Quality score updated:', data.new_score);
  // Performance tracking, user progress updates, etc.
}

app.listen(3000, () => {
  console.log('Webhook server listening on port 3000');
});
```

## Error Handling Best Practices

### Robust Error Handling

```javascript
class OKRApiError extends Error {
  constructor(message, statusCode, errorCode, details) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.name = 'OKRApiError';
  }
}

class OKRApiClient {
  async makeRequest(endpoint, options = {}) {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          ...options,
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
            ...options.headers
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          // Handle specific error types
          switch (response.status) {
            case 401:
              this.token = null;
              throw new OKRApiError(
                'Authentication required',
                401,
                'AUTHENTICATION_REQUIRED',
                errorData
              );
            case 429:
              // Exponential backoff for rate limiting
              if (attempt < maxRetries - 1) {
                const delay = Math.pow(2, attempt) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                attempt++;
                continue;
              }
              throw new OKRApiError(
                'Rate limit exceeded',
                429,
                'RATE_LIMIT_EXCEEDED',
                errorData
              );
            case 400:
              throw new OKRApiError(
                errorData.error?.message || 'Bad request',
                400,
                errorData.error?.code || 'BAD_REQUEST',
                errorData.error?.details
              );
            default:
              throw new OKRApiError(
                errorData.error?.message || 'API request failed',
                response.status,
                errorData.error?.code || 'API_ERROR',
                errorData
              );
          }
        }

        return await response.json();

      } catch (error) {
        if (error instanceof OKRApiError) {
          throw error;
        }

        // Network or other errors
        if (attempt < maxRetries - 1) {
          attempt++;
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        throw new OKRApiError(
          'Network request failed',
          0,
          'NETWORK_ERROR',
          { originalError: error.message }
        );
      }
    }
  }
}
```

---

## Best Practices Summary

### Authentication
- Always store tokens securely
- Implement token refresh logic
- Handle authentication failures gracefully
- Use HTTPS for all requests

### Rate Limiting
- Implement exponential backoff
- Respect rate limit headers
- Cache responses when appropriate
- Monitor usage patterns

### Error Handling
- Categorize error types
- Implement retry logic for transient failures
- Provide meaningful error messages
- Log errors for debugging

### Performance
- Use connection pooling
- Implement request timeouts
- Cache frequently accessed data
- Monitor response times

### Security
- Validate webhook signatures
- Sanitize input data
- Use environment variables for secrets
- Implement proper CORS policies

Ready to integrate? Choose your preferred language and start building with the OKR AI Agent API!