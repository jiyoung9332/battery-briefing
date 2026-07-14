// ============================================================
// Battery Briefing - AI 리포트 생성 (클라이언트 사이드, PPT/Word)
// 이미 생성된 주간 브리핑 데이터를 그대로 포맷팅해서 내보낸다.
// (브라우저에서 새로운 AI 분석을 돌리지는 않음 - API 키 보안상 불가)
// ============================================================

function starText(impact) {
  const n = typeof impact === 'number' ? Math.min(5, Math.max(0, impact)) : 0;
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

// ━━━━━━━━━━ PPT 생성 ━━━━━━━━━━

export async function generateReportPptx(reportData) {
  const pptxgenModule = await import('pptxgenjs');
  const PptxGenJS = pptxgenModule.default;
  const { weekRange, summary, issues = [], competitors = [], policyNews = [], overallResponse } = reportData;

  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'BB', width: 10, height: 5.63 });
  pptx.layout = 'BB';

  // 표지
  let slide = pptx.addSlide();
  slide.background = { color: '1F5F9E' };
  slide.addText('Battery Briefing 주간 리포트', { x: 0.5, y: 1.8, w: 9, h: 1, fontSize: 30, bold: true, color: 'FFFFFF' });
  slide.addText(weekRange || '', { x: 0.5, y: 2.7, w: 9, h: 0.6, fontSize: 16, color: 'E8F2FB' });
  slide.addText('SDI 기획그룹', { x: 0.5, y: 4.8, w: 9, h: 0.4, fontSize: 12, color: 'BBD6EE' });

  // Summary
  slide = pptx.addSlide();
  slide.addText('Summary', { x: 0.4, y: 0.3, fontSize: 22, bold: true, color: '1F5F9E' });
  slide.addText(summary || '(요약 없음)', { x: 0.4, y: 1.0, w: 9.2, h: 4.3, fontSize: 14, color: '2C2C2C', valign: 'top', lineSpacingMultiple: 1.3 });

  // 핵심이슈 - 이슈별 1슬라이드
  issues.forEach((issue, idx) => {
    const s = pptx.addSlide();
    s.addText(`핵심이슈 ${idx + 1}. ${issue.title || ''}`, { x: 0.4, y: 0.3, w: 9.2, fontSize: 18, bold: true, color: '1F5F9E' });
    const lines = [
      `영향도 ${starText(issue.impact)}   담당 · ${issue.owner || '-'}${issue.meetingCandidate ? '   [임원회의 안건 후보]' : ''}`,
      '',
      issue.summary || '',
      '',
      `SDI 영향 · ${issue.sdiImpact || '-'}`,
      `추진방안 · ${issue.actionPlan || '-'}`,
    ];
    if (issue.shareTargets && issue.shareTargets.length > 0) {
      lines.push('', `공유대상 · ${issue.shareTargets.join(', ')}`);
    }
    s.addText(lines.join('\n'), { x: 0.4, y: 1.15, w: 9.2, h: 4.2, fontSize: 13, color: '2C2C2C', valign: 'top', lineSpacingMultiple: 1.3 });
  });

  // 경쟁사 동향
  slide = pptx.addSlide();
  slide.addText('경쟁사 동향', { x: 0.4, y: 0.3, fontSize: 22, bold: true, color: '1F5F9E' });
  const compRows = [[
    { text: '회사', options: { bold: true, fill: { color: 'E8F2FB' } } },
    { text: '동향', options: { bold: true, fill: { color: 'E8F2FB' } } },
  ]];
  competitors.forEach(c => {
    compRows.push([c.label || '', c.summary || '-']);
  });
  if (compRows.length > 1) {
    slide.addTable(compRows, {
      x: 0.4, y: 1.0, w: 9.2, fontSize: 12, color: '2C2C2C',
      border: { type: 'solid', color: 'E0E5EB', pt: 1 },
      colW: [2, 7.2],
    });
  } else {
    slide.addText('경쟁사 동향 데이터가 없습니다.', { x: 0.4, y: 1.0, fontSize: 13, color: '999999' });
  }

  // 정책변화
  slide = pptx.addSlide();
  slide.addText('정책 변화', { x: 0.4, y: 0.3, fontSize: 22, bold: true, color: '1F5F9E' });
  const policyText = policyNews.length > 0
    ? policyNews.map(n => `• ${n.title}`).join('\n')
    : '최근 정책 관련 뉴스가 없습니다.';
  slide.addText(policyText, { x: 0.4, y: 1.0, w: 9.2, h: 4.3, fontSize: 13, color: '2C2C2C', valign: 'top', lineSpacingMultiple: 1.4 });

  // 대응방향
  slide = pptx.addSlide();
  slide.addText('종합 대응방향', { x: 0.4, y: 0.3, fontSize: 22, bold: true, color: '1F5F9E' });
  slide.addText(overallResponse || '-', { x: 0.4, y: 1.0, w: 9.2, h: 4.3, fontSize: 14, color: '2C2C2C', valign: 'top', lineSpacingMultiple: 1.3 });

  await pptx.writeFile({ fileName: `battery-briefing-${weekRange || 'report'}.pptx` });
}

