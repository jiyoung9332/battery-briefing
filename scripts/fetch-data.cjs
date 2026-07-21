// ============================================================
// Battery Briefing - 자동 데이터 수집 (with Gemini AI 요약)
// 매일 GitHub Actions에서 실행 — 구글 시트 → data.json
// + 주간 인사이트: 이번 주 신규 기사 기준 키워드/이슈/기획그룹 발굴주제 자동 생성
// ============================================================

const fs = require('fs');
const path = require('path');
const https = require('https');
const AdmZip = require('adm-zip');

const SHEET_ID = process.env.SHEET_ID || '1Td8b1PEOLYdaMfNqRcOUu1S0n0-G36sSX85WTKv43oI';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const DART_API_KEY = process.env.DART_API_KEY || '';
const CACHE_PATH = path.join('scripts', 'ai-cache.json');
const FIRST_SEEN_CACHE_PATH = path.join('scripts', 'first-seen-cache.json');
const HISTORY_PATH = path.join('scripts', 'weekly-insight-history.json');
const DART_CORP_CACHE_PATH = path.join('scripts', 'dart-corp-codes.json');
const DAILY_INSIGHT_CACHE_PATH = path.join('scripts', 'daily-insight-cache.json');
const FINANCIAL_REPORT_CACHE_PATH = path.join('scripts', 'financial-report-cache.json');
const MAX_NEW_SUMMARIES_PER_RUN = 80; // 1회 실행 시 최대 신규 요약 개수 (rate limit 보호)
const MAX_HISTORY_WEEKS = 8; // 발굴주제 아카이브 보관 주 수

// DART(전자공시) 자동 수집 대상 - 국내 상장사만 가능 (해외사는 DART 대상 아님)
// type: 'battery'(배터리회사) | 'customer'(고객사) - 사이드바에서 그룹 구분에 사용
const DART_COMPANIES = [
  { id: 'sdi', label: '삼성SDI', type: 'battery', nameCandidates: ['삼성에스디아이', '삼성SDI'] },
  { id: 'lges', label: 'LG에너지솔루션', type: 'battery', nameCandidates: ['엘지에너지솔루션', 'LG에너지솔루션'] },
  { id: 'hyundai', label: '현대자동차', type: 'customer', nameCandidates: ['현대자동차'] },
];

