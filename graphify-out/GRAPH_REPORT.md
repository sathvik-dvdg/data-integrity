# Graph Report - Data Integrity Checker  (2026-04-27)

## Corpus Check
- 22 files · ~6,891 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 70 nodes · 86 edges · 5 communities detected
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 6|Community 6]]

## God Nodes (most connected - your core abstractions)
1. `mapBigInts()` - 7 edges
2. `getBlock()` - 7 edges
3. `buildBlockHeader()` - 7 edges
4. `verifyBlockIntegrity()` - 6 edges
5. `verifyBlock()` - 5 edges
6. `getProvider()` - 5 edges
7. `getRawBlock()` - 5 edges
8. `getBackupBlockHash()` - 5 edges
9. `handleRPCError()` - 5 edges
10. `getDashboardSummary()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `verifyBlock()` --calls--> `verifyBlockIntegrity()`  [INFERRED]
  backend\controllers\verificationController.js → backend\services\integrityVerifier.js
- `verifyBlock()` --calls--> `getBlock()`  [INFERRED]
  backend\controllers\verificationController.js → backend\services\blockchain.js
- `startServer()` --calls--> `connectDB()`  [INFERRED]
  backend\index.js → backend\config\db.js
- `startServer()` --calls--> `startAutoVerify()`  [INFERRED]
  backend\index.js → backend\jobs\autoVerify.js
- `getDashboardSummary()` --calls--> `getLatestBlock()`  [INFERRED]
  backend\controllers\verificationController.js → frontend\src\services\api.js

## Communities

### Community 0 - "Community 0"
Cohesion: 0.35
Nodes (10): getLatestBlock(), buildSummaryAggregation(), exportLogs(), getDashboardSummary(), getLatest(), getLogs(), getValidCachedLog(), isPlainObject() (+2 more)

### Community 1 - "Community 1"
Cohesion: 0.45
Nodes (10): createProvider(), formatBlockTag(), getBackupBlockHash(), getBackupProvider(), getBlock(), getLatestBlock(), getProvider(), getRawBlock() (+2 more)

### Community 2 - "Community 2"
Cohesion: 0.46
Nodes (7): buildBlockHeader(), ensureField(), hexToBytes(), normalizeBlockNumber(), quantityToBytes(), recomputeBlockHash(), resolveHeaderEra()

### Community 3 - "Community 3"
Cohesion: 0.29
Nodes (3): startAutoVerify(), connectDB(), startServer()

### Community 6 - "Community 6"
Cohesion: 0.5
Nodes (2): Dashboard(), usePolling()

## Knowledge Gaps
- **Thin community `Community 6`** (4 nodes): `Dashboard()`, `usePolling.js`, `Dashboard.jsx`, `usePolling()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `verifyBlock()` connect `Community 0` to `Community 1`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **Why does `verifyBlockIntegrity()` connect `Community 1` to `Community 0`, `Community 2`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **Why does `getLatestBlock()` connect `Community 0` to `Community 4`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `getBlock()` (e.g. with `verifyBlockIntegrity()` and `verifyBlock()`) actually correct?**
  _`getBlock()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `verifyBlockIntegrity()` (e.g. with `verifyBlock()` and `getBlock()`) actually correct?**
  _`verifyBlockIntegrity()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `verifyBlock()` (e.g. with `verifyBlockIntegrity()` and `getBlock()`) actually correct?**
  _`verifyBlock()` has 2 INFERRED edges - model-reasoned connections that need verification._