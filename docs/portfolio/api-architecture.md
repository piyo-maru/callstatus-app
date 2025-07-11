# API Architecture Documentation - Enterprise Schedule Management System

## System Overview

### Project Scale
- **Target Scale**: Enterprise-level implementation (300+ users)
- **Technology Stack**: NestJS + TypeScript + PostgreSQL + WebSocket
- **Authentication**: JWT-based authentication system
- **API Endpoints**: ~80 RESTful endpoints
- **Real-time Communication**: Socket.IO WebSocket implementation

### Architectural Principles
- **Layered Data Architecture**: Two-tier data management system
- **Real-time Synchronization**: WebSocket-based live updates
- **Enterprise Security**: Role-based access control (RBAC)
- **Scalability Focus**: Designed for horizontal scaling

## API Design Patterns

### 1. RESTful API Structure

#### Resource-Based Endpoints
```yaml
/api/schedules          # Schedule management
/api/staff              # Personnel management
/api/contracts          # Work contract management
/api/adjustments        # Schedule adjustments
/api/responsibilities   # Task assignments
```

#### HTTP Method Conventions
- **GET**: Data retrieval with query parameters
- **POST**: Resource creation with validation
- **PATCH**: Partial updates with optimistic locking
- **DELETE**: Soft deletion with cascade handling

### 2. Unified Data API

#### Two-Layer Data Integration
```typescript
GET /api/schedules/unified?date=YYYY-MM-DD&staffIds=1,2,3

Response Structure:
{
  "date": "2025-07-09",
  "schedules": [{
    "staffId": 1,
    "layers": {
      "contract": { /* Base contract data */ },
      "adjustment": { /* Individual adjustments */ }
    },
    "effectiveSchedule": { /* Computed final schedule */ }
  }]
}
```

### 3. WebSocket Event Architecture

#### Real-time Event System
```typescript
Events:
- schedule:new        # New schedule creation
- schedule:updated    # Schedule modification
- schedule:deleted    # Schedule removal
- staff:updated       # Personnel information update
- real-time-update    # Generic update notification
```

#### Event Data Structure
```typescript
interface ScheduleEvent {
  id: number;
  staffId: number;
  date: string;
  status: string;
  start: string;
  end: string;
  metadata?: Record<string, any>;
}
```

## Data Model Architecture

### Core Entity Relationships
```
Staff (1) ←─── Central ───→ (N) Schedule
   │                          │
   ├─ (1) ────────────→ (N) Contract
   ├─ (1) ────────────→ (N) Adjustment
   └─ (1) ────────────→ (0..1) Authentication
```

### Time Handling Strategy
- **Internal Processing**: UTC exclusively
- **API Layer**: ISO-8601 with timezone (Z suffix)
- **Display Layer**: Locale-specific conversion
- **Precision**: Minute-level accuracy

## Security Architecture

### Authentication Flow
```yaml
1. Login Request → JWT Token Generation
2. Token Validation → Request Authorization
3. Role-Based Access → Resource Filtering
4. Audit Logging → Complete Traceability
```

### Permission Levels
- **ADMIN**: Full system access
- **MANAGER**: Department-level management
- **STAFF**: Personal data access only
- **VIEWER**: Read-only access

## Performance Optimization

### API Response Caching
```typescript
// Implemented caching strategies
- Contract display cache (monthly)
- Historical data snapshots (daily)
- Query result caching (5-minute TTL)
```

### Database Optimization
```sql
-- Composite indexes for common queries
CREATE INDEX idx_schedule_date_staff ON schedules(date, staffId);
CREATE INDEX idx_adjustment_pending ON adjustments(isPending, date);
CREATE INDEX idx_historical_batch ON historical_schedules(batchId);
```

### WebSocket Optimization Considerations
- **Current Implementation**: Full broadcast to all clients
- **Scalability Limit**: Estimated 50-100 concurrent connections
- **Future Enhancement**: Redis-based pub/sub for horizontal scaling

## Error Handling Standards

### Standardized Error Response
```json
{
  "statusCode": 400,
  "message": "Detailed error description",
  "error": "Bad Request",
  "timestamp": "2025-07-09T12:00:00.000Z",
  "path": "/api/schedules",
  "requestId": "uuid-v4"
}
```

### HTTP Status Code Usage
- **2xx**: Successful operations
- **400**: Validation errors
- **401**: Authentication required
- **403**: Insufficient permissions
- **409**: Conflict (optimistic locking)
- **500**: Server errors with tracking

## API Versioning Strategy

### Version Management
- **Current Version**: v1 (implicit in URLs)
- **Future Compatibility**: Header-based versioning planned
- **Deprecation Policy**: 6-month notice period

## Development Best Practices

### Type Safety
```typescript
// Strict TypeScript configuration
- No 'any' types allowed
- Explicit return types required
- Null safety enforcement
```

### API Documentation
- **OpenAPI/Swagger**: Auto-generated from decorators
- **Request/Response Examples**: Included in all endpoints
- **Change Log**: Maintained for all breaking changes

### Testing Strategy
- **Unit Tests**: Service layer coverage >80%
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Critical user flows
- **Load Tests**: Performance benchmarking

## Monitoring and Observability

### Metrics Collection
```yaml
API Metrics:
  - Response time (p50, p95, p99)
  - Request rate by endpoint
  - Error rate by status code
  - Active WebSocket connections

Resource Metrics:
  - CPU utilization
  - Memory usage
  - Database connection pool
  - Network I/O
```

### Logging Standards
- **Structured Logging**: JSON format
- **Log Levels**: ERROR, WARN, INFO, DEBUG
- **Correlation IDs**: Request tracking
- **Retention**: 30-day rolling window

## Future Enhancements

### Planned Improvements
1. **GraphQL Gateway**: For flexible data fetching
2. **Event Sourcing**: Complete audit trail
3. **Microservices Migration**: Service decomposition
4. **API Gateway**: Centralized routing and auth

### Technical Debt Acknowledgment
- WebSocket authentication enhancement needed
- Horizontal scaling preparation required
- Performance testing completion pending

---

**Documentation Version**: 1.0.0  
**Architecture Pattern**: RESTful + WebSocket Hybrid  
**Design Philosophy**: Enterprise-grade, scalable, maintainable