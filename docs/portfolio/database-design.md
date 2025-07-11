# Database Design Documentation - Enterprise Schedule Management System

## Overview

### Database Architecture
- **Database System**: PostgreSQL 15+
- **ORM**: Prisma with TypeScript
- **Tables**: 27 normalized tables
- **Design Principles**: Two-layer data architecture, UTC time handling, comprehensive audit trails

### Core Design Philosophy
- **Business Continuity**: Reliability-first approach for enterprise operations
- **Scalability**: Designed for 300+ concurrent users
- **Audit Compliance**: Complete operation traceability
- **Time Precision**: Minute-level accuracy with timezone awareness

## Core Schema Design

### 1. Two-Layer Schedule Architecture

#### Layer 1: Contract (Base Work Schedules)
```sql
CREATE TABLE "Contract" (
    "id"             SERIAL PRIMARY KEY,
    "employeeId"     TEXT NOT NULL UNIQUE,
    "staffId"        INTEGER NOT NULL,
    
    -- Weekly work hours (format: "09:00-18:00")
    "mondayHours"    TEXT,
    "tuesdayHours"   TEXT,
    "wednesdayHours" TEXT,
    "thursdayHours"  TEXT,
    "fridayHours"    TEXT,
    "saturdayHours"  TEXT,
    "sundayHours"    TEXT,
    
    -- UTC timestamp columns
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    
    FOREIGN KEY ("staffId") REFERENCES "Staff"("id")
);
```

**Design Features**:
- Day-specific work hour configuration
- Holiday handling through business logic
- Employee ID uniqueness constraint

#### Layer 2: Adjustment (Individual Schedule Modifications)
```sql
CREATE TABLE "Adjustment" (
    "id"              SERIAL PRIMARY KEY,
    "staffId"         INTEGER NOT NULL,
    "date"            TIMESTAMP(3) NOT NULL,
    "status"          TEXT NOT NULL,
    "startTime"       TIMESTAMP(3) NOT NULL,
    "endTime"         TIMESTAMP(3) NOT NULL,
    "memo"            TEXT,
    
    -- Approval workflow
    "isPending"       BOOLEAN NOT NULL DEFAULT false,
    "approvedAt"      TIMESTAMP(3),
    "approvedBy"      INTEGER,
    "rejectedAt"      TIMESTAMP(3),
    "rejectedBy"      INTEGER,
    
    -- Audit fields
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,
    
    FOREIGN KEY ("staffId") REFERENCES "Staff"("id"),
    FOREIGN KEY ("approvedBy") REFERENCES "Staff"("id"),
    FOREIGN KEY ("rejectedBy") REFERENCES "Staff"("id")
);
```

**Design Features**:
- Approval workflow integration
- Complete audit trail
- Flexible status management

### 2. Personnel Management

#### Staff (Core Personnel Table)
```sql
CREATE TABLE "Staff" (
    "id"                    SERIAL PRIMARY KEY,
    "name"                  TEXT NOT NULL,
    "department"            TEXT NOT NULL,
    "division"              TEXT NOT NULL,
    "employeeId"            TEXT UNIQUE,
    "isActive"              BOOLEAN NOT NULL DEFAULT true,
    "deletedAt"             TIMESTAMP(3),
    "position"              TEXT,
    "employmentType"        TEXT NOT NULL,
    
    -- Manager privileges
    "isManager"             BOOLEAN NOT NULL DEFAULT false,
    "managerPermissions"    TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- System fields
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL
);
```

**Design Features**:
- Soft deletion support
- Flexible organizational structure
- Role-based permissions
- Employment type tracking

### 3. Authentication & Security

#### User Authentication
```sql
CREATE TABLE "UserAuth" (
    "id"                    TEXT PRIMARY KEY,
    "email"                 TEXT NOT NULL UNIQUE,
    "passwordHash"          TEXT,
    "userType"              TEXT NOT NULL,
    "isActive"              BOOLEAN NOT NULL DEFAULT true,
    "staffId"               INTEGER UNIQUE,
    
    -- Security features
    "emailVerified"         TIMESTAMP(3),
    "lastLoginAt"           TIMESTAMP(3),
    "passwordSetAt"         TIMESTAMP(3),
    "loginAttempts"         INTEGER NOT NULL DEFAULT 0,
    "lockedUntil"           TIMESTAMP(3),
    
    -- Audit fields
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL,
    
    FOREIGN KEY ("staffId") REFERENCES "Staff"("id")
);
```

**Security Features**:
- Brute force protection
- Account locking mechanism
- Password history tracking
- Session management support

### 4. Historical Data & Auditing

