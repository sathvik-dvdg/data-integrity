# Graph Report - Data Integrity Checker  (2026-04-22)

## Corpus Check
- 20 files · ~5,591 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 47 nodes · 40 edges · 3 communities detected
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 3|Community 3]]

## God Nodes (most connected - your core abstractions)
1. `sanitizeData()` - 5 edges
2. `getBlock()` - 5 edges
3. `getLatestBlock()` - 4 edges
4. `getDashboardSummary()` - 3 edges
5. `verifyBlock()` - 3 edges
6. `getLatest()` - 3 edges
7. `getProvider()` - 3 edges
8. `handleRPCError()` - 3 edges
9. `getLatestBlock()` - 3 edges
10. `getLogs()` - 2 edges

## Surprising Connections (you probably didn't know these)
- `verifyBlock()` --calls--> `getBlock()`  [INFERRED]
  backend\controllers\verificationController.js → backend\services\blockchain.js
- `getDashboardSummary()` --calls--> `getLatestBlock()`  [INFERRED]
  backend\controllers\verificationController.js → frontend\src\services\api.js
- `getLatest()` --calls--> `getLatestBlock()`  [INFERRED]
  backend\controllers\verificationController.js → frontend\src\services\api.js
- `Dashboard()` --calls--> `usePolling()`  [INFERRED]
  frontend\src\pages\Dashboard.jsx → frontend\src\hooks\usePolling.js

## Communities

### Community 0 - "Community 0"
Cohesion: 0.52
Nodes (6): getLatestBlock(), getDashboardSummary(), getLatest(), getLogs(), sanitizeData(), verifyBlock()

### Community 1 - "Community 1"
Cohesion: 0.9
Nodes (4): getBlock(), getLatestBlock(), getProvider(), handleRPCError()

### Community 3 - "Community 3"
Cohesion: 0.5
Nodes (2): Dashboard(), usePolling()

## Knowledge Gaps
- **Thin community `Community 3`** (4 nodes): `Dashboard()`, `usePolling.js`, `Dashboard.jsx`, `usePolling()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `verifyBlock()` connect `Community 0` to `Community 1`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `getBlock()` connect `Community 1` to `Community 0`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `getLatestBlock()` connect `Community 0` to `Community 4`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._