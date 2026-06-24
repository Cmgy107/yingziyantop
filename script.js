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
const REDEEM_CODES={CHUYU2026:1600,ZIYAN0619:3200,FIRSTYEAR:800};
const RECYCLE_VALUES={R:20,SR:80,SSR:300,UR:1000};
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
let toastTimer;function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1800)}

$('#singleBtn').addEventListener('click',()=>summon(1));
$('#tenBtn').addEventListener('click',()=>summon(10));
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
document.querySelectorAll('.tab').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.tab,.tab-content').forEach(item=>item.classList.remove('active'));button.classList.add('active');$('#'+button.dataset.tab).classList.add('active')}));
$('#clearBtn').addEventListener('click',()=>{state.history=[];save();render();toast('记录已清空')});
render();
