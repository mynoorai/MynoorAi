import type { PersonalColorResult } from '@/types';
import { SEASON_DESCRIPTIONS } from './constants';
import { SEASON_COLORS } from './colorData';
import { SEASON_DATA, type SeasonType } from './seasonData';
import { setupCanvasPolyfill } from './canvasPolyfill';

// Setup polyfill
setupCanvasPolyfill();

// Canvas dimensions
const CANVAS = {
  width: 1080,
  height: 1920,
};

// Season-specific layout configurations
const SEASON_LAYOUTS = {
  spring: {
    // Spring: 밝고 화사한 레이아웃 - 더 많은 공간과 여유
    header: {
      y: 60,
      height: 300,
      brand: { y: 85, font: '18px -apple-system, sans-serif' },
      season: { y: 150, font: 'bold 56px -apple-system, sans-serif' },
      subtitle: { y: 200, font: '24px -apple-system, sans-serif' },
      description: { y: 240, font: '18px -apple-system, sans-serif', lineHeight: 28 },
    },
    characteristics: {
      y: 380,
      height: 240,
      title: { y: 405, font: '16px -apple-system, sans-serif' },
      keywords: { y: 450, tagHeight: 42, spacing: 16, font: '17px -apple-system, sans-serif' },
      quote: { y: 530, font: 'italic 22px Georgia, serif' },
    },
    colors: {
      y: 640,
      height: 350,
      title: { y: 665, font: '16px -apple-system, sans-serif' },
      best: {
        label: { y: 705, font: '15px -apple-system, sans-serif' },
        grid: { y: 740, swatchSize: 65, spacing: 25, nameFont: '14px -apple-system, sans-serif' },
      },
      avoid: {
        label: { y: 855, font: '15px -apple-system, sans-serif' },
        grid: { y: 890, swatchSize: 65, spacing: 25, nameFont: '14px -apple-system, sans-serif' },
      },
    },
    makeup: {
      y: 1010,
      height: 250,
      title: { y: 1035, font: '16px -apple-system, sans-serif' },
      foundation: { y: 1080, font: '18px -apple-system, sans-serif' },
      lips: { y: 1125, dotSize: 36, spacing: 28 },
      blush: { y: 1195, dotSize: 36, spacing: 28 },
    },
    style: {
      y: 1280,
      height: 220,
      title: { y: 1305, font: '16px -apple-system, sans-serif' },
      tips: { y: 1350, font: '17px -apple-system, sans-serif', lineHeight: 32 },
    },
    accessories: {
      y: 1520,
      height: 140,
      title: { y: 1545, font: '16px -apple-system, sans-serif' },
      content: { y: 1590, font: '19px -apple-system, sans-serif' },
    },
    footer: {
      instagram: { y: 1760, font: '26px -apple-system, sans-serif' },
      brand: { y: 1805, font: '22px -apple-system, sans-serif' },
      website: { y: 1845, font: '17px -apple-system, sans-serif' },
    },
    theme: {
      cardMargin: 35,
      cardPadding: 40,
      cardRadius: 24,
      shadowBlur: 25,
      shadowOpacity: 0.08,
    },
  },

  summer: {
    // Summer: 부드럽고 우아한 레이아웃 - 중간 정도의 여백
    header: {
      y: 55,
      height: 290,
      brand: { y: 78, font: '17px -apple-system, sans-serif' },
      season: { y: 140, font: 'bold 54px -apple-system, sans-serif' },
      subtitle: { y: 190, font: '23px -apple-system, sans-serif' },
      description: { y: 230, font: '17px -apple-system, sans-serif', lineHeight: 27 },
    },
    characteristics: {
      y: 365,
      height: 230,
      title: { y: 388, font: '15px -apple-system, sans-serif' },
      keywords: { y: 430, tagHeight: 40, spacing: 14, font: '16px -apple-system, sans-serif' },
      quote: { y: 510, font: 'italic 21px Georgia, serif' },
    },
    colors: {
      y: 615,
      height: 340,
      title: { y: 638, font: '15px -apple-system, sans-serif' },
      best: {
        label: { y: 675, font: '14px -apple-system, sans-serif' },
        grid: { y: 708, swatchSize: 62, spacing: 22, nameFont: '13px -apple-system, sans-serif' },
      },
      avoid: {
        label: { y: 820, font: '14px -apple-system, sans-serif' },
        grid: { y: 853, swatchSize: 62, spacing: 22, nameFont: '13px -apple-system, sans-serif' },
      },
    },
    makeup: {
      y: 975,
      height: 240,
      title: { y: 998, font: '15px -apple-system, sans-serif' },
      foundation: { y: 1040, font: '17px -apple-system, sans-serif' },
      lips: { y: 1082, dotSize: 34, spacing: 25 },
      blush: { y: 1148, dotSize: 34, spacing: 25 },
    },
    style: {
      y: 1235,
      height: 210,
      title: { y: 1258, font: '15px -apple-system, sans-serif' },
      tips: { y: 1300, font: '16px -apple-system, sans-serif', lineHeight: 30 },
    },
    accessories: {
      y: 1465,
      height: 135,
      title: { y: 1488, font: '15px -apple-system, sans-serif' },
      content: { y: 1530, font: '18px -apple-system, sans-serif' },
    },
    celebrity: {
      y: 1620,
      height: 100,
      title: { y: 1643, font: '15px -apple-system, sans-serif' },
      names: { y: 1680, font: '19px -apple-system, sans-serif' },
    },
    footer: {
      instagram: { y: 1770, font: '25px -apple-system, sans-serif' },
      brand: { y: 1813, font: '21px -apple-system, sans-serif' },
      website: { y: 1850, font: '16px -apple-system, sans-serif' },
    },
    theme: {
      cardMargin: 32,
      cardPadding: 38,
      cardRadius: 22,
      shadowBlur: 22,
      shadowOpacity: 0.07,
    },
  },

  autumn: {
    // Autumn: 따뜻하고 풍성한 레이아웃 - 컴팩트하지만 풍부한 느낌
    header: {
      y: 50,
      height: 280,
      brand: { y: 72, font: '16px -apple-system, sans-serif' },
      season: { y: 130, font: 'bold 52px -apple-system, sans-serif' },
      subtitle: { y: 178, font: '22px -apple-system, sans-serif' },
      description: { y: 215, font: '16px -apple-system, sans-serif', lineHeight: 26 },
    },
    characteristics: {
      y: 350,
      height: 220,
      title: { y: 372, font: '14px -apple-system, sans-serif' },
      keywords: { y: 410, tagHeight: 38, spacing: 12, font: '15px -apple-system, sans-serif' },
      quote: { y: 485, font: 'italic 20px Georgia, serif' },
    },
    colors: {
      y: 590,
      height: 330,
      title: { y: 610, font: '14px -apple-system, sans-serif' },
      best: {
        label: { y: 645, font: '13px -apple-system, sans-serif' },
        grid: { y: 675, swatchSize: 60, spacing: 20, nameFont: '12px -apple-system, sans-serif' },
      },
      avoid: {
        label: { y: 783, font: '13px -apple-system, sans-serif' },
        grid: { y: 813, swatchSize: 60, spacing: 20, nameFont: '12px -apple-system, sans-serif' },
      },
    },
    makeup: {
      y: 940,
      height: 230,
      title: { y: 960, font: '14px -apple-system, sans-serif' },
      foundation: { y: 1000, font: '16px -apple-system, sans-serif' },
      lips: { y: 1040, dotSize: 32, spacing: 22 },
      blush: { y: 1103, dotSize: 32, spacing: 22 },
    },
    style: {
      y: 1190,
      height: 200,
      title: { y: 1210, font: '14px -apple-system, sans-serif' },
      tips: { y: 1250, font: '15px -apple-system, sans-serif', lineHeight: 28 },
    },
    accessories: {
      y: 1410,
      height: 130,
      title: { y: 1430, font: '14px -apple-system, sans-serif' },
      content: { y: 1470, font: '17px -apple-system, sans-serif' },
    },
    celebrity: {
      y: 1560,
      height: 110,
      title: { y: 1580, font: '14px -apple-system, sans-serif' },
      names: { y: 1618, font: '18px -apple-system, sans-serif' },
    },
    footer: {
      instagram: { y: 1765, font: '24px -apple-system, sans-serif' },
      brand: { y: 1805, font: '20px -apple-system, sans-serif' },
      website: { y: 1840, font: '15px -apple-system, sans-serif' },
    },
    theme: {
      cardMargin: 30,
      cardPadding: 35,
      cardRadius: 20,
      shadowBlur: 20,
      shadowOpacity: 0.06,
    },
  },

  winter: {
    // Winter: 시크하고 모던한 레이아웃 - 샤프하고 미니멀
    header: {
      y: 45,
      height: 270,
      brand: { y: 65, font: '15px -apple-system, sans-serif' },
      season: { y: 118, font: 'bold 50px -apple-system, sans-serif' },
      subtitle: { y: 165, font: '21px -apple-system, sans-serif' },
      description: { y: 200, font: '15px -apple-system, sans-serif', lineHeight: 25 },
    },
    characteristics: {
      y: 335,
      height: 210,
      title: { y: 355, font: '13px -apple-system, sans-serif' },
      keywords: { y: 390, tagHeight: 36, spacing: 10, font: '14px -apple-system, sans-serif' },
      quote: { y: 460, font: 'italic 19px Georgia, serif' },
    },
    colors: {
      y: 565,
      height: 320,
      title: { y: 583, font: '13px -apple-system, sans-serif' },
      best: {
        label: { y: 615, font: '12px -apple-system, sans-serif' },
        grid: { y: 643, swatchSize: 58, spacing: 18, nameFont: '11px -apple-system, sans-serif' },
      },
      avoid: {
        label: { y: 748, font: '12px -apple-system, sans-serif' },
        grid: { y: 776, swatchSize: 58, spacing: 18, nameFont: '11px -apple-system, sans-serif' },
      },
    },
    makeup: {
      y: 905,
      height: 220,
      title: { y: 923, font: '13px -apple-system, sans-serif' },
      foundation: { y: 960, font: '15px -apple-system, sans-serif' },
      lips: { y: 998, dotSize: 30, spacing: 20 },
      blush: { y: 1058, dotSize: 30, spacing: 20 },
    },
    style: {
      y: 1145,
      height: 190,
      title: { y: 1163, font: '13px -apple-system, sans-serif' },
      tips: { y: 1200, font: '14px -apple-system, sans-serif', lineHeight: 26 },
    },
    accessories: {
      y: 1355,
      height: 125,
      title: { y: 1373, font: '13px -apple-system, sans-serif' },
      content: { y: 1410, font: '16px -apple-system, sans-serif' },
    },
    celebrity: {
      y: 1500,
      height: 115,
      title: { y: 1518, font: '13px -apple-system, sans-serif' },
      names: { y: 1555, font: '17px -apple-system, sans-serif' },
    },
    footer: {
      instagram: { y: 1760, font: '23px -apple-system, sans-serif' },
      brand: { y: 1798, font: '19px -apple-system, sans-serif' },
      website: { y: 1833, font: '14px -apple-system, sans-serif' },
    },
    theme: {
      cardMargin: 28,
      cardPadding: 32,
      cardRadius: 18,
      shadowBlur: 18,
      shadowOpacity: 0.05,
    },
  },
};