// 담당팀 후보군 (주간 핵심이슈 자동 분류에 사용)
const TEAM_LIST = ['기획그룹', '구매팀', '개발실', '지원팀', '제조기술센터', '기술팀', '전략마케팅실'];

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

  const teamListText = TEAM_LIST.join(', ');

  return `당신은 배터리 산업 전문 애널리스트입니다. 아래는 최근 1주일 내 새로 수집된 배터리 산업 관련 뉴스 목록입니다 (카테고리: 정책, 경쟁사, 고객사, 자사).

이 뉴스들을 분석해서 다음 항목을 도출해주세요.

1. summary: 이번 주 전체 흐름을 요약하는 5~7문장 분량의 짧은 브리핑 문단. 어떤 이슈들이 있었는지, 서로 어떻게 연결되는지, 삼성SDI 소형전지 입장에서 왜 중요한지까지 구체적으로 풀어서 서술하세요. 단순 나열이 아니라 기사 형태의 문단으로 작성하세요.
2. keywords: 이번 주 뉴스에서 반복적으로 등장하거나 중요하게 다뤄진 핵심 키워드 8개 (중요도·언급 빈도 순)
3. issues: 이번 주 핵심이슈 TOP 5 (중요도 순, 정확히 5개 이하). 개별 기사 하나가 아니라 여러 기사를 관통하는 흐름·사건 단위로 정리하고, 각 이슈마다 아래 필드를 모두 채워주세요.
   - title: 이슈 제목
   - summary: 2~3문장 요약
   - impact: 삼성SDI 소형전지 사업 관점에서의 영향도 1~5 사이 정수 (5가 가장 큼)
   - owner: 이 이슈를 담당해서 살펴봐야 할 팀. 반드시 다음 목록 중 하나만 사용: ${teamListText}
     배정 기준: 여러 팀에 걸쳐 있거나 사업 방향에 대한 의사결정이 필요한 전략적 이슈는 "기획그룹"을 담당으로 지정하세요. 원가·구매조건처럼 구매팀의 실무 협상만으로 해결되는 좁은 실무 이슈일 때만 "구매팀"을, 특정 기술·양산·품질 실무에 국한된 이슈일 때만 "개발실"/"제조기술센터"/"기술팀"을 지정하세요. 단순히 원자재·가격 관련 키워드가 있다고 기계적으로 구매팀을 배정하지 말고, 이슈의 성격(전략적 판단 필요 여부)을 기준으로 판단하세요.
   - sdiImpact: 이 이슈가 삼성SDI에 구체적으로 어떤 영향을 미치는지 한 문장
   - actionPlan: 담당 조직이 취해야 할 추진방안 1~2문장
   - meetingCandidate: 다음 임원회의 안건으로 올릴 만큼 중요한지 true/false
   - shareTargets: 이 이슈를 함께 공유하면 좋을 팀들 (다음 목록의 부분집합, 0개 이상): ${teamListText}
4. topics: 위 뉴스 흐름을 바탕으로 삼성SDI 소형전지(전동공구·고객사 대응 중심) 기획그룹이 이번 주에 논의하거나 발굴해볼 만한 주제 3~5개. 구체적이고 실행 가능한 형태로 제안하고, 어떤 뉴스/흐름에서 이 주제가 도출됐는지 근거를 함께 제시
5. reportCandidates: 위 이슈들 중 별도의 정식 보고서로 작성할 가치가 있는 주제 1~3개. 각각 title(보고서 제목)과 targetAudience("사업부장" 또는 "지원팀장" 중 하나), reason(왜 보고할 가치가 있는지 1문장)을 포함
6. overallResponse: 이번 주 이슈 전체를 종합했을 때 삼성SDI 소형전지 조직이 취해야 할 전반적 대응방향 2~3문장
7. themeClusters: 이번 주 이슈·키워드를 2~4개의 상위 테마로 묶어주세요. 각 테마마다 짧은 태그 형태의 하위 항목 2~3개를 포함합니다 (예: 테마 "ESS 성장" 아래 "중국 LFP 증설", "LG엔솔 46시리즈 수주"처럼 아주 짧은 명사구로). 하위 항목은 문장이 아니라 5~12자 내외의 짧은 태그여야 합니다. 각 테마마다 "이 테마가 삼성SDI에게 왜 중요한지"를 한 문장(whySdi)으로 반드시 함께 작성하세요.

반드시 아래 JSON 형식으로만 답변하세요. 다른 설명이나 마크다운 코드블록 없이 순수 JSON 텍스트만 출력하세요.

{
  "summary": "string",
  "keywords": [{"keyword": "string", "count": number, "note": "한 줄 설명"}],
  "issues": [{"title": "string", "summary": "string", "impact": number, "owner": "string", "sdiImpact": "string", "actionPlan": "string", "meetingCandidate": boolean, "shareTargets": ["string"]}],
  "topics": [{"title": "발굴 주제 제목", "description": "무엇을 논의/실행해야 하는지 구체적 설명 2~3문장", "rationale": "어떤 뉴스·흐름에서 도출됐는지"}],
  "reportCandidates": [{"title": "string", "targetAudience": "사업부장 또는 지원팀장", "reason": "string"}],
  "overallResponse": "string",
  "themeClusters": [{"theme": "string", "items": ["string"], "whySdi": "이 테마가 삼성SDI에게 왜 중요한지 한 문장"}]
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
      if (
        !Array.isArray(result.keywords) ||
        !Array.isArray(result.issues) ||
        !Array.isArray(result.topics) ||
        !Array.isArray(result.reportCandidates) ||
        !Array.isArray(result.themeClusters)
      ) {
        throw new Error('응답 형식이 예상과 다름 (keywords/issues/topics/reportCandidates/themeClusters 배열 필요)');
      }
      return {
        weekStart,
        weekRange: formatWeekRangeKR(weekStart),
        generatedAt: new Date().toISOString(),
        articleCount: pool.length,
        summary: result.summary || '',
        keywords: result.keywords,
        issues: result.issues.slice(0, 5),
        topics: result.topics,
        reportCandidates: result.reportCandidates,
        overallResponse: result.overallResponse || '',
        themeClusters: result.themeClusters,
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

  // 이번 주 것이 이미 있고, 최신 스키마(summary/reportCandidates/themeClusters.whySdi 포함)로 생성된 것이면 그대로 재사용 (주 1회만 생성)
  // 스키마가 바뀐 뒤 남아있는 예전 캐시는 여기서 걸러져서 자동으로 다시 생성된다.
  const hasCurrentSchema = latest
    && typeof latest.summary === 'string'
    && Array.isArray(latest.reportCandidates)
    && Array.isArray(latest.themeClusters)
    && latest.themeClusters.every(t => typeof t.whySdi === 'string' && t.whySdi.length > 0);
  if (latest && latest.weekStart === weekStart && hasCurrentSchema) {
    console.log(`\n📌 주간 인사이트: 이번 주(${weekStart}) 캐시 재사용`);
    return history;
  }
  if (latest && latest.weekStart === weekStart && !hasCurrentSchema) {
    console.log(`\n🔄 주간 인사이트: 이번 주(${weekStart}) 캐시가 예전 스키마라 새로 생성합니다.`);
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

// ━━━━━━━━━━━━━━━━ 일간 인사이트 생성 (오늘의 키워드/이슈요약) ━━━━━━━━━━━━━━━━
// 첫 페이지에 표시할 "오늘의" 콘텐츠. 주간 인사이트와 별개로 매일 새로 생성한다.

function buildDailyInsightPrompt(articles) {
  const listText = articles
    .slice(0, 40)
    .map((a, i) => `${i + 1}. [${CAT_LABEL[a.cat] || a.cat}] ${a.title} — ${(a.summary || '').slice(0, 60)}`)
    .join('\n');

  return `당신은 배터리 산업 전문 애널리스트입니다. 아래는 오늘 새로 수집된 배터리 산업 관련 뉴스 목록입니다 (카테고리: 정책, 경쟁사, 고객사, 자사).

이 뉴스들을 분석해서 다음 항목을 도출해주세요.

