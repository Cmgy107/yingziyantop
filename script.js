const cards = [
  {id:1,name:'仔仔登场',rarity:'R'}, {id:2,name:'拼图时间',rarity:'R'},
  {id:3,name:'手作练习室',rarity:'R'}, {id:4,name:'琴键下午',rarity:'R'}, {id:5,name:'台词本',rarity:'R'},
  {id:6,name:'紫光排练',rarity:'SR'}, {id:7,name:'音乐剧序章',rarity:'SR'},
  {id:8,name:'手作星幕',rarity:'SR'}, {id:9,name:'7月19日的信',rarity:'SR'},
  {id:10,name:'拼成星光',rarity:'SSR'}, {id:11,name:'剧场女主角',rarity:'SSR'},
  {id:12,name:'紫幕奇迹',rarity:'SSR'}, {id:13,name:'紫光初遇',rarity:'UR'}, {id:14,name:'终幕星愿',rarity:'UR'}
].map(card=>({...card,image:`assets/card-${String(card.id).padStart(2,'0')}.png`}));

const BACK_IMAGE='assets/card-back.png';
const RANK={R:1,SR:2,SSR:3,UR:4};
const state=JSON.parse(localStorage.getItem('firstMeetWish')||'null')||{currency:12800,pity:0,srPity:0,history:[]};
state.redeemed=state.redeemed||[];
if(!state.inventory){state.inventory={};state.history.forEach(item=>{if(item.id)state.inventory[item.id]=(state.inventory[item.id]||0)+1})}
const DEFAULT_WHEEL_PRIZES=[
  {name:'R 卡',weight:80},
  {name:'SR 卡',weight:15},
  {name:'SSR 卡',weight:4.5},
  {name:'UR 卡',weight:.5}
];
state.wheelPrizes=Array.isArray(state.wheelPrizes)&&state.wheelPrizes.length?state.wheelPrizes:DEFAULT_WHEEL_PRIZES.map(item=>({...item}));
const REDEEM_CODES={CHUYU2026:1600,ZIYAN0619:3200,FIRSTYEAR:800};
const RECYCLE_VALUES={R:20,SR:80,SSR:300,UR:1000};
const ADD_SEEDS_AMOUNT=1600;
const WHEEL_COLORS=['#8b5cf6','#46c2ff','#ffc15f','#ff7ac8','#6ee7b7','#f87171','#a78bfa','#f0abfc','#93c5fd','#fde68a'];
let wheelRotation=0,wheelSpinning=false;
const $=selector=>document.querySelector(selector);
const poolGrid=$('#poolGrid'),warehouseGrid=$('#warehouseGrid'),resultGrid=$('#resultGrid'),overlay=$('#resultOverlay');

