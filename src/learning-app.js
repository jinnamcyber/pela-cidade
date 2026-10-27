'use strict';
(function(){
const L=MapLearning,colors=['#4969ae','#188374','#bd5e3d'],letters=['A','B','C'];
let group=L.groups[0],selected=group.ids[0],tab='explore',questionIndex=0,solved=new Set(),firstTry=new Set(),attempted=false,finished=false,animation=null;
const pawn=$('#lesson-pawn'),canvas=$('#lesson-trail'),ctx=canvas.getContext('2d');
$('#lesson-art').src=mapImages.worksheet;$('#lesson-traveler').src=$('#facing img').src;
for(const g of L.groups)$('#explore-group').add(new Option(g.name,g.id));
function pct(p){const q=position('worksheet',p);return {left:q.x/1566*100+'%',top:q.y/950*100+'%'};}
function cancel(){if(animation){animation.cancel();animation=null;}pawn.getAnimations().forEach(a=>a.cancel());}
function place(s){Object.assign(pawn.style,pct(I.position(s)));pawn.dataset.node=s.node;pawn.dataset.heading=String(s.heading);pawn.setAttribute('aria-label','旅人面向'+['上方','右方','下方','左方'][s.heading]);$('.lesson-facing').style.transform=`rotate(${s.heading*90}deg)`;}
function clear(){cancel();ctx.clearRect(0,0,1566,950);$('#lesson-markers').replaceChildren();place(L.origin());}
function trail(s,color){
 const path=L.points(s).map(p=>position('worksheet',p));
 ctx.beginPath();path.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.lineCap='round';ctx.lineJoin='round';ctx.setLineDash([]);ctx.lineWidth=18;ctx.strokeStyle='#ffffffdd';ctx.stroke();ctx.lineWidth=10;ctx.strokeStyle=color;ctx.setLineDash([4,18]);ctx.stroke();ctx.setLineDash([]);
}
function marker(s,label,color,onClick){
 const el=document.createElement(onClick?'button':'span');el.className='lesson-marker';el.textContent=label;el.style.setProperty('--marker-color',color);Object.assign(el.style,pct(I.position(s)));el.setAttribute('aria-label',`${onClick?'選擇 ':''}${label} 停點`);if(onClick)el.onclick=onClick;$('#lesson-markers').append(el);return el;
}
function animate(s,color=colors[1]){
 cancel();place(L.origin());trail(s,color);
 const points=L.points(s),lengths=points.map((p,i)=>i?Math.hypot(p.x-points[i-1].x,p.y-points[i-1].y):0),total=lengths.reduce((a,b)=>a+b,0);
 let distance=0;const frames=points.map((p,i)=>{distance+=lengths[i];return {...pct(p),offset:total?distance/total:0};});
 if(frames.length===1)frames.push({...frames[0],offset:1});
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,duration=reduced?1:Math.max(650,Math.min(2600,total*3));
 animation=pawn.animate(frames,{duration,easing:'linear',fill:'forwards'});
 const current=animation;$('#lesson-map-note').textContent='旅人示範中…';
 animation.finished.then(()=>{if(animation!==current)return;place(s);current.cancel();animation=null;$('#lesson-map-note').textContent=L.explain(s.lastInstruction);}).catch(()=>{});
}
function explore(){
 clear();$('#explore-group').value=group.id;$('#explore-hint').textContent=group.hint;
 const ordinal=group.id==='ordinal';$('#ordinal-builder').hidden=!ordinal;$('#explore-choices').hidden=ordinal;
 if(ordinal){const [number,direction]=selected.split('-');$('#ordinal-number').value=number;$('#ordinal-direction').value=direction;$('#ordinal-phrase').textContent=I.get(selected).phrase;}
 $('#lesson-map-title').textContent='同一起點，唔同指令';$('#lesson-map-note').textContent='揀一句，先讀出嚟，再按「行一次」。';
 const list=$('#explore-choices');list.replaceChildren();
 for(const id of group.ids){const c=I.get(id),b=document.createElement('button');b.className='explore-choice';b.dataset.example=id;b.setAttribute('aria-pressed',String(id===selected));
 const icon=document.createElement('b');icon.textContent=c.icon;const text=document.createElement('span');text.textContent=c.phrase;const small=document.createElement('small');small.textContent=c.zh;b.append(icon,text,small);
 b.onclick=()=>{selected=id;explore();};list.append(b);}
 $('#explore-meaning').textContent=L.explain(selected);$('#explore-compare').hidden=group.id==='facing'||group.id==='street';
}
function predict(){
 clear();const q=L.questions[questionIndex];attempted=false;finished=false;
 $('#lesson-map-title').textContent='先估停點，再睇旅人行';$('#lesson-map-note').textContent='旅人由起點向上行。揀 A、B 或 C。';
 $('#predict-progress').textContent=`第 ${questionIndex+1} / ${L.questions.length} 題`;
 $('#predict-score').textContent=`已完成 ${solved.size} 題 · 一次答中 ${firstTry.size} 題`;
 $('#predict-phrase').textContent=I.get(q.command).phrase;$('#predict-feedback').textContent='讀一次指令，再望地圖上嘅三個停點。';$('#predict-feedback').className='';
 $('#predict-next').disabled=true;$('#predict-next').textContent=questionIndex===L.questions.length-1?'再玩一輪':'下一題';
 const options=$('#predict-options');options.replaceChildren();
 q.options.forEach((id,i)=>{const b=document.createElement('button');b.className='predict-option';b.dataset.answer=String(i);b.style.setProperty('--answer-color',colors[i]);b.textContent=letters[i];b.setAttribute('aria-label',`停喺 ${letters[i]}`);const pin=marker(L.result(id),letters[i],colors[i],()=>b.click());
 b.onclick=()=>{
  if(finished)return;
  if(L.answer(q.id,i)){
   finished=true;if(!solved.has(q.id)&&!attempted)firstTry.add(q.id);solved.add(q.id);b.classList.add('correct');b.setAttribute('aria-pressed','true');options.querySelectorAll('button').forEach(x=>x.disabled=true);$('#lesson-markers').querySelectorAll('button').forEach(x=>x.disabled=true);
   $('#predict-feedback').textContent='答中！一齊睇旅人點樣行。';$('#predict-feedback').className='correct';$('#predict-next').disabled=false;
   $('#predict-score').textContent=`已完成 ${solved.size} 題 · 一次答中 ${firstTry.size} 題`;animate(L.result(q.command),colors[i]);
  }else{attempted=true;b.disabled=true;pin.disabled=true;b.classList.add('retry');$('#predict-feedback').textContent=`再睇清楚。${q.hint} 可以再揀。`;}
 };options.append(b);});
}
function switchTab(next){
 tab=next;cancel();$$('[data-lesson-tab]').forEach(b=>{const on=b.dataset.lessonTab===tab;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;});
 $('#lesson-visual').hidden=tab==='build';$('#lesson-build').hidden=tab!=='build';$('#lesson-explore').hidden=tab!=='explore';$('#lesson-predict').hidden=tab!=='predict';
 if(tab==='explore')explore();if(tab==='predict')predict();
}
$$('[data-lesson-tab]').forEach((b,i)=>{b.onclick=()=>switchTab(b.dataset.lessonTab);b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=$$('[data-lesson-tab]'),index=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length;switchTab(tabs[index].dataset.lessonTab);tabs[index].focus();};});
$('#explore-group').onchange=()=>{group=L.groups.find(g=>g.id===$('#explore-group').value);selected=group.ids[0];explore();};
 for(const id of ['ordinal-number','ordinal-direction'])$('#'+id).onchange=()=>{selected=$('#ordinal-number').value+'-'+$('#ordinal-direction').value;explore();};
$('#explore-play').onclick=()=>{clear();animate(L.result(selected));};
$('#explore-compare').onclick=()=>{
 clear();const ids=group.id==='ordinal'?group.ids.filter(id=>id.endsWith(selected.endsWith('left')?'left':'right')):group.ids.slice(0,3);
 ids.forEach((id,i)=>{const s=L.result(id);trail(s,colors[i]);marker(s,letters[i],colors[i]);});
 $('#lesson-map-note').textContent=ids.map((id,i)=>`${letters[i]}：${I.get(id).phrase}`).join('　');
};
$('#predict-reveal').onclick=()=>{$('#predict-feedback').textContent=L.questions[questionIndex].hint;attempted=true;};
$('#predict-next').onclick=()=>{if(!finished)return;if(questionIndex===L.questions.length-1){questionIndex=0;solved=new Set();firstTry=new Set();}else questionIndex++;predict();};
$('#sentence-dialog').addEventListener('close',cancel);
window.previewSentence=id=>{id=id==='continue'?'forward':id;group=L.groups.find(g=>g.ids.includes(id));if(!group)return;selected=id;switchTab('explore');animate(L.result(id));};
// Reopening keeps the chosen activity, while each visual example restarts from the same origin.
$('#sentence-class').addEventListener('click',()=>{if(tab!=='build')switchTab(tab);});
explore();
})();
