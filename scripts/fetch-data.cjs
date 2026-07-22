// ============================================================
// Battery Briefing - 자동 데이터 수집 (with Gemini AI 요약 + 키워드 + 중요도 자동선정)
// 매일 GitHub Actions에서 실행 — 구글 시트 → data.json
// ============================================================

const fs = require('fs');
const path = require('path');
const https = require('https');

const SHEET_ID = process.env.SHEET_ID || '1Td8b1PEOLYdaMfNqRcOUu1S0n0-G36sSX85WTKv43oI';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const CACHE_PATH = path.join('scripts', 'ai-cache.json');
const MAX_NEW_ANALYSES_PER_RUN = 80; // 1회 실행 시 최대 신규 분석 개수 (rate limit 보호)
const FEATURED_COUNT = 4; // 홈 화면 상단에 노출할 "필수" 기사 개수

// 증시/주가 관련 키워드 (제목에 들어있으면 자사·경쟁사 카테고리에서 제외)
const STOCK_BLACKLIST = ['주가', '코스피', '코스닥', '시가총액', '거래량', '매도세', '매수세', '증시', '상한가', '하한가', '52주 신고가', '52주 신저가', '종가', '시초가', '공매도'];

// ━━━━━━━━━━━━━━━━ 구글 시트 읽기 ━━━━━━━━━━━━━━━━

