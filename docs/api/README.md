# Fitness Tracking API Documentation

## Overview

Complete RESTful API architecture for fitness tracking with support for web applications, Wear OS, Health Connect integration, and future mobile apps.

## Documentation Structure

### 1. [Fitness API Design](./fitness-api-design.md)
**Comprehensive API architecture document**

- Design principles and philosophy
- Authentication & authorization strategies
- Core resource models (Exercises, Workouts, Routines, Sets)
- Complete endpoint specifications
- Real-time tracking with WebSocket/SSE
- Batch operations for wearable sync
- Error handling patterns
- Rate limiting and caching strategies
- Pagination and filtering
- Versioning strategy
- Performance optimization
- Security considerations

**Key Features:**
- OAuth 2.0 authentication for mobile apps
- Idempotent operations for safe retries
- Batch endpoints for offline-first wearables
- Real-time workout updates via WebSocket
- Cross-platform data format compatibility

### 2. [OpenAPI Specification](./openapi-fitness.yaml)
**Machine-readable API specification (OpenAPI 3.1)**

- Complete API contract
- Request/response schemas
- Authentication methods
- All endpoints with parameters
- Error response formats
- Example payloads

**Use Cases:**
- Generate API documentation (Swagger UI, Redoc)
- Generate client SDKs
- API testing with tools like Postman
- Contract testing
- Mock server generation

**View Documentation:**
```bash
# Using Docker
docker run -p 8080:8080 -v $(pwd)/docs/api:/api swaggerapi/swagger-ui

# Or deploy to Swagger Hub, Redoc, etc.
```

### 3. [Implementation Guide](./implementation-guide.md)
**Practical implementation details**

- Complete database schema with migrations
- Next.js API route examples
- Authentication helpers
- Rate limiting implementation
- WebSocket server setup
- Client SDK examples (TypeScript, Kotlin)
- React hooks for real-time updates
- Testing strategies
- Deployment considerations
- Migration from server actions

**Includes:**
- Full SQL migration script
- Working Next.js API route example
- Authentication middleware
- Rate limiting with PostgreSQL
- WebSocket implementation
- Client SDK code
- Integration tests

### 4. [Quick Reference](./quick-reference.md)
**Developer quick start guide**

- Base URLs and authentication
- Common request examples (curl)
- Response format examples
- WebSocket connection examples
- Error response formats
- Query parameters reference
- SDK usage examples
- Rate limits and best practices

**Perfect For:**
- Quick API lookups
- Copy-paste examples
- Learning API patterns
- Testing endpoints with curl

### 5. [Health Connect Integration](./health-connect-integration.md)
**Health Connect integration guide**

- Data type mappings
- Integration architecture
- Sync flows (bidirectional)
- Webhook configuration
- Conflict resolution strategies
- Permissions and security
- Background sync implementation
- Batch sync patterns
- Testing and troubleshooting

**Covers:**
- Android Health Connect API
- Wear OS integration
- Webhook setup and security
- Data converters
- Offline sync strategies

## Quick Start

### 1. Authentication

Get an access token:

```bash
curl -X POST https://api.fulltracker.app/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "AUTH_CODE",
    "client_id": "your_client_id",
    "client_secret": "your_client_secret"
  }'
```

### 2. Start a Workout

```bash
curl -X POST https://api.fulltracker.app/v1/workouts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Chest Day",
    "started_at": "2025-11-14T10:00:00Z",
    "status": "in_progress"
  }'
```

### 3. Complete a Set

```bash
curl -X PATCH https://api.fulltracker.app/v1/workouts/WORKOUT_ID/exercises/EXERCISE_ID/sets/SET_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "actual_reps": 8,
    "actual_weight": 80,
    "rpe": 7,
    "completed": true
  }'
```

### 4. WebSocket Connection

```javascript
const ws = new WebSocket('wss://api.fulltracker.app/v1/workouts/WORKOUT_ID/live');
ws.send(JSON.stringify({ type: 'auth', token: 'YOUR_TOKEN' }));
ws.onmessage = (event) => console.log(JSON.parse(event.data));
```

## Core Resources

### Exercises
- **GET** `/api/v1/exercises` - List exercises
- **POST** `/api/v1/exercises` - Create custom exercise
- **GET** `/api/v1/exercises/{id}` - Get exercise details
- **PATCH** `/api/v1/exercises/{id}` - Update exercise
- **DELETE** `/api/v1/exercises/{id}` - Delete exercise