// Theme configurations with unique design elements
const THEMES: Record<
  SeasonType,
  {
    background: string[];
    card: string;
    accent: string;
    text: { primary: string; secondary: string; muted: string };
    special?: { gradient?: string[]; pattern?: string };
  }
> = {
  spring: {
    background: ['#FFF5F7', '#FFE8EC', '#FFF0F3'],
    card: '#FFFFFF',
    accent: '#FF6B9D',
    text: { primary: '#2D2D2D', secondary: '#666666', muted: '#999999' },
    special: { gradient: ['#FFE8EC', '#FFF5F7'] },
  },
  summer: {
    background: ['#F5F3FF', '#EDE8FF', '#F8F5FF'],
    card: '#FFFFFF',
    accent: '#9F8FEF',
    text: { primary: '#2D2D2D', secondary: '#666666', muted: '#999999' },
    special: { gradient: ['#EDE8FF', '#F5F3FF'] },
  },
  autumn: {
    background: ['#FFF8F3', '#FFEDE1', '#FFF5ED'],
    card: '#FFFFFF',
    accent: '#FF8547',
    text: { primary: '#2D2D2D', secondary: '#666666', muted: '#999999' },
    special: { gradient: ['#FFEDE1', '#FFF8F3'] },
  },
  winter: {
    background: ['#F3F8FF', '#E8F2FF', '#F0F6FF'],
    card: '#FFFFFF',
    accent: '#4A90E2',
    text: { primary: '#2D2D2D', secondary: '#666666', muted: '#999999' },
    special: { gradient: ['#E8F2FF', '#F3F8FF'] },
  },
};

