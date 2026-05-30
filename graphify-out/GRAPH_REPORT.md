# Algorithm Arena V2 - Knowledge Graph Report

**Generated:** 2026-05-31  
**Project:** Algorithm Arena V2 (Enterprise-grade Algorithm Arena Platform)

## Executive Summary

Algorithm Arena V2 is a **full-stack monorepo** designed as an enterprise-grade competitive programming platform. It features a React 19 frontend and Node.js/Express backend with MongoDB persistence, real-time Socket.io communication, and comprehensive clan-based gamification.

**Core Tech Stack:**
- **Frontend:** React 19, Vite, TailwindCSS, TanStack React Query, Socket.io
- **Backend:** Node.js, Express 5, Mongoose 9, JWT Auth, Zod validation
- **Database:** MongoDB with Mongoose ODM
- **Real-time:** Socket.io for live chat and notifications

---

## Architecture Overview

### Monorepo Structure
```
algorithm-arena-v2/
├── client/                  # React frontend
│   ├── src/
│   │   ├── pages/          # 50+ page components
│   │   ├── components/     # 22 reusable components
│   │   ├── context/        # Auth & app context
│   │   ├── hooks/          # Custom hooks (useSocket, etc)
│   │   └── lib/            # API client, mock data
│   └── vite.config.js
├── server/                  # Express backend
│   ├── src/features/       # 10 feature modules
│   ├── middleware/         # Auth, validation, context
│   ├── utils/              # Audit, leaderboard, tokens
│   └── app.js
└── package.json           # Root workspace
```

---

## Component Communities

### 1. **Core Platform** (Auth & Users)
**Purpose:** Authentication, user management, identity  
**Key Files:**
- `server/src/features/auth/` - JWT-based authentication
- `server/src/features/users/` - User profiles and data
- `client/src/context/AuthContext.jsx` - Frontend auth state
- `server/middleware/auth.js` - Protected route middleware

**Flow:**
1. User logs in → auth.controller validates credentials
2. JWT + Refresh Token issued → stored in client context
3. Protected routes verified via middleware → user object injected into req

**Critical Dependencies:** JWT, bcryptjs, Mongoose

---

### 2. **Challenges & Submissions**
**Purpose:** Algorithm problems, code submission, and execution  
**Key Files:**
- `server/src/features/challenges/` - Challenge CRUD
- `server/src/features/submissions/` - Submission validation
- `client/src/components/CodeEditor.jsx` - Editor component
- `client/src/pages/ChallengeDetails.jsx` - Challenge display

**Flow:**
1. Challenge fetched → displayed with editor
2. User submits code → submission.controller validates
3. Badge triggers on success → Leaderboard updates

**Blast Radius:** Changes to Challenge schema affect Submissions, Badges, and Dashboard

---

### 3. **Clans & Teams**
**Purpose:** Community features, hierarchy, clan-based competition  
**Key Files:**
- `server/src/features/clans/` - Clan CRUD & hierarchy
- `server/src/features/clans/clanScope.service.js` - **SECURITY-CRITICAL** authorization
- `client/src/pages/Clans.jsx` - Clan listing & creation
- `client/src/pages/ClanChiefPanel.jsx` - Chief management panel

**Hierarchy:**
- Clan Chief (admin)
- Senior Members
- Members

**Recent Security Hardening:**
- Commit: `518055c feat(clans): harden clan authorization and integrity flows`
- Service: `clanScope.service.js` - Authorization boundaries reviewed

**Blast Radius:** Clan schema changes cascade to:
- Submissions (clan-scoped leaderboards)
- Chat (clan-scoped messaging)
- Audit logging (compliance tracking)

---

### 4. **Gamification**
**Purpose:** Engagement through badges, leaderboards, achievements  
**Key Files:**
- `server/src/features/badges/` - Badge definitions
- `server/utils/leaderboard.js` - Leaderboard calculations
- `client/src/pages/Leaderboard.jsx` - Public leaderboard
- `client/src/pages/Dashboard.jsx` - Personal dashboard