1. keywords: 오늘 뉴스에서 반복적으로 등장하거나 중요하게 다뤄진 핵심 키워드 5개 (중요도·언급 빈도 순). 각 키워드마다 그 키워드가 등장한 오늘 기사 중 가장 대표적인 기사의 제목을 headline으로 그대로 인용하세요 (목록에 있는 기사 제목을 그대로 사용, 요약하거나 새로 만들지 마세요).
2. categorySummaries: 오늘 새 기사가 있었던 카테고리(정책/경쟁사/고객사/자사)별로 핵심 동향을 1~2문장씩 요약. 오늘 해당 카테고리에 뉴스가 없으면 그 카테고리는 제외하세요. cat 필드는 반드시 policy/competitor/customer/own 중 하나만 사용하세요.
3. reportAgenda: 오늘 뉴스 흐름 중 삼성SDI 소형전지 기획그룹이 임원 또는 유관부서에 보고할 만큼 중요한 안건 1~3개 (없으면 빈 배열). 각각 title(안건 제목)과 reason(왜 보고할 만한지 1문장)을 포함하세요.

반드시 아래 JSON 형식으로만 답변하세요. 다른 설명이나 마크다운 코드블록 없이 순수 JSON 텍스트만 출력하세요.

{
  "keywords": [{"keyword": "string", "count": number, "headline": "string"}],
  "categorySummaries": [{"cat": "policy 또는 competitor 또는 customer 또는 own", "summary": "string"}],
  "reportAgenda": [{"title": "string", "reason": "string"}]
}

뉴스 목록:
${listText}`;
}

async function generateDailyInsight(pool, date) {
  const prompt = buildDailyInsightPrompt(pool);

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await callGeminiJSON(prompt, { temperature: 0.4, maxOutputTokens: 1500 });
      if (
        !Array.isArray(result.keywords) ||
        !Array.isArray(result.categorySummaries) ||
        !Array.isArray(result.reportAgenda)
      ) {
        throw new Error('응답 형식이 예상과 다름 (keywords/categorySummaries/reportAgenda 배열 필요)');
      }
      return {
        date,
        generatedAt: new Date().toISOString(),
        articleCount: pool.length,
        keywords: result.keywords,
        categorySummaries: result.categorySummaries,
        reportAgenda: result.reportAgenda,
      };
    } catch (e) {
      lastError = e;
      console.warn(`  ✗ 일간 인사이트 시도 ${attempt}/3 실패: ${e.message}`);
      if (attempt < 3) {
        await sleep(6000 * attempt);
      }
    }
  }
  throw lastError;
}

async function buildDailyInsight(allNews, firstSeenCache) {
  const today = todayKST();
  const cached = loadJsonCache(DAILY_INSIGHT_CACHE_PATH, null);

  // 스키마가 바뀐 뒤 남아있는 예전 캐시(categorySummaries/reportAgenda/키워드별 headline 없음)는 걸러내고 다시 생성한다.
  const hasCurrentSchema = cached
    && Array.isArray(cached.categorySummaries)
    && Array.isArray(cached.reportAgenda)
    && Array.isArray(cached.keywords)
    && cached.keywords.every(k => typeof k.headline === 'string' && k.headline.length > 0);

  if (cached && cached.date === today && hasCurrentSchema) {
    console.log(`\n📌 일간 인사이트: 오늘(${today}) 캐시 재사용`);
    return cached;
  }

  if (!GEMINI_API_KEY) {
    console.warn('\n⚠ GEMINI_API_KEY 없음. 일간 인사이트는 이전 캐시를 유지합니다.');
    return cached;
  }

  let pool = allNews.filter(a => (firstSeenCache[cacheKey(a)] || today) === today);

  // 오늘 신규 기사가 너무 적으면(주말 등) 최근 2일로 범위 확대
  if (pool.length < 3) {
    const yesterday = addDaysToDateString(today, -1);
    console.log(`  ℹ 오늘 신규 기사 ${pool.length}건 - 최근 2일로 범위 확대`);
    pool = allNews.filter(a => (firstSeenCache[cacheKey(a)] || today) >= yesterday);
  }

  if (pool.length < 2) {
    console.warn(`\n⚠ 일간 인사이트: 분석할 기사가 부족함(${pool.length}건). 이전 캐시 유지.`);
    return cached;
  }

  try {
    console.log(`\n🧠 일간 인사이트 생성 중... (분석 대상 ${pool.length}건)`);
    await sleep(5000);
    const insight = await generateDailyInsight(pool, today);
    saveJsonCache(DAILY_INSIGHT_CACHE_PATH, insight);
    console.log(`✓ 일간 인사이트 생성 완료: 키워드 ${insight.keywords.length}개`);
    return insight;
  } catch (e) {
    console.warn(`⚠ 일간 인사이트 생성 실패: ${e.message} - 이전 캐시 유지`);
    return cached;
  }
}

// ━━━━━━━━━━━━━━━━ DART(전자공시) 자동 수집 ━━━━━━━━━━━━━━━━
// 국내 상장사(삼성SDI/LG에너지솔루션/현대차)의 최근 2주 공시 목록을 가져온다.
// corp_code는 DART의 corpCode.xml(zip)에서 회사명으로 찾아 1회만 조회 후 캐시한다.

function httpsGetBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function httpsGetJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

function extractXmlTag(block, tag) {
  const m = block.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([^<]*?)(?:\\]\\]>)?<\\/${tag}>`));
  return m ? m[1].trim() : null;
}

