'use strict';
const E=MapEngine,I=MapInstructions,$=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
const mapImages=JSON.parse($('#map-images').textContent);
const teacherKey=new URLSearchParams(location.search).get('key');
const online=location.pathname==='/teacher'&&!!teacherKey;
let session={state:E.initial(),mode:'direct',round:null,revision:0,choices:{...I.defaults}},lastRevision=-1,busy=false,notice='',lastHeading=0,rotation=0;
const target=$('#target');
target.innerHTML='<option value="">Explorar · 自由探索</option>'+E.places.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
// Illustration bounds in the same 1566 × 950 space as the movement graph.
const placeBoxes={banco:[219,12,260,156],cinema:[1087,12,261,156],escola:[7,167,249,156],museu:[1310,167,249,156],mercado:[7,374,249,157],biblioteca:[1310,374,249,157],jardim:[7,585,249,160],cafe:[1310,585,249,160],hospital:[224,762,258,165],farmacia:[1087,762,261,165]};
E.places.forEach(p=>{const [x,y,w,h]=placeBoxes[p.id];const b=document.createElement('button');b.className='place';b.dataset.place=p.id;b.title='去 '+p.name;b.setAttribute('aria-label','設定目的地：'+p.name);const name=document.createElement('span');name.className='place-name';name.textContent=p.name;b.append(name);Object.assign(b.style,{left:(x/1566*100)+'%',top:(y/950*100)+'%',width:(w/1566*100)+'%',height:(h/950*100)+'%'});b.onclick=()=>dispatch('target',{target:p.id});$('#places').append(b);});
let renderedMap='';
const mapCalibration={
 city:{x:[[255,280],[350,356],[565,565],[780,783],[995,989],[1210,1210],[1310,1285]],y:[[150,150],[170,170],[240,240],[345,354],[450,455],[555,564],[660,683],[770,740],[832,832]]},
 worksheet:{x:[[255,270],[350,350],[780,780],[1210,1210],[1310,1295]],y:[[150,150],[170,170],[240,240],[450,450],[660,668],[770,760],[832,832]]}
};
function interpolate(value,pairs){
 if(value<=pairs[0][0])return value+pairs[0][1]-pairs[0][0];
 for(let i=1;i<pairs.length;i++)if(value<=pairs[i][0]){const [a,b]=pairs[i-1],[c,d]=pairs[i];return b+(value-a)/(c-a)*(d-b);}
 return value+pairs.at(-1)[1]-pairs.at(-1)[0];
}
function position(map,p){const c=mapCalibration[map];return {x:interpolate(p.x,c.x),y:interpolate(p.y,c.y)};}
function renderMap(map){
 if(renderedMap===map)return;
 renderedMap=map;$('.city-art').src=mapImages[map];
 const labels=map==='city'?[
  ['Rua do Museu',565,196],['Rua do Mercado',895,450],['Rua do Jardim',670,660],
  ['Rua Nova',350,555,'vertical'],['Rua Central',780,750,'vertical'],['Rua do Sol',1210,345,'vertical'],
  ['Rua das Flores',565,555,'vertical minor'],['Rua da Escola',995,345,'vertical minor'],
  ['Rua da Praça',465,345,'minor'],['Rua das Lojas',1100,555,'minor']
 ]:[
  ['Rua do Museu',560,190],['Rua do Museu',1000,190],['Rua do Mercado',560,410],['Rua do Mercado',1000,410],
  ['Rua do Jardim',560,620],['Rua do Jardim',1000,620],['Rua Nova',300,530,'vertical'],['Rua do Sol',1260,530,'vertical'],['Rua Central',970,780]
 ];
 $('#streets').replaceChildren();
 for(const [name,x,y,kind=''] of labels){const p=position(map,{x,y});const el=document.createElement('span');el.className='street-name '+kind;el.textContent=name;el.style.left=p.x/1566*100+'%';el.style.top=p.y/950*100+'%';$('#streets').append(el);}
}
function drawTrail(s){
 const ctx=$('#trail').getContext('2d'),streets=E.graph(s);
 ctx.clearRect(0,0,1566,950);if(s.path.length<2&&!s.edge)return;
 ctx.beginPath();s.path.forEach((id,i)=>{const p=position(s.map||'worksheet',streets[id]);if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);});
 if(s.edge){const p=position(s.map||'worksheet',I.position(s));ctx.lineTo(p.x,p.y);}
 ctx.lineCap='round';ctx.lineJoin='round';ctx.setLineDash([]);ctx.lineWidth=13;ctx.strokeStyle='#fbfcf8b3';ctx.stroke();
 ctx.lineWidth=7;ctx.strokeStyle='#205b55';ctx.setLineDash([2,17]);ctx.stroke();ctx.setLineDash([]);
}
function message(text){notice=text;$('#status').textContent=text;$('#status').classList.remove('success');}
function counts(){return Object.fromEntries($$('[data-vote]').map(i=>[i.dataset.vote,i.value.trim()===''?NaN:Number(i.value)]));}
function clearCounts(){$$('[data-vote]').forEach(i=>i.value='0');}
function render(){
 const s=session.state,place=E.destination(s.target),voting=session.mode!=='direct',devices=session.mode==='devices';
 const map=s.map||'worksheet';renderMap(map);
 const p=position(map,I.position(s));
 $$('[data-map]').forEach(b=>{const active=b.dataset.map===map;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
 target.value=s.target;$('#mission').textContent=place?`Vamos ${place.phrase}.`:'Vamos explorar a cidade!';
 const walker=$('#walker'),oldX=parseFloat(walker.style.left)||p.x/1566*100,oldY=parseFloat(walker.style.top)||p.y/950*100;
 const duration=Math.min(1800,Math.max(450,Math.hypot(p.x/1566*100-oldX,p.y/950*100-oldY)*35));
 walker.style.transitionDuration=duration+'ms';walker.style.left=p.x/1566*100+'%';walker.style.top=p.y/950*100+'%';walker.dataset.node=s.node;walker.dataset.edge=s.edge?`${s.edge.a}:${s.edge.b}:${s.edge.t}`:'';
 let d=(s.heading-lastHeading+4)%4;if(d===3)d=-1;rotation+=d*90;lastHeading=s.heading;
 $('#facing').style.transitionDelay=d&&Math.hypot(p.x/1566*100-oldX,p.y/950*100-oldY)>1?duration+'ms':'0ms';$('#facing').style.transform=`rotate(${rotation}deg)`;
 drawTrail(s);
 $$('[data-place]').forEach(b=>{b.classList.toggle('selected',b.dataset.place===s.target);b.classList.toggle('arrived',b.dataset.place===s.target&&s.arrived);b.setAttribute('aria-pressed',String(b.dataset.place===s.target));});
 $('#status').textContent=notice||s.last;$('#status').classList.toggle('success',!notice&&s.arrived);
 document.body.classList.toggle('voting',voting);
 $$('[data-mode]').forEach(b=>{const active=b.dataset.mode===session.mode;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
 $$('.vote-input').forEach(el=>el.hidden=!voting);$('#vote-tools').hidden=!voting;
 $$('[data-command]').forEach(b=>{const c=I.get((session.choices||I.defaults)[b.dataset.command]);b.querySelector('.command-copy').firstChild.textContent=c.phrase;b.querySelector('small').textContent=c.short;b.querySelector('.arrow').textContent=c.icon;b.disabled=voting||s.arrived;b.classList.toggle('winner',!!session.round?.outcome&&session.round.outcome===b.dataset.command);});
 $$('[data-vote]').forEach(i=>{i.readOnly=devices;if(devices)i.value=session.round?.counts?.[i.dataset.vote]??0;});
 $('#mode-intro').textContent=devices?'學生用裝置揀 A／B／C。老師確認後，人物先行動。':voting?'學生舉手／舉 ABC 卡，老師輸入右邊票數。':'先講葡文，再按指令。';
 $('#open-round').hidden=!devices;$('#open-round').disabled=!!session.round?.open||s.arrived;
 $('#apply-vote').disabled=s.arrived||(devices&&!session.round?.open);
 $('#apply-vote').textContent=devices?'截止投票，執行勝出指令':'確認票數，執行指令';
 $('#clear-votes').hidden=devices;
 $('#round-info').textContent=devices?(session.round?.open?`第 ${session.round.id} 輪投票中 · 已收到 ${session.round.total} 票`:'投票未開放。按「開始新一輪投票」。'):'每輪只執行一個勝出指令；同票要重投。';
 $('#undo').disabled=!s.history.length;
 if(window.renderLanguage)window.renderLanguage();
}
async function dispatch(kind,data={}){
 if(busy)return;
 notice='';
 if(online){
  busy=true;document.body.classList.add('busy');
  try{const r=await fetch('/api/teacher',{method:'POST',headers:{'Content-Type':'application/json','X-Teacher-Key':teacherKey},body:JSON.stringify({kind,...data})});const j=await r.json();if(!r.ok)throw new Error(j.error);session=j;lastRevision=j.revision;if(['target','map','reset','mode','apply'].includes(kind))clearCounts();render();}
  catch(e){message(e.message||'未能連接，請檢查伺服器。');}
  finally{busy=false;document.body.classList.remove('busy');}
  return;
 }
 if(kind==='target')session.state=E.initial(data.target,session.state.map);
 if(kind==='map')session.state=E.initial(session.state.target,data.map);
 if(kind==='reset')session.state=E.initial(session.state.target,session.state.map);
 if(kind==='undo')session.state=E.undo(session.state);
 if(kind==='mode')session.mode=data.mode;
 if(kind==='action'){try{session.state=I.run(session.state,(session.choices||I.defaults)[data.choice]);}catch(e){message(e.message);return;}}
 if(kind==='instruction'){try{session.state=I.run(session.state,data.id);}catch(e){message(e.message);return;}}
 if(kind==='demo'){session.mode='direct';session.state=I.run(E.initial('','worksheet'),data.id);}
 if(kind==='choices'){session.choices={...data.choices};session.round=null;}
 if(kind==='apply'){
  const result=E.winner(data.counts);
  if(result.error){message(result.error);return;}
  try{session.state=I.run(session.state,(session.choices||I.defaults)[result.choice]);}catch(e){message(e.message);return;}session.state.last=`${result.choice} 勝出（${data.counts[result.choice]} 票） · ${session.state.last}`;
 }
 if(['target','map','reset','mode','apply'].includes(kind))clearCounts();render();
}
$$('[data-command]').forEach(b=>b.onclick=()=>dispatch('action',{choice:b.dataset.command}));
$$('[data-mode]').forEach(b=>b.onclick=()=>dispatch('mode',{mode:b.dataset.mode}));
$$('[data-map]').forEach(b=>b.onclick=()=>dispatch('map',{map:b.dataset.map}));
target.onchange=()=>dispatch('target',{target:target.value});
$('#random').onclick=()=>{const choices=E.places.filter(p=>p.id!==session.state.target);dispatch('target',{target:choices[Math.floor(Math.random()*choices.length)].id});};
$('#reset').onclick=()=>dispatch('reset');$('#undo').onclick=()=>dispatch('undo');
$('#apply-vote').onclick=()=>{const c=counts();if(session.mode==='hands'){const w=E.winner(c);if(w.error){message(w.error);return;}}dispatch('apply',{counts:c,roundId:session.round?.id});};
$('#open-round').onclick=()=>dispatch('open');
$('#clear-votes').onclick=()=>{clearCounts();message('票數已清空，請重新投票。');};
$('#show-trail').onchange=e=>$('#trail').style.display=e.target.checked?'':'none';
$('#help').onclick=()=>$('#help-dialog').showModal();
$$('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{message('瀏覽器未能開全螢幕，可用瀏覽器嘅全螢幕功能。');}};
document.addEventListener('fullscreenchange',()=>{const label=document.fullscreenElement?'退出全螢幕':'全螢幕';$('#fullscreen').innerHTML='⛶ <span>'+label+'</span>';$('#fullscreen').setAttribute('aria-label',label);});
document.addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||document.querySelector('dialog[open]')||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;if(session.mode!=='direct')return;const c={ArrowLeft:'A',ArrowUp:'B',ArrowRight:'C',a:'A',b:'B',c:'C',A:'A',B:'B',C:'C'}[e.key];if(c){e.preventDefault();dispatch('action',{choice:c});}});
if(online){
 $('#device-tab').hidden=false;$('#join').hidden=false;$('#connection').textContent='裝置連線準備中';
 $('#join').onclick=async()=>{try{const r=await fetch('/api/join',{headers:{'X-Teacher-Key':teacherKey}});if(!r.ok)throw new Error();const j=await r.json();const box=$('#join-addresses');box.replaceChildren();j.urls.forEach(url=>{const a=document.createElement('a');a.className='join-url';a.href=url;a.textContent=url;a.target='_blank';a.rel='noopener';box.append(a);});if(j.qr){const img=new Image();img.src='/join-qr.svg';img.className='qr';img.alt='學生加入網址 QR code';box.append(img);}$('#join-dialog').showModal();}catch{message('未能取得加入網址。');}};
 async function poll(){try{const r=await fetch('/api/state',{cache:'no-store'});if(!r.ok)throw new Error();const j=await r.json();$('#connection').textContent='課堂伺服器已連接';if(!busy&&j.revision>lastRevision){session=j;lastRevision=j.revision;render();}}catch{$('#connection').textContent='連線中斷 · 請檢查伺服器';}}
 poll();setInterval(poll,900);
}
render();
