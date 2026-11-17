/**
 * AUTOMATED LLM EVALUATION HARNESS FOR CAREMATCHAI
 * Đo Tool-Calling Accuracy, Grounded Keyword Recall, Medical Safety, Prompt Injection Guardrail,
 * Cache Hit Speedup, Token Usage & P50/P95 Latency trên hệ thống thật.
 *
 * Chạy: $env:VERCEL="1"; node evals/run_eval.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { app, initMySql } from '../server/server.js';
import { getPgPool } from '../server/db.js';
import { clearAiChatCache } from '../server/aiCache.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const datasetPath = path.join(__dirname, 'golden_dataset.json');
const reportPath = path.join(__dirname, 'latest_report.json');

function percentile(sortedArr, p) {
  if (!sortedArr.length) return 0;
  const idx = Math.min(sortedArr.length - 1, Math.floor((p / 100) * sortedArr.length));
  return sortedArr[idx];
}

async function run() {
  const cases = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));
  await initMySql();
  clearAiChatCache();

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  console.log(`\n🚀 CareMatchAI Automated Evaluation Harness (${cases.length} scenarios)\n`);

  // Đảm bảo vector table được đồng bộ trước khi eval RAG
  const reindexRes = await fetch(`${baseUrl}/api/ai/rag/reindex`, { method: 'POST' });
  const reindexJson = await reindexRes.json();
  console.log(`📚 Vector RAG Reindex: HTTP ${reindexRes.status} · indexed=${reindexJson.indexed || 0}`);

  const results = [];
  let cacheChecked = false;
  let cachePassed = false;

  try {
    for (const tc of cases) {
      const start = Date.now();
      const res = await fetch(`${baseUrl}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: tc.message,
          history: [],
          userRole: tc.userRole,
          userId: tc.userId,
          userName: tc.userRole === 'admin' ? 'Admin Eval' : 'Eval User',
        }),
      });
      const data = await res.json();
      const elapsed = Date.now() - start;

      const replyLower = String(data.reply || '').toLowerCase();
      const toolsUsed = Array.isArray(data.tools_used) ? data.tools_used : [];

      let toolPass = true;
      if (Array.isArray(tc.expectedToolsAny) && tc.expectedToolsAny.length > 0) {
        toolPass = tc.expectedToolsAny.some((t) => toolsUsed.includes(t));
      }

      let keywordPass = true;
      if (Array.isArray(tc.expectedKeywordsAny) && tc.expectedKeywordsAny.length > 0) {
        keywordPass = tc.expectedKeywordsAny.some((kw) => replyLower.includes(kw.toLowerCase()));
      }

      let guardrailPass = true;
      if (tc.expectGuardrail) {
        guardrailPass = data.guardrail === tc.expectGuardrail;
      }

      const passed = res.status === 200 && toolPass && keywordPass && guardrailPass;

      results.push({
        id: tc.id,
        category: tc.category,
        passed,
        status: res.status,
        latencyMs: Number(data.latency_ms || elapsed),
        toolsUsed,
        toolPass,
        keywordPass,
        guardrailPass,
        tokens: Number(data.usage?.totalTokens || 0),
        replyPreview: String(data.reply || '').slice(0, 140),
      });

      console.log(
        `${passed ? '✅' : '❌'} [${tc.id}] (${tc.category}) · ${elapsed}ms · tools=${JSON.stringify(toolsUsed)} · tokens=${data.usage?.totalTokens || 0}`
      );
      if (!passed) {
        console.log(`   ↳ toolPass=${toolPass}, keywordPass=${keywordPass}, guardrailPass=${guardrailPass} | reply="${String(data.reply || '').slice(0, 160)}"`);
      }

      // Kiểm tra Response Cache trên case đánh dấu repeatForCacheTest
      if (tc.repeatForCacheTest) {
        const cStart = Date.now();
        const cRes = await fetch(`${baseUrl}/api/ai/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: tc.message, history: [], userRole: tc.userRole, userId: tc.userId }),
        });
        const cData = await cRes.json();
        const cElapsed = Date.now() - cStart;
        cacheChecked = true;
        cachePassed = Boolean(cData.cache_hit);
        console.log(`⚡ [cache_hit_check] hit=${cData.cache_hit} · ${cElapsed}ms (saved full LLM call!)`);
      }

      // Nghỉ ngắn giữa các request để tránh chạm RPM burst của free-tier
      await new Promise((r) => setTimeout(r, 1200));
    }

    const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);
    const totalPassed = results.filter((r) => r.passed).length;
    const toolRequired = cases.filter((c) => Array.isArray(c.expectedToolsAny) && c.expectedToolsAny.length > 0).length;
    const toolMatched = results.filter((r, i) => cases[i].expectedToolsAny?.length && r.toolPass).length;
    const totalTokens = results.reduce((sum, r) => sum + r.tokens, 0);

    const summary = {
      timestamp: new Date().toISOString(),
      totalCases: results.length,
      passedCases: totalPassed,
      passRatePct: Number(((totalPassed / results.length) * 100).toFixed(1)),
      toolAccuracyPct: toolRequired ? Number(((toolMatched / toolRequired) * 100).toFixed(1)) : 100,
      cacheTestPassed: cacheChecked ? cachePassed : null,
      p50LatencyMs: percentile(latencies, 50),
      p95LatencyMs: percentile(latencies, 95),
      totalTokens,
      vectorChunksIndexed: Number(reindexJson.indexed || 0),
      cases: results,
    };

    fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2), 'utf-8');
    console.log('\n📊 EVALUATION SUMMARY:');
    console.log(
      JSON.stringify(
        {
          passRatePct: summary.passRatePct,
          toolAccuracyPct: summary.toolAccuracyPct,
          cacheTestPassed: summary.cacheTestPassed,
          p50LatencyMs: summary.p50LatencyMs,
          p95LatencyMs: summary.p95LatencyMs,
          totalTokens: summary.totalTokens,
          vectorChunksIndexed: summary.vectorChunksIndexed,
        },
        null,
        2
      )
    );

    if (totalPassed < results.length || (cacheChecked && !cachePassed)) {
      process.exitCode = 1;
    }
  } finally {
    server.close();
    const pgPool = getPgPool();
    if (pgPool) await pgPool.end();
  }
}

run();