async function resolveDartCorpCodes() {
  const cache = loadJsonCache(DART_CORP_CACHE_PATH, {});
  const needed = DART_COMPANIES.filter(c => !cache[c.id]);
  if (needed.length === 0) return cache;

  if (!DART_API_KEY) return cache;

  console.log('  DART corp_code 조회 중... (최초 1회만 실행되고 이후엔 캐시 사용)');
  const buf = await httpsGetBuffer(`https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=${DART_API_KEY}`);
  const zip = new AdmZip(buf);
  const entry = zip.getEntries().find(e => /CORPCODE/i.test(e.entryName));
  if (!entry) throw new Error('CORPCODE.xml 항목을 찾을 수 없음 (DART_API_KEY 확인 필요)');
  const xml = zip.readAsText(entry, 'utf8');

  const blocks = xml.split('<list>').slice(1);
  for (const block of blocks) {
    const name = extractXmlTag(block, 'corp_name');
    const code = extractXmlTag(block, 'corp_code');
    if (!name || !code) continue;
    for (const company of DART_COMPANIES) {
      if (cache[company.id]) continue;
      if (company.nameCandidates.includes(name)) {
        cache[company.id] = code;
        console.log(`  ✓ ${company.label} corp_code 확인: ${code}`);
      }
    }
  }
  saveJsonCache(DART_CORP_CACHE_PATH, cache);
  return cache;
}