function save(){localStorage.setItem('firstMeetWish',JSON.stringify(state))}
function poolCardHTML(card){return `<button class="collection-card" data-preview-id="${card.id}" title="点击放大：${card.rarity} · ${card.name}" aria-label="放大查看 ${card.rarity} ${card.name}"><img src="${card.image}" alt="${card.name}" loading="lazy"><span class="rarity-chip rarity-${card.rarity}">${card.rarity}</span></button>`}
function warehouseCardHTML(card){const count=state.inventory[card.id]||0;return `<article class="warehouse-card"><button class="warehouse-preview" data-preview-id="${card.id}" aria-label="放大查看 ${card.name}"><img src="${card.image}" alt="${card.name}" loading="lazy"><span class="card-count">×${count}</span></button><div class="warehouse-meta"><div><strong>${card.name}</strong><small style="color:${rankColor(card.rarity)}">${card.rarity}</small></div><button class="recycle-btn" data-recycle-id="${card.id}">回收 +${RECYCLE_VALUES[card.rarity]} 🌱</button></div></article>`}
function flipCardHTML(card,index){return `<button class="flip-card rarity-${card.rarity}" data-index="${index}" aria-label="翻开第 ${index+1} 张卡"><span class="flip-inner"><span class="flip-face back"><img src="${BACK_IMAGE}" alt="卡背"></span><span class="flip-face front"><img src="${card.image}" alt="${card.rarity} ${card.name}"></span></span></button>`}
function render(){
  $('#currency').textContent=state.currency.toLocaleString();
  $('#pityCount').textContent=100-state.pity;
  $('#pityBar').style.width=`${state.pity/100*100}%`;
  $('#historyBadge').textContent=state.history.length;
  const ownedCards=cards.filter(card=>(state.inventory[card.id]||0)>0),totalOwned=Object.values(state.inventory).reduce((sum,count)=>sum+count,0);
  $('#warehouseBadge').textContent=totalOwned;
  $('#warehouseSummary').textContent=`已拥有 ${totalOwned} 张 · 图鉴 ${ownedCards.length}/14`;
  const duplicateCount=cards.reduce((sum,card)=>sum+Math.max(0,(state.inventory[card.id]||0)-1),0);
  const extrasButton=$('#recycleExtras');extrasButton.textContent=duplicateCount?`回收重复卡（${duplicateCount} 张）`:'暂无重复卡';extrasButton.disabled=duplicateCount===0;
  const exchangeableCount=cards.filter(card=>(state.inventory[card.id]||0)>=3).length;
  const exchangeButton=$('#exchangeEntry');exchangeButton.textContent=exchangeableCount?`3 换 1 同级卡（${exchangeableCount}）`:'暂无可兑换卡';exchangeButton.disabled=exchangeableCount===0;
  poolGrid.innerHTML=cards.map(poolCardHTML).join('');
  warehouseGrid.innerHTML=ownedCards.length?ownedCards.map(warehouseCardHTML).join(''):'<div class="empty warehouse-empty">仓库还是空的，先去抽取第一张收藏卡吧。</div>';
  $('#historyList').innerHTML=state.history.length?state.history.map(h=>`<div class="history-item"><time>${h.time}</time><span>${h.name}</span><strong style="color:${rankColor(h.rarity)}">${h.rarity}</strong></div>`).join(''):'<div class="empty">还没有抽卡记录，去收藏第一年的星光吧。</div>';
  renderWheelConfig();
  updateWheelPreview();
}
function rankColor(rarity){return {R:'#b8b0ca',SR:'#ba91ff',SSR:'#ffc76d',UR:'#e2c5ff'}[rarity]}
function pick(rarity){const list=cards.filter(card=>card.rarity===rarity);return list[Math.floor(Math.random()*list.length)]}
function drawOne(forceSR=false){
  state.pity++;state.srPity++;
  let rarity;
  if(state.pity>=100)rarity='UR';
  else if(forceSR||state.srPity>=10){const r=Math.random();rarity=r<.01?'UR':r<.15?'SSR':'SR'}
  else{const r=Math.random();rarity=r<.005?'UR':r<.05?'SSR':r<.20?'SR':'R'}
  if(rarity==='UR')state.pity=0;
  if(RANK[rarity]>=RANK.SR)state.srPity=0;
  return pick(rarity);
}
function drawCost(count){return count===10?1520:160}
function summon(count){
  const cost=drawCost(count);
  if(state.currency<cost){toast('种籽不足，无法继续抽取');return}
  state.currency-=cost;
  const results=[];
  for(let i=0;i<count;i++)results.push(drawOne(count===10&&i===9&&!results.some(card=>RANK[card.rarity]>=RANK.SR)));
  const now=new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
  state.history.unshift(...results.map(card=>({id:card.id,name:card.name,rarity:card.rarity,time:now})));
  results.forEach(card=>{state.inventory[card.id]=(state.inventory[card.id]||0)+1});
  state.history=state.history.slice(0,100);save();render();showResults(results);
}
function showResults(results){
  resultGrid.className='result-grid'+(results.length===1?' single':'');
  resultGrid.innerHTML=results.map(flipCardHTML).join('');
  overlay.classList.add('show');overlay.setAttribute('aria-hidden','false');
  $('#revealAll').textContent='全部翻开';
  $('#repeatDraw').textContent=results.length===10?'再来十抽 · 1,520':'再来一抽 · 160';
  $('#repeatDraw').dataset.count=String(results.length===10?10:1);
}
function revealCard(card){if(!card.classList.contains('flipped'))card.classList.add('flipped')}
function revealAll(){document.querySelectorAll('.flip-card').forEach((card,index)=>setTimeout(()=>revealCard(card),index*90));$('#revealAll').textContent='已全部翻开'}
function closeResults(){overlay.classList.remove('show');overlay.setAttribute('aria-hidden','true')}
function openRedeem(){const panel=$('#redeemOverlay');panel.classList.add('show');panel.setAttribute('aria-hidden','false');$('#redeemMessage').textContent='';$('#redeemCode').value='';setTimeout(()=>$('#redeemCode').focus(),50)}
function closeRedeem(){const panel=$('#redeemOverlay');panel.classList.remove('show');panel.setAttribute('aria-hidden','true')}
function openPreview(card){const panel=$('#previewOverlay'),image=$('#previewImage');image.src=card.image;image.alt=`${card.rarity} ${card.name}`;$('#previewCaption').textContent=`${card.rarity} · ${card.name}`;panel.classList.add('show');panel.setAttribute('aria-hidden','false')}
function closePreview(){const panel=$('#previewOverlay');panel.classList.remove('show');panel.setAttribute('aria-hidden','true')}
function recycleCard(card){
  const count=state.inventory[card.id]||0;
  if(count<1){toast('这张卡已经没有可回收的副本了');return}
  state.inventory[card.id]=count-1;state.currency+=RECYCLE_VALUES[card.rarity];save();render();toast(`已回收「${card.name}」，获得 ${RECYCLE_VALUES[card.rarity]} 种籽`);
}
function recycleExtras(){
  let count=0,total=0;
  cards.forEach(card=>{const extras=Math.max(0,(state.inventory[card.id]||0)-1);count+=extras;total+=extras*RECYCLE_VALUES[card.rarity]});
  if(!count){toast('目前没有重复卡牌');return}
  if(!window.confirm(`将回收 ${count} 张重复卡，每种卡牌保留 1 张，共获得 ${total.toLocaleString()} 种籽。确认回收吗？`))return;
  cards.forEach(card=>{if((state.inventory[card.id]||0)>1)state.inventory[card.id]=1});state.currency+=total;save();render();toast(`已回收 ${count} 张重复卡，获得 ${total.toLocaleString()} 种籽`);
}
function openExchange(){
  const eligible=cards.filter(card=>(state.inventory[card.id]||0)>=3);
  if(!eligible.length){toast('需要至少持有 3 张相同卡牌才能兑换');return}
  $('#exchangeSource').innerHTML=eligible.map(card=>`<option value="${card.id}">${card.rarity} · ${card.name}（持有 ${state.inventory[card.id]}）</option>`).join('');
  updateExchangeTargets();$('#exchangeMessage').textContent='';
  const panel=$('#exchangeOverlay');panel.classList.add('show');panel.setAttribute('aria-hidden','false');
}
function updateExchangeTargets(){
  const source=cards.find(card=>card.id===Number($('#exchangeSource').value));
  $('#exchangeTarget').innerHTML=source?cards.filter(card=>card.rarity===source.rarity&&card.id!==source.id).map(card=>`<option value="${card.id}">${card.rarity} · ${card.name}${state.inventory[card.id]?`（已有 ${state.inventory[card.id]}）`:'（未获得）'}</option>`).join(''):'';
}
function closeExchange(){const panel=$('#exchangeOverlay');panel.classList.remove('show');panel.setAttribute('aria-hidden','true')}
function exchangeCards(){
  const source=cards.find(card=>card.id===Number($('#exchangeSource').value)),target=cards.find(card=>card.id===Number($('#exchangeTarget').value));
  if(!source||!target||source.rarity!==target.rarity||source.id===target.id){$('#exchangeMessage').textContent='请选择有效的同级卡牌。';return}
  if((state.inventory[source.id]||0)<3){$('#exchangeMessage').textContent='用于兑换的卡牌数量不足。';return}
  state.inventory[source.id]-=3;state.inventory[target.id]=(state.inventory[target.id]||0)+1;save();render();closeExchange();toast(`兑换成功：获得「${target.name}」`);
}
function redeem(code){
  const normalized=code.trim().toUpperCase(),message=$('#redeemMessage');
  if(!REDEEM_CODES[normalized]){message.className='redeem-message error';message.textContent='兑换码无效，请检查后重试。';return}
  if(state.redeemed.includes(normalized)){message.className='redeem-message error';message.textContent='这个兑换码已经使用过了。';return}
  const amount=REDEEM_CODES[normalized];state.currency+=amount;state.redeemed.push(normalized);save();render();
  message.className='redeem-message success';message.textContent=`兑换成功，获得 ${amount.toLocaleString()} 枚种籽！`;
}
function addSeeds(){
  state.currency+=ADD_SEEDS_AMOUNT;
  save();
  render();
  toast(`已增加 ${ADD_SEEDS_AMOUNT.toLocaleString()} 种籽`);
}
function sanitizeWheelPrizes(){
  return [...document.querySelectorAll('.wheel-prize-row')].map(row=>({
    name:row.querySelector('[data-wheel-name]').value.trim(),
    weight:Number(row.querySelector('[data-wheel-weight]').value)
  })).filter(item=>item.name&&Number.isFinite(item.weight)&&item.weight>0);
}
function renderWheelConfig(){
  const list=$('#wheelPrizeList');
  if(!list)return;
  list.innerHTML=state.wheelPrizes.map((item,index)=>`<div class="wheel-prize-row" data-wheel-row="${index}"><input data-wheel-name value="${escapeHTML(item.name)}" aria-label="奖项名称"><input data-wheel-weight type="number" min="0" step="0.1" value="${item.weight}" aria-label="奖项概率"><button class="wheel-remove" data-wheel-remove="${index}" aria-label="删除奖项">×</button></div>`).join('');
}
function escapeHTML(text){return String(text).replace(/[&<>"']/g,match=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[match]))}
function polar(cx,cy,r,angle){const rad=(angle-90)*Math.PI/180;return {x:cx+r*Math.cos(rad),y:cy+r*Math.sin(rad)}}
function annularSegmentPath(start,end,outer=145,inner=72,cx=180,cy=180){
  const pad=Math.min(1.6,(end-start)*.08);
  const s=start+pad,e=end-pad;
  const a=polar(cx,cy,outer,s),b=polar(cx,cy,outer,e),c=polar(cx,cy,inner,e),d=polar(cx,cy,inner,s),large=e-s>180?1:0;
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${outer} ${outer} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)} L ${c.x.toFixed(2)} ${c.y.toFixed(2)} A ${inner} ${inner} 0 ${large} 0 ${d.x.toFixed(2)} ${d.y.toFixed(2)} Z`;
}
function truncatePrizeName(name){return name.length>8?`${name.slice(0,8)}…`:name}
function wheelSVG(prizes){
  const total=prizes.reduce((sum,item)=>sum+item.weight,0);
  let cursor=0;
  const segments=prizes.map((item,index)=>{
    const start=cursor/total*360,end=(cursor+item.weight)/total*360,mid=(start+end)/2;
    cursor+=item.weight;
    const label=polar(180,180,108,mid),rune=polar(180,180,132,mid),gem=polar(180,180,88,mid),divider=polar(180,180,149,start);
    const icon=['✦','✧','✺','◆','✹','✶'][index%6];
    const labelRotate=mid>90&&mid<270?mid+180:mid;
    return `<g class="wheel-prize-slice"><path class="wheel-segment" d="${annularSegmentPath(start,end)}" fill="${WHEEL_COLORS[index%WHEEL_COLORS.length]}"></path><line class="wheel-divider" x1="180" y1="180" x2="${divider.x.toFixed(1)}" y2="${divider.y.toFixed(1)}"></line><circle class="wheel-gem-dot" cx="${gem.x.toFixed(1)}" cy="${gem.y.toFixed(1)}" r="4.6"></circle><text class="wheel-label" x="${label.x.toFixed(1)}" y="${label.y.toFixed(1)}" transform="rotate(${labelRotate.toFixed(1)} ${label.x.toFixed(1)} ${label.y.toFixed(1)})">${escapeHTML(truncatePrizeName(item.name))}</text><text class="wheel-rune" x="${rune.x.toFixed(1)}" y="${rune.y.toFixed(1)}">${icon}</text></g>`;
  }).join('');
  const pearls=Array.from({length:32},(_,index)=>{const p=polar(180,180,166,index*360/32);return `<circle class="wheel-pearl" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${index%4===0?3.4:2.1}"></circle>`}).join('');
  const ticks=Array.from({length:64},(_,index)=>{const a=index*360/64,p1=polar(180,180,index%4?153:151,a),p2=polar(180,180,index%4?158:163,a);return `<line class="wheel-tick" x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}"></line>`}).join('');
  const stars=[20,70,112,158,204,252,300,338].map((angle,index)=>{const p=polar(180,180,index%2?58:61,angle);return `<path class="wheel-star" d="M${p.x} ${p.y-5}l1.4 3.5 3.8.3-2.9 2.5.9 3.7-3.2-2-3.2 2 .9-3.7-2.9-2.5 3.8-.3z"/>`}).join('');
  return `<svg class="wheel-svg" viewBox="0 0 360 360" role="img" aria-label="紫色星夜魔法转盘">
    <defs>
      <radialGradient id="discShine" cx="38%" cy="26%" r="78%"><stop offset="0%" stop-color="#ffffff" stop-opacity=".28"/><stop offset="35%" stop-color="#e8d4ff" stop-opacity=".1"/><stop offset="100%" stop-color="#06030f" stop-opacity=".44"/></radialGradient>
      <radialGradient id="deepViolet" cx="50%" cy="44%" r="62%"><stop offset="0%" stop-color="#39226e"/><stop offset="56%" stop-color="#1a1037"/><stop offset="100%" stop-color="#090512"/></radialGradient>
      <linearGradient id="magicGold" x1="0" x2="1"><stop offset="0%" stop-color="#6f4cc8"/><stop offset="18%" stop-color="#fff5bf"/><stop offset="45%" stop-color="#c78b35"/><stop offset="70%" stop-color="#f3dca0"/><stop offset="100%" stop-color="#754fd0"/></linearGradient>
      <filter id="segmentGlow"><feDropShadow dx="0" dy="0" stdDeviation="2.6" flood-color="#cdb7ff" flood-opacity=".45"/></filter>
      <filter id="segmentGlowStrong"><feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#fff1bd" flood-opacity=".55"/></filter>
      <filter id="starGlow"><feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#fff4bd" flood-opacity=".9"/></filter>
      <filter id="innerGlow"><feDropShadow dx="0" dy="0" stdDeviation="7" flood-color="#8b5cf6" flood-opacity=".75"/><feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#fff4bd" flood-opacity=".5"/></filter>
    </defs>
    <circle cx="180" cy="180" r="174" fill="#07030f"></circle>
    <circle cx="180" cy="180" r="169" fill="none" stroke="url(#magicGold)" stroke-width="3.2"></circle>
    ${pearls}
    ${ticks}
    <circle cx="180" cy="180" r="150" fill="url(#deepViolet)" stroke="rgba(255,255,255,.18)" stroke-width="1"></circle>
    <circle class="wheel-ring" cx="180" cy="180" r="148"></circle>
    <g class="wheel-slices">${segments}</g>
    <circle cx="180" cy="180" r="149" fill="url(#discShine)" opacity=".54" pointer-events="none"></circle>
    <circle class="wheel-ring-thin" cx="180" cy="180" r="146"></circle>
    <circle class="wheel-ring-thin" cx="180" cy="180" r="73"></circle>
    <circle class="wheel-inner-orb" cx="180" cy="180" r="64"></circle>
    ${stars}
    <path class="wheel-center-star" d="M180 111l10 42 43-10-31 31 31 31-43-10-10 42-10-42-43 10 31-31-31-31 43 10z"></path>
  </svg>`;
}
function updateWheelPreview(){
  const disc=$('#wheelDisc'),note=$('#wheelNote');
  if(!disc)return;
  const prizes=sanitizeWheelPrizes();
  const total=prizes.reduce((sum,item)=>sum+item.weight,0);
  if(prizes.length<2||total<=0){
    if(note){note.className='wheel-note error';note.textContent='至少需要 2 个有效奖项，且概率必须大于 0。'}
    return;
  }
  disc.innerHTML=wheelSVG(prizes);
  if(note){note.className='wheel-note';note.textContent=`当前共 ${prizes.length} 个奖项，总权重 ${Number(total.toFixed(2))}。`}
}
function saveWheelConfig(){
  const prizes=sanitizeWheelPrizes();
  if(prizes.length<2){$('#wheelNote').className='wheel-note error';$('#wheelNote').textContent='至少保留 2 个有效奖项。';return}
  state.wheelPrizes=prizes;
  save();
  render();
  $('#wheelNote').className='wheel-note success';
  $('#wheelNote').textContent='转盘概率已保存。';
  toast('转盘概率已保存');
}
function addWheelPrize(){
  const list=$('#wheelPrizeList');
  const index=list.querySelectorAll('.wheel-prize-row').length;
  list.insertAdjacentHTML('beforeend',`<div class="wheel-prize-row" data-wheel-row="${index}"><input data-wheel-name value="新奖项" aria-label="奖项名称"><input data-wheel-weight type="number" min="0" step="0.1" value="1" aria-label="奖项概率"><button class="wheel-remove" data-wheel-remove="${index}" aria-label="删除奖项">×</button></div>`);
  updateWheelPreview();
}
function resetWheelConfig(){
  state.wheelPrizes=DEFAULT_WHEEL_PRIZES.map(item=>({...item}));
  save();
  render();
  $('#wheelResult').textContent='等待抽取';
  toast('已恢复默认转盘');
}
function pickWheelPrize(prizes){
  const total=prizes.reduce((sum,item)=>sum+item.weight,0);
  let cursor=Math.random()*total;
  for(const item of prizes){cursor-=item.weight;if(cursor<=0)return item}
  return prizes[prizes.length-1];
}
function spinWheel(){
  if(wheelSpinning)return;
  const prizes=sanitizeWheelPrizes();
  if(prizes.length<2){$('#wheelNote').className='wheel-note error';$('#wheelNote').textContent='至少需要 2 个有效奖项才能转动。';return}
  const prize=pickWheelPrize(prizes),index=prizes.indexOf(prize),total=prizes.reduce((sum,item)=>sum+item.weight,0);
  let before=0;for(let i=0;i<index;i++)before+=prizes[i].weight;
  const middle=(before+prize.weight/2)/total*360;
  const extraTurns=5+Math.floor(Math.random()*3);
  const currentRotation=((wheelRotation%360)+360)%360;
  const targetRotation=(360-middle)%360;
  const correction=(targetRotation-currentRotation+360)%360;
  wheelRotation+=extraTurns*360+correction;
  wheelSpinning=true;
  $('#wheelSpin').disabled=true;
  $('#wheelResult').textContent='转动中...';
  $('#wheelDisc').dataset.winner=prize.name;
  $('#wheelDisc').dataset.winnerAngle=middle.toFixed(3);
  $('#wheelDisc').dataset.finalRotation=(wheelRotation%360).toFixed(3);
  const complete=()=>{wheelSpinning=false;$('#wheelSpin').disabled=false;$('#wheelResult').textContent=`抽中：${prize.name}`;$('#wheelResult').classList.add('win');setTimeout(()=>$('#wheelResult')?.classList.remove('win'),1600);toast(`转盘抽中：${prize.name}`)};
  $('#wheelDisc').style.transition='transform 4.4s cubic-bezier(.12,.72,.08,1)';
  $('#wheelDisc').style.transform=`rotate(${wheelRotation}deg)`;
  setTimeout(complete,4500);
}
function launchMeteor(){
  const meteor=document.createElement('span');
  meteor.className='meteor';
  const fromLeft=Math.random()<.55;
  const startX=fromLeft?Math.random()*window.innerWidth*.55:window.innerWidth*(.35+Math.random()*.65);
  const startY=-80-Math.random()*160;
  const dx=(fromLeft?1:-1)*(window.innerWidth*(.35+Math.random()*.35));
  const dy=window.innerHeight*(.34+Math.random()*.32);
  const angle=(fromLeft?24:-204)+(Math.random()*10-5);
  meteor.style.setProperty('--sx',`${Math.round(startX)}px`);
  meteor.style.setProperty('--sy',`${Math.round(startY)}px`);
  meteor.style.setProperty('--dx',`${Math.round(dx)}px`);
  meteor.style.setProperty('--dy',`${Math.round(dy)}px`);
  meteor.style.setProperty('--angle',`${angle}deg`);
  meteor.style.animation=`meteorFly ${1.05+Math.random()*.55}s ease-out forwards`;
  document.body.appendChild(meteor);
  meteor.addEventListener('animationend',()=>meteor.remove(),{once:true});
}
function scheduleMeteor(){setTimeout(()=>{launchMeteor();scheduleMeteor()},3500+Math.random()*9500)}
let lastTrailTime=0;
function spawnCursorTrail(event){
  const now=Date.now();
  if(now-lastTrailTime<38)return;
  lastTrailTime=now;
  const dot=document.createElement('span');
  dot.className='cursor-trail';
  dot.style.setProperty('--tx',`${(Math.random()*18-9).toFixed(1)}px`);
  dot.style.setProperty('--ty',`${(Math.random()*18-9).toFixed(1)}px`);
  dot.style.left=`${event.clientX-4}px`;
  dot.style.top=`${event.clientY-4}px`;
  document.body.appendChild(dot);
  dot.addEventListener('animationend',()=>dot.remove(),{once:true});
  setTimeout(()=>dot.remove(),900);
}
let toastTimer;function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1800)}