### Workouts
- **GET** `/api/v1/workouts` - List workouts
- **POST** `/api/v1/workouts` - Create workout
- **GET** `/api/v1/workouts/{id}` - Get workout
- **PATCH** `/api/v1/workouts/{id}` - Update workout
- **DELETE** `/api/v1/workouts/{id}` - Delete workout
- **POST** `/api/v1/workouts/batch` - Batch create workouts

### Routines
- **GET** `/api/v1/routines` - List routines
- **POST** `/api/v1/routines` - Create routine
- **GET** `/api/v1/routines/{id}` - Get routine
- **PATCH** `/api/v1/routines/{id}` - Update routine
- **DELETE** `/api/v1/routines/{id}` - Delete routine
- **POST** `/api/v1/routines/{id}/start` - Start workout from routine

### Health Metrics
- **GET** `/api/v1/health/metrics` - List metrics
- **POST** `/api/v1/health/metrics` - Create metric
- **POST** `/api/v1/health/metrics/batch` - Batch create metrics

### Body Measurements
- **GET** `/api/v1/measurements` - List measurements
- **POST** `/api/v1/measurements` - Create measurement

### Sync
- **POST** `/api/v1/sync/workouts` - Bidirectional workout sync
- **GET** `/api/v1/sync/changes` - Get delta changes

## Data Models

### Workout
```typescript
interface Workout {
  id: string;
  user_id: string;
  title: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  started_at: string;
  completed_at?: string;
  exercises: WorkoutExercise[];
  metrics: {
    total_volume: number;
    total_reps: number;
    total_sets: number;
    calories_burned?: number;
  };
}
```

### Exercise
```typescript
interface Exercise {
  id: string;
  name: string;
  category: 'strength' | 'cardio' | 'flexibility' | ...;
  muscle_groups: string[];
  equipment: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  instructions: string[];
}
```

### Set
```typescript
interface Set {
  id: string;
  set_number: number;
  set_type: 'normal' | 'warmup' | 'drop_set' | ...;
  target_reps?: number;
  actual_reps?: number;
  target_weight?: number;
  actual_weight?: number;
  rpe?: number; // 1-10
  completed: boolean;
}
```

## Key Features

### 1. Batch Operations
Efficiently sync multiple workouts from wearables:

```bash
POST /api/v1/workouts/batch
Content-Type: application/json
Idempotency-Key: batch-sync-123

{
  "workouts": [
    { "client_id": "local_1", ... },
    { "client_id": "local_2", ... }
  ]
}
```

### 2. Real-time Updates
WebSocket for live workout tracking:

```javascript
ws.send(JSON.stringify({
  type: 'set.completed',
  payload: { set_id: 'set-123', actual_reps: 8 }
}));

ws.onmessage = (e) => {
  const data = JSON.parse(e.data);
  if (data.type === 'workout.stats') {
    updateUI(data.payload);
  }
};
```

### 3. Idempotency
Safe retry logic for network failures:

```bash
Idempotency-Key: unique-operation-123
```

Same request with same key = same result (no duplicates)

### 4. Health Connect Integration
Seamless sync with Android Health Connect:

- Automatic workout sync
- Heart rate streaming
- Body measurements sync
- Steps and activity tracking
- Webhook notifications

## Authentication Methods

### 1. OAuth 2.0 (Recommended for Apps)
```bash
# Get token
POST /api/v1/auth/token
{
  "grant_type": "authorization_code",
  "code": "AUTH_CODE"
}

# Use token
Authorization: Bearer eyJhbGc...
```

### 2. API Keys (Server-to-Server)
```bash
Authorization: Bearer sk_live_abc123
X-API-Key: sk_live_abc123
```

### 3. Session (Web App)
HttpOnly cookies with CSRF protection

## Rate Limits

| Tier | Requests/Hour | Batch/Hour | WebSocket |
|------|---------------|------------|-----------|
| Standard | 1,000 | 50 | 50 |
| Premium | 5,000 | 200 | 200 |

**Headers:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1699977600
```

## Error Handling

### Error Response Format
```json
{
  "error": {
    "code": "VAL_REQUIRED_FIELD",
    "message": "Validation failed",
    "field_errors": [
      {
        "field": "title",
        "code": "required",
        "message": "title is required"
      }
    ],
    "documentation_url": "https://docs.fulltracker.app/errors/VAL_REQUIRED_FIELD"
  },
  "meta": {
    "api_version": "1.0",
    "request_id": "req_abc123"
  }
}
```

### HTTP Status Codes
- `200` OK - Successful GET, PATCH
- `201` Created - Successful POST
- `204` No Content - Successful DELETE
- `207` Multi-Status - Batch with mixed results
- `400` Bad Request - Invalid request
- `401` Unauthorized - Missing/invalid auth
- `403` Forbidden - Insufficient permissions
- `404` Not Found - Resource not found
- `422` Validation Error - Invalid data
- `429` Rate Limited - Too many requests
- `500` Server Error - Internal error

## Client SDKs

### TypeScript/JavaScript
```typescript
import { FitnessAPIClient } from '@fulltracker/api-client';

