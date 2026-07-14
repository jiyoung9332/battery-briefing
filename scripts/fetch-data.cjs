// ============================================================
// Battery Briefing - 자동 데이터 수집 (with Gemini AI 요약)
// 매일 GitHub Actions에서 실행 — 구글 시트 → data.json
// + 주간 인사이트: 이번 주 신규 기사 기준 키워드/이슈/기획그룹 발굴주제 자동 생성
// ============================================================

const fs = require('fs');
const path = require('path');
const https = require('https');

const SHEET_ID = process.env.SHEET_ID || '1Td8b1PEOLYdaMfNqRcOUu1S0n0-G36sSX85WTKv43oI';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const CACHE_PATH = path.join('scripts', 'ai-cache.json');
const FIRST_SEEN_CACHE_PATH = path.join('scripts', 'first-seen-cache.json');
const HISTORY_PATH = path.join('scripts', 'weekly-insight-history.json');
const MAX_NEW_SUMMARIES_PER_RUN = 80; // 1회 실행 시 최대 신규 요약 개수 (rate limit 보호)
const MAX_HISTORY_WEEKS = 8; // 발굴주제 아카이브 보관 주 수

// 증시/주가 관련 키워드 (제목에 들어있으면 자사·경쟁사 카테고리에서 제외)
const STOCK_BLACKLIST = ['주가', '코스피', '코스닥', '시가총액', '거래량', '매도세', '매수세', '증시', '상한가', '하한가', '52주 신고가', '52주 신저가', '종가', '시초가', '공매도'];

const CAT_LABEL = { policy: '정책', competitor: '경쟁사', customer: '고객사', own: '자사' };

const COMPETITOR_SUBS = [
  { id: 'lges', label: 'LGES' },
  { id: 'catl', label: 'CATL' },
  { id: 'ampace', label: 'AMPACE' },
  { id: 'eve', label: 'EVE' },
];

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
      featured: r['필수'] == 1 || r['필수'] === '1' || r['필수'] === true,
    }));
}

// ━━━━━━━━━━━━━━━━ 범용 JSON 캐시 ━━━━━━━━━━━━━━━━

function loadJsonCache(filePath, fallback = {}) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.warn(`⚠ 캐시 로드 실패 (${filePath}), 새로 시작:`, e.message);
  }
  return fallback;
}

function saveJsonCache(filePath, obj) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), 'utf8');
  } catch (e) {
    console.warn(`⚠ 캐시 저장 실패 (${filePath}):`, e.message);
  }
}

function cacheKey(article) {
  return article.link || article.id || article.title;
}

// ━━━━━━━━━━━━━━━━ Gemini API 호출 (기사 요약) ━━━━━━━━━━━━━━━━

