// ==================== 星空背景 ====================
(function initStars() {
  const canvas = document.getElementById('stars');
  const ctx = canvas.getContext('2d');
  let stars = [];
  const STAR_COUNT = 200;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', () => { resize(); initStarArray(); });

  function initStarArray() {
    stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5 + 0.3,
        a: Math.random(),
        speed: Math.random() * 0.008 + 0.003,
        phase: Math.random() * Math.PI * 2
      });
    }
  }
  initStarArray();

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of stars) {
      s.a += s.speed;
      const alpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(s.a + s.phase));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,180,220,${alpha})`;
      ctx.fill();
      if (s.r > 1.0 && alpha > 0.8) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180,140,220,${alpha * 0.06})`;
        ctx.fill();
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
})();

// ==================== DOM 引用 ====================
const stageSelect   = document.getElementById('stage-select');
const stageDraw     = document.getElementById('stage-draw');
const stageResult   = document.getElementById('stage-result');
const drawTitle     = document.getElementById('draw-title');
const drawNeed      = document.getElementById('draw-need');
const drawPicked    = document.getElementById('draw-picked');
const drawTotal     = document.getElementById('draw-total');
const deckGrid      = document.getElementById('deck-grid');
const btnReveal     = document.getElementById('btn-reveal');
const resultContent = document.getElementById('result-content');

// ==================== 状态 ====================
let currentSpread = null;
let selectedCards = [];     // { cardData, isReversed, positionName, deckCardEl }
let allDeckCards  = [];     // all shuffled card data for this draw
let revealed      = false;  // whether cards have been revealed

// ==================== 牌阵选择 ====================
document.querySelectorAll('.spread-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const spreadKey = btn.dataset.spread;
    currentSpread = SPREADS[spreadKey];
    startDrawPhase();
  });
});

// ==================== 重新占卜 ====================
document.getElementById('btn-restart').addEventListener('click', resetToSelect);
btnReveal.addEventListener('click', revealAllCards);
document.getElementById('btn-pick').addEventListener('click', quickPick);
document.getElementById('input-numbers').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') quickPick();
});
document.getElementById('btn-back').addEventListener('click', resetToSelect);
const $ = (id) => document.getElementById(id);
// 安全绑定事件（元素不存在则跳过）
const safeOn = (id, event, fn) => {
  const el = $(id);
  if (el) el.addEventListener(event, fn);
};
safeOn('btn-daily', 'click', startDailyFortune);
safeOn('btn-shake', 'click', blindDraw);
safeOn('btn-share', 'click', openShareCard);
safeOn('btn-download-card', 'click', downloadShareCard);
safeOn('btn-close-modal', 'click', () => {
  const modal = $('modal-share');
  if (modal) modal.classList.remove('active');
});
// 演示模式
safeOn('btn-demo', 'click', runDemo);

function resetToSelect() {
  stageResult.classList.remove('active');
  stageDraw.classList.remove('active');
  stageSelect.classList.add('active');
  currentSpread = null;
  selectedCards = [];
  allDeckCards = [];
  revealed = false;
  // 重置演示按钮
  const btn = document.getElementById('btn-demo');
  btn.textContent = '🎬 演示模式';
  btn.classList.remove('running');
}

// ==================== 每日运势 ====================
function startDailyFortune() {
  currentSpread = SPREADS['single'];
  startDrawPhase();
}

// ==================== 盲抽 ====================
function blindDraw() {
  if (revealed) return;
  if (selectedCards.length >= currentSpread.count) return;

  // 从尚未被选中的牌中随机挑一张
  const allCardEls = document.querySelectorAll('.deck-card');
  const available = [];
  allCardEls.forEach(el => {
    if (!el.classList.contains('selected') && !el.classList.contains('picked')) {
      available.push(el);
    }
  });
  if (available.length === 0) return;

  const pick = available[Math.floor(Math.random() * available.length)];
  const idx = parseInt(pick.dataset.index);

  // 闪烁高亮
  pick.style.boxShadow = '0 0 30px rgba(100,200,255,0.7)';
  setTimeout(() => {
    pick.style.boxShadow = '';
    pick.click();
  }, 300);
}