const api = new FitnessAPIClient({
  apiKey: 'your_key',
  baseUrl: 'https://api.fulltracker.app/v1'
});

const workout = await api.workouts.create({
  title: 'Push Day',
  started_at: new Date().toISOString()
});
```

### Kotlin (Wear OS)
```kotlin
val api = FitnessAPIClient(
    apiKey = "your_key",
    baseUrl = "https://api.fulltracker.app/v1"
)

lifecycleScope.launch {
    val workout = api.workouts.create(
        WorkoutCreate(title = "Push Day")
    )
}
```

### React Hook
```typescript
const { stats, completeSet } = useLiveWorkout(workoutId);
```

## Implementation Phases

### Phase 1: Core API (Weeks 1-2)
- [ ] Database schema migration
- [ ] Exercise endpoints
- [ ] Workout endpoints
- [ ] Authentication setup
- [ ] Rate limiting

### Phase 2: Real-time Features (Week 3)
- [ ] WebSocket server
- [ ] Live workout tracking
- [ ] Set completion streaming
- [ ] Heart rate integration

### Phase 3: Batch Operations (Week 4)
- [ ] Batch workout creation
- [ ] Sync endpoints
- [ ] Conflict resolution
- [ ] Delta sync

### Phase 4: Health Connect (Weeks 5-6)
- [ ] Webhook system
- [ ] Health Connect integration
- [ ] Data converters
- [ ] Background sync

### Phase 5: Client SDKs (Weeks 7-8)
- [ ] TypeScript/JavaScript SDK
- [ ] Kotlin SDK (Wear OS)
- [ ] iOS SDK (Swift)
- [ ] Documentation

### Phase 6: Wear OS App (Weeks 9-12)
- [ ] Wear OS UI
- [ ] Offline support
- [ ] Health Connect sync
- [ ] Testing & deployment

## Development Setup

### 1. Database Migration
```bash
psql $DATABASE_URL < docs/api/implementation-guide.md
# (Extract SQL from implementation guide)
```

### 2. Environment Variables
```bash
DATABASE_URL=postgresql://...
JWT_SECRET=your_secret
API_RATE_LIMIT_ENABLED=true
WEBSOCKET_ENABLED=true
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Test API
```bash
# Run tests
npm test

# Test endpoint
curl http://localhost:3000/api/v1/exercises
```

## Testing

### Integration Tests
```typescript
describe('Workout API', () => {
  it('should create workout', async () => {
    const response = await api.workouts.create({
      title: 'Test Workout'
    });
    expect(response.data.id).toBeDefined();
  });
});
```

### Load Testing
```bash
# Artillery, k6, or similar
artillery run load-test.yml
```

## Monitoring

### Metrics to Track
- API response time (p50, p95, p99)
- Error rate by endpoint
- Rate limit hits
- WebSocket connection duration
- Database query performance

### Logging
```typescript
{
  "timestamp": "2025-11-14T10:30:00Z",
  "level": "info",
  "request_id": "req_abc123",
  "method": "POST",
  "path": "/api/v1/workouts",
  "status": 201,
  "duration_ms": 45
}
```

## Security

1. **Authentication**: OAuth 2.0, API keys, sessions
2. **Authorization**: Scope-based permissions
3. **Input Validation**: Zod schemas, sanitization
4. **SQL Injection**: Parameterized queries
5. **Rate Limiting**: Per-user, per-endpoint
6. **CORS**: Whitelist allowed origins
7. **HTTPS**: TLS 1.3, secure headers
8. **Audit Logging**: Track sensitive operations

## Support & Resources

- **API Documentation**: https://docs.fulltracker.app
- **API Status**: https://status.fulltracker.app
- **OpenAPI Spec**: `./openapi-fitness.yaml`
- **GitHub**: https://github.com/fulltracker/api
- **Support Email**: api@fulltracker.app
- **Community**: https://community.fulltracker.app

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-14 | Initial API design |

## Contributing

See `CONTRIBUTING.md` for guidelines on:
- API design principles
- Code style
- Testing requirements
- Documentation standards
- Pull request process

## License

MIT License - See `LICENSE` file

---

**Next Steps:**
1. Review API design document
2. Run database migrations
3. Implement core endpoints
4. Set up authentication
5. Deploy and test
6. Build client SDKs
7. Integrate with Wear OS

**Questions?** Contact api@fulltracker.app