function fmtDateCompact(d) {
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

async function fetchDartFilings(corpCodeMap) {
  if (!DART_API_KEY) {
    console.warn('  ⚠ DART_API_KEY 없음 — 공시 수집 건너뜀 (opendart.fss.or.kr에서 무료 발급 가능)');
    return null;
  }

  const end = new Date();
  const begin = new Date(end.getTime() - 14 * 24 * 3600 * 1000);
  const bgn_de = fmtDateCompact(begin);
  const end_de = fmtDateCompact(end);

  const companies = [];
  for (const company of DART_COMPANIES) {
    const corpCode = corpCodeMap[company.id];
    if (!corpCode) {
      console.warn(`  ✗ ${company.label} corp_code를 찾지 못함`);
      companies.push({ id: company.id, label: company.label, type: company.type, filings: [] });
      continue;
    }
    try {
      const url = `https://opendart.fss.or.kr/api/list.json?crtfc_key=${DART_API_KEY}&corp_code=${corpCode}&bgn_de=${bgn_de}&end_de=${end_de}&page_no=1&page_count=10`;
      const json = await httpsGetJSON(url);
      if (json.status !== '000' && json.status !== '013') {
        console.warn(`  ✗ ${company.label} DART 조회 실패: ${json.status} ${json.message || ''}`);
        companies.push({ id: company.id, label: company.label, type: company.type, filings: [] });
      } else {
        const filings = (json.list || []).slice(0, 5).map(item => ({
          title: item.report_nm,
          date: item.rcept_dt,
          link: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${item.rcept_no}`,
        }));
        companies.push({ id: company.id, label: company.label, type: company.type, filings });
        console.log(`  ✓ ${company.label} 공시 ${filings.length}건`);
      }
    } catch (e) {
      console.warn(`  ✗ ${company.label} DART 조회 오류: ${e.message}`);
      companies.push({ id: company.id, label: company.label, type: company.type, filings: [] });
    }
    await sleep(300);
  }

  return { generatedAt: new Date().toISOString(), companies };
}

// ━━━━━━━━━━━━━━━━ DART 분기 실적(재무제표) 요약 ━━━━━━━━━━━━━━━━
// 매출액/영업이익/당기순이익을 DART 재무제표 API에서 가져온다.
// 공시 시점에 따라 아직 안 나온 분기도 있으므로, 최신 것부터 순서대로 시도한다.

function getReportCandidates(today) {
  const d = new Date(today + 'T00:00:00Z');
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1; // 1~12

  const candidates = [];
  if (month >= 11) {
    candidates.push(['11014', String(year), '3분기보고서']);
    candidates.push(['11012', String(year), '반기보고서']);
  } else if (month >= 8) {
    candidates.push(['11012', String(year), '반기보고서']);
    candidates.push(['11013', String(year), '1분기보고서']);
  } else if (month >= 5) {
    candidates.push(['11013', String(year), '1분기보고서']);
    candidates.push(['11011', String(year - 1), '사업보고서']);
  } else {
    candidates.push(['11011', String(year - 1), '사업보고서']);
    candidates.push(['11014', String(year - 1), '3분기보고서']);
  }
  return candidates;
}

async function fetchCompanyFinancials(corpCode) {
  const candidates = getReportCandidates(todayKST());
  for (const [reprtCode, bsnsYear, label] of candidates) {
    try {
      const url = `https://opendart.fss.or.kr/api/fnlttSinglAcnt.json?crtfc_key=${DART_API_KEY}&corp_code=${corpCode}&bsns_year=${bsnsYear}&reprt_code=${reprtCode}`;
      const json = await httpsGetJSON(url);
      if (json.status === '000' && Array.isArray(json.list) && json.list.length > 0) {
        const cfsRows = json.list.filter(r => r.fs_div === 'CFS'); // 연결재무제표 우선
        const rows = cfsRows.length > 0 ? cfsRows : json.list;
        const pick = (name) => rows.find(r => r.account_nm === name);
        const revenue = pick('매출액');
        const opProfit = pick('영업이익');
        const netProfit = pick('당기순이익');
        if (!revenue && !opProfit) {
          await sleep(300);
          continue; // 계정을 못 찾으면 다음 후보(이전 분기)로
        }
        return {
          reportLabel: label,
          bsnsYear,
          revenue: revenue ? { current: revenue.thstrm_amount, prev: revenue.frmtrm_amount } : null,
          operatingProfit: opProfit ? { current: opProfit.thstrm_amount, prev: opProfit.frmtrm_amount } : null,
          netProfit: netProfit ? { current: netProfit.thstrm_amount, prev: netProfit.frmtrm_amount } : null,
        };
      }
    } catch (e) {
      // 이 후보 실패, 다음 후보로 넘어감
    }
    await sleep(300);
  }
  return null;
}

// 정기보고서는 연중 1분기(11013) → 반기(11012, 누적) → 3분기(11014, 누적) → 사업보고서(11011, 연간) 순.
// 최근 N개 보고서의 매출/영업이익을 뒤로 거슬러 올라가며 모아 추이를 만든다.
// 반기·3분기는 누적 수치라는 점을 라벨에 명시해 오해가 없도록 한다.
const REPORT_SEQUENCE = ['11013', '11012', '11014', '11011'];
const REPORT_LABEL_MAP = {
  '11013': '1분기',
  '11012': '반기(누적)',
  '11014': '3분기(누적)',
  '11011': '사업보고서(연간)',
};

function prevReportPeriod(reprtCode, year) {
  const idx = REPORT_SEQUENCE.indexOf(reprtCode);
  if (idx <= 0) return [REPORT_SEQUENCE[REPORT_SEQUENCE.length - 1], year - 1];
  return [REPORT_SEQUENCE[idx - 1], year];
}

async function fetchCompanyFinancialTrend(corpCode, desiredCount = 4) {
  const latest = getReportCandidates(todayKST())[0];
  let reprtCode = latest[0];
  let year = Number(latest[1]);

  const results = [];
  let guard = 0;
  while (results.length < desiredCount && guard < 10) {
    guard++;
    try {
      const url = `https://opendart.fss.or.kr/api/fnlttSinglAcnt.json?crtfc_key=${DART_API_KEY}&corp_code=${corpCode}&bsns_year=${year}&reprt_code=${reprtCode}`;
      const json = await httpsGetJSON(url);
      if (json.status === '000' && Array.isArray(json.list) && json.list.length > 0) {
        const cfsRows = json.list.filter(r => r.fs_div === 'CFS');
        const rows = cfsRows.length > 0 ? cfsRows : json.list;
        const pick = (name) => rows.find(r => r.account_nm === name);
        const revenue = pick('매출액');
        const opProfit = pick('영업이익');
        if (revenue || opProfit) {
          results.push({
            label: `${REPORT_LABEL_MAP[reprtCode]} ${year}`,
            year,
            reprtCode,
            revenue: revenue ? revenue.thstrm_amount : null,
            operatingProfit: opProfit ? opProfit.thstrm_amount : null,
          });
        }
      }
    } catch (e) {
      // 이 시점 조회 실패, 계속 과거로 이동
    }
    [reprtCode, year] = prevReportPeriod(reprtCode, year);
    await sleep(300);
  }
  return results.reverse(); // 오래된 것부터 최신 순으로
}

// 회사개황(대표자/주소/홈페이지)
async function fetchCompanyProfile(corpCode) {
  try {
    const url = `https://opendart.fss.or.kr/api/company.json?crtfc_key=${DART_API_KEY}&corp_code=${corpCode}`;
    const json = await httpsGetJSON(url);
    if (json.status === '000') {
      return {
        ceoName: json.ceo_nm || null,
        address: json.adres || null,
        homepageUrl: json.hm_url || null,
        estDate: json.est_dt || null,
      };
    }
  } catch (e) {
    // 회사개황 조회 실패, null 반환
  }
  return null;
}

function parseDartNumber(str) {
  if (!str || str === '-') return null;
  const n = Number(String(str).replace(/,/g, ''));
  return isFinite(n) ? n : null;
}

// 직원현황은 분기보고서(11013/11014)에는 생략되는 경우가 많아, 반기·사업보고서 위주로 조회한다.
function getEmployeeReportCandidates(today) {
  const d = new Date(today + 'T00:00:00Z');
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const candidates = [];
  if (month >= 8) {
    candidates.push(['11012', String(year), '반기보고서']);
    candidates.push(['11011', String(year - 1), '사업보고서']);
  } else {
    candidates.push(['11011', String(year - 1), '사업보고서']);
    candidates.push(['11012', String(year - 1), '반기보고서']);
  }
  return candidates;
}

// 직원현황 - 성별/사업부문별로 나뉜 행을 합산해 전체 인원수·가중평균 급여를 계산한다.
async function fetchCompanyEmployees(corpCode) {
  const candidates = getEmployeeReportCandidates(todayKST());
  for (const [reprtCode, bsnsYear, label] of candidates) {
    try {
      const url = `https://opendart.fss.or.kr/api/empSttus.json?crtfc_key=${DART_API_KEY}&corp_code=${corpCode}&bsns_year=${bsnsYear}&reprt_code=${reprtCode}`;
      const json = await httpsGetJSON(url);
      if (json.status === '000' && Array.isArray(json.list) && json.list.length > 0) {
        let totalHeadcount = 0;
        let totalSalary = 0;
        let hasData = false;
        for (const row of json.list) {
          const sm = parseDartNumber(row.sm);
          const salary = parseDartNumber(row.fyer_salary_totamt);
          if (sm !== null) { totalHeadcount += sm; hasData = true; }
          if (salary !== null) totalSalary += salary;
        }
        if (hasData && totalHeadcount > 0) {
          return {
            reportLabel: label,
            bsnsYear,
            totalHeadcount,
            avgAnnualSalary: totalSalary > 0 ? Math.round(totalSalary / totalHeadcount) : null,
          };
        }
      }
    } catch (e) {
      // 이 후보 실패, 다음 후보로
    }
    await sleep(300);
  }
  return null;
}

// 요약 재무현황(당기/전기/전전기) - 사업보고서(11011)에만 전전기(bfefrmtrm)가 나오므로
// 반드시 사업보고서 기준으로만 조회한다. 가장 최근 사업연도부터 최대 2개 연도까지 시도.
function pickAccount(rows, name) {
  return rows.find(r => r.account_nm === name || r.account_nm.startsWith(name));
}

async function fetchCompanySummaryFinancials(corpCode) {
  const year = new Date(todayKST() + 'T00:00:00Z').getUTCFullYear();
  const candidateYears = [year - 1, year - 2];

  for (const y of candidateYears) {
    try {
      const url = `https://opendart.fss.or.kr/api/fnlttSinglAcnt.json?crtfc_key=${DART_API_KEY}&corp_code=${corpCode}&bsns_year=${y}&reprt_code=11011`;
      const json = await httpsGetJSON(url);
      if (json.status === '000' && Array.isArray(json.list) && json.list.length > 0) {
        const cfsRows = json.list.filter(r => r.fs_div === 'CFS');
        const ofsRows = json.list.filter(r => r.fs_div === 'OFS');
        const revenue = pickAccount(cfsRows, '매출액');
        const opProfit = pickAccount(cfsRows, '영업이익');
        const netProfit = pickAccount(cfsRows, '당기순이익');
        const assetsCfs = pickAccount(cfsRows, '자산총계');
        const assetsOfs = pickAccount(ofsRows, '자산총계');
        const liabilitiesCfs = pickAccount(cfsRows, '부채총계');
        const equityCfs = pickAccount(cfsRows, '자본총계');
        if (!revenue && !opProfit && !assetsCfs) {
          await sleep(300);
          continue;
        }
        const ref = revenue || opProfit || netProfit || assetsCfs;
        const toRow = (item) => item
          ? { thstrm: item.thstrm_amount, frmtrm: item.frmtrm_amount, bfefrmtrm: item.bfefrmtrm_amount }
          : null;
        return {
          bsnsYear: String(y),
          thstrmNm: ref.thstrm_nm || null,
          frmtrmNm: ref.frmtrm_nm || null,
          bfefrmtrmNm: ref.bfefrmtrm_nm || null,
          revenue: toRow(revenue),
          operatingProfit: toRow(opProfit),
          netProfit: toRow(netProfit),
          totalAssetsCfs: toRow(assetsCfs),
          totalAssetsOfs: toRow(assetsOfs),
          liabilitiesCfs: toRow(liabilitiesCfs),
          equityCfs: toRow(equityCfs),
        };
      }
    } catch (e) {
      // 이 연도 실패, 다음 후보로
    }
    await sleep(300);
  }
  return null;
}

async function fetchDartFinancials(corpCodeMap) {
  if (!DART_API_KEY) return null;

  const companies = [];
  for (const company of DART_COMPANIES) {
    const corpCode = corpCodeMap[company.id];
    if (!corpCode) {
      companies.push({ id: company.id, label: company.label, type: company.type, financials: null, trend: [], profile: null, employees: null, summaryFinancials: null });
      continue;
    }
    try {
      const financials = await fetchCompanyFinancials(corpCode);
      const trend = await fetchCompanyFinancialTrend(corpCode, 4);
      const profile = await fetchCompanyProfile(corpCode);
      const employees = await fetchCompanyEmployees(corpCode);
      const summaryFinancials = await fetchCompanySummaryFinancials(corpCode);
      companies.push({ id: company.id, label: company.label, type: company.type, financials, trend, profile, employees, summaryFinancials });
      console.log(`  ✓ ${company.label} 실적 조회: ${financials ? financials.reportLabel + ' (' + financials.bsnsYear + ')' : '데이터 없음'} · 추이 ${trend.length}개 · 직원 ${employees ? employees.totalHeadcount + '명' : '데이터 없음'} · 요약재무 ${summaryFinancials ? summaryFinancials.bsnsYear : '없음'}`);
    } catch (e) {
      console.warn(`  ✗ ${company.label} 실적 조회 오류: ${e.message}`);
      companies.push({ id: company.id, label: company.label, type: company.type, financials: null, trend: [], profile: null, employees: null, summaryFinancials: null });
    }
  }
  return { generatedAt: new Date().toISOString(), companies };
}

// ━━━━━━━━━━━━━━━━ AI 재무 리포트 (SDI/LGES 비교 요약 + 차트용 데이터) ━━━━━━━━━━━━━━━━
// 비교 차트 수치는 절대 AI에게 계산시키지 않고 여기서 코드로 직접 계산한다.
// AI는 이미 계산된 숫자를 근거로 요약문·하이라이트·리스크 "텍스트"만 생성한다.
function eokRound(raw) {
  if (raw === undefined || raw === null) return null;
  const n = Number(String(raw).replace(/,/g, ''));
  if (!isFinite(n)) return null;
  return Math.round(n / 100000000); // 원 -> 억원
}

// 부채비율(%) = 부채총계 / 자본총계 * 100. 재무안정성(레버리지) 지표.
function debtRatioPct(item) {
  if (!item) return null;
  const calc = (liab, equity) => {
    const l = Number(String(liab).replace(/,/g, ''));
    const e = Number(String(equity).replace(/,/g, ''));
    if (!isFinite(l) || !isFinite(e) || e === 0) return null;
    return Math.round((l / e) * 1000) / 10; // 소수점 1자리
  };
  return calc(item.liabilities, item.equity);
}

function buildDebtRatioRow(sf) {
  if (!sf || !sf.liabilitiesCfs || !sf.equityCfs) return null;
  const at = (period) => debtRatioPct({
    liabilities: sf.liabilitiesCfs[period],
    equity: sf.equityCfs[period],
  });
  return { thstrm: at('thstrm'), frmtrm: at('frmtrm'), bfefrmtrm: at('bfefrmtrm') };
}

function buildComparisonData(companies) {
  const metrics = [
    { key: 'revenue', label: '매출액', unit: '억원' },
    { key: 'operatingProfit', label: '영업이익', unit: '억원' },
    { key: 'netProfit', label: '당기순이익', unit: '억원' },
  ];
  const rows = metrics.map(m => {
    const row = { metric: m.label, unit: m.unit };
    for (const c of companies) {
      const item = c.summaryFinancials && c.summaryFinancials[m.key];
      row[c.id] = item ? eokRound(item.thstrm) : null;
    }
    return row;
  });

  const debtRow = { metric: '부채비율', unit: '%' };
  let hasDebtRow = false;
  for (const c of companies) {
    const ratio = buildDebtRatioRow(c.summaryFinancials);
    debtRow[c.id] = ratio ? ratio.thstrm : null;
    if (ratio) hasDebtRow = true;
  }
  if (hasDebtRow) rows.push(debtRow);

  return rows;
}

function buildFinancialReportPrompt(companies) {
  const fmt = (item) => item
    ? `당기 ${eokRound(item.thstrm)}억원 (전기 ${eokRound(item.frmtrm)}억원, 전전기 ${eokRound(item.bfefrmtrm)}억원)`
    : '데이터 없음';
  const fmtPct = (row) => row
    ? `당기 ${row.thstrm ?? '-'}% (전기 ${row.frmtrm ?? '-'}%, 전전기 ${row.bfefrmtrm ?? '-'}%)`
    : '데이터 없음';

  const lines = companies.map(c => {
    const sf = c.summaryFinancials;
    if (!sf) return `[${c.label}] 데이터 없음`;
    const debtRow = buildDebtRatioRow(sf);
    return `[${c.label}] (${sf.thstrmNm || sf.bsnsYear}기 사업보고서 기준)\n- 매출액: ${fmt(sf.revenue)}\n- 영업이익: ${fmt(sf.operatingProfit)}\n- 당기순이익: ${fmt(sf.netProfit)}\n- 연결 자산총액: ${fmt(sf.totalAssetsCfs)}\n- 부채비율(부채총계/자본총계): ${fmtPct(debtRow)}`;
  }).join('\n\n');

  return `당신은 배터리 산업 재무 담당 애널리스트입니다. 아래는 DART 사업보고서에서 조회한 삼성SDI와 LG에너지솔루션의 최근 3개년(당기/전기/전전기) 요약 재무 데이터입니다. 주어진 숫자만 근거로 사용하고 없는 숫자를 만들어내지 마세요.

${lines}

다음 항목을 도출해주세요.
1. summary: 두 회사의 최근 실적 흐름과 리스크를 비교하는 3~5문장 요약 (숫자를 인용할 때는 위에 주어진 숫자만 사용)
2. highlights: 핵심 포인트 3~4개. 각각 label(4~10자 라벨), value(간단한 상태/수치 설명), tone(danger 위험·적자·감소, success 긍정적 흐름, neutral 중립 중 하나)
3. risks: 두 회사에 공통되거나 개별적인 재무 리스크 요인 1~3개. 각각 title, description(1~2문장)

반드시 아래 JSON 형식으로만 답변하세요. 다른 설명이나 마크다운 코드블록 없이 순수 JSON 텍스트만 출력하세요.

{
  "summary": "string",
  "highlights": [{"label": "string", "value": "string", "tone": "danger 또는 success 또는 neutral"}],
  "risks": [{"title": "string", "description": "string"}]
}`;
}

async function generateFinancialReportText(companies) {
  const prompt = buildFinancialReportPrompt(companies);
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await callGeminiJSON(prompt, { temperature: 0.3, maxOutputTokens: 1200 });
      if (!Array.isArray(result.highlights) || !Array.isArray(result.risks) || typeof result.summary !== 'string') {
        throw new Error('응답 형식이 예상과 다름 (summary/highlights/risks 필요)');
      }
      return { summary: result.summary, highlights: result.highlights, risks: result.risks };
    } catch (e) {
      lastError = e;
      console.warn(`  ✗ AI 재무 리포트 시도 ${attempt}/3 실패: ${e.message}`);
      if (attempt < 3) await sleep(6000 * attempt);
    }
  }
  throw lastError;
}

async function buildFinancialReport(dartFinancials) {
  if (!dartFinancials || !Array.isArray(dartFinancials.companies)) return null;
  const companies = dartFinancials.companies.filter(c => c.type === 'battery' && c.summaryFinancials);
  if (companies.length === 0) return null;

  const comparison = buildComparisonData(companies);
  // 데이터가 바뀌면(새 사업보고서 반영 등) 캐시를 새로 만들기 위한 서명
  const signature = companies.map(c => `${c.id}:${c.summaryFinancials.thstrmNm || c.summaryFinancials.bsnsYear}`).join('|');
  const today = todayKST();
  const cached = loadJsonCache(FINANCIAL_REPORT_CACHE_PATH, null);

  if (cached && cached.signature === signature && cached.date === today) {
    console.log('  📌 AI 재무 리포트: 캐시 재사용');
    return { ...cached, comparison };
  }

  if (!GEMINI_API_KEY) {
    console.warn('  ⚠ GEMINI_API_KEY 없음. AI 재무 리포트 텍스트 생성은 건너뜁니다 (비교차트 데이터는 유지).');
    return cached ? { ...cached, comparison } : { comparison, summary: null, highlights: [], risks: [] };
  }

  try {
    console.log('  🧠 AI 재무 리포트 생성 중...');
    await sleep(4000);
    const text = await generateFinancialReportText(companies);
    const report = { date: today, signature, generatedAt: new Date().toISOString(), companies: companies.map(c => c.label), comparison, ...text };
    saveJsonCache(FINANCIAL_REPORT_CACHE_PATH, report);
    console.log(`  ✓ AI 재무 리포트 생성 완료: 하이라이트 ${text.highlights.length}개, 리스크 ${text.risks.length}개`);
    return report;
  } catch (e) {
    console.warn(`  ⚠ AI 재무 리포트 생성 실패: ${e.message} - 이전 캐시 유지`);
    return cached ? { ...cached, comparison } : { comparison, summary: null, highlights: [], risks: [] };
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

    // 일간 인사이트 (오늘의 키워드/이슈요약) - 매일 새로 생성, 첫 페이지에 노출
    const dailyInsight = await buildDailyInsight(allNews, firstSeenCache);

    // DART 공시 및 분기 실적 자동 수집 (국내 상장사: 삼성SDI/LG에너지솔루션/현대차)
    let dartFilings = null;
    let dartFinancials = null;
    console.log('\n🏛️ DART 공시 수집 중...');
    try {
      const corpCodeMap = await resolveDartCorpCodes();
      dartFilings = await fetchDartFilings(corpCodeMap);
      console.log('\n💰 DART 분기 실적 수집 중...');
      dartFinancials = await fetchDartFinancials(corpCodeMap);
    } catch (e) {
      console.warn(`⚠ DART 수집 실패: ${e.message}`);
    }

    // AI 재무 리포트 (SDI/LGES 요약 재무현황 기반 요약문 + 비교차트 데이터)
    let financialReport = null;
    console.log('\n📑 AI 재무 리포트 생성 중...');
    try {
      financialReport = await buildFinancialReport(dartFinancials);
    } catch (e) {
      console.warn(`⚠ AI 재무 리포트 생성 실패: ${e.message}`);
    }

    const featured = allNews.filter(n => n.featured).slice(0, 4);

    const data = {
      news: allNews,
      featured: featured,
      dailyInsight: dailyInsight,
      weeklyInsight: weeklyInsight,
      weeklyInsightHistory: weeklyInsightHistory,
      dartFilings: dartFilings,
      dartFinancials: dartFinancials,
      financialReport: financialReport,
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
    console.log(`📌 일간 인사이트: ${dailyInsight ? '있음 (' + dailyInsight.date + ')' : '없음'}`);
    console.log(`🏛️ DART 공시: ${dartFilings ? dartFilings.companies.length + '개사' : '없음 (DART_API_KEY 미설정)'}`);
    console.log(`💰 DART 분기 실적: ${dartFinancials ? dartFinancials.companies.length + '개사' : '없음'}`);
    console.log(`📑 AI 재무 리포트: ${financialReport && financialReport.summary ? '있음' : (financialReport ? '비교차트만' : '없음')}`);
    console.log(`📁 저장: public/data.json`);
  } catch (e) {
    console.error('❌ Error:', e);
    process.exit(1);
  }
})();
