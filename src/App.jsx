import React, { useState, useMemo, useEffect } from 'react';
import { Zap, FileText, Users, Swords, Building2, Clock, Star, Search, RefreshCw, AlertCircle, ChevronRight, Sparkles, Home, ExternalLink, Lightbulb, Hash, Flame, Target, History, Award, Landmark, Download, TrendingUp } from 'lucide-react';
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
// ⬇️  AI가 아직 오늘의 분석을 만들지 못했을 때 임시로 보여줄 샘플입니다.
// ⬇️  실제 데이터(data.json의 dailyInsight)가 생기면 자동으로 이 샘플 대신 그걸 보여줍니다.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const SAMPLE_DAILY_INSIGHT = {
  isSample: true,
  date: '2026-07-21',
  articleCount: 18,
  keywords: [
    { keyword: 'FEOC 규제', count: 4, headline: '美 상무부, FEOC 세부 시행지침 초안 공개', link: 'https://example.com/news/feoc-guideline' },
    { keyword: 'ESS 성장', count: 3, headline: 'LGES, AI데이터센터向 ESS 수주 확대 발표', link: 'https://example.com/news/lges-ess' },
    { keyword: '리튬 가격', count: 3, headline: '리튬 현물가, 3주 연속 반등세', link: 'https://example.com/news/lithium-price' },
    { keyword: '46파이 배터리', count: 2, headline: '테슬라 46파이 라인 수율 개선 소식', link: 'https://example.com/news/tesla-4680' },
    { keyword: '전고체 전지', count: 2, headline: '도요타, 전고체 전지 양산 일정 재확인', link: 'https://example.com/news/toyota-solid-state' },
  ],
  categorySummaries: [
    { cat: 'policy', points: [
      '美 상무부가 FEOC(해외우려기업) 세부 시행지침 초안을 공개하면서 배터리·소재 원산지 추적 요건이 예상보다 까다로워질 수 있다는 우려가 제기됐다.',
      '비중국 공급망을 갖춘 업체들의 반사이익 기대가 커지는 분위기지만, 시행 세칙 확정까지는 시간이 걸릴 수 있어 추가 공청회·의견수렴 일정을 계속 지켜볼 필요가 있다.',
    ] },
    { cat: 'competitor', points: [
      'CATL과 LGES가 나란히 ESS向 대형 수주 확대 소식을 발표하며 데이터센터發 전력 저장 수요를 선점하려는 움직임을 보였다.',
      '동시에 중국 업체들의 LFP 생산라인 증설 소식도 이어지면서 중저가 시장 공급 과잉 우려가 함께 제기된다.',
    ] },
    { cat: 'customer', points: [
      'TTI·Bosch 등 주요 전동공구 고객사들이 하반기 물량 계획을 구체화하는 기사가 다수 나왔다. 재고 조정이 어느 정도 마무리되며 발주가 정상화되는 신호로 해석할 수 있다.',
    ] },
  ],
  reportAgenda: [
    { title: 'FEOC 규제 후속지침에 따른 비중국 공급망 영향 점검', reason: '오늘 세부 시행지침 초안 관련 기사가 다수 보도되어 원산지 추적 요건이 소형전지 공급망에 미치는 영향을 사업부 차원에서 조기에 점검할 필요가 있다. 시행 세칙이 확정되기 전에 대응 시나리오를 준비해두면 규제 확정 이후 대응 속도를 높일 수 있다.' },
    { title: 'ESS向 경쟁사 수주 확대 동향 공유', reason: 'CATL·LGES의 ESS 수주 확대 소식은 소형전지와 직접 경합하지는 않지만, 두 회사의 생산능력 배분 전략 변화를 보여주는 신호다. 파생 수요 및 라인 우선순위 변화 가능성을 유관부서와 공유해 중장기 대응 방향을 함께 논의할 필요가 있다.' },
  ],
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
    { theme: 'ESS 성장', items: ['중국 LFP 증설', 'LG엔솔 46시리즈 수주'], whySdi: 'AI데이터센터發 ESS 수요가 소형전지 파생 수요로 이어질 수 있어 중장기 포트폴리오 검토가 필요하다.' },
    { theme: '탈중국 공급망', items: ['FEOC 규제 강화', '비중국 파트너십 검토'], whySdi: '비중국 공급망을 갖춘 SDI에는 북미 고객사 대상 반사이익 기회로 작용할 수 있다.' },
    { theme: '원자재 가격', items: ['리튬 가격 급락', '구매단가 재협상'], whySdi: '리튬 가격 급락은 단기 원가 절감 기회이나 장기계약 단가 재협상 이슈로 이어질 수 있다.' },
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
    keywords: [
      { keyword: 'FEOC 규제', count: 9 },
      { keyword: 'ESS 성장', count: 8 },
      { keyword: 'LFP 국산화', count: 10 },
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⬇️  DART 분기 실적(재무제표) 자동수집이 아직 연결 안 됐을 때 임시로 보여줄 샘플입니다.
// ⬇️  DART_API_KEY가 설정되면 자동으로 이 샘플 대신 실제 매출/영업이익 데이터를 보여줍니다.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const SAMPLE_DART_FINANCIALS = {
  isSample: true,
  companies: [
    {
      id: 'sdi', label: '삼성SDI', type: 'battery',
      financials: {
        reportLabel: '1분기보고서', bsnsYear: '2026',
        revenue: { current: '3576353183422', prev: '3176817731170' },
        operatingProfit: { current: '-155580771739', prev: '-434068787207' },
        netProfit: { current: '56110855928', prev: '-215955155323' },
      },
      trend: [
        { label: '3분기(누적) 2025', revenue: '10800000000000', operatingProfit: '-680000000000' },
        { label: '사업보고서(연간) 2025', revenue: '14300000000000', operatingProfit: '-920000000000' },
        { label: '1분기 2026', revenue: '3576353183422', operatingProfit: '-155580771739' },
      ],
      profile: {
        ceoName: '최주선', address: '경기도 용인시 기흥구 공세로 150-20',
        homepageUrl: 'www.samsungsdi.co.kr', estDate: '19700120',
      },
      employees: { reportLabel: '사업보고서', bsnsYear: '2025', totalHeadcount: 12826, avgAnnualSalary: 94231873 },
      summaryFinancials: {
        bsnsYear: '2025', thstrmNm: '제 56 기', frmtrmNm: '제 55 기', bfefrmtrmNm: '제 54 기',
        revenue: { thstrm: '13,266,730,679,499', frmtrm: '16,592,248,884,388', bfefrmtrm: '21,436,788,407,451' },
        operatingProfit: { thstrm: '-1,722,360,788,760', frmtrm: '363,304,463,263', bfefrmtrm: '1,545,488,713,572' },
        netProfit: { thstrm: '-584,875,358,534', frmtrm: '575,512,415,979', bfefrmtrm: '2,066,046,562,201' },
        totalAssetsCfs: { thstrm: '42,255,338,580,919', frmtrm: '40,597,344,536,357', bfefrmtrm: '34,038,860,192,967' },
        totalAssetsOfs: { thstrm: '22,103,874,635,370', frmtrm: '21,552,149,591,601', bfefrmtrm: '19,529,981,403,920' },
      },
    },
    {
      id: 'lges', label: 'LG에너지솔루션', type: 'battery',
      financials: {
        reportLabel: '1분기보고서', bsnsYear: '2026',
        revenue: { current: '6554967000000', prev: '6722711000000' },
        operatingProfit: { current: '-207755000000', prev: '374673000000' },
        netProfit: { current: '-944034000000', prev: '226573000000' },
      },
      trend: [
        { label: '3분기(누적) 2025', revenue: '19700000000000', operatingProfit: '480000000000' },
        { label: '사업보고서(연간) 2025', revenue: '26500000000000', operatingProfit: '210000000000' },
        { label: '1분기 2026', revenue: '6554967000000', operatingProfit: '-207755000000' },
      ],
      profile: {
        ceoName: '김동명', address: '서울특별시 영등포구 여의대로 108, 타워 1',
        homepageUrl: 'www.lgensol.com', estDate: '20201201',
      },
      employees: { reportLabel: '사업보고서', bsnsYear: '2025', totalHeadcount: 12922, avgAnnualSalary: 111672726 },
      summaryFinancials: {
        bsnsYear: '2025', thstrmNm: '제 6 기', frmtrmNm: '제 5 기', bfefrmtrmNm: '제 4 기',
        revenue: { thstrm: '23,671,759,000,000', frmtrm: '25,619,585,000,000', bfefrmtrm: '33,745,470,000,000' },
        operatingProfit: { thstrm: '1,346,120,000,000', frmtrm: '575,387,000,000', bfefrmtrm: '2,163,234,000,000' },
        netProfit: { thstrm: '80,803,000,000', frmtrm: '338,602,000,000', bfefrmtrm: '1,637,985,000,000' },
        totalAssetsCfs: { thstrm: '67,147,953,000,000', frmtrm: '60,306,791,000,000', bfefrmtrm: '45,437,144,000,000' },
        totalAssetsOfs: { thstrm: '31,167,774,000,000', frmtrm: '27,640,810,000,000', bfefrmtrm: '23,545,939,000,000' },
      },
    },
    {
      id: 'hyundai', label: '현대자동차', type: 'customer',
      financials: null,
      trend: [],
      profile: null,
      employees: null,
      summaryFinancials: null,
    },
  ],
};