**Flow:**
1. User submits challenge → Submission marked correct
2. Badge service evaluates trigger conditions
3. Leaderboard recalculated → Dashboard refreshes

---

### 5. **Communication & Notifications**
**Purpose:** Real-time chat, global notices, audit logs  
**Key Files:**
- `server/src/features/chat/` - Chat message store
- `server/src/features/notices/` - Global notices & audit
- `client/src/pages/ClanChat.jsx` - Clan chat UI
- `client/src/components/NotificationListener.jsx` - Toast notifications

**Real-time Channel:** Socket.io for instant chat delivery

---

### 6. **Admin & Management**
**Purpose:** System administration, audit, compliance  
**Key Files:**
- `client/src/pages/AdminPanel.jsx` - Admin dashboard
- `client/src/pages/admin/*` - Tabs for different admin functions
- `server/services/audit/` - Audit service
- `server/utils/audit.js` - Audit logging utility

**Routes Protected by:** `AdminRoute.jsx` component (role check)

---

### 7. **Supporting Services**
**Purpose:** Learning resources, missions, tracking  
**Key Files:**
- `server/src/features/resources/` - Resource management
- `client/src/pages/Resources.jsx` - Resource display
- `client/src/pages/Missions.jsx` - Mission tracking

---

## Data Flow Patterns

### Submission Flow (High-Risk)
```
CodeEditor.jsx 
  ↓ (user submits)
submission.routes.js 
  ↓ (validate & save)
Submission.model 
  ↓ (check correctness)
badge.controller.js 
  ↓ (trigger badge logic)
leaderboard.js 
  ↓ (recalculate ranks)
Dashboard.jsx (refresh)
```

**Security Considerations:**
- Code execution sandboxing (check: `submission.controller.js`)
- Input validation (Zod schemas in `validators/submissionSchemas.js`)
- Audit logging on every submission

### Clan Management Flow
```
Clans.jsx 
  ↓ (create/join clan)
clan.routes.js 
  ↓ (auth required)
clanScope.service.js 
  ↓ (authorization check)
Clan.model 
  ↓ (update members)
ChatMessage.model (clan-scoped)
```

**Authorization Model:**
- Chief can manage members & send clan notices
- Members can chat & submit in clan context
- Scope isolation enforced in `clanScope.service.js`

### Auth Flow
```
Login.jsx 
  ↓ (username/password)
auth.controller.js 
  ↓ (bcrypt verify)
JWT + Refresh Token 
  ↓ (stored in context)
middleware/auth.js 
  ↓ (validates on protected routes)
ProtectedRoute.jsx (gate access)
```

---

## Dependency Graph

### Backend Feature Dependencies
```
Users ←─┬─── Auth (required)
        ├─── Leaderboard
        └─── Audit

Submissions ────────┬─── Challenges (required)
                    ├─── Users
                    ├─── Badges
                    └─── Audit

Clans ──────────┬─── Users (required)
                ├─── Auth
                └─── Audit

Chat ──────────┬─── Clans
               ├─── Socket.io
               └─── Auth
```

### Frontend Dependencies
```
All Protected Pages ──→ ProtectedRoute.jsx ──→ AuthContext
                             ↓
                      middleware/auth.js

CodeEditor ──→ useQuery (TanStack)
                ↓
           src/lib/api.js (Axios)
```

---

## Database Models

### Core Models
- **User** - User profiles, credentials, stats
- **Auth.RefreshToken** - Token management
- **Challenge** - Algorithm problems
- **Submission** - Code submissions & results
- **Badge** - Achievement definitions
- **Clan** - Team/community structure
- **ChatMessage** - Message storage
- **GlobalNotice** - System announcements
- **AuditLog** - Security audit trail
- **EntityRevision** - Change history
- **Resource** - Learning materials

---

## Security & Compliance Hotspots

### 🔴 HIGH PRIORITY

**1. Clan Authorization (`clanScope.service.js`)**
- **Risk:** Scope escape in clan operations
- **Mitigation:** Recent hardening in commit `518055c`
- **Action:** Review scope checks on every clan operation
- **Files:** `clan.controller.js`, `clanScope.service.js`