$('#singleBtn').addEventListener('click',()=>summon(1));
$('#tenBtn').addEventListener('click',()=>summon(10));
$('#addSeedsBtn').addEventListener('click',addSeeds);
$('#addWheelPrize').addEventListener('click',addWheelPrize);
$('#saveWheelConfig').addEventListener('click',saveWheelConfig);
$('#resetWheelConfig').addEventListener('click',resetWheelConfig);
$('#wheelSpin').addEventListener('click',spinWheel);
$('#wheelPrizeList').addEventListener('input',updateWheelPreview);
$('#wheelPrizeList').addEventListener('click',event=>{const button=event.target.closest('[data-wheel-remove]');if(!button)return;button.closest('.wheel-prize-row').remove();updateWheelPreview()});
$('#closeResult').addEventListener('click',closeResults);
$('#revealAll').addEventListener('click',revealAll);
$('#repeatDraw').addEventListener('click',event=>summon(Number(event.currentTarget.dataset.count||1)));
$('#redeemEntry').addEventListener('click',openRedeem);
$('#redeemClose').addEventListener('click',closeRedeem);
$('#redeemForm').addEventListener('submit',event=>{event.preventDefault();redeem($('#redeemCode').value)});
$('#redeemOverlay').addEventListener('click',event=>{if(event.target===event.currentTarget)closeRedeem()});
resultGrid.addEventListener('click',event=>{const card=event.target.closest('.flip-card');if(card)revealCard(card)});
document.addEventListener('click',event=>{const preview=event.target.closest('[data-preview-id]');if(preview){const card=cards.find(item=>item.id===Number(preview.dataset.previewId));if(card)openPreview(card)}});
warehouseGrid.addEventListener('click',event=>{const button=event.target.closest('[data-recycle-id]');if(!button)return;event.stopPropagation();const card=cards.find(item=>item.id===Number(button.dataset.recycleId));if(card)recycleCard(card)});
$('#recycleExtras').addEventListener('click',recycleExtras);
$('#exchangeEntry').addEventListener('click',openExchange);
$('#exchangeSource').addEventListener('change',updateExchangeTargets);
$('#exchangeConfirm').addEventListener('click',exchangeCards);
$('#exchangeClose').addEventListener('click',closeExchange);
$('#exchangeOverlay').addEventListener('click',event=>{if(event.target===event.currentTarget)closeExchange()});
$('#previewClose').addEventListener('click',closePreview);
$('#previewOverlay').addEventListener('click',event=>{if(event.target===event.currentTarget)closePreview()});
overlay.addEventListener('click',event=>{if(event.target===overlay)closeResults()});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeResults();closeRedeem();closePreview();closeExchange()}});
document.addEventListener('pointermove',spawnCursorTrail);
document.querySelectorAll('.tab').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.tab,.tab-content').forEach(item=>item.classList.remove('active'));button.classList.add('active');$('#'+button.dataset.tab).classList.add('active')}));
$('#clearBtn').addEventListener('click',()=>{state.history=[];save();render();toast('记录已清空')});
render();
scheduleMeteor();