// ⬇️  AI 재무 리포트가 아직 생성되지 않았을 때 임시로 보여줄 샘플입니다.
// ⬇️  GEMINI_API_KEY가 설정되면 자동으로 이 샘플 대신 실제 생성된 리포트를 보여줍니다.
const SAMPLE_FINANCIAL_REPORT = {
  isSample: true,
  companies: ['삼성SDI', 'LG에너지솔루션'],
  summary: '삼성SDI는 2025년 매출 13.3조원, 영업이익 -1.7조원으로 전년(영업이익 3,633억원) 대비 적자 전환했습니다. LG에너지솔루션은 매출 23.7조원으로 전년보다 소폭 줄었지만 영업이익은 1.3조원으로 흑자 전환에 성공해 두 회사의 수익성 흐름이 엇갈렸습니다. 양사 모두 최근 3개년 매출이 지속적으로 감소하는 추세여서 전방 수요 둔화가 공통 리스크로 확인됩니다.',
  highlights: [
    { label: '삼성SDI 적자전환', value: '영업이익 -1.7조원 (전기 +3,633억원)', tone: 'danger' },
    { label: 'LGES 흑자전환', value: '영업이익 1.3조원 (전기 5,754억원)', tone: 'success' },
    { label: 'LGES 부채비율 상승', value: '86%→95%→129%로 3개년 연속 상승', tone: 'danger' },
    { label: 'SDI 순이익도 적자', value: '당기순이익 -5,849억원', tone: 'danger' },
  ],
  risks: [
    { title: '전방 수요 둔화', description: '전기차 판매 성장 둔화로 양사 모두 최근 3개년 매출이 지속 감소하고 있어 중장기 매출 회복 여부가 관건입니다.' },
    { title: 'LGES 재무 레버리지 확대', description: '부채비율이 86%에서 129%까지 상승해 자본 대비 부채 부담이 빠르게 커지고 있습니다.' },
    { title: '삼성SDI 수익성 악화', description: '매출 감소와 함께 영업이익까지 적자로 전환되어 원가·가동률 관리 부담이 커진 상태입니다.' },
  ],
  comparison: [
    { metric: '매출액', unit: '억원', sdi: 132667, lges: 236718 },
    { metric: '영업이익', unit: '억원', sdi: -17224, lges: 13461 },
    { metric: '당기순이익', unit: '억원', sdi: -5849, lges: 808 },
    { metric: '부채비율', unit: '%', sdi: 79.3, lges: 129.0 },
  ],
};

