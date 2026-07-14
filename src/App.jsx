import React, { useState, useMemo, useEffect } from 'react';
import { Zap, FileText, Users, Swords, Building2, Clock, Star, Search, RefreshCw, AlertCircle, ChevronRight, Sparkles, Home, ExternalLink, Lightbulb, Hash, Flame, Target, History, Award, Landmark, Download } from 'lucide-react';
import { generateReportPptx, generateReportDocx } from './report-builder';

// 카테고리 정의 (기존과 동일)
const CATEGORIES = [
  { id: 'policy', label: '정책', desc: 'IRA · 배터리법 · 광물', icon: FileText, subs: [
    { id: 'us', label: '미국' },
    { id: 'eu', label: '유럽' },
    { id: 'kr', label: '국내' },
    { id: 'minerals', label: '광물·공급망' },
    { id: 'etc', label: '기타' },
  ]},
  { id: 'competitor', label: '경쟁사', desc: '주요 경쟁사 동향', icon: Swords, subs: [
    { id: 'lges', label: 'LGES' },
    { id: 'catl', label: 'CATL' },
    { id: 'ampace', label: 'AMPACE' },
    { id: 'eve', label: 'EVE' },
  ]},
  { id: 'customer', label: '고객사', desc: '주요 고객사 동향', icon: Users, subs: [
    { id: 'samsung-mx', label: '삼성전자 MX' },
    { id: 'tti', label: 'TTI' },
    { id: 'bosch', label: 'Bosch' },
    { id: 'volvo', label: 'Volvo' },
    { id: 'bmw', label: 'BMW' },
    { id: 'vwg', label: 'VWG' },
    { id: 'spacex', label: 'Space X' },
    { id: 'hyundai', label: '현대자동차' },
    { id: 'rivian', label: 'Rivian' },
  ]},
  { id: 'own', label: '자사', desc: '삼성SDI 동향', icon: Building2, subs: [] },
];

const SUB_LABEL = {
  us: '미국', eu: '유럽', kr: '국내', minerals: '광물·공급망', etc: '기타',
  lges: 'LGES', catl: 'CATL', ampace: 'AMPACE', eve: 'EVE',
  'samsung-mx': '삼성전자 MX', tti: 'TTI', bosch: 'Bosch', volvo: 'Volvo',
  bmw: 'BMW', vwg: 'VWG', spacex: 'Space X', hyundai: '현대자동차', rivian: 'Rivian',
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⬇️  AI가 아직 이번 주 분석을 만들지 못했을 때 임시로 보여줄 샘플입니다.
// ⬇️  실제 데이터(data.json의 weeklyInsight)가 생기면 자동으로 이 샘플 대신 그걸 보여줍니다.
// ⬇️  내용을 자유롭게 고쳐서 원하는 시안으로 만들 수 있습니다.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const SAMPLE_WEEKLY_INSIGHT = {
  isSample: true,
  weekStart: '2026-07-07',
  weekRange: '7/7 ~ 7/13',
  articleCount: 132,
  summary: '이번 주는 중국 LFP 증설과 리튬 가격 급락이 원가 경쟁 구도를 흔들었고, 美 FEOC 규제 강화로 비중국 공급망의 반사이익 기대가 커졌다. ESS·AI데이터센터發 수요가 새로운 성장축으로 부상하는 흐름도 뚜렷했다.',
  overallResponse: '단기적으로는 리튬 가격 급락에 따른 구매 전략 재점검이 시급하고, 중장기적으로는 비중국 공급망 파트너십과 ESS 파생 수요 대응 체계를 함께 준비해야 한다.',
  competitors: [
    { sub: 'lges', label: 'LGES', summary: 'AI데이터센터發 ESS 성장 기대에 강세, 리비안向 46시리즈 공급 확대', articleCount: 6 },
    { sub: 'catl', label: 'CATL', summary: 'FEOC 우회 위해 美 라이선스 방식 진출 지속, 유럽 현지생산 확대', articleCount: 4 },
    { sub: 'ampace', label: 'AMPACE', summary: '최근 특별한 동향이 확인되지 않았습니다.', articleCount: 0 },
    { sub: 'eve', label: 'EVE', summary: '최근 특별한 동향이 확인되지 않았습니다.', articleCount: 0 },
  ],
  keywords: [
    { keyword: 'FEOC 규제', count: 14, note: '해외우려기업 규정 강화' },
    { keyword: 'ESS 성장', count: 11, note: 'AI 데이터센터발 수요' },
    { keyword: 'LFP 국산화', count: 9, note: '국내 소재사 증설' },
    { keyword: '배터리 여권·CBAM', count: 7, note: 'EU 탄소규제' },
    { keyword: 'AI 데이터센터', count: 6, note: '전력 수요 급증' },
    { keyword: '탈중국 공급망', count: 5, note: '비중국 소재 확보 경쟁' },
  ],
  issues: [
    {
      title: '중국 LFP 증설 영향',
      summary: '중국 배터리사들의 LFP 라인 증설이 이어지며 글로벌 공급 과잉 우려가 커지고 있다.',
      impact: 5,
      owner: '기획그룹',
      sdiImpact: '소형전지 원가 경쟁력에 직접적인 압박 요인으로 작용할 수 있다.',
      actionPlan: '중국산 LFP 원가 동향을 종합해 사업 방향에 대한 의사결정을 준비하고, 구매팀·전략마케팅실과 대응 방안을 조율한다.',
      meetingCandidate: true,
      shareTargets: ['구매팀', '전략마케팅실'],
    },
    {
      title: '리튬 가격 급락 영향',
      summary: '리튬 원자재 가격이 최근 급락하며 셀 원가 구조에 변화가 생기고 있다.',
      impact: 3,
      owner: '구매팀',
      sdiImpact: '단기 원가 절감 기회이나, 장기 계약 단가 재협상 이슈가 발생할 수 있다.',
      actionPlan: '주요 원료 장기계약 단가를 재점검하고 현물가 연동 조항 여부를 확인한다.',
      meetingCandidate: false,
      shareTargets: ['기획그룹'],
    },
    {
      title: '美 FEOC 규제 강화, 북미 ESS向 비중국 LFP 공급 부족 우려',
      summary: '해외우려기업(FEOC) 규정이 확대되며 북미 ESS 시장에서 비중국산 LFP 공급이 빠듯해질 전망이다.',
      impact: 4,
      owner: '전략마케팅실',
      sdiImpact: '비중국 공급망을 갖춘 국내 업체에는 기회 요인으로 작용할 수 있다.',
      actionPlan: '북미 ESS向 비중국 LFP 공급 레퍼런스를 확보하고 고객사 대상 제안을 준비한다.',
      meetingCandidate: true,
      shareTargets: ['기획그룹', '기술팀'],
    },
    {
      title: '전기차 수요 둔화 속 ESS·AI데이터센터가 배터리 새 성장축으로',
      summary: '완성차 EV 수요는 정체됐지만 AI 데이터센터發 전력 수요가 ESS 시장을 밀어올리고 있다.',
      impact: 4,
      owner: '기획그룹',
      sdiImpact: '중장기 포트폴리오 재편의 핵심 변수가 될 수 있다.',
      actionPlan: 'ESS·AI데이터센터向 소형전지 파생 수요 시나리오를 정리해 사업부에 공유한다.',
      meetingCandidate: false,
      shareTargets: ['개발실'],
    },
    {
      title: '배터리 여권·CBAM 등 EU 탄소규제, 공급망 탄소데이터 대응 필수화',
      summary: '디지털배터리여권과 탄소국경조정제도 시행이 임박하며 원료 이력 관리 요구가 커지고 있다.',
      impact: 3,
      owner: '지원팀',
      sdiImpact: 'EU向 출하 비중이 있는 만큼 선제 대응이 필요하다.',
      actionPlan: '원료 추적성 데이터 체계 구축 현황을 점검하고 대응 일정을 수립한다.',
      meetingCandidate: false,
      shareTargets: ['제조기술센터'],
    },
  ],
  reportCandidates: [
    { title: '중국 LFP 증설이 소형전지 원가 경쟁력에 미치는 영향', targetAudience: '사업부장', reason: '원가 경쟁력 이슈로 사업 전략 차원의 의사결정이 필요함' },
    { title: '북미 ESS向 비중국 LFP 공급 기회 대응 방안', targetAudience: '지원팀장', reason: '고객 대응 실무 준비가 시급한 사안' },
  ],
  themeClusters: [
    { theme: 'ESS 성장', items: ['중국 LFP 증설', 'LG엔솔 46시리즈 수주'] },
    { theme: '탈중국 공급망', items: ['FEOC 규제 강화', '비중국 파트너십 검토'] },
    { theme: '원자재 가격', items: ['리튬 가격 급락', '구매단가 재협상'] },
  ],
  topics: [
    {
      title: '전동공구·고객사向 ESS/AI데이터센터 파생 수요 대응 전략',
      description: '소형전지 고객군에서도 ESS 연계 수요가 생길 수 있는지 TTI·Bosch 등 주요 고객사 로드맵을 점검한다.',
      rationale: 'ESS·AI데이터센터 수요 관련 뉴스 다수 발생',
    },
    {
      title: '배터리 여권·CBAM 대응 자사 공급망 탄소데이터 체계 점검',
      description: 'EU향 소형전지 출하 비중을 감안해 원료 추적성 데이터 확보 시급성을 검토한다.',
      rationale: 'EU 탄소규제 관련 뉴스 흐름',
    },
    {
      title: '비중국 LFP 공급망 파트너십 검토',
      description: '국내 소재사 LFP 증설 흐름에 맞춰 소형전지 원가 경쟁력 확보 방안을 논의한다.',
      rationale: 'LFP 국산화·FEOC 규제 뉴스 흐름',
    },
  ],
};