#### Historical Snapshots
```sql
CREATE TABLE "HistoricalSchedules" (
    "id"              SERIAL PRIMARY KEY,
    "snapshotDate"    DATE NOT NULL,
    "batchId"         TEXT NOT NULL,
    
    -- Denormalized staff data for performance
    "staffId"         INTEGER NOT NULL,
    "staffName"       TEXT NOT NULL,
    "department"      TEXT NOT NULL,
    "division"        TEXT NOT NULL,
    
    -- Schedule snapshot
    "scheduleStatus"  TEXT NOT NULL,
    "startTime"       TIMESTAMP(3) NOT NULL,
    "endTime"         TIMESTAMP(3) NOT NULL,
    "memo"            TEXT,
    
    -- Metadata
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version"         TEXT NOT NULL DEFAULT '1.0'
);
```

**Design Rationale**:
- Denormalized for query performance
- Batch processing support
- Version tracking for schema evolution

## Data Layer Integration

### Conceptual Architecture
```
Layer 1 (Contract): Base working hours
         ↓
Layer 2 (Adjustment): Individual modifications
         ↓
Unified View: Computed effective schedule
```

### Integration Logic
```typescript
// Priority hierarchy
1. Adjustment (highest priority)
2. Contract (base schedule)
3. null (holidays/days off)
```

## Time Handling Strategy

### UTC Implementation
```sql
-- All timestamp columns use UTC
-- Application layer handles timezone conversion
-- Display layer shows local time

Example:
- Database stores: '2025-07-09T03:00:00.000Z'
- API returns: '2025-07-09T03:00:00.000Z'
- UI displays: '2025-07-09 12:00' (JST)
```

### Time Precision
- **Storage**: Millisecond precision (TIMESTAMP(3))
- **Business Logic**: Minute-level accuracy
- **Display**: Configurable format

## Indexing Strategy

### Performance Optimization
```sql
-- Query performance indexes
CREATE INDEX idx_adjustment_date_staff ON "Adjustment"(date, staffId);
CREATE INDEX idx_adjustment_pending ON "Adjustment"(isPending, date);
CREATE INDEX idx_historical_date ON "HistoricalSchedules"(snapshotDate);

-- Authentication indexes
CREATE INDEX idx_auth_email ON "UserAuth"(email);
CREATE INDEX idx_session_expires ON "AuthSessions"(expiresAt);

-- Audit trail indexes
CREATE INDEX idx_audit_timestamp ON "AuditLogs"(timestamp DESC);
CREATE INDEX idx_audit_user_action ON "AuditLogs"(userId, action);
```

## Constraints & Data Integrity

### Business Rule Constraints
```sql
-- Prevent duplicate schedules
UNIQUE("staffId", "date", "startTime", "endTime")

-- Ensure time validity
CHECK ("startTime" < "endTime")

-- Approval state consistency
CHECK (
  ("isPending" = true AND "approvedAt" IS NULL) OR
  ("isPending" = false AND "approvedAt" IS NOT NULL)
)
```

### Referential Integrity
- **Cascade Deletion**: Auth sessions, user preferences
- **Restrict Deletion**: Core business data
- **Soft Deletion**: Staff records with historical preservation

## Scalability Considerations

### Partitioning Strategy
```sql
-- Future implementation for large datasets
-- Partition historical data by year
-- Partition active schedules by month
```

### Read Optimization
- **Materialized Views**: Monthly schedule summaries
- **Caching Tables**: Frequently accessed aggregations
- **Read Replicas**: Supported architecture

## Migration Strategy

### Version Control
- **Migration Tool**: Prisma Migrate
- **Rollback Support**: Point-in-time recovery
- **Zero-downtime**: Blue-green deployment compatible

### Data Evolution
```yaml
Schema Changes:
  - Additive changes preferred
  - Backward compatibility maintained
  - Migration scripts version controlled
  - Automated testing for migrations
```

## Security & Compliance

### Data Protection
- **Encryption at Rest**: Supported
- **Row-Level Security**: Implemented through application
- **Audit Logging**: All data modifications tracked
- **GDPR Compliance**: Soft deletion, data export support

### Access Control
```sql
-- Application-level enforcement
-- Role-based data filtering
-- Department-level isolation
-- Personal data protection
```

## Performance Metrics

### Expected Performance
```yaml
Query Performance:
  - Simple lookups: <10ms
  - Complex aggregations: <100ms
  - Bulk operations: <500ms
  
Concurrent Users:
  - Design target: 300+
  - Connection pooling: 200 max
  - Query optimization: Continuous
```

## Best Practices Applied

### Development Guidelines
1. **UTC Everywhere**: Internal time handling
2. **Type Safety**: Prisma TypeScript generation
3. **Audit Everything**: Complete operation history
4. **Performance First**: Indexed appropriately
5. **Security by Design**: RBAC implementation

---

**Documentation Version**: 1.0.0  
**Database Platform**: PostgreSQL 15+  
**Design Pattern**: Layered Architecture with Temporal Data