export default function App() {
  const [news, setNews] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [dailyInsight, setDailyInsight] = useState(null);
  const [weeklyInsight, setWeeklyInsight] = useState(null);
  const [weeklyInsightHistory, setWeeklyInsightHistory] = useState(null);
  const [dartFilings, setDartFilings] = useState(null);
  const [dartFinancials, setDartFinancials] = useState(null);
  const [financialReport, setFinancialReport] = useState(null);
  const [lastUpdated, setLastUpdated] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCat, setActiveCat] = useState(null);
  const [activeSub, setActiveSub] = useState(null);
  const [search, setSearch] = useState('');
  const [activeView, setActiveView] = useState('daily'); // 'daily' | 'news' | 'filings'

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}data.json?t=${Date.now()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setNews(data.news || []);
      setFeatured(data.featured || []);
      setDailyInsight(data.dailyInsight || SAMPLE_DAILY_INSIGHT);
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
      setDartFinancials(
        data.dartFinancials && data.dartFinancials.companies && data.dartFinancials.companies.length > 0
          ? data.dartFinancials
          : SAMPLE_DART_FINANCIALS
      );
      setFinancialReport(
        data.financialReport && data.financialReport.comparison && data.financialReport.comparison.length > 0
          ? data.financialReport
          : SAMPLE_FINANCIAL_REPORT
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

  const goDaily = () => {
    setActiveView('daily');
    setActiveCat(null);
    setActiveSub(null);
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

  const goFilings = () => {
    setActiveView('filings');
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

      <TopNav lastUpdated={lastUpdated} totalCount={news.length} onLogoClick={goDaily} />

      <div className="bb-layout">
        <Sidebar
          news={news}
          activeView={activeView}
          activeCat={activeCat}
          activeSub={activeSub}
          onCatClick={handleCatClick}
          onSubClick={handleSubClick}
          onDailyClick={goDaily}
          onNewsClick={goNews}
          onFilingsClick={goFilings}
        />

        <main className="bb-content">
          {loading && <LoadingView />}
          {!loading && error && <ErrorView error={error} onRetry={loadData} />}
          {!loading && !error && (
            <>
              {activeView === 'news' && !activeCat && <HeroBanner />}

              {activeView === 'news' && featured.length > 0 && <ConcernsBanner featured={featured} />}

              {activeView === 'daily' ? (
                <DailyView data={dailyInsight} weeklyInsightHistory={weeklyInsightHistory} />
              ) : activeView === 'filings' ? (
                <FilingsView dartFilings={dartFilings} dartFinancials={dartFinancials} financialReport={financialReport} />
              ) : activeCat ? (
                <CategoryView
                  category={activeCategory}
                  activeSub={activeSub}
                  news={news}
                  filteredNews={filteredNews}
                  search={search}
                  setSearch={setSearch}
                  onSubClick={handleSubClick}
                />
              ) : (
                <HomeView news={news} onCatClick={handleCatClick} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

// ━━━━━━━━━━ Top Navigation ━━━━━━━━━━
function TopNav({ lastUpdated, totalCount, onLogoClick }) {
  return (
    <header className="bb-topnav">
      <div className="bb-logo" onClick={onLogoClick}>
        <div className="bb-logo-icon"><Zap size={16} color="#fff" strokeWidth={2.5} /></div>
        <span className="bb-logo-text">Battery Briefing</span>
        <span className="bb-logo-badge">SDI 기획그룹</span>
      </div>
      <div className="bb-top-right">
        {lastUpdated && <span className="bb-last-update">업데이트 · {lastUpdated}</span>}
        <span className="bb-total-count">총 {totalCount}건</span>
      </div>
    </header>
  );
}

// ━━━━━━━━━━ Sidebar ━━━━━━━━━━
function Sidebar({ news, activeView, activeCat, activeSub, onCatClick, onSubClick, onDailyClick, onNewsClick, onFilingsClick }) {
  return (
    <aside className="bb-sidebar">
      <div className={`bb-menu-item bb-menu-item-root ${activeView === 'daily' ? 'active' : ''}`} onClick={onDailyClick}>
        <Flame size={16} style={{ marginRight: 9, verticalAlign: -3 }} />
        오늘의 브리핑
      </div>

      <div className="bb-menu-divider" />

      <div className={`bb-menu-item bb-menu-item-root ${activeView === 'news' && !activeCat ? 'active' : ''}`} onClick={onNewsClick}>
        <Home size={16} style={{ marginRight: 9, verticalAlign: -3 }} />
        뉴스
        <span className="bb-count">{news.length}</span>
      </div>

      {CATEGORIES.map(cat => {
        const count = news.filter(n => n.cat === cat.id).length;
        const isActive = activeView === 'news' && activeCat === cat.id;
        return (
          <React.Fragment key={cat.id}>
            <div className={`bb-menu-item ${isActive ? 'active' : ''}`} onClick={() => onCatClick(cat.id)}>
              {cat.label}
              <span className="bb-count">{count}</span>
            </div>
            {isActive && cat.subs.length > 0 && (
              <div className="bb-submenu">
                {cat.subs.map(sub => {
                  const subCount = news.filter(n => n.cat === cat.id && n.sub === sub.id).length;
                  return (
                    <div
                      key={sub.id}
                      className={`bb-submenu-item ${activeSub === sub.id ? 'active' : ''}`}
                      onClick={() => onSubClick(cat.id, sub.id)}
                    >
                      {sub.label}
                      <span className="bb-count">{subCount}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </React.Fragment>
        );
      })}

      <div className="bb-menu-divider" />

      <div className={`bb-menu-item bb-menu-item-root ${activeView === 'filings' ? 'active' : ''}`} onClick={onFilingsClick}>
        <Landmark size={16} style={{ marginRight: 9, verticalAlign: -3 }} />
        공시
      </div>
    </aside>
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

// ━━━━━━━━━━ 오늘의 브리핑 (단일 페이지) ━━━━━━━━━━
function DailyStatBar({ data }) {
  const articleCount = typeof data.articleCount === 'number' ? data.articleCount : null;
  const keywordCount = data.keywords?.length || 0;
  const agendaCount = data.reportAgenda?.length || 0;
  return (
    <div className="bb-daily-statbar">
      <div className="bb-daily-stat">
        <div className="bb-daily-stat-value">{articleCount ?? '-'}</div>
        <div className="bb-daily-stat-label">오늘 분석 기사</div>
      </div>
      <div className="bb-daily-stat">
        <div className="bb-daily-stat-value">{keywordCount}</div>
        <div className="bb-daily-stat-label">핵심 키워드</div>
      </div>
      <div className="bb-daily-stat bb-daily-stat-agenda">
        <div className="bb-daily-stat-value">{agendaCount}</div>
        <div className="bb-daily-stat-label">보고안건</div>
      </div>
    </div>
  );
}

function DailyKeywordsList({ keywords }) {
  const [openIdx, setOpenIdx] = useState(null);
  if (!keywords || keywords.length === 0) return null;
  return (
    <div className="bb-daily">
      <div className="bb-daily-block-title"><Hash size={17} /> 주요 키워드</div>
      <div className="bb-daily-keyword-cloud">
        {keywords.map((k, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div className="bb-daily-keyword-chip-wrap" key={idx}>
              <button
                type="button"
                className={`bb-daily-keyword-chip ${isOpen ? 'active' : ''}`}
                onClick={() => setOpenIdx(isOpen ? null : idx)}
              >
                {k.keyword}
                {typeof k.count === 'number' && <span className="bb-daily-keyword-chip-count">{k.count}</span>}
              </button>
              {isOpen && k.headline && (
                k.link ? (
                  <a
                    href={k.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bb-daily-keyword-popover bb-daily-keyword-popover-link"
                  >
                    {k.headline}
                    <span className="bb-daily-keyword-popover-cta">기사 보러가기 <ExternalLink size={11} /></span>
                  </a>
                ) : (
                  <div className="bb-daily-keyword-popover">{k.headline}</div>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DailyCategoryRows({ summaries }) {
  if (!summaries || summaries.length === 0) return null;
  return (
    <div className="bb-daily">
      <div className="bb-daily-block-title"><TrendingUp size={17} /> 카테고리별 동향</div>
      <div className="bb-daily-catrow-list">
        {summaries.map((s, idx) => {
          const cat = CATEGORIES.find(c => c.id === s.cat);
          const points = Array.isArray(s.points) && s.points.length > 0 ? s.points : (s.summary ? [s.summary] : []);
          return (
            <div className="bb-daily-catrow" key={idx}>
              <div className="bb-daily-catrow-label">{cat ? cat.label : s.cat}</div>
              {points.length > 1 ? (
                <ol className="bb-daily-catrow-points">
                  {points.map((p, pIdx) => <li key={pIdx}>{p}</li>)}
                </ol>
              ) : (
                <div className="bb-daily-catrow-text">{points[0]}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DailyReportAgenda({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="bb-daily">
      <div className="bb-daily-agenda-title"><FileText size={17} /> 기획그룹 보고안건</div>
      <div className="bb-daily-agenda-list">
        {items.map((item, idx) => (
          <div className="bb-daily-agenda-item" key={idx}>
            <div className="bb-daily-agenda-num">{idx + 1}</div>
            <div>
              <div className="bb-daily-agenda-item-title">{item.title}</div>
              {item.reason && <div className="bb-daily-agenda-item-reason">{item.reason}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━ 오늘의 브리핑 (사이드바 최상단 페이지) ━━━━━━━━━━
function DailyView({ data, weeklyInsightHistory }) {
  if (!data || (!data.keywords?.length && !data.categorySummaries?.length && !data.reportAgenda?.length)) {
    return (
      <div className="bb-daily-empty">
        <Flame size={22} color="#A9A79C" />
        <div>아직 생성된 오늘의 브리핑이 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="bb-daily-page">
      <div className="bb-daily-page-header">
        <div className="bb-daily-page-title">
          오늘의 브리핑
          {data.isSample && <span className="bb-weekly-sample-badge">샘플</span>}
        </div>
        <div className="bb-daily-page-desc">
          {data.date && <>{data.date} </>}· AI 자동 생성
        </div>
      </div>

      <DailyStatBar data={data} />

      <DailyKeywordsList keywords={data.keywords} />
      <DailyCategoryRows summaries={data.categorySummaries} />
      <DailyReportAgenda items={data.reportAgenda} />

      <TopicArchive history={weeklyInsightHistory} />
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
function tokenizeKeyword(str) {
  return (str || '')
    .replace(/[·,()~/\-–]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2);
}

// 키워드와 제목이 겹치는 기사를 중복 없이 전부 찾는다 (클라이언트 사이드 매칭, 별도 AI 호출 없음)
function findMatchingArticles(keyword, news) {
  const tokens = tokenizeKeyword(keyword);
  if (tokens.length === 0 || !news || news.length === 0) return [];
  const seen = new Set();
  const matches = [];
  for (const n of news) {
    const dedupeKey = n.link || n.id || n.title;
    if (seen.has(dedupeKey)) continue;
    if (tokens.some(t => n.title && n.title.includes(t))) {
      seen.add(dedupeKey);
      matches.push(n);
    }
  }
  return matches;
}

function KeywordHeatmap({ keywords, news, prevKeywords }) {
  if (!keywords || keywords.length === 0) return null;
  const maxCount = Math.max(...keywords.map(k => (typeof k.count === 'number' ? k.count : 0)), 1);

  return (
    <div className="bb-heatmap-grid">
      {keywords.map((k, idx) => {
        const ratio = typeof k.count === 'number' ? k.count / maxCount : 0.3;
        const isDark = ratio > 0.5;
        const articles = findMatchingArticles(k.keyword, news);

        const prev = prevKeywords ? prevKeywords.find(p => p.keyword === k.keyword) : null;
        let trendLabel = null;
        let trendClass = '';
        if (prev && typeof prev.count === 'number' && typeof k.count === 'number') {
          const diff = k.count - prev.count;
          if (diff > 0) { trendLabel = `▲${diff}`; trendClass = 'up'; }
          else if (diff < 0) { trendLabel = `▼${Math.abs(diff)}`; trendClass = 'down'; }
          else { trendLabel = '－'; trendClass = 'flat'; }
        } else if (prevKeywords && !prev) {
          trendLabel = 'NEW';
          trendClass = 'new';
        }

        return (
          <div
            className="bb-heatmap-card"
            key={idx}
            style={{ background: `rgba(91, 79, 224, ${0.08 + ratio * 0.22})` }}
          >
            <div className="bb-heatmap-card-top">
              <span className="bb-heatmap-card-keyword" style={{ color: isDark ? 'var(--insight)' : 'var(--ink)' }}>
                {k.keyword}
              </span>
              <span className="bb-heatmap-card-meta">
                {typeof k.count === 'number' && <span className="bb-heatmap-card-count">{k.count}건</span>}
                {trendLabel && <span className={`bb-heatmap-card-trend ${trendClass}`}>{trendLabel}</span>}
              </span>
            </div>
            {k.note && <div className="bb-heatmap-card-note">{k.note}</div>}
            {articles.length > 0 && (
              <div className="bb-heatmap-card-articles">
                {articles.map((a, i) => (
                  <a key={a.id || a.link || i} href={a.link} target="_blank" rel="noopener noreferrer" className="bb-heatmap-card-article">
                    {a.title}
                  </a>
                ))}
              </div>
            )}
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

function WeeklyInsight({ data, news, prevKeywords }) {
  if (!data || (!data.keywords?.length && !data.issues?.length && !data.themeClusters?.length)) {
    return null;
  }

  const {
    isSample, weekRange, articleCount, summary,
    keywords = [], themeClusters = [],
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

      <ThemeCluster themeClusters={themeClusters} />

      {keywords.length > 0 && (
        <div className="bb-weekly-block">
          <div className="bb-weekly-block-title"><Hash size={15} /> Heat Map · 이번 주 최다 언급 키워드</div>
          <KeywordHeatmap keywords={keywords} news={news} prevKeywords={prevKeywords} />
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
function BriefingView({ weeklyInsight, weeklyInsightHistory, news }) {
  const prevKeywords = (weeklyInsightHistory && weeklyInsightHistory[1] && weeklyInsightHistory[1].keywords) || null;

  return (
    <>
      <div className="bb-page-header">
        <div className="bb-page-title-area">
          <div className="bb-page-icon"><Sparkles size={20} color="#5B4FE0" strokeWidth={2.2} /></div>
          <div>
            <div className="bb-page-title">주간 브리핑</div>
            <div className="bb-page-desc">이번 주 배터리 산업 흐름 · 테마 · 키워드 · 경쟁사 동향</div>
          </div>
        </div>
        <div className="bb-breadcrumb">
          <Home size={13} color="#2C7DC4" />
          <span>›</span>
          <span className="current">주간 브리핑</span>
        </div>
      </div>

      <WeeklyInsight data={weeklyInsight} news={news} prevKeywords={prevKeywords} />
      <CompetitorCompare competitors={weeklyInsight?.competitors} />
    </>
  );
}

// ━━━━━━━━━━ 이번 주 테마 클러스터 (주간 브리핑용) ━━━━━━━━━━
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
              {t.whySdi && <div className="bb-theme-why"><strong>SDI 영향</strong> · {t.whySdi}</div>}
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

// ━━━━━━━━━━ 기획그룹이 발굴해볼 주제 (Executive Issues용) ━━━━━━━━━━
function TopicsSection({ topics }) {
  if (!topics || topics.length === 0) return null;
  return (
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
  );
}

// ━━━━━━━━━━ Executive Issues 페이지 ━━━━━━━━━━
function ExecutiveIssuesView({ weeklyInsight, weeklyInsightHistory }) {
  if (!weeklyInsight) return null;
  return (
    <>
      <div className="bb-page-header">
        <div className="bb-page-title-area">
          <div className="bb-page-icon"><Flame size={20} color="#5B4FE0" strokeWidth={2.2} /></div>
          <div>
            <div className="bb-page-title">Executive Issues</div>
            <div className="bb-page-desc">담당팀별 후속 이슈 · 발굴주제 · 보고서 후보</div>
          </div>
        </div>
        <div className="bb-breadcrumb">
          <Home size={13} color="#2C7DC4" />
          <span>›</span>
          <span className="current">Executive Issues</span>
        </div>
      </div>

      <OwnerIssueList issues={weeklyInsight.issues} />

      {weeklyInsight.overallResponse && (
        <div className="bb-weekly-block">
          <div className="bb-weekly-block-title"><Target size={15} /> 종합 대응방향</div>
          <div className="bb-overall-response">{weeklyInsight.overallResponse}</div>
        </div>
      )}

      <TopicsSection topics={weeklyInsight.topics} />
      <TopicArchive history={weeklyInsightHistory} />
      <ReportCandidates candidates={weeklyInsight.reportCandidates} />
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

// ━━━━━━━━━━ 분기 실적 요약 (매출·영업이익) ━━━━━━━━━━
function formatEokAmount(raw) {
  if (raw === undefined || raw === null) return null;
  const n = Number(String(raw).replace(/,/g, ''));
  if (!isFinite(n)) return null;
  const eok = n / 100000000; // 원 -> 억원
  return `${eok.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}억원`;
}

function formatYoyChange(current, prev) {
  const c = Number(String(current).replace(/,/g, ''));
  const p = Number(String(prev).replace(/,/g, ''));
  if (!isFinite(c) || !isFinite(p) || p === 0) return null;
  const pct = ((c - p) / Math.abs(p)) * 100;
  const sign = pct > 0 ? '+' : '';
  return `전년동기比 ${sign}${pct.toFixed(1)}%`;
}

function yoyLabel(current, prev) {
  const c = Number(String(current).replace(/,/g, ''));
  const p = Number(String(prev).replace(/,/g, ''));
  if (!isFinite(c) || !isFinite(p) || p === 0) return null;
  const pct = ((c - p) / Math.abs(p)) * 100;
  const sign = pct > 0 ? '+' : '';
  const isDown = c < p;
  // 적자/흑자 전환 등 부호가 바뀌는 경우는 %보다 상태 설명이 더 이해하기 쉽다.
  if (c >= 0 && p < 0) return { text: '적자→흑자', down: false };
  if (c < 0 && p >= 0) return { text: '흑자→적자', down: true };
  if (c < 0 && p < 0) return { text: c > p ? '적자축소' : '적자확대', down: c <= p };
  return { text: `${sign}${pct.toFixed(1)}%`, down: isDown };
}

function formatManwon(won) {
  if (won === undefined || won === null) return null;
  const man = Math.round(won / 10000);
  return `${man.toLocaleString('ko-KR')}만원`;
}

function toMillionWon(raw) {
  if (raw === undefined || raw === null) return null;
  const n = Number(String(raw).replace(/,/g, ''));
  if (!isFinite(n)) return null;
  return Math.round(n / 1000000).toLocaleString('ko-KR');
}

function FinancialTableCell({ item }) {
  if (!item) return <td className="bb-fintable-empty">-</td>;
  const amount = formatEokAmount(item.current);
  const yoy = yoyLabel(item.current, item.prev);
  if (!amount) return <td className="bb-fintable-empty">-</td>;
  return (
    <td className="bb-fintable-num">
      {amount}
      {yoy && <span className={`bb-fintable-yoy ${yoy.down ? 'down' : 'up'}`}>{yoy.text}</span>}
    </td>
  );
}

// ━━━━━━━━━━ 실적·인력 비교 표 ━━━━━━━━━━
function FinancialsTable({ data }) {
  if (!data || !data.companies || data.companies.length === 0) return null;
  // 고객사(현대차 등)는 배터리사끼리의 실적·인력 비교 대상이 아니므로 표에서 제외한다.
  const companies = data.companies.filter(c => c.type !== 'customer');
  if (companies.length === 0) return null;
  const reportLabel = companies.find(c => c.financials)?.financials;
  return (
    <div className="bb-financials">
      <div className="bb-financials-header">
        <div className="bb-financials-title">
          <TrendingUp size={15} /> 실적·인력 비교
          {reportLabel && <span className="bb-fintable-period">매출·이익 {reportLabel.reportLabel}({reportLabel.bsnsYear})</span>}
          {data.isSample && <span className="bb-weekly-sample-badge">샘플</span>}
        </div>
      </div>
      <div className="bb-fintable-wrap">
        <table className="bb-fintable">
          <thead>
            <tr>
              <th className="bb-fintable-th-label">회사</th>
              <th>매출액</th>
              <th>영업이익</th>
              <th>순이익</th>
              <th>종업원수</th>
              <th>1인평균급여</th>
            </tr>
          </thead>
          <tbody>
            {companies.map(c => {
              const f = c.financials;
              const emp = c.employees;
              const profileTip = c.profile
                ? `대표이사: ${c.profile.ceoName || '-'} · ${c.profile.homepageUrl || ''}`
                : undefined;
              return (
                <tr key={c.id}>
                  <td className="bb-fintable-label" title={profileTip}>{c.label}</td>
                  <FinancialTableCell item={f?.revenue} />
                  <FinancialTableCell item={f?.operatingProfit} />
                  <FinancialTableCell item={f?.netProfit} />
                  <td className="bb-fintable-num">
                    {emp ? `${emp.totalHeadcount.toLocaleString('ko-KR')}명` : '-'}
                  </td>
                  <td className="bb-fintable-num">
                    {emp && emp.avgAnnualSalary ? formatManwon(emp.avgAnnualSalary) : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {companies.some(c => c.employees) && (
        <div className="bb-fintable-footnote">
          종업원수·급여는 가장 최근 사업/반기보고서 기준 (매출·이익과 조회 시점이 다를 수 있음)
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━ 분기별 실적 추이 (연도별 비교) ━━━━━━━━━━
// fetch-data.cjs가 회사별로 최근 4개 보고서(1분기→반기누적→3분기누적→사업보고서)의
// 매출/영업이익을 trend 배열에 모아두는데, 기존에는 화면에 표시되지 않고 있었다.
function FinancialsTrendTable({ data }) {
  if (!data || !data.companies) return null;
  const companies = data.companies.filter(c => c.type !== 'customer' && c.trend && c.trend.length > 0);
  if (companies.length === 0) return null;
  return (
    <div className="bb-financials">
      <div className="bb-financials-header">
        <div className="bb-financials-title">
          <TrendingUp size={15} /> 분기별 실적 추이
          {data.isSample && <span className="bb-weekly-sample-badge">샘플</span>}
        </div>
      </div>
      <div className="bb-trend-grid">
        {companies.map(c => (
          <div key={c.id} className="bb-trend-company">
            <div className="bb-trend-company-label">{c.label}</div>
            <div className="bb-fintable-wrap">
              <table className="bb-fintable bb-trend-table">
                <thead>
                  <tr>
                    <th className="bb-fintable-th-label">구분</th>
                    {c.trend.map((t, i) => <th key={i}>{t.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="bb-fintable-label">매출액</td>
                    {c.trend.map((t, i) => (
                      <td key={i} className="bb-fintable-num">{formatEokAmount(t.revenue) || '-'}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="bb-fintable-label">영업이익</td>
                    {c.trend.map((t, i) => (
                      <td key={i} className="bb-fintable-num">{formatEokAmount(t.operatingProfit) || '-'}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
      <div className="bb-fintable-footnote">
        반기·3분기는 누적 수치입니다 (분기 단독 금액이 아님)
      </div>
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

// ━━━━━━━━━━ 사업부문(세그먼트) 정보 링크 ━━━━━━━━━━
// DART 구조화 API(재무제표/주요계정)에는 사업부문별 매출 데이터가 없어,
// 회사 IR 페이지의 실적발표자료 원문 링크로 대신 안내한다.
const IR_SEGMENT_LINKS = [
  {
    id: 'sdi',
    label: '삼성SDI',
    desc: '에너지솔루션·전자재료 부문별 매출 비중은 실적발표자료(IR Presentation)에서 확인 가능',
    url: 'https://www.samsungsdi.co.kr/ir/ir-activity/earning-releases.html',
  },
  {
    id: 'sdi-report',
    label: '삼성SDI 사업보고서',
    desc: '"사업의 내용" 및 주석의 영업부문 정보에 상세 매출 구성 수록',
    url: 'https://www.samsungsdi.co.kr/ir/financial/business-report.html',
  },
];

function SegmentInfoLinks() {
  return (
    <div className="bb-segment-links">
      <div className="bb-filings-title">
        <Landmark size={15} /> 사업부문별 매출(세그먼트) 정보
      </div>
      <div className="bb-segment-links-note">
        DART 공시 API는 회사 전체 합산 매출만 제공하며 사업부문별 세부 매출은 별도 제공하지 않습니다. 부문별 매출 구성은 아래 IR 원문 자료를 참고하세요.
      </div>
      <div className="bb-segment-links-list">
        {IR_SEGMENT_LINKS.map(l => (
          <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" className="bb-segment-link-item">
            <span className="bb-segment-link-label">{l.label}</span>
            <span className="bb-segment-link-desc">{l.desc}</span>
            <ChevronRight size={14} />
          </a>
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━ AI 재무 리포트 (SDI vs LGES 요약 + 비교차트) ━━━━━━━━━━
// 비교차트 수치는 fetch-data.cjs에서 코드로 직접 계산한 값이며, AI는 summary/highlights/risks
// 텍스트만 생성한다 (숫자를 AI가 새로 만들어내지 않도록 하기 위함).
const FINREPORT_COMPANY_META = {
  sdi: { label: '삼성SDI', color: 'var(--primary)' },
  lges: { label: 'LG에너지솔루션', color: '#7F8FA6' },
};

function FinReportBarRow({ row }) {
  const companyIds = Object.keys(row).filter(k => k !== 'metric' && k !== 'unit');
  const maxAbs = Math.max(1, ...companyIds.map(id => Math.abs(row[id] || 0)));
  return (
    <div className="bb-finreport-bar-row">
      <div className="bb-finreport-bar-metric">{row.metric}</div>
      <div className="bb-finreport-bar-track">
        {companyIds.map(id => {
          const val = row[id];
          const meta = FINREPORT_COMPANY_META[id] || { label: id, color: 'var(--ink-faint)' };
          const widthPct = val === null || val === undefined ? 0 : (Math.abs(val) / maxAbs) * 100;
          return (
            <div key={id} className="bb-finreport-bar-line">
              <span className="bb-finreport-bar-label">{meta.label}</span>
              <div className="bb-finreport-bar-bg">
                <div
                  className="bb-finreport-bar-fill"
                  style={{ width: `${widthPct}%`, background: val < 0 ? '#C0392B' : meta.color }}
                />
              </div>
              <span className="bb-finreport-bar-value">
                {val === null || val === undefined
                  ? '-'
                  : row.unit === '%'
                    ? `${val.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}%`
                    : `${val.toLocaleString('ko-KR')}억원`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FinancialAIReport({ report }) {
  if (!report || !Array.isArray(report.comparison) || report.comparison.length === 0) return null;

  return (
    <div className="bb-finreport">
      <div className="bb-financials-header">
        <div className="bb-financials-title">
          <Sparkles size={15} /> AI 재무 리포트 (삼성SDI · LG에너지솔루션)
          {report.isSample && <span className="bb-weekly-sample-badge">샘플</span>}
        </div>
      </div>

      {report.summary && <p className="bb-finreport-summary">{report.summary}</p>}

      {Array.isArray(report.highlights) && report.highlights.length > 0 && (
        <div className="bb-finreport-highlights">
          {report.highlights.map((h, i) => (
            <div key={i} className={`bb-finreport-highlight bb-finreport-highlight-${h.tone || 'neutral'}`}>
              <div className="bb-finreport-highlight-label">{h.label}</div>
              <div className="bb-finreport-highlight-value">{h.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="bb-finreport-chart">
        {report.comparison.map((row, i) => <FinReportBarRow key={i} row={row} />)}
      </div>

      {Array.isArray(report.risks) && report.risks.length > 0 && (
        <div className="bb-finreport-risks">
          <div className="bb-finreport-risks-title">주요 리스크</div>
          {report.risks.map((r, i) => (
            <div key={i} className="bb-finreport-risk-item">
              <div className="bb-finreport-risk-title">{r.title}</div>
              <div className="bb-finreport-risk-desc">{r.description}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━ 특허·공시 페이지 ━━━━━━━━━━
function FilingsView({ dartFilings, dartFinancials, financialReport }) {
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

      <FinancialAIReport report={financialReport} />
      <FinancialsTable data={dartFinancials} />
      <FinancialsTrendTable data={dartFinancials} />
      <SegmentInfoLinks />
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
  .bb-top-right { display: flex; align-items: center; gap: 16px; margin-left: auto; }
  .bb-last-update { font-size: 13px; color: var(--ink-faint); }
  .bb-total-count { font-size: 13px; color: var(--ink-mute); background: var(--bg); padding: 5px 12px; border-radius: 14px; font-weight: 500; }

  /* ━━━ Layout (사이드바 + 콘텐츠) ━━━ */
  /* 완전히 꽉 채우면 넓은 모니터에서 표/그래프가 지나치게 길어지므로,
     적당한 최대폭을 두고 좌우 여백만 살짝 주는 방식으로 가운데 정렬한다. */
  .bb-layout { display: flex; width: 100%; max-width: 1600px; margin: 0 auto; align-items: flex-start; }
  .bb-sidebar {
    width: 220px;
    flex-shrink: 0;
    background: #fff;
    border-right: 1px solid var(--line);
    padding: 18px 0;
    position: sticky;
    top: 68px;
    height: calc(100vh - 68px);
    overflow-y: auto;
  }
  .bb-menu-item {
    display: flex;
    align-items: center;
    font-size: 14.5px;
    font-weight: 500;
    color: var(--ink-mute);
    padding: 11px 22px;
    cursor: pointer;
    transition: all 0.15s;
    position: relative;
  }
  .bb-menu-item:hover { background: var(--bg); color: var(--ink); }
  .bb-menu-item.active { background: var(--primary-bg); color: var(--primary-dark); font-weight: 700; }
  .bb-menu-item.active::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--primary); }
  .bb-menu-item-root { font-weight: 600; }
  .bb-count { margin-left: auto; font-size: 11.5px; color: var(--ink-faint); background: var(--bg); padding: 1px 8px; border-radius: 10px; }
  .bb-menu-item.active .bb-count { background: rgba(44,125,196,0.15); color: var(--primary-dark); }
  .bb-submenu { background: var(--bg); padding: 4px 0; }
  .bb-submenu-item {
    display: flex;
    align-items: center;
    font-size: 13.5px;
    color: var(--ink-mute);
    padding: 8px 22px 8px 40px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .bb-submenu-item:hover { color: var(--ink); }
  .bb-submenu-item.active { color: var(--primary-dark); font-weight: 700; }
  .bb-menu-divider { height: 1px; background: var(--line-light); margin: 12px 22px; }

  .bb-content { flex: 1; min-width: 0; padding: 24px 28px 60px; }

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

  /* ━━━ 키워드 Heat Map (카드형, 매칭 기사 전체 표시) ━━━ */
  .bb-heatmap-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .bb-heatmap-card {
    border: 1px solid var(--line-light);
    border-radius: 10px;
    padding: 14px 16px;
  }
  .bb-heatmap-card-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 4px; }
  .bb-heatmap-card-keyword { font-size: 14.5px; font-weight: 700; letter-spacing: -0.01em; }
  .bb-heatmap-card-meta { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
  .bb-heatmap-card-count { font-size: 12px; font-weight: 700; color: var(--insight); background: rgba(255,255,255,0.6); padding: 2px 8px; border-radius: 10px; }
  .bb-heatmap-card-trend { font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 10px; }
  .bb-heatmap-card-trend.up { color: #C0392B; background: #FDEDEB; }
  .bb-heatmap-card-trend.down { color: #1F6FA0; background: #E8F2FB; }
  .bb-heatmap-card-trend.flat { color: var(--ink-faint); background: #fff; }
  .bb-heatmap-card-trend.new { color: #fff; background: var(--insight); }
  .bb-heatmap-card-note { font-size: 12px; color: var(--ink-mute); margin-bottom: 8px; }
  .bb-heatmap-card-articles {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 130px;
    overflow-y: auto;
    padding-top: 8px;
    border-top: 1px dashed var(--line);
  }
  .bb-heatmap-card-article {
    font-size: 12.5px;
    color: var(--ink-mute);
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .bb-heatmap-card-article:hover { color: var(--primary-dark); text-decoration: underline; }

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
  .bb-theme-why { font-size: 12px; color: var(--ink-mute); line-height: 1.55; padding: 8px 2px 2px; }
  .bb-theme-why strong { color: var(--insight); font-weight: 700; }

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

  /* ━━━ 분기 실적 요약 ━━━ */
  .bb-financials {
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 20px 24px;
    margin-bottom: 22px;
  }
  .bb-financials-header { margin-bottom: 14px; }
  .bb-financials-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 17px;
    font-weight: 700;
    color: var(--ink);
  }
  .bb-fintable-period { font-size: 11px; font-weight: 500; color: var(--ink-faint); margin-left: 8px; }
  .bb-fintable-wrap { overflow-x: auto; }
  .bb-fintable { width: 100%; border-collapse: collapse; font-size: 12px; }
  .bb-fintable th { text-align: right; padding: 6px 8px; font-weight: 700; color: var(--ink); border-bottom: 1.5px solid var(--ink); white-space: nowrap; }
  .bb-fintable th.bb-fintable-th-label { text-align: left; }
  .bb-fintable td { padding: 8px; border-bottom: 1px solid var(--line-light); white-space: nowrap; }
  .bb-fintable tbody tr:nth-child(odd) { background: var(--bg); }
  .bb-fintable-label { font-weight: 700; color: var(--primary-dark); text-align: left; cursor: help; }
  .bb-fintable-num { text-align: right; }
  .bb-fintable-empty { text-align: right; color: var(--ink-faint); }
  .bb-fintable-yoy { display: inline-block; margin-left: 6px; font-size: 10.5px; font-weight: 600; }
  .bb-fintable-yoy.up { color: #1F7A4C; }
  .bb-fintable-yoy.down { color: #C0392B; }
  .bb-fintable-footnote { font-size: 11px; color: var(--ink-faint); margin-top: 10px; }

  /* ━━━ AI 재무 리포트 ━━━ */
  .bb-finreport {
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 20px 24px;
    margin-bottom: 22px;
  }
  .bb-finreport-summary { font-size: 15px; line-height: 1.7; color: var(--ink); margin: 4px 0 18px; }
  .bb-finreport-highlights { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-bottom: 22px; }
  .bb-finreport-highlight { border-radius: 8px; padding: 12px 14px; border: 1px solid var(--line-light); }
  .bb-finreport-highlight-label { font-size: 13px; font-weight: 700; margin-bottom: 5px; }
  .bb-finreport-highlight-value { font-size: 14px; color: var(--ink-mute); line-height: 1.45; }
  .bb-finreport-highlight-danger { background: #FDEDEB; }
  .bb-finreport-highlight-danger .bb-finreport-highlight-label { color: #C0392B; }
  .bb-finreport-highlight-success { background: #E8F2FB; }
  .bb-finreport-highlight-success .bb-finreport-highlight-label { color: var(--primary-dark); }
  .bb-finreport-highlight-neutral { background: var(--bg); }
  .bb-finreport-highlight-neutral .bb-finreport-highlight-label { color: var(--ink); }
  .bb-finreport-chart { display: flex; flex-direction: column; gap: 18px; margin-bottom: 18px; }
  .bb-finreport-bar-metric { font-size: 15px; font-weight: 700; color: var(--ink); margin-bottom: 8px; }
  .bb-finreport-bar-line { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
  .bb-finreport-bar-label { font-size: 13px; color: var(--ink-mute); width: 104px; flex-shrink: 0; }
  .bb-finreport-bar-bg { flex: 1; background: var(--bg); border-radius: 4px; height: 14px; overflow: hidden; }
  .bb-finreport-bar-fill { height: 100%; border-radius: 4px; }
  .bb-finreport-bar-value { font-size: 13px; font-weight: 600; color: var(--ink); width: 100px; text-align: right; flex-shrink: 0; }
  .bb-finreport-risks { border-top: 1px solid var(--line-light); padding-top: 16px; }
  .bb-finreport-risks-title { font-size: 15px; font-weight: 700; color: var(--ink); margin-bottom: 10px; }
  .bb-finreport-risk-item { margin-bottom: 10px; }
  .bb-finreport-risk-title { font-size: 14px; font-weight: 700; color: var(--primary-dark); }
  .bb-finreport-risk-desc { font-size: 13px; color: var(--ink-faint); line-height: 1.55; }

  /* ━━━ 분기별 실적 추이 ━━━ */
  .bb-trend-grid { display: flex; flex-direction: column; gap: 18px; }
  .bb-trend-company-label { font-size: 13px; font-weight: 700; color: var(--primary-dark); margin-bottom: 8px; }
  .bb-trend-table { font-size: 11.5px; }
  .bb-trend-table th { font-size: 11px; }

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

  /* ━━━ 사업부문(세그먼트) 정보 링크 ━━━ */
  .bb-segment-links {
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 20px 24px;
    margin-bottom: 22px;
  }
  .bb-segment-links-note { font-size: 12.5px; color: var(--ink-faint); line-height: 1.5; margin: 8px 0 14px; }
  .bb-segment-links-list { display: flex; flex-direction: column; gap: 10px; }
  .bb-segment-link-item {
    display: flex;
    align-items: center;
    gap: 12px;
    border: 1px solid var(--line-light);
    border-radius: 8px;
    padding: 12px 14px;
    color: inherit;
  }
  .bb-segment-link-item:hover { background: var(--bg); border-color: var(--primary); }
  .bb-segment-link-label { font-size: 13px; font-weight: 700; color: var(--primary-dark); white-space: nowrap; }
  .bb-segment-link-desc { font-size: 12.5px; color: var(--ink-mute); flex: 1; }

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

  /* ━━━ 오늘의 배터리 산업 브리핑 (첫 페이지, 일간) ━━━ */
  .bb-daily-page-header { margin-bottom: 18px; }
  .bb-daily-page-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 20px;
    font-weight: 700;
    color: var(--ink);
    letter-spacing: -0.01em;
  }
  .bb-daily-page-desc { font-size: 12.5px; color: var(--ink-faint); margin-top: 4px; }

  .bb-daily-empty {
    background: #fff;
    border: 1px dashed var(--line);
    border-radius: 6px;
    padding: 40px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    color: var(--ink-faint);
    font-size: 13.5px;
  }

  .bb-daily-statbar { display: flex; gap: 12px; margin-bottom: 22px; }
  .bb-daily-stat {
    flex: 1;
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 16px;
    text-align: center;
  }
  .bb-daily-stat-agenda { border-top: 3px solid var(--primary); }
  .bb-daily-stat-value { font-size: 24px; font-weight: 700; color: var(--primary-dark); line-height: 1.2; }
  .bb-daily-stat-label { font-size: 12px; color: var(--ink-faint); margin-top: 4px; }

  .bb-daily {
    background: #fff;
    border: 1px solid var(--line);
    border-top: 4px solid var(--primary);
    border-radius: 6px;
    padding: 20px 24px;
    margin-bottom: 22px;
  }
  .bb-daily-block { margin-bottom: 20px; }
  .bb-daily-block:last-child { margin-bottom: 0; }
  .bb-daily-block-title { display: flex; align-items: center; gap: 8px; font-size: 17px; font-weight: 700; color: var(--ink); margin-bottom: 14px; }
  .bb-daily-block-title svg { color: var(--primary); flex-shrink: 0; }

  .bb-daily-keyword-cloud { display: flex; flex-wrap: wrap; gap: 12px; }
  .bb-daily-keyword-chip-wrap { position: relative; }
  .bb-daily-keyword-chip {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: var(--primary-bg);
    color: var(--primary-dark);
    border: none;
    border-radius: 24px;
    padding: 12px 20px;
    font-family: inherit;
    font-size: 17px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s;
  }
  .bb-daily-keyword-chip:hover { background: #d9ecfa; }
  .bb-daily-keyword-chip.active { background: var(--primary); color: #fff; }
  .bb-daily-keyword-chip-count {
    font-size: 13px;
    font-weight: 700;
    background: rgba(255,255,255,0.6);
    color: var(--primary-dark);
    padding: 2px 10px;
    border-radius: 10px;
  }
  .bb-daily-keyword-chip.active .bb-daily-keyword-chip-count { background: rgba(255,255,255,0.25); color: #fff; }
  .bb-daily-keyword-popover {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    z-index: 5;
    min-width: 240px;
    max-width: 320px;
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 12px 14px;
    font-size: 13.5px;
    color: var(--ink-mute);
    line-height: 1.55;
    box-shadow: 0 6px 18px rgba(0,0,0,0.08);
    display: block;
  }
  .bb-daily-keyword-popover-link { cursor: pointer; }
  .bb-daily-keyword-popover-link:hover { border-color: var(--primary); color: var(--primary-dark); }
  .bb-daily-keyword-popover-cta {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 8px;
    font-size: 12px;
    font-weight: 700;
    color: var(--primary);
  }

  .bb-daily-catrow-list { display: flex; flex-direction: column; gap: 10px; }
  .bb-daily-catrow { background: var(--bg); border-radius: 8px; padding: 12px 14px; }
  .bb-daily-catrow-label {
    display: inline-block;
    font-size: 12px;
    font-weight: 700;
    color: var(--primary-dark);
    background: var(--primary-bg);
    padding: 3px 12px;
    border-radius: 12px;
    margin-bottom: 8px;
  }
  .bb-daily-catrow-text { font-size: 13px; color: var(--ink-mute); line-height: 1.55; }
  .bb-daily-catrow-points { margin: 0; padding-left: 20px; font-size: 13px; color: var(--ink-mute); line-height: 1.6; }
  .bb-daily-catrow-points li { margin-bottom: 4px; }
  .bb-daily-catrow-points li:last-child { margin-bottom: 0; }

  /* ━━━ 오늘의 보고안건 ━━━ */
  .bb-daily-agenda { border-top: 1px dashed var(--line); padding-top: 14px; }
  .bb-daily-agenda-title { display: flex; align-items: center; gap: 8px; font-size: 17px; font-weight: 700; color: var(--ink); margin-bottom: 14px; }
  .bb-daily-agenda-title svg { color: var(--primary); flex-shrink: 0; }
  .bb-daily-agenda-list { display: flex; flex-direction: column; gap: 8px; }
  .bb-daily-agenda-item { display: flex; align-items: flex-start; gap: 12px; background: #FFF8EC; border-left: 3px solid #E0A426; border-radius: 4px; padding: 11px 15px; }
  .bb-daily-agenda-num {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #E0A426;
    color: #fff;
    font-size: 11.5px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .bb-daily-agenda-item-title { font-size: 13px; font-weight: 700; color: var(--ink); margin-bottom: 3px; }
  .bb-daily-agenda-item-reason { font-size: 12px; color: var(--ink-faint); line-height: 1.5; }

  /* ━━━ 홈 화면 섹션 ━━━ */
  .bb-home-section { margin-bottom: 34px; }
  .bb-home-section-header { margin-bottom: 14px; }
  .bb-home-section-title { font-size: 19px; font-weight: 700; color: var(--ink); letter-spacing: -0.01em; }
  .bb-home-section-desc { font-size: 12.5px; color: var(--ink-faint); margin-top: 3px; }


  /* ━━━ 공시 섹터 전체보기 링크 ━━━ */
  .bb-filings-viewall {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    font-weight: 600;
    color: var(--primary-dark);
    cursor: pointer;
    margin-top: 4px;
  }
  .bb-filings-viewall:hover { text-decoration: underline; }

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
    .bb-layout { flex-direction: column; }
    .bb-sidebar { width: 100%; height: auto; position: static; border-right: none; border-bottom: 1px solid var(--line); display: flex; overflow-x: auto; padding: 8px; white-space: nowrap; }
    .bb-sidebar .bb-submenu { display: none; }
    .bb-menu-item { padding: 8px 14px; flex-shrink: 0; }
    .bb-menu-item.active::before { display: none; }
    .bb-menu-divider { display: none; }
    .bb-content { padding: 16px; }
    .bb-topnav { padding: 0 16px; gap: 12px; overflow-x: auto; }
    .bb-logo-badge { display: none; }
    .bb-cat-grid { grid-template-columns: 1fr; }
    .bb-compare-grid { grid-template-columns: 1fr; }
    .bb-filings-grid { grid-template-columns: 1fr; }
    .bb-daily-catsum-grid { grid-template-columns: 1fr; }
    .bb-fintable { font-size: 11px; }
    .bb-theme-grid { grid-template-columns: 1fr; }
    .bb-heatmap-grid { grid-template-columns: 1fr; }
  }
`;