// ==================== 分享卡片 ====================
function openShareCard() {
  if (selectedCards.length === 0) return;

  const lines = selectedCards.map(dc => {
    const pos = dc.isReversed ? '（逆）' : '';
    return `${dc.positionName}：${dc.cardData.nameCn}${pos}`;
  });

  document.getElementById('sc-result').innerHTML = lines.join('<br>');

  // 二维码链接：部署上线后自动使用真实网址
  const host = window.location.host || '你的网站.com';
  const siteUrl = host === '你的网站.com' ? 'https://你的网站.com' : window.location.origin + window.location.pathname;
  const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(siteUrl)}`;
  document.getElementById('sc-qr-img').src = qrApi;
  document.getElementById('sc-url').textContent = '扫码体验你的今日运势';

  document.getElementById('modal-share').classList.add('active');
}

function downloadShareCard() {
  const el = document.getElementById('share-card');
  html2canvas(el, { backgroundColor: '#0e0820', scale: 2 }).then(canvas => {
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = '星辰塔罗馆-运势卡.png';
    a.click();
  });
}

// ==================== 演示模式 ====================
async function runDemo() {
  const btn = document.getElementById('btn-demo');
  btn.textContent = '⏳ 演示中...';
  btn.classList.add('running');

  // 随机选一个牌阵
  const spreadKeys = ['single', 'three', 'celticCross'];
  const key = spreadKeys[Math.floor(Math.random() * spreadKeys.length)];
  currentSpread = SPREADS[key];

  // 进入抽牌阶段
  startDrawPhase();
  await sleep(600);

  // 随机选牌
  const cardEls = document.querySelectorAll('.deck-card');
  const indices = shuffleIndices(cardEls.length).slice(0, currentSpread.count);

  for (let i = 0; i < indices.length; i++) {
    const el = cardEls[indices[i]];
    // 高亮提示
    el.style.boxShadow = '0 0 25px rgba(100,200,255,0.6)';
    await sleep(500);
    el.style.boxShadow = '';
    el.click();
    await sleep(400);
  }

  // 翻牌
  await sleep(600);
  btnReveal.click();

  // 等全部翻完 + 结果展示
  await sleep(currentSpread.count * 300 + 1500);

  btn.textContent = '🎬 演示模式';
  btn.classList.remove('running');
}

function shuffleIndices(n) {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== 快速选牌 ====================
function quickPick() {
  if (revealed) return;

  const input = document.getElementById('input-numbers').value.trim();
  if (!input) return;

  // 解析输入：支持 "5, 12, 33" 和 "1-3, 7, 10-12"
  const numbers = parseNumberInput(input, 78);
  if (numbers.length === 0) {
    // 输入无效，给个视觉反馈
    const inp = document.getElementById('input-numbers');
    inp.style.borderColor = 'rgba(255,80,80,0.5)';
    setTimeout(() => { inp.style.borderColor = ''; }, 600);
    return;
  }

  // 去重，且不能超过牌阵需要的数量
  const uniqueNums = [...new Set(numbers)].slice(0, currentSpread.count);

  // 先清除已有选择
  [...selectedCards].forEach(s => deselectCard(s.deckCardEl));

  // 按输入顺序依次选择
  const allCardEls = document.querySelectorAll('.deck-card');
  uniqueNums.forEach(num => {
    const idx = num - 1; // 转为索引
    const cardEl = allCardEls[idx];
    if (cardEl && !cardEl.classList.contains('selected')) {
      const cardData = allDeckCards[idx];
      onDeckCardClick(cardEl, cardData, idx);
    }
  });

  // 滚动到第一张选中的牌
  if (selectedCards.length > 0) {
    selectedCards[0].deckCardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function parseNumberInput(input, max) {
  const result = new Set();
  const parts = input.split(/[,，\s]+/).filter(Boolean);

  for (const part of parts) {
    if (part.includes('-')) {
      // 范围
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (isNaN(start) || isNaN(end)) continue;
      const lo = Math.max(1, Math.min(start, end));
      const hi = Math.min(max, Math.max(start, end));
      for (let i = lo; i <= hi; i++) result.add(i);
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num) && num >= 1 && num <= max) result.add(num);
    }
  }

  return [...result];
}

// ==================== 抽牌阶段：展示78张牌 ====================
function startDrawPhase() {
  const spread = currentSpread;
  selectedCards = [];
  revealed = false;

  // 打乱整副牌
  allDeckCards = [...TAROT_DECK].sort(() => Math.random() - 0.5);

  // 更新头部
  drawTitle.textContent = `✦ ${spread.name}`;
  drawNeed.textContent = spread.count;
  drawTotal.textContent = spread.count;
  drawPicked.textContent = '0';
  btnReveal.disabled = true;
  btnReveal.textContent = '翻牌揭晓';
  document.getElementById('input-numbers').value = '';

  // 渲染牌库
  deckGrid.innerHTML = '';
  allDeckCards.forEach((card, index) => {
    const cardEl = document.createElement('div');
    cardEl.className = 'deck-card';
    cardEl.dataset.index = index;
    cardEl.innerHTML = `
      <div class="deck-card-inner">
        <div class="deck-card-face deck-card-back">✦<span class="card-num">${index + 1}</span></div>
        <div class="deck-card-face deck-card-front">
          <span class="deck-card-name">${card.nameCn}</span>
          <span class="deck-card-badge ${getTagClass(card)}">${getTagText(card)}</span>
        </div>
      </div>
    `;

    cardEl.addEventListener('click', () => onDeckCardClick(cardEl, card, index));
    deckGrid.appendChild(cardEl);
  });

  // 切换阶段
  stageSelect.classList.remove('active');
  stageResult.classList.remove('active');
  stageDraw.classList.add('active');

  // 滚动到顶部
  deckGrid.parentElement.scrollTop = 0;
}

// ==================== 选牌逻辑 ====================
function onDeckCardClick(cardEl, cardData, index) {
  // 已揭晓或已选中 -> 忽略
  if (revealed) return;
  if (cardEl.classList.contains('selected')) {
    // 取消选择
    deselectCard(cardEl);
    return;
  }
  if (selectedCards.length >= currentSpread.count) return;

  // 随机决定正逆位
  const isReversed = Math.random() < 0.5;

  // 添加选择
  const selection = {
    cardData: cardData,
    isReversed: isReversed,
    positionName: currentSpread.positions[selectedCards.length],
    deckCardEl: cardEl,
    index: index
  };
  selectedCards.push(selection);

  // UI 更新
  cardEl.classList.add('selected');
  cardEl.setAttribute('data-order', selectedCards.length);

  // 更新背面预览：显示牌位名
  const backFace = cardEl.querySelector('.deck-card-back');
  backFace.innerHTML = `${getPositionShort(selection.positionName)}<span class="card-num">${index + 1}</span>`;

  // 提前设好正面的逆位标识
  const frontFace = cardEl.querySelector('.deck-card-front');
  // 先清理旧的逆位标识
  const oldBadge = frontFace.querySelector('.deck-reversed-badge');
  if (oldBadge) oldBadge.remove();
  if (isReversed) {
    const badge = document.createElement('span');
    badge.className = 'deck-reversed-badge';
    badge.textContent = '逆';
    frontFace.appendChild(badge);
  }

  drawPicked.textContent = selectedCards.length;

  // 选够了吗？
  if (selectedCards.length >= currentSpread.count) {
    btnReveal.disabled = false;
    btnReveal.textContent = '✧ 翻牌揭晓';
  }
}

function deselectCard(cardEl) {
  const idx = selectedCards.findIndex(s => s.deckCardEl === cardEl);
  if (idx === -1) return;

  // 移除该选择
  selectedCards.splice(idx, 1);

  // 重置 UI
  cardEl.classList.remove('selected');
  cardEl.removeAttribute('data-order');
  const cardNum = parseInt(cardEl.dataset.index) + 1;
  const backFace = cardEl.querySelector('.deck-card-back');
  backFace.innerHTML = `✦<span class="card-num">${cardNum}</span>`;
  const frontFace = cardEl.querySelector('.deck-card-front');
  const oldBadge = frontFace.querySelector('.deck-reversed-badge');
  if (oldBadge) oldBadge.remove();

  // 重新编号后面的选择
  for (let i = idx; i < selectedCards.length; i++) {
    selectedCards[i].positionName = currentSpread.positions[i];
    selectedCards[i].deckCardEl.setAttribute('data-order', i + 1);
    const bf = selectedCards[i].deckCardEl.querySelector('.deck-card-back');
    bf.innerHTML = `${getPositionShort(selectedCards[i].positionName)}<span class="card-num">${parseInt(selectedCards[i].deckCardEl.dataset.index) + 1}</span>`;
  }

  drawPicked.textContent = selectedCards.length;
  btnReveal.disabled = selectedCards.length < currentSpread.count;
  btnReveal.textContent = selectedCards.length >= currentSpread.count ? '✧ 翻牌揭晓' : '翻牌揭晓';
}

// ==================== 翻牌揭晓 ====================
function revealAllCards() {
  if (revealed) return;
  if (selectedCards.length < currentSpread.count) return;
  revealed = true;
  btnReveal.disabled = true;
  btnReveal.textContent = '解读中...';

  // 首先给所有未选中的牌降暗
  document.querySelectorAll('.deck-card:not(.selected)').forEach(el => {
    el.classList.add('picked');
  });

  // 逐个翻牌，带延迟
  selectedCards.forEach((sel, i) => {
    setTimeout(() => {
      flashSpark();
      const cardEl = sel.deckCardEl;
      if (sel.isReversed) {
        cardEl.classList.add('reversed');
      } else {
        cardEl.classList.add('flipped');
      }
      // 最后一张翻完后跳到结果
      if (i === selectedCards.length - 1) {
        setTimeout(showResult, 1000);
      }
    }, i * 300);
  });
}

// ==================== 解读结果 ====================
function showResult() {
  stageDraw.classList.remove('active');
  stageSelect.classList.remove('active');
  stageResult.classList.add('active');

  resultContent.innerHTML = '';

  selectedCards.forEach(dc => {
    const meaning = dc.isReversed ? dc.cardData.reversed : dc.cardData.upright;
    const posLabel = dc.isReversed ? '逆位' : '正位';

    const div = document.createElement('div');
    div.className = 'card-result';
    div.innerHTML = `
      <div class="card-result-mini ${dc.isReversed ? 'reversed-card' : ''}">✦</div>
      <div class="card-result-info">
        <div class="card-result-name">${dc.cardData.nameCn} · <small>${posLabel}</small></div>
        <div class="card-result-position">${dc.positionName}</div>
        <div class="card-result-meaning">
          <strong>牌位：</strong>${dc.positionName}<br>
          <strong>解读：</strong>${meaning}
        </div>
      </div>
    `;
    resultContent.appendChild(div);
  });

  // 综合解读
  const overall = generateOverall(selectedCards);
  const overallDiv = document.createElement('div');
  overallDiv.className = 'overall-reading';
  overallDiv.innerHTML = `<h3>🌟 综合解读</h3><p>${overall}</p>`;
  resultContent.appendChild(overallDiv);

  // 滚动到顶部
  document.querySelector('.result-panel').scrollTop = 0;
}

// ==================== 综合解读生成 ====================
function generateOverall(cards) {
  const majorCount = cards.filter(c => c.cardData.type === 'major').length;
  const reversedCount = cards.filter(c => c.isReversed).length;
  const suits = {};
  cards.forEach(c => {
    if (c.cardData.suit) {
      suits[c.cardData.suit] = (suits[c.cardData.suit] || 0) + 1;
    }
  });

  const parts = [];

  // ========== 一、整体能量概览 ==========
  parts.push('<h4>🔮 整体能量概览</h4>');

  if (majorCount >= cards.length * 0.6) {
    parts.push('<p>此次占卜中大阿尔卡纳牌占据了多数，这表明你当前面临的问题触及了人生的核心课题——这些并非偶然的日常琐事，而是命运在更深层面为你安排的重要转折。大牌的能量厚重而深远，请以更宏观的视角看待当下发生的一切。</p>');
  } else if (majorCount === 0) {
    parts.push('<p>此次占卜中全部为小阿尔卡纳牌，暗示当前阶段的关注点集中在日常生活的具体层面。你不需要过度解读每一个细节，而是应该把注意力投向工作、人际和生活中的实际事务。平凡之中同样蕴藏着改变的力量。</p>');
  } else {
    parts.push('<p>大小阿尔卡纳的比例较为均衡，这意味着你正处在命运洪流与日常生活的交汇点上。既有深层的人生课题在推动你成长，也有具体的事务等待你去处理。请同时关注内心的声音和外部世界的实际变化。</p>');
  }

  if (reversedCount >= cards.length * 0.5) {
    parts.push('<p>牌面中逆位牌比例较高，这并非凶兆，而是一个温柔的提醒：你当前可能正经历较多的内在矛盾或外部阻碍。逆位牌的意义在于引导你<strong>向内审视</strong>——那些卡住的地方，往往隐藏着你尚未察觉的信念模式或未处理完的情绪。与其急于突破，不如先静下心来，看看自己真正在抗拒什么。</p>');
  } else if (reversedCount === 0) {
    parts.push('<p>令人欣慰的是，所有牌均以正位呈现。这预示着你当前的能量场非常通透，内在状态与外部环境处于难得的协调之中。无论是人际沟通、工作推进还是个人成长，现在都是积极行动的绝佳窗口期。</p>');
  } else {
    parts.push('<p>正逆位牌混合出现，这如实反映了生活本身的状态——有顺境也有波折，有关键的机遇也有需要注意的警示。关键在于如何平衡这两种能量，既不因顺利而掉以轻心，也不因挫折而放弃前行。</p>');
  }

  // 牌组能量分析
  const dominantSuit = Object.entries(suits).sort((a, b) => b[1] - a[1])[0];
  if (dominantSuit) {
    const suitDetail = {
      wands: {
        element: '火元素',
        focus: '行动力、事业发展与个人意志',
        detail: '权杖牌组在占卜中最为突出，火元素的能量正在主导你当前的局面。这意味着你正处于一个需要主动出击的阶段——等待并不会让事情变好，唯有点燃内心的热情，迈出坚定的步伐，才能将愿景一步步落地。这段时间你的创造力和行动欲望可能格外强烈，善用这股能量。'
      },
      cups: {
        element: '水元素',
        focus: '情感关系、直觉感受与内在世界',
        detail: '圣杯牌组在占卜中占据主导，水元素的能量正温柔地包裹着你。当前阶段的核心课题围绕情感与关系展开——你或许正在经历深刻的情感波动，或面临人际关系中的重要转折。请相信自己的直觉，它比理性分析更能带你抵达真实的答案。同时，学会在给予他人关怀之前先滋养自己的内心。'
      },
      swords: {
        element: '风元素',
        focus: '思维模式、沟通交流与重大决策',
        detail: '宝剑牌组在此次占卜中最为显著，风元素的能量提示你，当前的核心挑战在于思维和沟通层面。你可能正面临一个需要清晰头脑的关键决策，或是陷入了过度思考的漩涡中无法自拔。锋利的剑可以斩断迷雾，也能伤及自身——关键在于你如何使用它。建议你在做出重大判断前，先让思绪沉淀片刻，避免在情绪波动时做出不可逆的选择。'
      },
      pentacles: {
        element: '土元素',
        focus: '财务状况、身体健康与物质基础',
        detail: '星币牌组在此次占卜中最为突出，土元素的能量将你的注意力拉回到实实在在的物质世界。当前阶段的核心议题围绕金钱、工作成果或身体健康展开。这不是好高骛远的时候，而是需要你像农夫一样，弯下腰、一锄一锄地耕耘。每一个微小的积累都在为未来奠定不可动摇的根基。务实不是无趣，而是通向长久安稳的唯一道路。'
      }
    };
    const sd = suitDetail[dominantSuit[0]];
    parts.push(`<p>在四元素中，<strong>${sd.focus}</strong>的议题最为突出，对应${sd.element}的领域。${sd.detail}</p>`);
  }

  // ========== 二、现状分析 ==========
  parts.push('<h4>📋 现状分析</h4>');
  parts.push(buildSituationAnalysis(cards));

  // ========== 三、建议与行动指南 ==========
  parts.push('<h4>💡 建议与行动指南</h4>');
  parts.push(buildAdvice(cards));

  // ========== 四、未来展望 ==========
  parts.push('<h4>🗺️ 未来展望</h4>');
  parts.push(buildFutureOutlook(cards));

  // ========== 五、结语 ==========
  parts.push('<h4>🌙 结语</h4>');
  parts.push('<p>塔罗牌是你内心的一面镜子，它映照出你当下的能量状态和潜在趋势，而非一个不可更改的宿命预言。牌面的启示只是一个参考坐标——<strong>真正的舵手始终是你自己</strong>。无论牌面是阳光普照还是乌云密布，明天的方向，仍由你当下的每一个选择所决定。</p>');
  parts.push('<p>建议你在接下来的几天里，保持一份觉察，观察生活中的细微变化——也许一个不经意的相遇、一句偶然听到的话，正是宇宙给你的下一步指引。保持开放的心，答案自会浮现。</p>');

  return parts.join('');
}

// ========== 现状分析 ==========
function buildSituationAnalysis(cards) {
  const uprightCards = cards.filter(c => !c.isReversed);
  const reversedCards = cards.filter(c => c.isReversed);

  let text = '<p>';

  // 用第一张牌（通常是"现状"或"今日指引"位）来描述当前状况
  const primary = cards[0];
  if (primary) {
    const state = primary.isReversed ? '你目前可能正处于一段充满挑战的时期，' : '你目前正处在一个相对有利的时间节点上，';
    text += `${state}「${primary.cardData.nameCn}」出现在「${primary.positionName}」的位置`;

    if (primary.cardData.type === 'major') {
      text += '，这张大阿尔卡纳牌暗示当前的处境并非偶然，而是你灵魂旅程中的一个重要路标。它邀请你暂时停下匆忙的脚步，认真审视生命中正在发生的关键转变。';
    } else {
      const suitContext = {
        wands: '，提示当前的状况与你的行动方向或事业发展密切相关。你可能感到一股想要突破现状的冲动，但需要清晰地辨别这股能量是该释放还是该收敛。',
        cups: '，提示当前的核心问题与情感或人际关系有关。你的内心世界可能比外在表现要丰富得多，也许是时候和信任的人坦诚交流了。',
        swords: '，提示当前的关键在于思维和沟通。你也许正陷入反复的权衡之中，或面临一个难以抉择的十字路口。过度思考并不会带来答案，有时候需要让直觉参与进来。',
        pentacles: '，提示当前的焦点在现实层面——工作、金钱或健康。你需要对当下的实际状况做一个诚实的评估，然后一步步做出调整。'
      };
      text += (suitContext[primary.cardData.suit] || '。');
    }
  }

  // 逆位牌的提醒
  if (reversedCards.length > 0) {
    const reversedNames = reversedCards.map(c => `「${c.cardData.nameCn}」`).join('、');
    text += `值得注意的是，${reversedNames}以逆位出现，这些牌在提醒你：当前的能量在某些领域可能存在阻塞或需要重新审视的地方。逆位并非否定，而是邀请你换一个角度看问题——那些让你感到挫败的卡点，也许恰恰是你最需要成长的地方。</p>`;
  } else {
    text += '</p>';
  }

  // 多张牌时做交叉分析
  if (cards.length >= 3) {
    text += '<p>从整体牌面来看，';
    const majorCards = cards.filter(c => c.cardData.type === 'major');
    const minorCards = cards.filter(c => c.cardData.type === 'minor');
    if (majorCards.length >= 2) {
      text += '多张大阿尔卡纳牌同时出现，说明这并非一个可以简单应付的阶段。这些原型力量在交织运作，你需要从更高的视角来理解正在发生的一切。';
    } else if (minorCards.length >= 2) {
      text += '多张小阿尔卡纳牌的出现，提醒你不要忽略了日常中的微妙变化——有时候最有价值的启示，往往隐藏在看似平凡的人和事之中。';
    }
    text += '</p>';
  }

  return text;
}

// ========== 建议与行动指南 ==========
function buildAdvice(cards) {
  let text = '<p>';

  // 根据逆位占比给建议
  const reversedCount = cards.filter(c => c.isReversed).length;
  const totalCount = cards.length;

  if (reversedCount === 0) {
    text += '当前正是你积极行动的黄金时期。所有牌都处于正位，意味着内在的意愿和外部的机遇处于高度一致的状态。<strong>不要再犹豫了</strong>——你已经拥有了推动事情向前发展所需的一切条件。具体而言：</p>';
  } else if (reversedCount >= totalCount * 0.5) {
    text += '较多的逆位牌提示你，当前阶段<strong>不宜冒进</strong>。这不是一个适合大刀阔斧做决定的时刻，而是更适合内省、复盘和修正的时期。具体建议如下：</p>';
  } else {
    text += '牌面呈现正逆参半的状态，这反映了现实生活的真实面貌。你的策略应该是：<strong>在顺境中加速推进，在逆境中沉淀反思</strong>。以下是一些具体建议：</p>';
  }

  text += '<ul>';

  // 用各牌的 keywords 来生成具体建议
  const tips = [];
  cards.forEach(c => {
    const kws = c.cardData.keywords || [];
    const direction = c.isReversed ? '需要注意' : '可以善用';
    if (kws.length > 0) {
      const kw = kws[Math.floor(Math.random() * kws.length)];
      tips.push({ kw, direction, card: c.cardData.nameCn, isReversed: c.isReversed });
    }
  });

  // 基于牌面生成 3-5 条建议
  const usedTips = tips.slice(0, Math.min(5, tips.length));
  usedTips.forEach(t => {
    if (t.isReversed) {
      text += `<li><strong>审视「${t.kw}」的阴影面：</strong>「${t.card}」逆位提醒你，${t.kw}相关的议题可能正在阻碍你的进展。问问自己：我是否在这一领域过度或不足？是否有什么需要放手的执念？</li>`;
    } else {
      text += `<li><strong>拥抱「${t.kw}」的能量：</strong>「${t.card}」正位鼓励你，将${t.kw}的品质融入当下的行动中。这是你与生俱来的优势，请大胆地展现它。</li>`;
    }
  });

  // 通用的实用建议
  if (cards.length === 1) {
    text += '<li><strong>单张牌的指引：</strong>单张抽牌给出的信息较为集中。建议你将这张牌的含义写在纸上或记在手机里，接下来一周每天回顾一次，观察生活中与之共鸣的事件。</li>';
  } else if (cards.length === 3) {
    text += '<li><strong>三牌的时间线：</strong>过去→现在→未来的牌阵结构给了你一条清晰的时间脉络。建议你回顾一下"过去"位置的牌是否与你近期的经历有共鸣，这能帮助你验证解读的准确性，并更好地理解"未来"位置的指引。</li>';
  } else if (cards.length === 10) {
    text += '<li><strong>十字阵的深度：</strong>凯尔特十字阵信息量非常丰富，不必一次性消化所有内容。建议你先聚焦在"现状"和"最终结果"这两张牌上，它们构成了你的起点和潜在的终点。中间的牌面则是连接这两点的路径图。</li>';
  }

  text += '<li><strong>保持记录的习惯：</strong>建议你简单记录下这次占卜的时间、牌面和第一感受。过一段时间再回头来看，你常常会发现牌面的启示比当时理解的更加深远。</li>';
  text += '</ul>';

  return text;
}

// ========== 未来展望 ==========
function buildFutureOutlook(cards) {
  let text = '<p>';

  // 找"未来"或"最终结果"位置的牌
  const futureCard = cards.find(c =>
    c.positionName.includes('未来') || c.positionName.includes('结果') || c.positionName.includes('目标')
  ) || cards[cards.length - 1];

  if (futureCard) {
    const outlook = futureCard.isReversed ? '预示着前方的道路可能并非一帆风顺，但这并不意味着失败——恰恰相反，逆位更像是一张地图，提前标注了潜在的弯路和需要留意的路段。' : '传递出一个积极的信号：你正在朝着正确的方向前进。正位的能量像是一阵顺风，推动你驶向更开阔的水域。';

    text += `牌阵中「${futureCard.positionName}」位置的「${futureCard.cardData.nameCn}」${futureCard.isReversed ? '（逆位）' : '（正位）'}${outlook}</p>`;

    text += '<p>在未来的一段时间里，';
    const majorCards = cards.filter(c => c.cardData.type === 'major');
    if (majorCards.length >= cards.length * 0.5) {
      text += '命运的齿轮正在加速转动，你可能会遇到一些意义深远的人或事。请相信这些并非偶然——每一个相遇都是你灵魂成长拼图中不可或缺的一块。保持敏锐的觉察力，你会发现生活中的每一个转折都暗藏着深意。';
    } else {
      text += '真正的改变往往从细微处开始。不必期待一夜之间的天翻地覆，而是把注意力放在每天的微小进步上。一个习惯的改变、一次真诚的对话、一个深思熟虑的决定——这些看似平凡的行动，将在时间的累积下产生惊人的复利效应。';
    }
    text += '</p>';

    // 给一个大致的时间框架建议
    text += '<p><strong>时间参考：</strong>塔罗的时间提示并非精确的钟表，而是一个能量节奏的参考。一般来说，大阿尔卡纳牌的能量周期较长（数月到数年），小阿尔卡纳牌则对应较短的周期（数周到数月）。牌阵中的指引，有的会在几天内显现，有的则需要更长的酝酿——请保持耐心，勿因一时未见变化而否定整个趋势。</p>';
  }

  return text;
}

// ==================== 闪金光效 ====================
function flashSpark() {
  const overlay = document.createElement('div');
  overlay.className = 'spark-overlay';
  document.body.appendChild(overlay);
  setTimeout(() => overlay.remove(), 600);
}

// ==================== 工具函数 ====================
function getTagClass(card) {
  if (card.type === 'major') return 'tag-major';
  const map = { wands: 'tag-wands', cups: 'tag-cups', swords: 'tag-swords', pentacles: 'tag-pentacles' };
  return map[card.suit] || '';
}

function getTagText(card) {
  if (card.type === 'major') return '大牌';
  const map = { wands: '权杖', cups: '圣杯', swords: '宝剑', pentacles: '星币' };
  return map[card.suit] || '';
}

function getPositionShort(pos) {
  const map = {
    '今日指引': '指引', '过去': '过去', '现在': '现在', '未来': '未来',
    '现状': '现状', '阻碍': '阻碍', '根源': '根源', '目标': '目标',
    '态度': '态度', '环境': '环境', '希望与恐惧': '希望', '最终结果': '结果'
  };
  return map[pos] || pos;
}