**2. Code Submission (`submission.controller.js`)**
- **Risk:** Untrusted code execution
- **Mitigation:** Input validation, sandboxing (if applicable)
- **Action:** Check for injection vectors
- **Files:** `submission.controller.js`, `CodeEditor.jsx`

### 🟡 MEDIUM PRIORITY

**3. Audit & Compliance**
- **Status:** Recent security hardening
- **Files:** `services/audit/sanitize.js`, `AuditLog.model`
- **Check:** Audit logging completeness

**4. Admin Panel Access**
- **Files:** `AdminRoute.jsx`, `pages/AdminPanel.jsx`
- **Check:** Role-based access control enforcement

---

## Critical File Index

### Server (81 files total)
| Component | Files | Key Entry Point |
|-----------|-------|-----------------|
| Features | 50+ | `server/src/features/` |
| Models | 14 | Each feature folder |
| Controllers | 10 | `**/controller.js` |
| Routes | 10 | `**/routes.js` |
| Middleware | 3 | `server/middleware/` |
| Utils | 8 | `server/utils/` |
| Validators | 6 | `server/validators/` |

### Client (81 files total)
| Section | Files | Location |
|---------|-------|----------|
| Pages | 50+ | `client/src/pages/` |
| Components | 22 | `client/src/components/` |
| Context & Hooks | 5 | `client/src/context/` & `hooks/` |
| API & Utils | 4 | `client/src/lib/` |

---

## Key Workflows & Blast Radius

### Changing User Schema
**Blast Radius:** 🔴 WIDE  
**Affected:** Submissions, Leaderboard, Dashboard, Audit, Admin  
**Files to Review:**
1. `User.model.js`
2. `user.controller.js`
3. `leaderboard.js` (recalculation logic)
4. `audit.js` (change tracking)
5. Frontend user display components

### Changing Challenge Schema
**Blast Radius:** 🟡 MEDIUM  
**Affected:** Submissions, Badges, Leaderboard  
**Files to Review:**
1. `Challenge.model.js`
2. `Submission.model.js` & controller
3. Badge trigger logic
4. `challenge.routes.js` API contract

### Changing Clan Authorization
**Blast Radius:** 🔴 WIDE  
**Affected:** Chat, Submissions, Leaderboard, Notices  
**Files to Review:**
1. `Clan.model.js`
2. `clanScope.service.js` (START HERE)
3. All `clan.controller.js` actions
4. Chat scope validation
5. Frontend `ClanChiefRoute.jsx`, `ClanChiefPanel.jsx`

---

## Integration Points

### Frontend ↔ Backend
| Feature | Protocol | Real-time? | Auth Required? |
|---------|----------|-----------|----------------|
| Auth | REST | No | No |
| Challenges | REST | No | Yes |
| Submissions | REST | No | Yes |
| Chat | Socket.io | **Yes** | Yes |
| Notifications | Socket.io | **Yes** | Yes |
| Leaderboard | REST | No | No |

### API Client
- **Central Point:** `client/src/lib/api.js` (Axios instance)
- **Real-time:** `client/src/hooks/useSocket.js`

---

## Recent Changes & Stability

### Latest Commits
1. `518055c` - **feat(clans): harden clan authorization** ← SECURITY FOCUS
2. `a4d6b19` - feat(observability): enable Vercel Analytics
3. `a53a5a5` - chore: clean unused artifacts
4. `f1a3fa8` - Merge PR #58 (analysis fix)
5. `b35aeaf` - feat: security hardening + UI/UX overhaul

**Trend:** Security hardening phase active

---

## Recommendations

1. **Before modifying clan features:** Review `clanScope.service.js` (authorization boundaries)
2. **Before changing schemas:** Cross-reference this graph for blast radius
3. **Before touching auth:** Verify `middleware/auth.js` isn't broken
4. **Before admin features:** Check `AdminRoute.jsx` enforces role checks
5. **Real-time features:** Always use Socket.io (not polling)

---

*This graph should be consulted before making changes to core files to avoid unintended cascading failures.*