function fetchSheet(sheetName) {
  return new Promise((resolve, reject) => {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonText = data.substring(data.indexOf('{'), data.lastIndexOf('}') + 1);
          const parsed = JSON.parse(jsonText);
          if (!parsed.table || !parsed.table.rows) {
            resolve([]);
            return;
          }
          const cols = parsed.table.cols.map(c => c.label || c.id);
          const rows = parsed.table.rows.map(row => {
            const obj = {};
            row.c.forEach((cell, i) => {
              obj[cols[i]] = cell ? cell.v : '';
            });
            return obj;
          });
          resolve(rows);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function isStockNews(title) {
  if (!title) return false;
  return STOCK_BLACKLIST.some(kw => title.includes(kw));
}

function rowsToNews(rows) {
  return rows
    .filter(r => r.title && r.cat)
    .filter(r => !((r.cat === 'own' || r.cat === 'competitor') && isStockNews(r.title)))
    .map(r => ({
      id: r.id,
      cat: r.cat,
      sub: String(r.sub || ''),
      title: r.title,
      summary: r.summary || '',
      source: r.source || '',
      time: r.time || '',
      link: r.link || '#',
      keywords: [],
      importance: null,
      // 시트에 사람이 직접 표시해둔 값(있으면 폴백용으로 유지)
      manualFeatured: r['필수'] == 1 || r['필수'] === '1' || r['필수'] === true,
      featured: false,
    }));
}

// ━━━━━━━━━━━━━━━━ AI 분석 캐시 ━━━━━━━━━━━━━━━━
// 캐시 항목 형식: { summary, keywords: string[], importance: number }
// (예전 형식: 문자열만 저장된 경우도 있어 호환 처리)

function loadCache() {
  try {
    if (fs.existsSync(CACHE_PATH)) {
      const raw = fs.readFileSync(CACHE_PATH, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('⚠ Cache load failed, starting fresh:', e.message);
  }
  return {};
}

function saveCache(cache) {
  try {
    fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf8');
    console.log(`✓ Cache saved: ${Object.keys(cache).length} entries`);
  } catch (e) {
    console.warn('⚠ Cache save failed:', e.message);
  }
}

function cacheKey(article) {
  return article.link || article.id || article.title;
}

// 캐시 항목이 "완전한 분석"(요약+키워드+중요도)을 갖고 있는지 확인
function isFullyAnalyzed(entry) {
  return !!entry && typeof entry === 'object' && Array.isArray(entry.keywords) && typeof entry.importance === 'number';
}

function cachedSummaryText(entry) {
  if (!entry) return null;
  if (typeof entry === 'string') return entry; // 예전 형식
  return entry.summary || null;
}

// ━━━━━━━━━━━━━━━━ Gemini API 호출 (요약 + 키워드 + 중요도) ━━━━━━━━━━━━━━━━

function callGeminiAnalyze(title, originalSummary) {
  return new Promise((resolve, reject) => {
    if (!GEMINI_API_KEY) {
      reject(new Error('GEMINI_API_KEY not set'));
      return;
    }

    const prompt = `당신은 배터리 산업 전문 기자입니다. 다음 뉴스를 분석해주세요.

요구사항:
1. summary: 한국어 2문장 요약. 첫 문장은 핵심 사실(무엇이/누가/언제), 둘째 문장은 배경·영향·시사점. 군더더기 없이 객관적·전문적인 톤. 마크다운(**, *, # 등) 금지. "요약:" 같은 라벨 금지.
2. keywords: 이 기사를 대표하는 핵심 키워드 3~5개 (한국어 명사 위주, 기업명·기술명·정책명 우선, 일반 단어 제외)
3. importance: 삼성SDI 배터리 사업 관점에서 이 기사의 중요도를 1~10 정수로 평가. 10에 가까울수록 업계 전반에 영향이 크거나 삼성SDI/주요 경쟁사가 직접 관련되거나 대형 계약·정책 변화인 경우.

제목: ${title}
원문: ${originalSummary}

아래 JSON 형식으로만 답하세요. 다른 설명이나 코드블록 표시 없이 순수 JSON만 출력하세요.
{"summary": "...", "keywords": ["...", "..."], "importance": 0}`;

    const payload = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 350,
      }
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      port: 443,
      path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 30000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            reject(new Error(`API error: ${parsed.error.message}`));
            return;
          }
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) {
            reject(new Error('Empty response'));
            return;
          }
          // 코드블록/마크다운 제거 후 JSON 파싱
          let cleaned = text.trim()
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/```\s*$/i, '')
            .trim();
          let result;
          try {
            result = JSON.parse(cleaned);
          } catch (parseErr) {
            // JSON 파싱 실패 시, 최소한 요약 텍스트라도 살려서 사용
            reject(new Error(`JSON parse failed: ${parseErr.message}`));
            return;
          }
          const summary = String(result.summary || '').trim();
          const keywords = Array.isArray(result.keywords)
            ? result.keywords.map(k => String(k).trim()).filter(Boolean).slice(0, 5)
            : [];
          let importance = Number(result.importance);
          if (!Number.isFinite(importance)) importance = 0;
          importance = Math.max(0, Math.min(10, Math.round(importance)));

          if (!summary || summary.length <= 10) {
            reject(new Error('Empty or too short summary'));
            return;
          }
          resolve({ summary, keywords, importance });
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.write(payload);
    req.end();
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ━━━━━━━━━━━━━━━━ AI 분석 적용 ━━━━━━━━━━━━━━━━

async function applyAIAnalysis(news, cache) {
  let cachedCount = 0;
  let newAnalysisCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const article of news) {
    const key = cacheKey(article);
    const entry = cache[key];

    // 1. 캐시에 완전한 분석(요약+키워드+중요도)이 있으면 그대로 사용
    if (isFullyAnalyzed(entry)) {
      article.summary = entry.summary;
      article.keywords = entry.keywords;
      article.importance = entry.importance;
      cachedCount++;
      continue;
    }

    // 2. 원본이 너무 짧으면 스킵 (분석 가치 없음). 예전 캐시에 요약만 있으면 그거라도 유지.
    const legacySummary = cachedSummaryText(entry);
    if (!article.summary || article.summary.length < 30) {
      if (legacySummary) article.summary = legacySummary;
      skippedCount++;
      continue;
    }

    // 3. 이번 실행에서 충분히 처리했으면 다음 실행으로 미룸 (예전 요약이라도 있으면 유지)
    if (newAnalysisCount >= MAX_NEW_ANALYSES_PER_RUN) {
      if (legacySummary) article.summary = legacySummary;
      skippedCount++;
      continue;
    }

    // 4. Gemini 호출
    try {
      const result = await callGeminiAnalyze(article.title, article.summary);
      article.summary = result.summary;
      article.keywords = result.keywords;
      article.importance = result.importance;
      cache[key] = result;
      newAnalysisCount++;
      if (newAnalysisCount % 10 === 0) {
        console.log(`  ✓ ${newAnalysisCount}개 완료...`);
      }
      // Rate limit 보호: 4.2초 대기 (15 RPM = 분당 15회)
      await sleep(4200);
    } catch (e) {
      errorCount++;
      console.warn(`  ✗ "${article.title.substring(0, 40)}..." 실패: ${e.message}`);
      if (legacySummary) article.summary = legacySummary;
      if (errorCount > 5) {
        console.warn('⚠ 에러 5회 초과, AI 분석 중단 (다음 실행에서 재시도)');
        break;
      }
      // 에러 후 10초 대기 (back-off)
      await sleep(10000);
    }
  }

  console.log(`\n━━━ AI 분석 결과 ━━━`);
  console.log(`✓ 캐시 활용: ${cachedCount}건`);
  console.log(`✓ 신규 분석: ${newAnalysisCount}건`);
  console.log(`- 스킵: ${skippedCount}건`);
  console.log(`✗ 실패: ${errorCount}건`);
}

// 중요도 기준으로 상위 N개를 "필수(featured)"로 자동 선정.
// AI 분석이 안 된 기사는 시트에 사람이 표시해둔 값(manualFeatured)을 폴백으로 사용.
function selectFeatured(news) {
  const analyzed = news.filter(n => typeof n.importance === 'number' && n.importance > 0);

  if (analyzed.length === 0) {
    // AI 분석 결과가 하나도 없으면(예: GEMINI_API_KEY 미설정) 기존 수동 방식으로 폴백
    const manual = news.filter(n => n.manualFeatured).slice(0, FEATURED_COUNT);
    manual.forEach(n => { n.featured = true; });
    return manual;
  }

  const top = [...analyzed]
    .sort((a, b) => b.importance - a.importance)
    .slice(0, FEATURED_COUNT);
  top.forEach(n => { n.featured = true; });
  return top;
}

// ━━━━━━━━━━━━━━━━ 메인 실행 ━━━━━━━━━━━━━━━━

(async () => {
  try {
    console.log('━━━ Battery Briefing 데이터 수집 시작 ━━━\n');

    console.log('📊 구글 시트에서 뉴스 가져오는 중...');
    const newsRows = await fetchSheet('뉴스');
    console.log(`✓ ${newsRows.length}건 가져옴`);

    const allNews = rowsToNews(newsRows);
    console.log(`✓ 필터링 후 ${allNews.length}건\n`);

    // AI 분석 적용 (요약 + 키워드 + 중요도)
    if (GEMINI_API_KEY) {
      console.log('🤖 Gemini AI 분석 적용 중 (요약/키워드/중요도)...');
      const cache = loadCache();
      console.log(`  기존 캐시: ${Object.keys(cache).length}건`);
      await applyAIAnalysis(allNews, cache);
      saveCache(cache);
    } else {
      console.warn('\n⚠ GEMINI_API_KEY 환경변수가 설정되지 않음. AI 분석 건너뜀.\n');
    }

    const featured = selectFeatured(allNews);

    // 내부용 필드는 최종 출력에서 정리 (manualFeatured는 사이트에 노출할 필요 없음)
    const news = allNews.map(({ manualFeatured, ...rest }) => rest);

    const data = {
      news,
      featured: featured.map(({ manualFeatured, ...rest }) => rest),
      lastUpdated: new Date().toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      }),
    };

    fs.mkdirSync('public', { recursive: true });
    fs.writeFileSync('public/data.json', JSON.stringify(data, null, 2), 'utf8');

    console.log(`\n━━━ 완료 ━━━`);
    console.log(`📰 뉴스: ${data.news.length}건`);
    console.log(`⭐ 필수: ${data.featured.length}건`);
    console.log(`📁 저장: public/data.json`);
  } catch (e) {
    console.error('❌ Error:', e);
    process.exit(1);
  }
})();