function callGemini(title, originalSummary) {
  return new Promise((resolve, reject) => {
    if (!GEMINI_API_KEY) {
      reject(new Error('GEMINI_API_KEY not set'));
      return;
    }

    const prompt = `당신은 배터리 산업 전문 기자입니다. 다음 뉴스를 한국어로 2문장으로 요약해주세요.

요구사항:
- 첫 문장: 핵심 사실 (무엇이/누가/언제 일어났는지)
- 둘째 문장: 배경, 영향, 또는 시사점
- 군더더기 없이 명확하게
- 객관적이고 전문적인 톤
- 절대 마크다운(**, *, # 등) 사용하지 말 것
- 절대 "요약:" 같은 라벨 붙이지 말 것

제목: ${title}
원문: ${originalSummary}

요약:`;

    const payload = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 250,
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
          // 마크다운 제거 및 정리
          const cleaned = text.trim()
            .replace(/^\*+|\*+$/g, '')
            .replace(/\*\*/g, '')
            .replace(/^#+\s*/gm, '')
            .replace(/^요약:\s*/i, '')
            .trim();
          resolve(cleaned);
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

// ━━━━━━━━━━━━━━━━ Gemini API 호출 (주간 인사이트: 키워드/이슈/기획주제) ━━━━━━━━━━━━━━━━

function callGeminiJSON(prompt, { temperature = 0.4, maxOutputTokens = 3000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!GEMINI_API_KEY) {
      reject(new Error('GEMINI_API_KEY not set'));
      return;
    }

    const payload = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature, maxOutputTokens },
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
      timeout: 45000,
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
          // ```json ... ``` 코드블록이나 잡텍스트가 섞여 와도 JSON 부분만 추출
          let jsonText = text.trim();
          const fenced = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/i);
          if (fenced) jsonText = fenced[1].trim();
          const start = jsonText.indexOf('{');
          const end = jsonText.lastIndexOf('}');
          if (start === -1 || end === -1) {
            reject(new Error('JSON 블록을 찾을 수 없음'));
            return;
          }
          jsonText = jsonText.substring(start, end + 1);
          resolve(JSON.parse(jsonText));
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

// ━━━━━━━━━━━━━━━━ AI 요약 적용 ━━━━━━━━━━━━━━━━

async function applyAISummaries(news, cache) {
  let cachedCount = 0;
  let newSummaryCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const article of news) {
    const key = cacheKey(article);

    // 1. 캐시에 있으면 그대로 사용
    if (cache[key]) {
      article.summary = cache[key];
      cachedCount++;
      continue;
    }

    // 2. 원본이 너무 짧으면 스킵 (요약 가치 없음)
    if (!article.summary || article.summary.length < 30) {
      skippedCount++;
      continue;
    }

    // 3. 이번 실행에서 충분히 처리했으면 다음 실행으로 미룸
    if (newSummaryCount >= MAX_NEW_SUMMARIES_PER_RUN) {
      skippedCount++;
      continue;
    }

    // 4. Gemini 호출
    try {
      const aiSummary = await callGemini(article.title, article.summary);
      if (aiSummary && aiSummary.length > 10) {
        article.summary = aiSummary;
        cache[key] = aiSummary;
        newSummaryCount++;
        if (newSummaryCount % 10 === 0) {
          console.log(`  ✓ ${newSummaryCount}개 완료...`);
        }
      } else {
        skippedCount++;
      }
      // Rate limit 보호: 4.2초 대기 (15 RPM = 분당 15회)
      await sleep(4200);
    } catch (e) {
      errorCount++;
      console.warn(`  ✗ "${article.title.substring(0, 40)}..." 실패: ${e.message}`);
      if (errorCount > 5) {
        console.warn('⚠ 에러 5회 초과, AI 요약 중단 (다음 실행에서 재시도)');
        break;
      }
      // 에러 후 10초 대기 (back-off)
      await sleep(10000);
    }
  }

  console.log(`\n━━━ AI 요약 결과 ━━━`);
  console.log(`✓ 캐시 활용: ${cachedCount}건`);
  console.log(`✓ 신규 요약: ${newSummaryCount}건`);
  console.log(`- 스킵: ${skippedCount}건`);
  console.log(`✗ 실패: ${errorCount}건`);
}

// ━━━━━━━━━━━━━━━━ 날짜 유틸 ━━━━━━━━━━━━━━━━
// 구글 시트의 time 컬럼은 "3시간 전", "어제", "1주 전" 같은 상대 텍스트라
// 실제 날짜를 역산할 수 없음. 그래서 이 스크립트가 매일 실행될 때마다
// "오늘 처음 본 기사"를 스스로 기록해서(first-seen-cache.json) 그걸 기준으로
// "이번 주 신규 기사"를 판단한다.

// KST 기준 YYYY-MM-DD
function todayKST() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
}

function addDaysToDateString(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// 해당 날짜가 속한 주(週)의 월요일 날짜를 반환
function mondayOf(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = d.getUTCDay(); // 0=일 ... 6=토
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diffToMonday);
  return d.toISOString().slice(0, 10);
}

function formatWeekRangeKR(weekStart) {
  const start = new Date(weekStart + 'T00:00:00Z');
  const end = new Date(weekStart + 'T00:00:00Z');
  end.setUTCDate(end.getUTCDate() + 6);
  const fmt = (d) => `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
  return `${fmt(start)} ~ ${fmt(end)}`;
}

// first-seen 캐시 갱신: 오늘 처음 등장한 기사에 오늘 날짜를 기록
function updateFirstSeenCache(news, today, firstSeenCache) {
  let newlySeenCount = 0;
  for (const article of news) {
    const key = cacheKey(article);
    if (!firstSeenCache[key]) {
      firstSeenCache[key] = today;
      newlySeenCount++;
    }
  }
  return newlySeenCount;
}

// ━━━━━━━━━━━━━━━━ 주간 인사이트 생성 ━━━━━━━━━━━━━━━━

function buildWeeklyInsightPrompt(articles) {
  const listText = articles
    .slice(0, 60)
    .map((a, i) => `${i + 1}. [${CAT_LABEL[a.cat] || a.cat}] ${a.title} — ${(a.summary || '').slice(0, 60)}`)
    .join('\n');

  return `당신은 배터리 산업 전문 애널리스트입니다. 아래는 최근 1주일 내 새로 수집된 배터리 산업 관련 뉴스 목록입니다 (카테고리: 정책, 경쟁사, 고객사, 자사).

이 뉴스들을 분석해서 다음 세 가지를 도출해주세요.

1. keywords: 이번 주 뉴스에서 반복적으로 등장하거나 중요하게 다뤄진 핵심 키워드 8개 (중요도·언급 빈도 순)
2. issues: 이번 주의 주요 이슈 4~5개. 개별 기사 하나가 아니라, 여러 기사를 관통하는 흐름이나 사건 단위로 묶어서 정리
3. topics: 위 뉴스 흐름을 바탕으로 삼성SDI 소형전지(전동공구·고객사 대응 중심) 기획그룹이 이번 주에 논의하거나 발굴해볼 만한 주제 3~5개. 구체적이고 실행 가능한 형태로 제안하고, 어떤 뉴스/흐름에서 이 주제가 도출됐는지 근거를 함께 제시

반드시 아래 JSON 형식으로만 답변하세요. 다른 설명이나 마크다운 코드블록 없이 순수 JSON 텍스트만 출력하세요.

{
  "keywords": [{"keyword": "string", "count": number, "note": "한 줄 설명"}],
  "issues": [{"title": "이슈 제목", "summary": "2~3문장 요약", "why": "왜 중요한지 1문장"}],
  "topics": [{"title": "발굴 주제 제목", "description": "무엇을 논의/실행해야 하는지 구체적 설명 2~3문장", "rationale": "어떤 뉴스·흐름에서 도출됐는지"}]
}

뉴스 목록:
${listText}`;
}

async function generateWeeklyInsight(pool, weekStart) {
  const prompt = buildWeeklyInsightPrompt(pool);

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await callGeminiJSON(prompt);
      if (!Array.isArray(result.keywords) || !Array.isArray(result.issues) || !Array.isArray(result.topics)) {
        throw new Error('응답 형식이 예상과 다름 (keywords/issues/topics 배열 필요)');
      }
      return {
        weekStart,
        weekRange: formatWeekRangeKR(weekStart),
        generatedAt: new Date().toISOString(),
        articleCount: pool.length,
        keywords: result.keywords,
        issues: result.issues,
        topics: result.topics,
      };
    } catch (e) {
      lastError = e;
      console.warn(`  ✗ 주간 인사이트 시도 ${attempt}/3 실패: ${e.message}`);
      if (attempt < 3) {
        await sleep(8000 * attempt);
      }
    }
  }
  throw lastError;
}

// ━━━━━━━━━━━━━━━━ 경쟁사 동향 요약 ━━━━━━━━━━━━━━━━
// 경쟁사(LGES/CATL/AMPACE/EVE)별로 최근 기사를 모아 1~2문장 동향을 생성한다.
// AMPACE·EVE처럼 중국 회사라 국내 뉴스가 거의 없는 경우도 있으므로,
// 기사가 없는 회사는 AI를 호출하지 않고 "최근 특별한 동향 없음"으로 처리한다.

function buildCompetitorPrompt(groups) {
  const sections = Object.entries(groups)
    .map(([subId, articles]) => {
      const label = COMPETITOR_SUBS.find(c => c.id === subId)?.label || subId;
      const lines = articles
        .slice(0, 8)
        .map((a, i) => `  ${i + 1}. ${a.title} — ${(a.summary || '').slice(0, 60)}`)
        .join('\n');
      return `[${label}]\n${lines}`;
    })
    .join('\n\n');

  const keys = Object.keys(groups).join(', ');

  return `당신은 배터리 산업 전문 애널리스트입니다. 아래는 경쟁사별 최근 뉴스 목록입니다.

각 회사별로 이번 주 동향을 1~2문장으로 요약해주세요. 여러 기사를 관통하는 핵심만 짚고, 없는 내용을 지어내지 마세요.

반드시 아래 JSON 형식으로만 답변하세요 (키는 ${keys} 만 사용). 다른 설명이나 마크다운 코드블록 없이 순수 JSON 텍스트만 출력하세요.

{ ${Object.keys(groups).map(k => `"${k}": "string"`).join(', ')} }

${sections}`;
}

async function generateCompetitorSummaries(allNews) {
  const groups = {};
  for (const c of COMPETITOR_SUBS) {
    const articles = allNews.filter(a => a.cat === 'competitor' && a.sub === c.id);
    if (articles.length > 0) groups[c.id] = articles;
  }

  const result = {};
  for (const c of COMPETITOR_SUBS) {
    result[c.id] = { label: c.label, summary: null, articleCount: (groups[c.id] || []).length };
  }

  if (Object.keys(groups).length === 0) {
    return COMPETITOR_SUBS.map(c => ({ sub: c.id, label: c.label, summary: '최근 특별한 동향이 확인되지 않았습니다.', articleCount: 0 }));
  }

  if (!GEMINI_API_KEY) {
    return COMPETITOR_SUBS.map(c => ({
      sub: c.id,
      label: c.label,
      summary: result[c.id].articleCount > 0 ? null : '최근 특별한 동향이 확인되지 않았습니다.',
      articleCount: result[c.id].articleCount,
    }));
  }

  try {
    const prompt = buildCompetitorPrompt(groups);
    const aiResult = await callGeminiJSON(prompt, { temperature: 0.3, maxOutputTokens: 800 });
    for (const subId of Object.keys(groups)) {
      if (typeof aiResult[subId] === 'string' && aiResult[subId].trim()) {
        result[subId].summary = aiResult[subId].trim();
      }
    }
  } catch (e) {
    console.warn(`  ✗ 경쟁사 동향 생성 실패: ${e.message}`);
  }

  return COMPETITOR_SUBS.map(c => ({
    sub: c.id,
    label: c.label,
    summary: result[c.id].summary || (result[c.id].articleCount > 0
      ? `최근 관련 기사 ${result[c.id].articleCount}건 있음 (요약 생성 실패)`
      : '최근 특별한 동향이 확인되지 않았습니다.'),
    articleCount: result[c.id].articleCount,
  }));
}

// ━━━━━━━━━━━━━━━━ 발굴주제 아카이브(최근 8주) ━━━━━━━━━━━━━━━━

async function buildWeeklyInsight(allNews, firstSeenCache) {
  const today = todayKST();
  const weekStart = mondayOf(today);
  const prevWeekStart = mondayOf(addDaysToDateString(weekStart, -7));

  const history = loadJsonCache(HISTORY_PATH, []);
  const latest = history[0] || null;

  // 이번 주 것이 이미 있으면 그대로 재사용 (주 1회만 생성)
  if (latest && latest.weekStart === weekStart) {
    console.log(`\n📌 주간 인사이트: 이번 주(${weekStart}) 캐시 재사용`);
    return history;
  }

  if (!GEMINI_API_KEY) {
    console.warn('\n⚠ GEMINI_API_KEY 없음. 주간 인사이트는 이전 캐시를 유지합니다.');
    return history;
  }

  // 이번 주(월요일 이후) 처음 등장한 기사만 추림
  let pool = allNews.filter(a => (firstSeenCache[cacheKey(a)] || today) >= weekStart);

  // 신규 기사가 너무 적으면(주 초반 등) 지난 주까지 넓혀서 보완
  if (pool.length < 5) {
    console.log(`  ℹ 이번 주 신규 기사 ${pool.length}건 - 지난 주까지 범위 확대`);
    pool = allNews.filter(a => (firstSeenCache[cacheKey(a)] || today) >= prevWeekStart);
  }

  if (pool.length < 3) {
    console.warn(`\n⚠ 주간 인사이트: 분석할 기사가 부족함(${pool.length}건). 이전 캐시 유지.`);
    return history;
  }

  try {
    console.log(`\n🧠 주간 인사이트 생성 중... (분석 대상 ${pool.length}건)`);
    // 직전 기사 요약 루프의 Gemini 호출 rate limit 여유를 두기 위해 잠시 대기
    await sleep(6000);
    const insight = await generateWeeklyInsight(pool, weekStart);

    console.log('🏢 경쟁사 동향 생성 중...');
    await sleep(4000);
    insight.competitors = await generateCompetitorSummaries(allNews);

    const newHistory = [insight, ...history].slice(0, MAX_HISTORY_WEEKS);
    saveJsonCache(HISTORY_PATH, newHistory);
    console.log(`✓ 주간 인사이트 생성 완료: 키워드 ${insight.keywords.length}개, 이슈 ${insight.issues.length}개, 발굴주제 ${insight.topics.length}개`);
    return newHistory;
  } catch (e) {
    console.warn(`⚠ 주간 인사이트 생성 실패: ${e.message} - 이전 캐시 유지`);
    return history;
  }
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

    // AI 요약 적용
    if (GEMINI_API_KEY) {
      console.log('🤖 Gemini AI 요약 적용 중...');
      const cache = loadJsonCache(CACHE_PATH);
      console.log(`  기존 캐시: ${Object.keys(cache).length}건`);
      await applyAISummaries(allNews, cache);
      saveJsonCache(CACHE_PATH, cache);
    } else {
      console.warn('\n⚠ GEMINI_API_KEY 환경변수가 설정되지 않음. AI 요약 건너뜀.\n');
    }

    // 신규 기사 first-seen 기록 (주간 인사이트 대상 판별용)
    const firstSeenCache = loadJsonCache(FIRST_SEEN_CACHE_PATH);
    const today = todayKST();
    const newlySeenCount = updateFirstSeenCache(allNews, today, firstSeenCache);
    saveJsonCache(FIRST_SEEN_CACHE_PATH, firstSeenCache);
    console.log(`\n📅 오늘(${today}) 처음 발견된 기사: ${newlySeenCount}건`);

    // 주간 인사이트 아카이브 (키워드/주요이슈/기획그룹 발굴주제/경쟁사 동향) - 주 1회만 새로 생성, 최근 8주 보관
    const weeklyInsightHistory = await buildWeeklyInsight(allNews, firstSeenCache);
    const weeklyInsight = weeklyInsightHistory[0] || null;

    const featured = allNews.filter(n => n.featured).slice(0, 4);

    const data = {
      news: allNews,
      featured: featured,
      weeklyInsight: weeklyInsight,
      weeklyInsightHistory: weeklyInsightHistory,
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
    console.log(`🧠 주간 인사이트: ${weeklyInsight ? '있음 (' + weeklyInsight.weekStart + ')' : '없음'} · 아카이브 ${weeklyInsightHistory.length}주`);
    console.log(`📁 저장: public/data.json`);
  } catch (e) {
    console.error('❌ Error:', e);
    process.exit(1);
  }
})();
