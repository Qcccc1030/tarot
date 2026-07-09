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
// 访问计数器
fetch('https://api.countapi.xyz/hit/qcccc1030-tarot/visits')
  .then(r => r.json()).then(d => {
    document.getElementById('visit-count').textContent = d.value || 1;
  }).catch(() => {
    document.getElementById('visit-count').textContent = '许多';
  });
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
    parts.push('<p>大阿尔卡纳牌占比偏高——你正处在人生的重要转折点，眼前的课题不是偶然，而是灵魂成长的必经之路。请用更宏观的视角看待当下。</p>');
  } else if (majorCount === 0) {
    parts.push('<p>全部为小阿尔卡纳牌，焦点落在日常事务上。不必过度解读，关注工作、人际和生活的具体细节，平凡中自有力量。</p>');
  } else {
    parts.push('<p>大小牌比例均衡，命运洪流与日常生活在此交汇。既聆听内心的声音，也关注外在的实际变化。</p>');
  }

  if (reversedCount >= cards.length * 0.5) {
    parts.push('<p>逆位牌比例较高，提醒你<strong>向内审视</strong>。那些卡住的地方，藏着你尚未察觉的信念或未处理的情绪。与其急于突破，先静心看看自己在抗拒什么。</p>');
  } else if (reversedCount === 0) {
    parts.push('<p>全部正位——能量通畅，内在状态与外部环境高度协调。这是一个难得的窗口期，适合果断行动。</p>');
  } else {
    parts.push('<p>正逆位参半，如实映照生活。顺境时不飘，逆境时不弃，平衡才是关键。</p>');
  }

  // 牌组能量分析
  const dominantSuit = Object.entries(suits).sort((a, b) => b[1] - a[1])[0];
  if (dominantSuit) {
    const suitDetail = {
      wands: '<strong>行动力</strong>（火元素）是当前主角。等待不会让事情变好，点燃热情、迈出步伐，将愿景一步步落地。创造力正在峰值，善用它。',
      cups: '<strong>情感关系</strong>（水元素）是当前核心。你或许正经历深刻的情感波动，或在关系中面临转折。相信直觉，它比理性更能带你抵达真实。在关怀他人之前，先滋养自己。',
      swords: '<strong>思维与沟通</strong>（风元素）是当前焦点。你可能面临关键决策，或陷入过度思考的漩涡。剑可斩断迷雾也可伤及自身——做重大判断前，让思绪沉淀片刻。',
      pentacles: '<strong>物质与现实</strong>（土元素）是当前主题。金钱、工作或健康需要你的关注。像农夫一样踏实耕耘，每个微小积累都在为未来奠基。务实不是无趣，是最稳的路。'
    };
    parts.push(`<p>${suitDetail[dominantSuit[0]]}</p>`);
  }
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
  parts.push('<p>塔罗是你内心的一面镜子，不是宿命的判决书。<strong>舵手始终是你自己</strong>。接下来的日子里保持觉察，也许一次偶遇、一句不经意的话，就是宇宙的下一步提示。</p>');

  return parts.join('');
}

// ========== 现状分析 ==========
function buildSituationAnalysis(cards) {
  const reversedCards = cards.filter(c => c.isReversed);
  let text = '<p>';
  const primary = cards[0];
  if (primary) {
    const state = primary.isReversed ? '挑战期' : '有利期';
    text += `你在「${state}」抽到了「${primary.cardData.nameCn}」，位置是<strong>${primary.positionName}</strong>。`;
    if (primary.cardData.type === 'major') {
      text += '大阿尔卡纳的出现暗示这不是小事——停下脚步，认真审视正在发生的关键转变。';
    } else {
      const s = { wands:'焦点在行动与事业', cups:'焦点在情感与关系', swords:'焦点在思维与决策', pentacles:'焦点在现实与物质' };
      text += (s[primary.cardData.suit] || '') + '，这是你需要投入注意力的领域。';
    }
  }
  if (reversedCards.length > 0) {
    const names = reversedCards.map(c => `「${c.cardData.nameCn}」`).join('、');
    text += `${names}逆位出现，提示某些领域存在阻塞。逆位不是否定，而是邀请你换个角度——卡住的地方，往往最需要成长。`;
  }
  text += '</p>';
  return text;
}

// ========== 建议与行动指南 ==========
function buildAdvice(cards) {
  const reversedCount = cards.filter(c => c.isReversed).length;
  let text = '<p>';
  if (reversedCount === 0) {
    text += '全正位——<strong>别再犹豫</strong>，内在意愿与外部机遇高度一致，你有足够条件推动事情向前。';
  } else if (reversedCount >= cards.length * 0.5) {
    text += '逆位偏多——<strong>不宜冒进</strong>。这阶段更适合内省和修正，而非大刀阔斧做决定。';
  } else {
    text += '正逆参半——<strong>顺境加速，逆境沉淀</strong>，灵活切换节奏是关键。';
  }
  text += '</p><ul>';

  const tips = [];
  cards.forEach(c => {
    const kws = c.cardData.keywords || [];
    if (kws.length > 0) {
      tips.push({ kw: kws[Math.floor(Math.random() * kws.length)], card: c.cardData.nameCn, isReversed: c.isReversed });
    }
  });
  tips.slice(0, Math.min(5, tips.length)).forEach(t => {
    if (t.isReversed) {
      text += `<li><strong>反思「${t.kw}」：</strong>「${t.card}」逆位暗示这一领域有阻塞。问问自己：我在害怕什么？有什么执念该放下了？</li>`;
    } else {
      text += `<li><strong>发挥「${t.kw}」：</strong>「${t.card}」正位告诉你，这是你的优势所在，大胆用它。</li>`;
    }
  });

  if (cards.length === 1) {
    text += '<li><strong>记下来：</strong>把这张牌的含义存手机里，接下来一周每天看一遍，观察生活中呼应它的事件。</li>';
  } else if (cards.length === 3) {
    text += '<li><strong>验证过去：</strong>回顾"过去"位置的牌是否与近期经历有共鸣，这能帮你判断解读的准确性。</li>';
  } else if (cards.length === 10) {
    text += '<li><strong>先看两头：</strong>十字阵信息量大，优先看"现状"和"最终结果"，中间的牌是路径图。</li>';
  }
  text += '</ul>';
  return text;
}

// ========== 未来展望 ==========
function buildFutureOutlook(cards) {
  let text = '<p>';
  const futureCard = cards.find(c =>
    c.positionName.includes('未来') || c.positionName.includes('结果') || c.positionName.includes('目标')
  ) || cards[cards.length - 1];

  if (futureCard) {
    const outlook = futureCard.isReversed
      ? '逆位预警：前方可能有曲折，但逆位像地图，提前标注了弯道和需要留意的路段。'
      : '正位顺风：你正在正确的方向上，保持节奏继续前进。';
    text += `「${futureCard.positionName}」位的「${futureCard.cardData.nameCn}」：${outlook}</p>`;

    const majorCards = cards.filter(c => c.cardData.type === 'major');
    text += '<p>';
    if (majorCards.length >= cards.length * 0.5) {
      text += '大牌主导意味着命运的节奏在加快，你会遇到意义深远的人和事。每一次相遇都不是偶然。';
    } else {
      text += '改变从细微处开始。一个习惯、一次对话、一个决定——平凡行动在时间中产生复利。';
    }
    text += '</p><p><strong>时间参考：</strong>大阿尔卡纳周期较长（数月到数年），小阿尔卡纳较短（数周到数月）。指引有的几天显现，有的需要酝酿——别急，别因一时未见变化否定整体趋势。</p>';
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
