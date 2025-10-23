# Jarvis API Reference

Complete API documentation for all endpoints.

---

## 📋 Table of Contents

- [Authentication](#authentication)
- [Organizations](#organizations)
- [Workspaces](#workspaces)
- [Teams](#teams) (Coming Soon)
- [Portfolios](#portfolios) (Coming Soon)
- [Projects](#projects) (Coming Soon)
- [Tasks](#tasks) (Coming Soon)
- [Error Handling](#error-handling)

---

## 🔐 Authentication

All API requests require authentication via the `x-user-id` header.

```bash
curl -H "x-user-id: user@example.com" http://localhost:8080/api/...
```

### Future: Firebase Auth

In production, replace with Firebase Auth:

```bash
curl -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" http://localhost:8080/api/...
```

---

## 🏢 Organizations

Organizations are the top-level entity in the hierarchy.

### Data Model

```typescript
{
  id: string;
  name: string;
  description?: string;
  ownerId: string;              // User who owns the organization
  memberIds: string[];          // Array of user IDs
  settings: Record<string, any>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}
```

### Endpoints

#### Create Organization

```http
POST /api/organizations
```

**Headers:**
- `Content-Type: application/json`
- `x-user-id: <user-id>`

**Request Body:**
```json
{
  "name": "Acme Corporation",
  "description": "Main organization",
  "settings": {
    "timezone": "America/New_York",
    "currency": "USD"
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "organizationId": "eQYbsMBxuccnIlMSLSeR"
  },
  "message": "Organization created successfully"
}
```

**Example:**
```bash
curl -X POST http://localhost:8080/api/organizations \
  -H "Content-Type: application/json" \
  -H "x-user-id: jd@example.com" \
  -d '{
    "name": "My Company",
    "description": "Company description"
  }'
```

---

#### Get Organization by ID

```http
GET /api/organizations/:id
```

**Headers:**
- `x-user-id: <user-id>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "eQYbsMBxuccnIlMSLSeR",
    "name": "Acme Corporation",
    "description": "Main organization",
    "ownerId": "jd@example.com",
    "memberIds": ["jd@example.com"],
    "settings": {},
    "createdAt": { "_seconds": 1761224821, "_nanoseconds": 10000000 },
    "updatedAt": { "_seconds": 1761224821, "_nanoseconds": 10000000 }
  }
}
```

**Errors:**
- `404`: Organization not found
- `403`: User is not a member of the organization

**Example:**
```bash
curl -H "x-user-id: jd@example.com" \
  http://localhost:8080/api/organizations/eQYbsMBxuccnIlMSLSeR
```

---

#### List User's Organizations

```http
GET /api/organizations
```

Returns all organizations where the user is a member.

**Headers:**
- `x-user-id: <user-id>`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "org1",
      "name": "Acme Corporation",
      "ownerId": "jd@example.com",
      "memberIds": ["jd@example.com", "jane@example.com"]
    },
    {
      "id": "org2",
      "name": "Beta Inc",
      "ownerId": "jane@example.com",
      "memberIds": ["jd@example.com", "jane@example.com"]
    }
  ]
}
```

**Example:**
```bash
curl -H "x-user-id: jd@example.com" \
  http://localhost:8080/api/organizations
```

---

#### Update Organization

```http
PATCH /api/organizations/:id
```

**Permissions:** Owner only

**Headers:**
- `Content-Type: application/json`
- `x-user-id: <user-id>`

**Request Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "settings": {
    "newSetting": "value"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Organization updated successfully"
}
```

**Errors:**
- `403`: Only owner can update organization

**Example:**
```bash
curl -X PATCH http://localhost:8080/api/organizations/eQYbsMBxuccnIlMSLSeR \
  -H "Content-Type: application/json" \
  -H "x-user-id: jd@example.com" \
  -d '{"name": "New Name"}'
```

---

#### Delete Organization

```http
DELETE /api/organizations/:id
```

**Permissions:** Owner only

**Headers:**
- `x-user-id: <user-id>`

**Response (200):**
```json
{
  "success": true,
  "message": "Organization deleted successfully"
}
```

**Errors:**
- `403`: Only owner can delete organization

**Example:**
```bash
curl -X DELETE http://localhost:8080/api/organizations/eQYbsMBxuccnIlMSLSeR \
  -H "x-user-id: jd@example.com"
```

---

#### Add Member to Organization

```http
POST /api/organizations/:id/members
```

**Permissions:** Owner only

**Headers:**
- `Content-Type: application/json`
- `x-user-id: <user-id>`

**Request Body:**
```json
{
  "userId": "newuser@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Member added successfully"
}
```

**Example:**
```bash
curl -X POST http://localhost:8080/api/organizations/eQYbsMBxuccnIlMSLSeR/members \
  -H "Content-Type: application/json" \
  -H "x-user-id: jd@example.com" \
  -d '{"userId": "jane@example.com"}'
```

---

#### Remove Member from Organization

```http
DELETE /api/organizations/:id/members/:userId
```

**Permissions:** Owner only

**Headers:**
- `x-user-id: <user-id>`

**Response (200):**
```json
{
  "success": true,
  "message": "Member removed successfully"
}
```

**Errors:**
- `403`: Only owner can remove members
- `400`: Owner cannot remove themselves

**Example:**
```bash
curl -X DELETE http://localhost:8080/api/organizations/eQYbsMBxuccnIlMSLSeR/members/jane@example.com \
  -H "x-user-id: jd@example.com"
```

---

## 🗂️ Workspaces

Workspaces organize teams and portfolios within an organization.

### Data Model

```typescript
{
  id: string;
  organizationId: string;       // Parent organization
  name: string;
  description?: string;
  color?: string;               // Hex color code
  icon?: string;                // Emoji or icon name
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}
```

### Endpoints

#### Create Workspace

```http
POST /api/workspaces
```

**Headers:**
- `Content-Type: application/json`
- `x-user-id: <user-id>`

**Request Body:**
```json
{
  "organizationId": "eQYbsMBxuccnIlMSLSeR",
  "name": "Engineering",
  "description": "Engineering workspace",
  "color": "#3B82F6",
  "icon": "🚀"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "workspaceId": "workspace123"
  },
  "message": "Workspace created successfully"
}
```

**Errors:**
- `400`: organizationId and name are required
- `403`: User must be member of organization

**Example:**
```bash
curl -X POST http://localhost:8080/api/workspaces \
  -H "Content-Type: application/json" \
  -H "x-user-id: jd@example.com" \
  -d '{
    "organizationId": "eQYbsMBxuccnIlMSLSeR",
    "name": "Engineering",
    "color": "#3B82F6"
  }'
```

---

#### Get Workspace by ID

```http
GET /api/workspaces/:id
```

**Headers:**
- `x-user-id: <user-id>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "workspace123",
    "organizationId": "eQYbsMBxuccnIlMSLSeR",
    "name": "Engineering",
    "description": "Engineering workspace",
    "color": "#3B82F6",
    "icon": "🚀",
    "createdAt": { "_seconds": 1761224821, "_nanoseconds": 10000000 }
  }
}
```

**Errors:**
- `404`: Workspace not found
- `403`: User not member of organization

**Example:**
```bash
curl -H "x-user-id: jd@example.com" \
  http://localhost:8080/api/workspaces/workspace123
```

---

#### List Workspaces by Organization

```http
GET /api/workspaces?organizationId=<org-id>
```

**Headers:**
- `x-user-id: <user-id>`

**Query Parameters:**
- `organizationId` (required): Organization ID to filter by

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "workspace1",
      "organizationId": "eQYbsMBxuccnIlMSLSeR",
      "name": "Engineering",
      "color": "#3B82F6"
    },
    {
      "id": "workspace2",
      "organizationId": "eQYbsMBxuccnIlMSLSeR",
      "name": "Marketing",
      "color": "#10B981"
    }
  ]
}
```

**Errors:**
- `400`: organizationId query parameter required
- `403`: User not member of organization

**Example:**
```bash
curl -H "x-user-id: jd@example.com" \
  "http://localhost:8080/api/workspaces?organizationId=eQYbsMBxuccnIlMSLSeR"
```

---

#### Update Workspace

```http
PATCH /api/workspaces/:id
```

**Headers:**
- `Content-Type: application/json`
- `x-user-id: <user-id>`

**Request Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "color": "#EF4444"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Workspace updated successfully"
}
```

**Example:**
```bash
curl -X PATCH http://localhost:8080/api/workspaces/workspace123 \
  -H "Content-Type: application/json" \
  -H "x-user-id: jd@example.com" \
  -d '{"name": "New Name"}'
```

---

#### Delete Workspace

```http
DELETE /api/workspaces/:id
```

**Permissions:** Organization owner only

**Headers:**
- `x-user-id: <user-id>`

**Response (200):**
```json
{
  "success": true,
  "message": "Workspace deleted successfully"
}
```

**Errors:**
- `403`: Only organization owners can delete workspaces

**Example:**
```bash
curl -X DELETE http://localhost:8080/api/workspaces/workspace123 \
  -H "x-user-id: jd@example.com"
```

---

## ⚠️ Error Handling

### Standard Error Response

```json
{
  "success": false,
  "error": "Error Type",
  "message": "Human-readable error message"
}
```

### HTTP Status Codes

- `200 OK` - Request succeeded
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Missing authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

### Common Errors

#### Missing Authentication

```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Missing x-user-id header"
}
```

#### Insufficient Permissions

```json
{
  "success": false,
  "error": "Forbidden",
  "message": "Only the organization owner can delete it"
}
```

#### Validation Error

```json
{
  "success": false,
  "error": "Validation Error",
  "message": "organizationId and name are required"
}
```

#### Resource Not Found

```json
{
  "success": false,
  "error": "Not Found",
  "message": "Organization not found"
}
```

---

## 📝 Notes

### Timestamps

All timestamps are returned as Firestore Timestamp objects:

```json
{
  "_seconds": 1761224821,
  "_nanoseconds": 10000000
}
```

Convert to JavaScript Date:
```javascript
const date = new Date(timestamp._seconds * 1000);
```

### User IDs

Currently using email addresses as user IDs. In production, use Firebase Auth UIDs.

### Child-Knows-Parent

Remember: Children store parent IDs, not the other way around:
- Workspaces know their `organizationId`
- Projects will know their `portfolioIds[]`
- Tasks will know their `projectIds[]`

---

**Last Updated:** October 2025  
**API Version:** 2.0  
**Status:** In Development