// Helper function to convert API response to season key
function getSeasonKey(personalColorEn: string): keyof typeof SEASON_DESCRIPTIONS {
  const seasonMap: Record<string, keyof typeof SEASON_DESCRIPTIONS> = {
    'Spring Warm': 'spring',
    'Summer Cool': 'summer',
    'Autumn Warm': 'autumn',
    'Winter Cool': 'winter',
  };

  return seasonMap[personalColorEn] || 'spring';
}

// Drawing helper functions
function drawBackground(
  ctx: CanvasRenderingContext2D,
  theme: (typeof THEMES)[SeasonType],
  season: SeasonType,
) {
  const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS.height);
  theme.background.forEach((color, i) => {
    gradient.addColorStop(i / (theme.background.length - 1), color);
  });

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);

  // Add subtle pattern for each season
  if (season === 'spring') {
    // Add subtle flower pattern
    ctx.globalAlpha = 0.03;
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * CANVAS.width;
      const y = Math.random() * CANVAS.height;
      ctx.fillStyle = theme.accent;
      ctx.beginPath();
      ctx.arc(x, y, 80, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (season === 'winter') {
    // Add geometric lines
    ctx.globalAlpha = 0.02;
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * 400);
      ctx.lineTo(CANVAS.width, i * 400 + 200);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

function drawCard(
  ctx: CanvasRenderingContext2D,
  y: number,
  height: number,
  theme: (typeof THEMES)[SeasonType],
  layout: (typeof SEASON_LAYOUTS)[SeasonType],
) {
  ctx.save();
  ctx.shadowColor = `rgba(0, 0, 0, ${layout.theme.shadowOpacity})`;
  ctx.shadowBlur = layout.theme.shadowBlur;
  ctx.shadowOffsetY = 5;

  ctx.fillStyle = theme.card;
  ctx.beginPath();
  // @ts-expect-error - roundRect is supported via polyfill
  ctx.roundRect(
    layout.theme.cardMargin,
    y,
    CANVAS.width - layout.theme.cardMargin * 2,
    height,
    layout.theme.cardRadius,
  );
  ctx.fill();

  ctx.restore();
}

function drawCenteredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  y: number,
  font: string,
  color: string,
) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(text, CANVAS.width / 2, y);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function drawKeywordTags(
  ctx: CanvasRenderingContext2D,
  keywords: string[],
  layout: (typeof SEASON_LAYOUTS)[SeasonType]['characteristics']['keywords'],
  theme: (typeof THEMES)[SeasonType],
) {
  const tags = keywords.map((k) => k.toUpperCase());
  const tagHeight = layout.tagHeight;
  const padding = 26;
  const spacing = layout.spacing;

  ctx.font = layout.font;

  // Calculate positions for all tags
  const measurements: Array<{ tag: string; width: number; x: number; y: number }> = [];
  let currentX = 0;
  let currentY = layout.y;
  let rowWidth = 0;
  const maxWidth = CANVAS.width - 100;

  tags.forEach((tag) => {
    const width = ctx.measureText(tag).width + padding * 2;

    if (rowWidth + width > maxWidth && rowWidth > 0) {
      // Start new row
      currentY += tagHeight + 15;
      currentX = 0;
      rowWidth = 0;
    }

    measurements.push({ tag, width, x: currentX, y: currentY });
    currentX += width + spacing;
    rowWidth += width + spacing;
  });

  // Center all rows
  const rows: Array<Array<(typeof measurements)[0]>> = [];
  let currentRow: Array<(typeof measurements)[0]> = [];
  let lastY = measurements[0]?.y;

  measurements.forEach((m) => {
    if (m.y !== lastY) {
      rows.push(currentRow);
      currentRow = [m];
      lastY = m.y;
    } else {
      currentRow.push(m);
    }
  });
  if (currentRow.length > 0) rows.push(currentRow);

  // Draw centered tags
  rows.forEach((row) => {
    const totalWidth = row.reduce(
      (sum, m, i) => sum + m.width + (i < row.length - 1 ? spacing : 0),
      0,
    );
    const startX = (CANVAS.width - totalWidth) / 2;

    row.forEach((m, i) => {
      const tagX =
        startX +
        row.slice(0, i).reduce((sum, pm, j) => sum + pm.width + (j < i - 1 ? spacing : spacing), 0);

      ctx.fillStyle = `${theme.accent}15`;
      ctx.beginPath();
      // @ts-expect-error - roundRect is supported
      ctx.roundRect(tagX, m.y, m.width, tagHeight, tagHeight / 2);
      ctx.fill();

      ctx.strokeStyle = `${theme.accent}30`;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = theme.accent;
      ctx.textAlign = 'center';
      ctx.fillText(m.tag, tagX + m.width / 2, m.y + tagHeight / 2 + 5);
    });
  });
}

function drawColorGrid(
  ctx: CanvasRenderingContext2D,
  colors: Array<{ hex: string; name: string }>,
  gridConfig: (typeof SEASON_LAYOUTS)[SeasonType]['colors']['best']['grid'],
  labelConfig: (typeof SEASON_LAYOUTS)[SeasonType]['colors']['best']['label'],
  label: string,
  theme: (typeof THEMES)[SeasonType],
) {
  // Draw label
  ctx.font = labelConfig.font;
  ctx.fillStyle = theme.text.muted;
  ctx.textAlign = 'center';
  ctx.fillText(label, CANVAS.width / 2, labelConfig.y);

  const swatchSize = gridConfig.swatchSize;
  const spacing = gridConfig.spacing;
  const totalWidth = 4 * swatchSize + 3 * spacing;
  const startX = (CANVAS.width - totalWidth) / 2;

  colors.forEach((color, i) => {
    const x = startX + i * (swatchSize + spacing);
    const y = gridConfig.y;

    // Shadow for swatch
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;

    // Draw swatch
    ctx.fillStyle = color.hex;
    ctx.beginPath();
    // @ts-expect-error - roundRect is supported
    ctx.roundRect(x, y, swatchSize, swatchSize, 12);
    ctx.fill();

    ctx.restore();

    // Draw border
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw name
    ctx.font = gridConfig.nameFont;
    ctx.fillStyle = theme.text.secondary;
    ctx.textAlign = 'center';
    ctx.fillText(color.name.toUpperCase(), x + swatchSize / 2, y + swatchSize + 22);
  });
}

function drawMakeupDots(
  ctx: CanvasRenderingContext2D,
  colors: string[],
  config: { y: number; dotSize: number; spacing: number },
  label: string,
  theme: (typeof THEMES)[SeasonType],
) {
  const dotSize = config.dotSize;
  const spacing = config.spacing;
  const colorCount = colors.length;
  const totalWidth = colorCount * dotSize + (colorCount - 1) * spacing;
  const startX = (CANVAS.width - totalWidth) / 2;

  // Draw label
  ctx.font = '14px -apple-system, sans-serif';
  ctx.fillStyle = theme.text.muted;
  ctx.textAlign = 'center';
  ctx.fillText(label, CANVAS.width / 2, config.y);

  const palette =
    label === 'LIPS'
      ? ['#E8747C', '#E89B97', '#D4736E', '#C96169', '#B85A61']
      : ['#FFB5BA', '#FFC4C4', '#FFAAAA', '#FFB0B0', '#FFA8A8'];

  colors.forEach((_, i) => {
    const x = startX + i * (dotSize + spacing) + dotSize / 2;
    const dotY = config.y + 28;

    // Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = palette[i % palette.length];
    ctx.beginPath();
    ctx.arc(x, dotY, dotSize / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  });
}

/**
 * Generate a customized result card based on season
 */
export const generateCustomizedCard = async (
  result: PersonalColorResult,
  instagramId: string,
): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to create canvas context');
  }

  canvas.width = CANVAS.width;
  canvas.height = CANVAS.height;

  // Get season info
  const seasonKey = getSeasonKey(result.personal_color_en) as SeasonType;
  const seasonInfo = SEASON_DESCRIPTIONS[seasonKey];
  const seasonData = SEASON_DATA[seasonKey];
  const seasonColors = SEASON_COLORS[seasonKey];
  const theme = THEMES[seasonKey];
  const layout = SEASON_LAYOUTS[seasonKey];

  // Draw customized background
  drawBackground(ctx, theme, seasonKey);

  // 1. Header Section
  drawCard(ctx, layout.header.y, layout.header.height, theme, layout);

  drawCenteredText(
    ctx,
    'NOOR.AI × PERSONAL COLOR ANALYSIS',
    layout.header.brand.y,
    layout.header.brand.font,
    theme.text.muted,
  );

  drawCenteredText(
    ctx,
    seasonInfo.en.toUpperCase(),
    layout.header.season.y,
    layout.header.season.font,
    theme.accent,
  );

  const subtitles = {
    spring: 'WARM & BRIGHT',
    summer: 'COOL & SOFT',
    autumn: 'WARM & DEEP',
    winter: 'COOL & CLEAR',
  };

  drawCenteredText(
    ctx,
    subtitles[seasonKey],
    layout.header.subtitle.y,
    layout.header.subtitle.font,
    theme.text.secondary,
  );

  // Description
  ctx.font = layout.header.description.font;
  const descLines = wrapText(ctx, seasonInfo.description, CANVAS.width - 120);
  descLines.forEach((line, i) => {
    drawCenteredText(
      ctx,
      line,
      layout.header.description.y + i * layout.header.description.lineHeight,
      layout.header.description.font,
      theme.text.secondary,
    );
  });

  // 2. Characteristics Section
  drawCard(ctx, layout.characteristics.y, layout.characteristics.height, theme, layout);

  drawCenteredText(
    ctx,
    'YOUR CHARACTERISTICS',
    layout.characteristics.title.y,
    layout.characteristics.title.font,
    theme.text.muted,
  );

  drawKeywordTags(ctx, seasonData.keywords, layout.characteristics.keywords, theme);

  drawCenteredText(
    ctx,
    `"${seasonData.atmosphere.toUpperCase()}"`,
    layout.characteristics.quote.y,
    layout.characteristics.quote.font,
    theme.text.primary,
  );

  // 3. Color Palette Section
  drawCard(ctx, layout.colors.y, layout.colors.height, theme, layout);

  drawCenteredText(
    ctx,
    'YOUR PERFECT COLORS',
    layout.colors.title.y,
    layout.colors.title.font,
    theme.text.muted,
  );

  drawColorGrid(
    ctx,
    seasonColors.bestColors.slice(0, 4),
    layout.colors.best.grid,
    layout.colors.best.label,
    'BEST',
    theme,
  );

  drawColorGrid(
    ctx,
    seasonColors.worstColors.slice(0, 4),
    layout.colors.avoid.grid,
    layout.colors.avoid.label,
    'AVOID',
    theme,
  );

  // 4. Makeup Section
  drawCard(ctx, layout.makeup.y, layout.makeup.height, theme, layout);

  drawCenteredText(
    ctx,
    'MAKEUP PALETTE',
    layout.makeup.title.y,
    layout.makeup.title.font,
    theme.text.muted,
  );

  drawCenteredText(
    ctx,
    `Foundation: ${seasonData.makeupColors.foundation}`,
    layout.makeup.foundation.y,
    layout.makeup.foundation.font,
    theme.text.secondary,
  );

  drawMakeupDots(ctx, seasonData.makeupColors.lips, layout.makeup.lips, 'LIPS', theme);

  drawMakeupDots(ctx, seasonData.makeupColors.blush, layout.makeup.blush, 'BLUSH', theme);

  // 5. Style Tips Section
  drawCard(ctx, layout.style.y, layout.style.height, theme, layout);

  drawCenteredText(
    ctx,
    'STYLE GUIDE',
    layout.style.title.y,
    layout.style.title.font,
    theme.text.muted,
  );

  const tips = getStyleTips(seasonKey);
  tips.forEach((tip, i) => {
    drawCenteredText(
      ctx,
      `• ${tip}`,
      layout.style.tips.y + i * layout.style.tips.lineHeight,
      layout.style.tips.font,
      theme.text.secondary,
    );
  });

  // 6. Accessories Section
  drawCard(ctx, layout.accessories.y, layout.accessories.height, theme, layout);

  drawCenteredText(
    ctx,
    'ACCESSORIES',
    layout.accessories.title.y,
    layout.accessories.title.font,
    theme.text.muted,
  );

  drawCenteredText(
    ctx,
    `${seasonData.accessories.metal.toUpperCase()} • ${seasonData.accessories.style}`,
    layout.accessories.content.y,
    layout.accessories.content.font,
    theme.text.primary,
  );

  // 7. Celebrity Section (if included in layout)
  if (layout.celebrity) {
    drawCard(ctx, layout.celebrity.y, layout.celebrity.height, theme, layout);

    drawCenteredText(
      ctx,
      'CELEBRITY REFERENCES',
      layout.celebrity.title.y,
      layout.celebrity.title.font,
      theme.text.muted,
    );

    drawCenteredText(
      ctx,
      seasonData.celebrities.join(' • '),
      layout.celebrity.names.y,
      layout.celebrity.names.font,
      theme.text.primary,
    );
  }

  // 8. Footer
  drawCenteredText(
    ctx,
    `@${instagramId}`,
    layout.footer.instagram.y,
    layout.footer.instagram.font,
    theme.text.primary,
  );

  drawCenteredText(ctx, 'Noor.AI', layout.footer.brand.y, layout.footer.brand.font, theme.accent);

  drawCenteredText(
    ctx,
    'www.noor.ai',
    layout.footer.website.y,
    layout.footer.website.font,
    theme.text.muted,
  );

  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to generate image'));
        }
      },
      'image/jpeg',
      0.98,
    );
  });
};

function getStyleTips(season: SeasonType): string[] {
  const tips = {
    spring: [
      'Choose bright, clear colors with warm undertones',
      'Mix pastels with vibrant accent colors',
      'Opt for lightweight, flowing fabrics',
    ],
    summer: [
      'Select soft, muted colors with cool undertones',
      'Layer different shades of the same color family',
      'Choose materials with subtle textures',
    ],
    autumn: [
      'Embrace rich, earthy tones and warm hues',
      'Mix textures like suede, wool, and leather',
      'Add metallic accents in gold or bronze',
    ],
    winter: [
      'Go for high contrast and bold color combinations',
      'Choose pure, saturated colors or stark neutrals',
      'Opt for sleek, structured silhouettes',
    ],
  };

  return tips[season];
}