// 아카이브 화면 샘플 (최신 주 + 지난 주 몇 개) - 실제 데이터가 생기면 자동으로 대체됨
const SAMPLE_WEEKLY_HISTORY = [
  SAMPLE_WEEKLY_INSIGHT,
  {
    weekStart: '2026-06-30',
    weekRange: '6/30 ~ 7/6',
    topics: [
      { title: '비중국 LFP 공급망 파트너십 검토' },
      { title: '전동공구向 ESS 파생 수요 검토' },
    ],
  },
  {
    weekStart: '2026-06-23',
    weekRange: '6/23 ~ 6/29',
    topics: [
      { title: '인터배터리 후속 고객사 미팅 제안' },
    ],
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⬇️  DART 공시 자동수집이 아직 연결 안 됐을 때 임시로 보여줄 샘플입니다.
// ⬇️  DART_API_KEY가 설정되면 자동으로 이 샘플 대신 실제 공시 목록을 보여줍니다.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const SAMPLE_DART_FILINGS = {
  isSample: true,
  companies: [
    {
      id: 'sdi', label: '삼성SDI', type: 'battery',
      filings: [
        { title: '분기보고서 (2026.1분기)', date: '20260514', link: '#' },
        { title: '주요사항보고서(자기주식취득결정)', date: '20260508', link: '#' },
      ],
    },
    {
      id: 'lges', label: 'LG에너지솔루션', type: 'battery',
      filings: [
        { title: '분기보고서 (2026.1분기)', date: '20260515', link: '#' },
      ],
    },
    {
      id: 'hyundai', label: '현대자동차', type: 'customer',
      filings: [
        { title: '주요사항보고서(투자판단관련주요경영사항)', date: '20260510', link: '#' },
      ],
    },
  ],
};

export default function App() {
  const [news, setNews] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [weeklyInsight, setWeeklyInsight] = useState(null);
  const [weeklyInsightHistory, setWeeklyInsightHistory] = useState(null);
  const [dartFilings, setDartFilings] = useState(null);
  const [lastUpdated, setLastUpdated] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCat, setActiveCat] = useState(null);
  const [activeSub, setActiveSub] = useState(null);
  const [search, setSearch] = useState('');
  const [activeView, setActiveView] = useState('news'); // 'news' | 'filings' | 'briefing' | 'executive' | 'report'

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}data.json?t=${Date.now()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setNews(data.news || []);
      setFeatured(data.featured || []);
      setWeeklyInsight(data.weeklyInsight || SAMPLE_WEEKLY_INSIGHT);
      setWeeklyInsightHistory(
        data.weeklyInsightHistory && data.weeklyInsightHistory.length > 0
          ? data.weeklyInsightHistory
          : SAMPLE_WEEKLY_HISTORY
      );
      setDartFilings(
        data.dartFilings && data.dartFilings.companies && data.dartFilings.companies.length > 0
          ? data.dartFilings
          : SAMPLE_DART_FILINGS
      );
      setLastUpdated(data.lastUpdated || '');
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleCatClick = (catId) => {
    setActiveView('news');
    if (activeCat === catId) {
      setActiveCat(null);
      setActiveSub(null);
    } else {
      setActiveCat(catId);
      setActiveSub(null);
    }
    setSearch('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubClick = (catId, subId) => {
    setActiveView('news');
    setActiveCat(catId);
    setActiveSub(activeSub === subId ? null : subId);
    setSearch('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goNews = () => {
    setActiveView('news');
    setActiveCat(null);
    setActiveSub(null);
    setSearch('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBriefing = () => {
    setActiveView('briefing');
    setActiveCat(null);
    setActiveSub(null);
    setSearch('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goFilings = () => {
    setActiveView('filings');
    setActiveCat(null);
    setActiveSub(null);
    setSearch('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goExecutive = () => {
    setActiveView('executive');
    setActiveCat(null);
    setActiveSub(null);
    setSearch('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goReport = () => {
    setActiveView('report');
    setActiveCat(null);
    setActiveSub(null);
    setSearch('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeCategory = CATEGORIES.find(c => c.id === activeCat);

  const filteredNews = useMemo(() => {
    let list = news;
    if (activeCat) list = list.filter(n => n.cat === activeCat);
    if (activeSub) list = list.filter(n => n.sub === activeSub);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(n =>
        n.title.toLowerCase().includes(q) ||
        (n.summary && n.summary.toLowerCase().includes(q))
      );
    }
    return list;
  }, [news, activeCat, activeSub, search]);

  return (
    <div className="bb-app">
      <style>{globalStyles}</style>

      <TopNav
        lastUpdated={lastUpdated}
        totalCount={news.length}
        onLogoClick={goNews}
        activeView={activeView}
        onNewsClick={goNews}
        onFilingsClick={goFilings}
        onBriefingClick={goBriefing}
        onExecutiveClick={goExecutive}
        onReportClick={goReport}
      />

      <main className="bb-content-full">
        {loading && <LoadingView />}
        {!loading && error && <ErrorView error={error} onRetry={loadData} />}
        {!loading && !error && (
          <>
            {activeView === 'news' && !activeCat && <HeroBanner />}
            {activeView === 'news' && featured.length > 0 && <ConcernsBanner featured={featured} />}

            {activeView === 'briefing' ? (
              <BriefingView
                weeklyInsight={weeklyInsight}
                weeklyInsightHistory={weeklyInsightHistory}
              />
            ) : activeView === 'filings' ? (
              <FilingsView dartFilings={dartFilings} />
            ) : activeView === 'executive' ? (
              <ExecutiveIssuesView weeklyInsight={weeklyInsight} />
            ) : activeView === 'report' ? (
              <ReportView weeklyInsight={weeklyInsight} news={news} />
            ) : (
              <NewsView
                news={news}
                activeCat={activeCat}
                activeSub={activeSub}
                activeCategory={activeCategory}
                filteredNews={filteredNews}
                search={search}
                setSearch={setSearch}
                onCatClick={handleCatClick}
                onSubClick={handleSubClick}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ━━━━━━━━━━ Top Navigation ━━━━━━━━━━
function TopNav({ lastUpdated, totalCount, onLogoClick, activeView, onNewsClick, onFilingsClick, onBriefingClick, onExecutiveClick, onReportClick }) {
  return (
    <header className="bb-topnav">
      <div className="bb-logo" onClick={onLogoClick}>
        <div className="bb-logo-icon"><Zap size={16} color="#fff" strokeWidth={2.5} /></div>
        <span className="bb-logo-text">Battery Briefing</span>
        <span className="bb-logo-badge">SDI 기획그룹</span>
      </div>
      <nav className="bb-top-menu">
        <a className={activeView === 'news' ? 'active' : ''} onClick={onNewsClick}>뉴스</a>
        <a className={activeView === 'filings' ? 'active' : ''} onClick={onFilingsClick}>특허·공시</a>
        <a className={activeView === 'briefing' ? 'active' : ''} onClick={onBriefingClick}>주간 브리핑</a>
        <a className={activeView === 'executive' ? 'active' : ''} onClick={onExecutiveClick}>Executive Issues</a>
        <a className={activeView === 'report' ? 'active' : ''} onClick={onReportClick}>AI 리포트</a>
      </nav>
      <div className="bb-top-right">
        {lastUpdated && <span className="bb-last-update">업데이트 · {lastUpdated}</span>}
        <span className="bb-total-count">총 {totalCount}건</span>
      </div>
    </header>
  );
}

// ━━━━━━━━━━ 뉴스 (카테고리 필터) ━━━━━━━━━━
function NewsView({ news, activeCat, activeSub, activeCategory, filteredNews, search, setSearch, onCatClick, onSubClick }) {
  return (
    <>
      <div className="bb-subchips">
        <div className={`bb-subchip ${!activeCat ? 'active' : ''}`} onClick={() => onCatClick(null)}>
          전체 <span className="bb-subchip-count">{news.length}</span>
        </div>
        {CATEGORIES.map(cat => {
          const count = news.filter(n => n.cat === cat.id).length;
          return (
            <div
              key={cat.id}
              className={`bb-subchip ${activeCat === cat.id ? 'active' : ''}`}
              onClick={() => onCatClick(cat.id)}
            >
              {cat.label} <span className="bb-subchip-count">{count}</span>
            </div>
          );
        })}
      </div>

      {activeCat ? (
        <CategoryView
          category={activeCategory}
          activeSub={activeSub}
          news={news}
          filteredNews={filteredNews}
          search={search}
          setSearch={setSearch}
          onSubClick={onSubClick}
        />
      ) : (
        <HomeView news={news} onCatClick={onCatClick} />
      )}
    </>
  );
}

// ━━━━━━━━━━ Hero Banner (Main Slogan) ━━━━━━━━━━
function HeroBanner() {
  return (
    <div className="bb-hero">
      <div className="bb-hero-eyebrow">SAMSUNG SDI · SMALL BATTERY</div>
      <h2 className="bb-hero-title">
        전동공구에서 <span className="accent">우주</span>까지
      </h2>
      <div className="bb-hero-divider"></div>
      <p className="bb-hero-subtitle">
        삼성 SDI 소형 배터리의 무한한 확장
      </p>
    </div>
  );
}

// ━━━━━━━━━━ SDI 고민거리 Banner ━━━━━━━━━━
function ConcernsBanner({ featured }) {
  const items = featured.slice(0, 3);
  return (
    <div className="bb-concerns">
      <div className="bb-concerns-label">
        SDI 고민거리
        <span className="bb-concerns-badge">{featured.length}</span>
      </div>
      <div className="bb-concerns-items">
        {items.map((item, idx) => (
          <a
            key={item.id}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="bb-concern"
          >
            <span className="bb-concern-num">{String(idx + 1).padStart(2, '0')}</span>
            {item.title}
          </a>
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━ 이번 주 배터리 산업 브리핑 (AI 자동 생성) ━━━━━━━━━━
function KeywordHeatmap({ keywords }) {
  if (!keywords || keywords.length === 0) return null;
  const maxCount = Math.max(...keywords.map(k => (typeof k.count === 'number' ? k.count : 0)), 1);

  return (
    <div className="bb-heatmap">
      {keywords.map((k, idx) => {
        const ratio = typeof k.count === 'number' ? k.count / maxCount : 0.3;
        return (
          <div
            className="bb-heatmap-tile"
            key={idx}
            title={k.note || ''}
            style={{ background: `rgba(91, 79, 224, ${0.12 + ratio * 0.68})`, color: ratio > 0.55 ? '#fff' : 'var(--insight)' }}
          >
            <span className="bb-heatmap-keyword">{k.keyword}</span>
            {typeof k.count === 'number' && <span className="bb-heatmap-count">{k.count}</span>}
          </div>
        );
      })}
    </div>
  );
}

function IssueCard({ issue, idx }) {
  const impact = typeof issue.impact === 'number' ? Math.min(5, Math.max(0, issue.impact)) : 0;

  return (
    <div className="bb-issue-card">
      <div className="bb-issue-card-head">
        <div className="bb-issue-num">{idx + 1}</div>
        <div className="bb-issue-card-title-area">
          <div className="bb-issue-title">{issue.title}</div>
          <div className="bb-issue-badges">
            {impact > 0 && (
              <span className="bb-issue-impact" title={`영향도 ${impact}/5`}>
                {[1, 2, 3, 4, 5].map(n => (
                  <Star key={n} size={12} fill={n <= impact ? '#5B4FE0' : 'none'} color="#5B4FE0" strokeWidth={1.8} />
                ))}
              </span>
            )}
            {issue.owner && <span className="bb-issue-owner">담당 · {issue.owner}</span>}
            {issue.meetingCandidate && <span className="bb-issue-meeting">임원회의 안건 후보</span>}
          </div>
        </div>
      </div>

      {issue.summary && <div className="bb-issue-summary">{issue.summary}</div>}
      {issue.sdiImpact && (
        <div className="bb-issue-sdi-impact"><strong>SDI 영향</strong> · {issue.sdiImpact}</div>
      )}
      {issue.actionPlan && (
        <div className="bb-issue-action"><strong>추진방안</strong> · {issue.actionPlan}</div>
      )}
      {issue.shareTargets && issue.shareTargets.length > 0 && (
        <div className="bb-issue-share">
          공유대상 ·
          {issue.shareTargets.map((t, i) => (
            <span className="bb-issue-share-chip" key={i}>{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportCandidates({ candidates }) {
  if (!candidates || candidates.length === 0) return null;
  return (
    <div className="bb-weekly-block">
      <div className="bb-weekly-block-title"><FileText size={15} /> 보고서 후보 주제</div>
      <div className="bb-report-candidates">
        {candidates.map((c, idx) => (
          <div className="bb-report-candidate" key={idx}>
            <div className="bb-report-candidate-title">{c.title}</div>
            <div className="bb-report-candidate-meta">
              <span className="bb-report-candidate-audience">보고대상 · {c.targetAudience}</span>
              {c.reason && <span className="bb-report-candidate-reason">{c.reason}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeeklyInsight({ data }) {
  if (!data || (!data.keywords?.length && !data.issues?.length && !data.topics?.length)) {
    return null;
  }

  const {
    isSample, weekRange, articleCount, summary,
    keywords = [], topics = [],
  } = data;

  return (
    <div className="bb-weekly">
      <div className="bb-weekly-header">
        <div className="bb-weekly-icon">
          <Sparkles size={20} color="#5B4FE0" strokeWidth={2.2} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="bb-weekly-title">
            이번 주 배터리 산업 브리핑
            {isSample && <span className="bb-weekly-sample-badge">샘플</span>}
          </div>
          <div className="bb-weekly-desc">
            {weekRange && <>{weekRange} </>}
            {typeof articleCount === 'number' && <>· 뉴스 {articleCount}건 분석 </>}
            · AI 자동 생성
          </div>
        </div>
      </div>

      {summary && <div className="bb-weekly-summary">{summary}</div>}

      {keywords.length > 0 && (
        <div className="bb-weekly-block">
          <div className="bb-weekly-block-title"><Hash size={15} /> Heat Map · 이번 주 최다 언급 키워드</div>
          <KeywordHeatmap keywords={keywords} />
        </div>
      )}

      {topics.length > 0 && (
        <div className="bb-weekly-block bb-weekly-topics-block">
          <div className="bb-weekly-block-title"><Target size={15} /> 기획그룹이 발굴해볼 주제</div>
          <div className="bb-topic-cards">
            {topics.map((topic, idx) => (
              <div className="bb-topic-card" key={idx}>
                <div className="bb-topic-num">{idx + 1}</div>
                <div className="bb-topic-body">
                  <div className="bb-topic-title">{topic.title}</div>
                  {topic.description && <div className="bb-topic-desc">{topic.description}</div>}
                  {topic.rationale && <div className="bb-topic-rationale">근거 · {topic.rationale}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━ 경쟁사 동향 비교 ━━━━━━━━━━
function CompetitorCompare({ competitors }) {
  if (!competitors || competitors.length === 0) return null;

  return (
    <div className="bb-compare">
      <div className="bb-compare-title"><Swords size={15} /> 경쟁사 동향 비교</div>
      <div className="bb-compare-grid">
        {competitors.map((c) => (
          <div className="bb-compare-card" key={c.sub}>
            <div className="bb-compare-card-label">{c.label}</div>
            <div className="bb-compare-card-summary">{c.summary}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━ 지난 발굴주제 아카이브 ━━━━━━━━━━
function tokenizeTopic(str) {
  return (str || '')
    .replace(/[·,()~/·\-–]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2);
}

function topicsOverlap(titleA, titleB) {
  const setA = new Set(tokenizeTopic(titleA));
  return tokenizeTopic(titleB).some(w => setA.has(w));
}

function TopicArchive({ history }) {
  if (!history || history.length <= 1) return null;

  const rows = [];
  history.forEach((week, weekIdx) => {
    if (weekIdx === 0) return; // 이번 주는 위에서 이미 보여줬으니 제외
    (week.topics || []).forEach((topic, topicIdx) => {
      const moreRecentWeeks = history.slice(0, weekIdx);
      const recurring = moreRecentWeeks.some(w => (w.topics || []).some(t => topicsOverlap(t.title, topic.title)));
      rows.push({ key: `${weekIdx}-${topicIdx}`, weekRange: week.weekRange, title: topic.title, recurring });
    });
  });

  if (rows.length === 0) return null;

  return (
    <div className="bb-archive">
      <div className="bb-archive-title"><History size={15} /> 지난 발굴주제 아카이브</div>
      <div className="bb-archive-list">
        {rows.map(row => (
          <div className="bb-archive-row" key={row.key}>
            <span className="bb-archive-week">{row.weekRange}</span>
            <span className="bb-archive-topic">{row.title}</span>
            {row.recurring && <span className="bb-archive-badge">재등장</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━ 주간 브리핑 (전용 페이지) ━━━━━━━━━━
function BriefingView({ weeklyInsight, weeklyInsightHistory }) {
  return (
    <>
      <div className="bb-page-header">
        <div className="bb-page-title-area">
          <div className="bb-page-icon"><Sparkles size={20} color="#5B4FE0" strokeWidth={2.2} /></div>
          <div>
            <div className="bb-page-title">주간 브리핑</div>
            <div className="bb-page-desc">AI가 정리한 이번 주 배터리 산업 키워드 · 발굴주제</div>
          </div>
        </div>
        <div className="bb-breadcrumb">
          <Home size={13} color="#2C7DC4" />
          <span>›</span>
          <span className="current">주간 브리핑</span>
        </div>
      </div>

      <WeeklyInsight data={weeklyInsight} />
      <CompetitorCompare competitors={weeklyInsight?.competitors} />
      <TopicArchive history={weeklyInsightHistory} />
    </>
  );
}

// ━━━━━━━━━━ Executive Issues: 테마 클러스터 ━━━━━━━━━━
function ThemeCluster({ themeClusters }) {
  if (!themeClusters || themeClusters.length === 0) return null;
  return (
    <div className="bb-weekly-block">
      <div className="bb-weekly-block-title"><Sparkles size={15} /> 이번 주 테마 클러스터</div>
      <div className="bb-theme-grid">
        {themeClusters.map((t, idx) => (
          <div className="bb-theme-card" key={idx}>
            <div className="bb-theme-card-head">{t.theme}</div>
            <div className="bb-theme-card-body">
              {(t.items || []).map((item, i) => (
                <div className="bb-theme-tag" key={i}>{item}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━ Executive Issues: 담당팀별 후속 이슈 ━━━━━━━━━━
function OwnerIssueList({ issues }) {
  if (!issues || issues.length === 0) return null;
  return (
    <div className="bb-weekly-block">
      <div className="bb-weekly-block-title"><Flame size={15} /> 담당팀별 후속 이슈</div>
      <div className="bb-owner-issue-list">
        {issues.map((issue, idx) => {
          const impact = typeof issue.impact === 'number' ? Math.min(5, Math.max(0, issue.impact)) : 0;
          return (
            <div className="bb-owner-issue-row" key={idx}>
              {issue.owner && <span className="bb-issue-owner bb-owner-issue-badge">{issue.owner}</span>}
              <div className="bb-owner-issue-body">
                <div className="bb-issue-title">{issue.title}</div>
                <div className="bb-issue-badges" style={{ marginBottom: 6 }}>
                  {impact > 0 && (
                    <span className="bb-issue-impact" title={`영향도 ${impact}/5`}>
                      {[1, 2, 3, 4, 5].map(n => (
                        <Star key={n} size={12} fill={n <= impact ? '#5B4FE0' : 'none'} color="#5B4FE0" strokeWidth={1.8} />
                      ))}
                    </span>
                  )}
                  {issue.meetingCandidate && <span className="bb-issue-meeting">임원회의 안건 후보</span>}
                </div>
                {issue.summary && <div className="bb-issue-summary">{issue.summary}</div>}
                {issue.sdiImpact && <div className="bb-issue-sdi-impact"><strong>SDI 영향</strong> · {issue.sdiImpact}</div>}
                {issue.actionPlan && <div className="bb-issue-action"><strong>추진방안</strong> · {issue.actionPlan}</div>}
                {issue.shareTargets && issue.shareTargets.length > 0 && (
                  <div className="bb-issue-share">
                    공유대상 ·
                    {issue.shareTargets.map((t, i) => (
                      <span className="bb-issue-share-chip" key={i}>{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ━━━━━━━━━━ Executive Issues 페이지 ━━━━━━━━━━
function ExecutiveIssuesView({ weeklyInsight }) {
  if (!weeklyInsight) return null;
  return (
    <>
      <div className="bb-page-header">
        <div className="bb-page-title-area">
          <div className="bb-page-icon"><Flame size={20} color="#5B4FE0" strokeWidth={2.2} /></div>
          <div>
            <div className="bb-page-title">Executive Issues</div>
            <div className="bb-page-desc">테마별 동향 클러스터와 담당팀별 후속 이슈</div>
          </div>
        </div>
        <div className="bb-breadcrumb">
          <Home size={13} color="#2C7DC4" />
          <span>›</span>
          <span className="current">Executive Issues</span>
        </div>
      </div>

      <ThemeCluster themeClusters={weeklyInsight.themeClusters} />
      <OwnerIssueList issues={weeklyInsight.issues} />

      {weeklyInsight.overallResponse && (
        <div className="bb-weekly-block">
          <div className="bb-weekly-block-title"><Target size={15} /> 종합 대응방향</div>
          <div className="bb-overall-response">{weeklyInsight.overallResponse}</div>
        </div>
      )}
    </>
  );
}

// ━━━━━━━━━━ AI 리포트 페이지 ━━━━━━━━━━
function ReportView({ weeklyInsight, news }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const buildReportData = () => {
    const policyNews = (news || [])
      .filter(n => n.cat === 'policy')
      .slice(0, 8)
      .map(n => ({ title: n.title }));

    return {
      weekRange: weeklyInsight.weekRange,
      summary: weeklyInsight.summary,
      issues: weeklyInsight.issues || [],
      competitors: weeklyInsight.competitors || [],
      policyNews,
      overallResponse: weeklyInsight.overallResponse,
    };
  };

  const handleGenerate = async (format) => {
    setGenerating(true);
    setError(null);
    try {
      const reportData = buildReportData();
      if (format === 'pptx') {
        await generateReportPptx(reportData);
      } else {
        await generateReportDocx(reportData);
      }
    } catch (e) {
      console.error(e);
      setError('리포트 생성에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <div className="bb-page-header">
        <div className="bb-page-title-area">
          <div className="bb-page-icon"><Download size={20} color="#5B4FE0" strokeWidth={2.2} /></div>
          <div>
            <div className="bb-page-title">AI 리포트</div>
            <div className="bb-page-desc">보고서 후보 주제 기반으로 PPT·Word 리포트를 생성합니다</div>
          </div>
        </div>
        <div className="bb-breadcrumb">
          <Home size={13} color="#2C7DC4" />
          <span>›</span>
          <span className="current">AI 리포트</span>
        </div>
      </div>

      {!weeklyInsight ? (
        <div className="bb-empty">
          <AlertCircle size={28} color="#999" />
          <div>아직 생성된 주간 인사이트가 없습니다</div>
        </div>
      ) : (
        <>
          <ReportCandidates candidates={weeklyInsight.reportCandidates} />

          <div className="bb-weekly-block">
            <div className="bb-weekly-block-title"><Download size={15} /> 이번 주 리포트 생성</div>
            <div className="bb-report-generate-row">
              <button className="bb-report-btn" onClick={() => handleGenerate('pptx')} disabled={generating}>
                <Download size={15} />
                {generating ? '생성 중...' : 'PPT로 생성'}
              </button>
              <button className="bb-report-btn" onClick={() => handleGenerate('docx')} disabled={generating}>
                <Download size={15} />
                {generating ? '생성 중...' : 'Word로 생성'}
              </button>
            </div>
            <div className="bb-report-generate-desc">Summary · 핵심이슈 · 경쟁사 동향 · 정책 변화 · 종합 대응방향이 포함됩니다.</div>
            {error && <div className="bb-report-error" style={{ position: 'static', marginTop: 10 }}>{error}</div>}
          </div>
        </>
      )}
    </>
  );
}

// ━━━━━━━━━━ DART 공시 목록 ━━━━━━━━━━
function FilingsCardGrid({ companies }) {
  return (
    <div className="bb-filings-grid">
      {companies.map((c) => (
        <div className="bb-filings-card" key={c.id}>
          <div className="bb-filings-card-label">{c.label}</div>
          {(!c.filings || c.filings.length === 0) ? (
            <div className="bb-filings-empty">최근 2주 내 공시 없음</div>
          ) : (
            <ul className="bb-filings-list">
              {c.filings.map((item, idx) => (
                <li key={idx}>
                  <a href={item.link} target="_blank" rel="noopener noreferrer">{item.title}</a>
                  <span className="bb-filings-date">{item.date}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function DartFilings({ data }) {
  if (!data || !data.companies || data.companies.length === 0) return null;
  const { isSample, companies } = data;

  const batteryCompanies = companies.filter(c => c.type === 'battery');
  const customerCompanies = companies.filter(c => c.type === 'customer');
  const ungroupedCompanies = companies.filter(c => c.type !== 'battery' && c.type !== 'customer');

  return (
    <div className="bb-filings">
      <div className="bb-filings-header">
        <div className="bb-filings-title">
          <Landmark size={15} /> 최근 공시 (최근 2주 · 국내 상장사)
          {isSample && <span className="bb-weekly-sample-badge">샘플</span>}
        </div>
      </div>

      {batteryCompanies.length > 0 && (
        <div className="bb-filings-group">
          <div className="bb-filings-group-label">배터리회사</div>
          <FilingsCardGrid companies={batteryCompanies} />
        </div>
      )}

      {customerCompanies.length > 0 && (
        <div className="bb-filings-group">
          <div className="bb-filings-group-label">고객사</div>
          <FilingsCardGrid companies={customerCompanies} />
        </div>
      )}

      {ungroupedCompanies.length > 0 && <FilingsCardGrid companies={ungroupedCompanies} />}
    </div>
  );
}

// ━━━━━━━━━━ 특허 동향 (준비 중 placeholder) ━━━━━━━━━━
function PatentSignals({ patents }) {
  if (patents && patents.length > 0) {
    return null; // TODO: 특허 API 키 발급 후 실제 렌더링 구현
  }
  return (
    <div className="bb-patents-placeholder">
      <div className="bb-patents-placeholder-icon"><Award size={18} color="#999" /></div>
      <div>
        <div className="bb-patents-placeholder-title">특허 동향 (준비 중)</div>
        <div className="bb-patents-placeholder-desc">특허 API 키 발급이 완료되면 경쟁사·고객사 특허 출원 동향이 여기 자동으로 표시됩니다.</div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━ 특허·공시 페이지 ━━━━━━━━━━
function FilingsView({ dartFilings }) {
  return (
    <>
      <div className="bb-page-header">
        <div className="bb-page-title-area">
          <div className="bb-page-icon"><Landmark size={20} color="#2C7DC4" strokeWidth={2.2} /></div>
          <div>
            <div className="bb-page-title">특허·공시</div>
            <div className="bb-page-desc">공식 공시자료·특허 데이터 기반 오픈소스 시그널</div>
          </div>
        </div>
        <div className="bb-breadcrumb">
          <Home size={13} color="#2C7DC4" />
          <span>›</span>
          <span className="current">특허·공시</span>
        </div>
      </div>

      <DartFilings data={dartFilings} />
      <PatentSignals patents={null} />
    </>
  );
}

// ━━━━━━━━━━ Home View ━━━━━━━━━━
function HomeView({ news, onCatClick }) {
  return (
    <>
      <div className="bb-cat-grid">
        {CATEGORIES.map(cat => {
          const items = news.filter(n => n.cat === cat.id).slice(0, 4);
          const totalCount = news.filter(n => n.cat === cat.id).length;
          const Icon = cat.icon;
          return (
            <div key={cat.id} className="bb-cat-card" onClick={() => onCatClick(cat.id)}>
              <div className="bb-cat-card-header">
                <div className="bb-cat-card-icon"><Icon size={18} color="#2C7DC4" strokeWidth={2.2} /></div>
                <div className="bb-cat-card-title-area">
                  <div className="bb-cat-card-title">{cat.label}</div>
                  <div className="bb-cat-card-desc">{cat.desc}</div>
                </div>
                <div className="bb-cat-card-count">{totalCount}</div>
              </div>
              <div className="bb-cat-card-list">
                {items.length === 0 ? (
                  <div className="bb-empty-small">아직 수집된 기사가 없습니다</div>
                ) : (
                  items.map((n, idx) => (
                    <a
                      key={n.id}
                      href={n.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bb-cat-card-item"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="bb-cat-card-item-num">{idx + 1}</span>
                      <span className="bb-cat-card-item-title">{n.title}</span>
                    </a>
                  ))
                )}
              </div>
              <div className="bb-cat-card-more">
                {cat.label} 전체 보기 <ChevronRight size={14} />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ━━━━━━━━━━ Category View ━━━━━━━━━━
function CategoryView({ category, activeSub, news, filteredNews, search, setSearch, onSubClick }) {
  if (!category) return null;
  const Icon = category.icon;
  const hasSubs = category.subs && category.subs.length > 0;
  const totalInCat = news.filter(n => n.cat === category.id).length;

  return (
    <>
      {/* Page Header */}
      <div className="bb-page-header">
        <div className="bb-page-title-area">
          <div className="bb-page-icon"><Icon size={20} color="#2C7DC4" strokeWidth={2.2} /></div>
          <div>
            <div className="bb-page-title">
              {category.label}
              {activeSub && <span className="bb-page-title-sub"> · {SUB_LABEL[activeSub] || activeSub}</span>}
            </div>
            <div className="bb-page-desc">{category.desc}</div>
          </div>
        </div>
        <div className="bb-breadcrumb">
          <Home size={13} color="#2C7DC4" />
          <span>›</span>
          <span>{category.label}</span>
          {activeSub && (<>
            <span>›</span>
            <span className="current">{SUB_LABEL[activeSub]}</span>
          </>)}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bb-filter-bar">
        <span className="bb-filter-label">검색</span>
        <div className="bb-search-box">
          <input
            type="text"
            className="bb-search-input"
            placeholder={`${category.label} 내 기사 검색`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="bb-search-btn"><Search size={14} /></button>
        </div>
        <div className="bb-result-count">총 <strong>{filteredNews.length}</strong>건</div>
      </div>

      {/* Subcategory chips (only if has subs) */}
      {hasSubs && (
        <div className="bb-subchips">
          <div
            className={`bb-subchip ${!activeSub ? 'active' : ''}`}
            onClick={() => onSubClick(category.id, null)}
          >
            전체 <span className="bb-subchip-count">{totalInCat}</span>
          </div>
          {category.subs.map(sub => {
            const subCount = news.filter(n => n.cat === category.id && n.sub === sub.id).length;
            return (
              <div
                key={sub.id}
                className={`bb-subchip ${activeSub === sub.id ? 'active' : ''}`}
                onClick={() => onSubClick(category.id, sub.id)}
              >
                {sub.label} <span className="bb-subchip-count">{subCount}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Article list */}
      {filteredNews.length === 0 ? (
        <div className="bb-empty">
          <AlertCircle size={28} color="#999" />
          <div>해당하는 기사가 없습니다</div>
        </div>
      ) : (
        <div className="bb-article-list">
          {filteredNews.map((n, idx) => (
            <ArticleRow key={n.id} article={n} num={idx + 1} category={category} />
          ))}
        </div>
      )}
    </>
  );
}

// ━━━━━━━━━━ Article Row ━━━━━━━━━━
function ArticleRow({ article, num, category }) {
  return (
    <a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      className="bb-article-row"
    >
      <div className="bb-article-num">{num}</div>
      <div className="bb-article-body">
        <div className="bb-article-title">{article.title}</div>

        {article.summary && (
          <div className="bb-ai-summary">
            <div className="bb-ai-summary-label">
              <Sparkles size={11} color="#2C7DC4" />
              AI 요약
            </div>
            <div className="bb-ai-summary-content">{article.summary}</div>
          </div>
        )}

        <div className="bb-article-meta">
          {article.sub && SUB_LABEL[article.sub] && (
            <span className="bb-article-tag">{category.label} · {SUB_LABEL[article.sub]}</span>
          )}
          <span className="bb-article-source">{article.source}</span>
          <span className="bb-article-date">{article.time}</span>
        </div>
      </div>
      <div className="bb-article-arrow"><ExternalLink size={14} color="#999" /></div>
    </a>
  );
}

// ━━━━━━━━━━ Loading & Error Views ━━━━━━━━━━
function LoadingView() {
  return (
    <div className="bb-loading">
      <RefreshCw size={28} className="bb-spin" color="#2C7DC4" />
      <div>뉴스를 불러오는 중…</div>
    </div>
  );
}

function ErrorView({ error, onRetry }) {
  return (
    <div className="bb-error">
      <AlertCircle size={32} color="#E74C3C" />
      <h3>데이터를 불러올 수 없습니다</h3>
      <p>새로고침을 시도해 주세요.</p>
      <details>
        <summary>오류 상세</summary>
        <code>{error}</code>
      </details>
      <button onClick={onRetry}>다시 시도</button>
    </div>
  );
}

// ━━━━━━━━━━ Global Styles ━━━━━━━━━━
const globalStyles = `
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css');

  :root {
    --primary: #2C7DC4;
    --primary-dark: #1F5F9E;
    --primary-light: #5BA8D9;
    --primary-bg: #E8F2FB;
    --bg: #F5F7FA;
    --bg-card: #FFFFFF;
    --ink: #2C2C2C;
    --ink-mute: #666666;
    --ink-faint: #999999;
    --line: #E0E5EB;
    --line-light: #EEF1F5;
    --accent: #E74C3C;
    --warning: #F39C12;
    --insight: #5B4FE0;
    --insight-bg: #EFEDFC;
  }

  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Pretendard', -apple-system, sans-serif; background: var(--bg); color: var(--ink); -webkit-font-smoothing: antialiased; }
  a { color: inherit; text-decoration: none; }

  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-thumb { background: #d0d6de; border-radius: 4px; }

  .bb-app { min-height: 100vh; }

  /* ━━━ Top Nav ━━━ */
  .bb-topnav { background: #fff; border-bottom: 1px solid var(--line); height: 68px; display: flex; align-items: center; padding: 0 32px; gap: 36px; position: sticky; top: 0; z-index: 10; }
  .bb-logo { display: flex; align-items: center; gap: 10px; cursor: pointer; }
  .bb-logo-icon { width: 32px; height: 32px; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%); border-radius: 7px; display: flex; align-items: center; justify-content: center; }
  .bb-logo-text { font-size: 22px; font-weight: 700; color: var(--primary-dark); letter-spacing: -0.02em; }
  .bb-logo-badge { font-size: 12px; color: var(--primary); background: var(--primary-bg); padding: 4px 10px; border-radius: 4px; letter-spacing: 0.04em; font-weight: 500; }
  .bb-top-menu { display: flex; gap: 28px; flex: 1; }
  .bb-top-menu a { font-size: 15px; font-weight: 500; color: var(--ink-mute); padding: 6px 0; border-bottom: 2px solid transparent; cursor: pointer; transition: all 0.15s; }
  .bb-top-menu a.active { color: var(--ink); border-bottom-color: var(--primary); }
  .bb-top-menu a:hover { color: var(--ink); }
  .bb-top-right { display: flex; align-items: center; gap: 16px; }
  .bb-last-update { font-size: 13px; color: var(--ink-faint); }
  .bb-total-count { font-size: 13px; color: var(--ink-mute); background: var(--bg); padding: 5px 12px; border-radius: 14px; font-weight: 500; }

  /* ━━━ Layout (탭 기반, 사이드바 없음) ━━━ */
  .bb-content-full { max-width: 1100px; margin: 0 auto; padding: 24px 28px 60px; min-width: 0; }

  /* ━━━ 소형 기획그룹 고민해봅시다 ━━━ */
  .bb-planning {
    background: linear-gradient(135deg, #FFFCF0 0%, #FFF8E1 100%);
    border: 1px solid #F3E2A8;
    border-left: 4px solid #E89611;
    border-radius: 6px;
    padding: 22px 26px;
    margin-bottom: 22px;
    position: relative;
    overflow: hidden;
  }
  .bb-planning::after {
    content: '✨';
    position: absolute;
    top: 14px;
    right: 18px;
    font-size: 18px;
    opacity: 0.6;
  }
  .bb-planning-header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 16px;
    padding-bottom: 14px;
    border-bottom: 1px dashed #F0DA98;
  }
  .bb-planning-icon {
    width: 42px;
    height: 42px;
    background: #FFF3CD;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .bb-planning-title {
    font-size: 18px;
    font-weight: 700;
    color: #5C4117;
    letter-spacing: -0.015em;
  }
  .bb-planning-desc {
    font-size: 13px;
    color: #8A7340;
    margin-top: 2px;
  }
  .bb-planning-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .bb-planning-item {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 8px 4px;
    border-radius: 6px;
    transition: background 0.15s;
  }
  .bb-planning-item:hover {
    background: rgba(255, 255, 255, 0.5);
  }
  .bb-planning-num {
    width: 28px;
    height: 28px;
    background: linear-gradient(135deg, #F39C12 0%, #E89611 100%);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    flex-shrink: 0;
    box-shadow: 0 2px 5px rgba(232, 150, 17, 0.3);
  }
  .bb-planning-text {
    font-size: 14.5px;
    line-height: 1.6;
    color: #4A3D1A;
    padding-top: 3px;
    font-weight: 500;
    flex: 1;
  }

  /* ━━━ 이번 주 배터리 산업 브리핑 (AI) ━━━ */
  .bb-weekly {
    background: #fff;
    border: 1px solid var(--line);
    border-top: 4px solid var(--insight);
    border-radius: 6px;
    padding: 24px 26px;
    margin-bottom: 22px;
  }
  .bb-weekly-header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--line-light);
  }
  .bb-weekly-icon {
    width: 42px;
    height: 42px;
    background: var(--insight-bg);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .bb-weekly-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--ink);
    letter-spacing: -0.015em;
  }
  .bb-weekly-sample-badge {
    display: inline-block;
    font-size: 11px;
    font-weight: 600;
    color: var(--ink-faint);
    border: 1px solid var(--line);
    padding: 2px 8px;
    border-radius: 10px;
    margin-left: 8px;
    vertical-align: 2px;
  }
  .bb-weekly-desc {
    font-size: 13px;
    color: var(--ink-faint);
    margin-top: 2px;
  }
  .bb-weekly-block { margin-bottom: 22px; }
  .bb-weekly-block:last-child { margin-bottom: 0; }
  .bb-weekly-block-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 700;
    color: var(--insight);
    margin-bottom: 12px;
    letter-spacing: -0.01em;
  }
  .bb-keyword-chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .bb-keyword-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13.5px;
    font-weight: 600;
    color: var(--insight);
    background: var(--insight-bg);
    padding: 7px 13px;
    border-radius: 20px;
    cursor: default;
  }
  .bb-keyword-chip em {
    font-style: normal;
    font-size: 11.5px;
    font-weight: 700;
    color: #fff;
    background: var(--insight);
    padding: 1px 7px;
    border-radius: 10px;
  }
  .bb-weekly-summary {
    font-size: 14px;
    color: var(--ink-mute);
    line-height: 1.7;
    background: var(--bg);
    border-radius: 8px;
    padding: 14px 16px;
    margin-bottom: 20px;
  }
  .bb-overall-response {
    font-size: 13.5px;
    color: var(--ink);
    line-height: 1.7;
    background: var(--insight-bg);
    border-radius: 8px;
    padding: 14px 16px;
  }

  /* ━━━ 키워드 Heat Map ━━━ */
  .bb-heatmap { display: flex; flex-wrap: wrap; gap: 8px; }
  .bb-heatmap-tile {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 13.5px;
    font-weight: 600;
    padding: 9px 14px;
    border-radius: 8px;
    cursor: default;
    transition: transform 0.15s;
  }
  .bb-heatmap-tile:hover { transform: translateY(-1px); }
  .bb-heatmap-count {
    font-size: 11px;
    font-weight: 700;
    background: rgba(255,255,255,0.35);
    padding: 1px 7px;
    border-radius: 10px;
  }

  /* ━━━ 주간 핵심이슈 카드 ━━━ */
  .bb-issue-list { display: flex; flex-direction: column; gap: 14px; }
  .bb-issue-card {
    border: 1px solid var(--line-light);
    border-radius: 10px;
    padding: 16px 18px;
  }
  .bb-issue-card-head { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 8px; }
  .bb-issue-num {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    background: var(--insight-bg);
    color: var(--insight);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    margin-top: 1px;
  }
  .bb-issue-card-title-area { flex: 1; min-width: 0; }
  .bb-issue-title { font-size: 15px; font-weight: 700; color: var(--ink); margin-bottom: 6px; letter-spacing: -0.01em; }
  .bb-issue-badges { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
  .bb-issue-impact { display: inline-flex; align-items: center; gap: 1px; }
  .bb-issue-owner {
    font-size: 11.5px;
    font-weight: 600;
    color: var(--primary-dark);
    background: var(--primary-bg);
    padding: 2px 9px;
    border-radius: 10px;
  }
  .bb-issue-meeting {
    font-size: 11.5px;
    font-weight: 700;
    color: #C0392B;
    background: #FDEDEB;
    padding: 2px 9px;
    border-radius: 10px;
  }
  .bb-issue-summary { font-size: 13.5px; color: var(--ink-mute); line-height: 1.6; margin-bottom: 8px; }
  .bb-issue-sdi-impact, .bb-issue-action {
    font-size: 13px;
    color: var(--ink);
    line-height: 1.6;
    margin-bottom: 6px;
  }
  .bb-issue-sdi-impact strong, .bb-issue-action strong { color: var(--insight); font-weight: 700; }
  .bb-issue-share { font-size: 12px; color: var(--ink-faint); display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .bb-issue-share-chip {
    font-size: 11.5px;
    color: var(--ink-mute);
    background: var(--bg);
    border: 1px solid var(--line);
    padding: 2px 8px;
    border-radius: 10px;
  }

  /* ━━━ 보고서 후보 주제 ━━━ */
  .bb-report-candidates { display: flex; flex-direction: column; gap: 10px; }
  .bb-report-candidate {
    background: var(--bg);
    border-radius: 8px;
    padding: 12px 16px;
  }
  .bb-report-candidate-title { font-size: 14px; font-weight: 700; color: var(--ink); margin-bottom: 5px; }
  .bb-report-candidate-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 12.5px; color: var(--ink-mute); }
  .bb-report-candidate-audience {
    font-weight: 700;
    color: var(--primary-dark);
    background: var(--primary-bg);
    padding: 2px 9px;
    border-radius: 10px;
  }

  /* ━━━ Executive Issues: 테마 클러스터 ━━━ */
  .bb-theme-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  .bb-theme-card { border-radius: 10px; overflow: hidden; border: 1px solid var(--line-light); }
  .bb-theme-card-head { background: var(--insight); color: #fff; font-size: 13px; font-weight: 700; text-align: center; padding: 9px 6px; }
  .bb-theme-card-body { padding: 8px; display: flex; flex-direction: column; gap: 6px; }
  .bb-theme-tag { font-size: 12px; color: var(--ink); background: var(--bg); border-radius: 6px; padding: 7px 9px; }

  /* ━━━ Executive Issues: 담당팀별 후속 이슈 ━━━ */
  .bb-owner-issue-list { display: flex; flex-direction: column; }
  .bb-owner-issue-row { display: flex; align-items: flex-start; gap: 12px; padding: 14px 0; border-bottom: 1px solid var(--line-light); }
  .bb-owner-issue-row:last-child { border-bottom: none; }
  .bb-owner-issue-badge { flex-shrink: 0; margin-top: 2px; }
  .bb-owner-issue-body { flex: 1; min-width: 0; }

  /* ━━━ AI 리포트 페이지 ━━━ */
  .bb-report-generate-row { display: flex; gap: 12px; }
  .bb-report-generate-desc { font-size: 12.5px; color: var(--ink-faint); margin-top: 10px; }
  .bb-topic-cards { display: flex; flex-direction: column; gap: 12px; }
  .bb-topic-card {
    display: flex;
    gap: 14px;
    background: var(--insight-bg);
    border-radius: 8px;
    padding: 16px 18px;
  }
  .bb-topic-num {
    width: 26px;
    height: 26px;
    flex-shrink: 0;
    background: var(--insight);
    color: #fff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
  }
  .bb-topic-body { flex: 1; min-width: 0; }
  .bb-topic-title { font-size: 15px; font-weight: 700; color: #382F8C; margin-bottom: 5px; letter-spacing: -0.01em; }
  .bb-topic-desc { font-size: 13.5px; color: #4A4470; line-height: 1.6; margin-bottom: 6px; }
  .bb-topic-rationale { font-size: 12.5px; color: #6B63B0; }

  /* ━━━ 경쟁사 동향 비교 ━━━ */
  .bb-compare {
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 20px 24px;
    margin-bottom: 22px;
  }
  .bb-compare-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 700;
    color: var(--primary);
    margin-bottom: 14px;
  }
  .bb-compare-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .bb-compare-card { border: 1px solid var(--line-light); border-radius: 8px; padding: 12px 14px; }
  .bb-compare-card-label { font-size: 13px; font-weight: 700; color: var(--ink); margin-bottom: 5px; }
  .bb-compare-card-summary { font-size: 12.5px; color: var(--ink-mute); line-height: 1.55; }

  /* ━━━ 지난 발굴주제 아카이브 ━━━ */
  .bb-archive {
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 20px 24px;
    margin-bottom: 22px;
  }
  .bb-archive-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 700;
    color: var(--ink);
    margin-bottom: 10px;
  }
  .bb-archive-list { display: flex; flex-direction: column; }
  .bb-archive-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 9px 0;
    border-bottom: 1px solid var(--line-light);
    font-size: 13px;
  }
  .bb-archive-row:last-child { border-bottom: none; }
  .bb-archive-week { color: var(--ink-faint); flex-shrink: 0; min-width: 76px; }
  .bb-archive-topic { color: var(--ink); flex: 1; }
  .bb-archive-badge {
    font-size: 11px;
    font-weight: 600;
    color: var(--ink-faint);
    border: 1px solid var(--line);
    padding: 2px 8px;
    border-radius: 10px;
    flex-shrink: 0;
  }

  /* ━━━ AI 리포트 생성 버튼 ━━━ */
  .bb-report-btn-wrap { position: relative; display: flex; justify-content: flex-end; margin-bottom: 16px; }
  .bb-report-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: var(--insight);
    color: #fff;
    border: none;
    padding: 10px 18px;
    border-radius: 8px;
    font-size: 13.5px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s;
  }
  .bb-report-btn:hover { background: #4A3FC7; }
  .bb-report-btn:disabled { opacity: 0.7; cursor: default; }
  .bb-report-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 8px;
    box-shadow: 0 6px 20px rgba(0,0,0,0.1);
    overflow: hidden;
    z-index: 20;
    min-width: 150px;
  }
  .bb-report-menu-item {
    padding: 11px 16px;
    font-size: 13.5px;
    color: var(--ink);
    cursor: pointer;
    transition: background 0.15s;
  }
  .bb-report-menu-item:hover { background: var(--bg); }
  .bb-report-error { position: absolute; top: calc(100% + 6px); right: 0; font-size: 12px; color: #C0392B; white-space: nowrap; }

  /* ━━━ DART 공시 ━━━ */
  .bb-filings {
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 20px 24px;
    margin-bottom: 22px;
  }
  .bb-filings-header { margin-bottom: 14px; }
  .bb-filings-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 700;
    color: var(--ink);
  }
  .bb-filings-group { margin-bottom: 16px; }
  .bb-filings-group:last-child { margin-bottom: 0; }
  .bb-filings-group-label {
    font-size: 12px;
    font-weight: 700;
    color: var(--primary);
    background: var(--primary-bg);
    display: inline-block;
    padding: 3px 10px;
    border-radius: 10px;
    margin-bottom: 10px;
  }
  .bb-filings-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  .bb-filings-card { border: 1px solid var(--line-light); border-radius: 8px; padding: 14px 16px; }
  .bb-filings-card-label { font-size: 14px; font-weight: 700; color: var(--ink); margin-bottom: 10px; }
  .bb-filings-empty { font-size: 12.5px; color: var(--ink-faint); padding: 6px 0; }
  .bb-filings-list { display: flex; flex-direction: column; gap: 9px; list-style: none; padding: 0; margin: 0; }
  .bb-filings-list li { display: flex; flex-direction: column; gap: 2px; }
  .bb-filings-list a { font-size: 13px; color: var(--primary-dark); font-weight: 500; line-height: 1.4; }
  .bb-filings-list a:hover { text-decoration: underline; }
  .bb-filings-date { font-size: 11.5px; color: var(--ink-faint); }

  /* ━━━ 특허 동향 (준비 중) ━━━ */
  .bb-patents-placeholder {
    background: var(--bg);
    border: 1px dashed var(--line);
    border-radius: 6px;
    padding: 18px 22px;
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .bb-patents-placeholder-icon {
    width: 38px;
    height: 38px;
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .bb-patents-placeholder-title { font-size: 14px; font-weight: 700; color: var(--ink-mute); margin-bottom: 3px; }
  .bb-patents-placeholder-desc { font-size: 12.5px; color: var(--ink-faint); line-height: 1.5; }

  /* ━━━ Hero Banner (Main Slogan) ━━━ */
  .bb-hero {
    background: linear-gradient(135deg, #FFFFFF 0%, #F0F7FB 100%);
    border: 1px solid var(--line);
    border-top: 4px solid var(--primary);
    border-radius: 6px;
    padding: 44px 36px;
    margin-bottom: 22px;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .bb-hero::before {
    content: '';
    position: absolute;
    top: -50px; right: -50px;
    width: 220px; height: 220px;
    background: radial-gradient(circle, rgba(44,125,196,0.10) 0%, transparent 70%);
    pointer-events: none;
  }
  .bb-hero::after {
    content: '';
    position: absolute;
    bottom: -50px; left: -50px;
    width: 180px; height: 180px;
    background: radial-gradient(circle, rgba(91,168,217,0.08) 0%, transparent 70%);
    pointer-events: none;
  }
  .bb-hero-eyebrow {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.2em;
    color: var(--primary);
    margin-bottom: 14px;
    position: relative;
  }
  .bb-hero-title {
    font-size: 36px;
    font-weight: 700;
    letter-spacing: -0.025em;
    color: var(--ink);
    line-height: 1.25;
    position: relative;
    margin: 0 0 4px;
  }
  .bb-hero-title .accent {
    color: var(--primary);
    font-style: italic;
    padding: 0 0.12em 0 0.08em;
    margin: 0 0.04em;
  }
  .bb-hero-divider {
    width: 42px;
    height: 3px;
    background: var(--primary);
    margin: 18px auto;
    border-radius: 2px;
    position: relative;
  }
  .bb-hero-subtitle {
    font-size: 16px;
    color: var(--ink-mute);
    letter-spacing: 0.02em;
    position: relative;
    font-weight: 500;
    margin: 0;
  }

  /* ━━━ Concerns Banner ━━━ */
  .bb-concerns { background: linear-gradient(135deg, #1F5F9E 0%, #2C7DC4 100%); color: #fff; border-radius: 4px; padding: 22px 26px; margin-bottom: 22px; display: flex; gap: 24px; align-items: center; position: relative; overflow: hidden; flex-wrap: wrap; }
  .bb-concerns::before { content: ''; position: absolute; top: -30px; right: -30px; width: 160px; height: 160px; background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%); }
  .bb-concerns-label { font-size: 15px; font-weight: 700; padding-right: 24px; border-right: 1px solid rgba(255,255,255,0.3); flex-shrink: 0; letter-spacing: 0.02em; position: relative; }
  .bb-concerns-badge { display: inline-block; font-size: 11px; background: rgba(255,255,255,0.2); padding: 3px 9px; border-radius: 12px; margin-left: 8px; font-weight: 500; }
  .bb-concerns-items { display: flex; gap: 26px; flex: 1; position: relative; flex-wrap: wrap; min-width: 0; }
  .bb-concern { font-size: 14.5px; line-height: 1.45; color: #fff; cursor: pointer; transition: opacity 0.15s; }
  .bb-concern:hover { opacity: 0.8; }
  .bb-concern-num { color: #FFE082; font-weight: 700; margin-right: 7px; font-size: 13px; }

  /* ━━━ Page Header ━━━ */
  .bb-page-header { background: #fff; border: 1px solid var(--line); border-radius: 4px; padding: 22px 26px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
  .bb-page-title-area { display: flex; align-items: center; gap: 16px; }
  .bb-page-icon { width: 48px; height: 48px; background: var(--primary-bg); border-radius: 10px; display: flex; align-items: center; justify-content: center; }
  .bb-page-title { font-size: 24px; font-weight: 700; letter-spacing: -0.02em; }
  .bb-page-title-sub { color: var(--primary); }
  .bb-page-desc { font-size: 14px; color: var(--ink-mute); margin-top: 3px; }
  .bb-breadcrumb { display: flex; align-items: center; gap: 7px; font-size: 13.5px; color: var(--ink-faint); }
  .bb-breadcrumb .current { color: var(--ink); font-weight: 500; }

  /* ━━━ Filter Bar ━━━ */
  .bb-filter-bar { background: #fff; border: 1px solid var(--line); border-radius: 4px; padding: 14px 20px; margin-bottom: 16px; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
  .bb-filter-label { font-size: 14px; color: var(--ink-mute); font-weight: 500; }
  .bb-search-box { flex: 1; min-width: 220px; display: flex; border: 1px solid var(--line); border-radius: 4px; overflow: hidden; }
  .bb-search-input { flex: 1; padding: 9px 14px; border: none; outline: none; font-size: 14px; background: var(--bg); font-family: inherit; }
  .bb-search-btn { background: var(--primary); color: #fff; border: none; padding: 0 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .bb-search-btn:hover { background: var(--primary-dark); }
  .bb-result-count { font-size: 14px; color: var(--ink-mute); }
  .bb-result-count strong { color: var(--primary); font-weight: 700; }

  /* ━━━ Subchips ━━━ */
  .bb-subchips { display: flex; gap: 7px; flex-wrap: wrap; margin-bottom: 18px; }
  .bb-subchip { font-size: 13.5px; padding: 7px 14px; background: #fff; border: 1px solid var(--line); color: var(--ink-mute); cursor: pointer; border-radius: 20px; transition: all 0.15s; user-select: none; }
  .bb-subchip:hover { border-color: var(--primary); color: var(--primary); }
  .bb-subchip.active { background: var(--primary); color: #fff; border-color: var(--primary); font-weight: 500; }
  .bb-subchip-count { margin-left: 4px; font-size: 12px; opacity: 0.65; }

  /* ━━━ Article List ━━━ */
  .bb-article-list { background: #fff; border: 1px solid var(--line); border-radius: 4px; overflow: hidden; }
  .bb-article-row { padding: 22px 26px; border-bottom: 1px solid var(--line-light); cursor: pointer; transition: background 0.15s; display: grid; grid-template-columns: 32px 1fr auto; gap: 16px; align-items: start; }
  .bb-article-row:last-child { border-bottom: none; }
  .bb-article-row:hover { background: var(--primary-bg); }
  .bb-article-num { font-size: 16px; font-weight: 700; color: var(--primary); padding-top: 2px; text-align: center; }
  .bb-article-body { min-width: 0; }
  .bb-article-title { font-size: 17px; font-weight: 600; letter-spacing: -0.01em; line-height: 1.4; margin-bottom: 11px; color: var(--ink); }
  .bb-article-row:hover .bb-article-title { color: var(--primary-dark); }
  .bb-ai-summary { background: var(--bg); border-left: 3px solid var(--primary-light); padding: 11px 15px; margin-bottom: 11px; border-radius: 0 4px 4px 0; }
  .bb-ai-summary-label { font-size: 11.5px; color: var(--primary); font-weight: 700; letter-spacing: 0.08em; margin-bottom: 4px; display: flex; align-items: center; gap: 5px; }
  .bb-ai-summary-content { font-size: 14px; color: var(--ink-mute); line-height: 1.65; }
  .bb-article-meta { display: flex; align-items: center; gap: 11px; font-size: 13px; color: var(--ink-faint); flex-wrap: wrap; }
  .bb-article-source { color: var(--primary-dark); font-weight: 500; }
  .bb-article-date { color: var(--ink-faint); }
  .bb-article-tag { display: inline-block; background: var(--primary-bg); color: var(--primary); font-size: 12px; padding: 3px 9px; border-radius: 4px; font-weight: 500; }
  .bb-article-arrow { padding-top: 3px; opacity: 0.5; transition: opacity 0.15s; }
  .bb-article-row:hover .bb-article-arrow { opacity: 1; }

  /* ━━━ Category Grid (Home) ━━━ */
  .bb-cat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
  .bb-cat-card { background: #fff; border: 1px solid var(--line); border-radius: 6px; padding: 20px 22px 18px; cursor: pointer; transition: all 0.15s; }
  .bb-cat-card:hover { border-color: var(--primary); box-shadow: 0 4px 14px rgba(44,125,196,0.1); transform: translateY(-2px); }
  .bb-cat-card-header { display: flex; align-items: center; gap: 12px; padding-bottom: 14px; border-bottom: 1px solid var(--line-light); margin-bottom: 14px; }
  .bb-cat-card-icon { width: 40px; height: 40px; background: var(--primary-bg); border-radius: 8px; display: flex; align-items: center; justify-content: center; }
  .bb-cat-card-title-area { flex: 1; min-width: 0; }
  .bb-cat-card-title { font-size: 18px; font-weight: 700; letter-spacing: -0.015em; }
  .bb-cat-card-desc { font-size: 13px; color: var(--ink-faint); margin-top: 2px; }
  .bb-cat-card-count { font-size: 15px; font-weight: 700; color: var(--primary); background: var(--primary-bg); padding: 4px 12px; border-radius: 14px; }
  .bb-cat-card-list { display: flex; flex-direction: column; gap: 8px; min-height: 120px; }
  .bb-cat-card-item { display: flex; gap: 10px; padding: 6px 0; font-size: 14px; color: var(--ink); line-height: 1.5; cursor: pointer; transition: color 0.15s; }
  .bb-cat-card-item:hover { color: var(--primary); }
  .bb-cat-card-item-num { color: var(--primary); font-weight: 700; flex-shrink: 0; min-width: 16px; }
  .bb-cat-card-item-title { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
  .bb-cat-card-more { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--line-light); font-size: 13.5px; color: var(--primary); font-weight: 600; display: flex; align-items: center; gap: 4px; }
  .bb-empty-small { padding: 22px 0; text-align: center; color: var(--ink-faint); font-size: 13px; }

  /* ━━━ Empty / Loading / Error ━━━ */
  .bb-empty { padding: 60px 30px; background: #fff; border: 1px solid var(--line); border-radius: 4px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 10px; color: var(--ink-mute); font-size: 13.5px; }
  .bb-loading { padding: 80px 20px; text-align: center; }
  .bb-loading div { margin-top: 14px; font-size: 13px; color: var(--ink-mute); }
  .bb-spin { animation: bb-spin 1s linear infinite; }
  @keyframes bb-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .bb-error { padding: 40px 30px; background: #fff; border: 1px solid #F5D9D7; border-radius: 4px; text-align: center; max-width: 480px; margin: 40px auto; }
  .bb-error h3 { font-size: 16px; font-weight: 700; margin: 14px 0 6px; }
  .bb-error p { font-size: 13px; color: var(--ink-mute); margin: 0 0 16px; }
  .bb-error details { margin-bottom: 14px; font-size: 12px; color: var(--ink-faint); }
  .bb-error details code { display: block; margin-top: 8px; padding: 10px; background: var(--bg); border-radius: 4px; font-size: 11px; text-align: left; }
  .bb-error button { padding: 8px 18px; background: var(--primary); color: #fff; border: none; border-radius: 4px; cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 600; }
  .bb-error button:hover { background: var(--primary-dark); }

  /* ━━━ Responsive ━━━ */
  @media (max-width: 768px) {
    .bb-content-full { padding: 16px; }
    .bb-topnav { padding: 0 16px; gap: 12px; overflow-x: auto; }
    .bb-logo-badge { display: none; }
    .bb-cat-grid { grid-template-columns: 1fr; }
    .bb-compare-grid { grid-template-columns: 1fr; }
    .bb-filings-grid { grid-template-columns: 1fr; }
    .bb-theme-grid { grid-template-columns: 1fr; }
  }
`;