// ━━━━━━━━━━ Word(docx) 생성 ━━━━━━━━━━

export async function generateReportDocx(reportData) {
  const { Document, Packer, Paragraph, HeadingLevel, TextRun } = await import('docx');
  const { weekRange, summary, issues = [], competitors = [], policyNews = [], overallResponse } = reportData;

  const children = [];

  children.push(new Paragraph({ text: 'Battery Briefing 주간 리포트', heading: HeadingLevel.TITLE }));
  children.push(new Paragraph({ text: weekRange || '', spacing: { after: 300 } }));

  children.push(new Paragraph({ text: 'Summary', heading: HeadingLevel.HEADING_1 }));
  children.push(new Paragraph({ text: summary || '(요약 없음)', spacing: { after: 300 } }));

  children.push(new Paragraph({ text: '핵심이슈', heading: HeadingLevel.HEADING_1 }));
  issues.forEach((issue, idx) => {
    children.push(new Paragraph({ text: `${idx + 1}. ${issue.title || ''}`, heading: HeadingLevel.HEADING_2 }));
    children.push(new Paragraph({
      children: [
        new TextRun({ text: `영향도 ${starText(issue.impact)}   담당 · ${issue.owner || '-'}`, bold: true }),
      ],
    }));
    if (issue.meetingCandidate) {
      children.push(new Paragraph({ children: [new TextRun({ text: '임원회의 안건 후보', bold: true, color: 'C0392B' })] }));
    }
    if (issue.summary) children.push(new Paragraph({ text: issue.summary }));
    if (issue.sdiImpact) {
      children.push(new Paragraph({ children: [new TextRun({ text: 'SDI 영향: ', bold: true }), new TextRun(issue.sdiImpact)] }));
    }
    if (issue.actionPlan) {
      children.push(new Paragraph({ children: [new TextRun({ text: '추진방안: ', bold: true }), new TextRun(issue.actionPlan)] }));
    }
    if (issue.shareTargets && issue.shareTargets.length > 0) {
      children.push(new Paragraph({
        children: [new TextRun({ text: '공유대상: ', bold: true }), new TextRun(issue.shareTargets.join(', '))],
        spacing: { after: 200 },
      }));
    }
  });

  children.push(new Paragraph({ text: '경쟁사 동향', heading: HeadingLevel.HEADING_1 }));
  if (competitors.length > 0) {
    competitors.forEach(c => {
      children.push(new Paragraph({
        children: [new TextRun({ text: `${c.label}: `, bold: true }), new TextRun(c.summary || '-')],
      }));
    });
  } else {
    children.push(new Paragraph({ text: '경쟁사 동향 데이터가 없습니다.' }));
  }

  children.push(new Paragraph({ text: '정책 변화', heading: HeadingLevel.HEADING_1, spacing: { before: 300 } }));
  if (policyNews.length > 0) {
    policyNews.forEach(n => {
      children.push(new Paragraph({ text: n.title, bullet: { level: 0 } }));
    });
  } else {
    children.push(new Paragraph({ text: '최근 정책 관련 뉴스가 없습니다.' }));
  }

  children.push(new Paragraph({ text: '종합 대응방향', heading: HeadingLevel.HEADING_1, spacing: { before: 300 } }));
  children.push(new Paragraph({ text: overallResponse || '-' }));

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `battery-briefing-${weekRange || 'report'}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
