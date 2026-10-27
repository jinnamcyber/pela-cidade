'use strict';
(function(){
let taskIndex=0,chosen=[],model=true,checked=false;
const taskSelect=$('#sentence-task');
I.tasks.forEach((t,i)=>{const o=new Option(`${i+1}. ${t.prompt}`,String(i));taskSelect.add(o);});
const selectors=$('#choice-selectors');
for(const k of ['A','B','C']){
 const label=document.createElement('label');label.textContent=k;
 const select=document.createElement('select');select.dataset.choiceSlot=k;select.setAttribute('aria-label',`投票 ${k} 指令`);
 for(const c of I.items.filter(c=>c.group!=='scene'))select.add(new Option(c.phrase,c.id));
 label.append(select);selectors.append(label);
}
const bank=$('#instruction-bank');
for(const [group,name] of [['walk','行幾遠，喺邊度停'],['turn','向邊轉，第幾條街'],['scene','街道生活情境']]){
 const heading=document.createElement('h3');heading.textContent=name;bank.append(heading);
 const grid=document.createElement('div');grid.className='instruction-grid';bank.append(grid);
 for(const c of I.items.filter(x=>x.group===group)){
  const button=document.createElement('button');button.className='instruction-card';button.dataset.instruction=c.id;
  const icon=document.createElement('b');icon.textContent=c.icon;
  const text=document.createElement('span');text.textContent=c.phrase;
  const small=document.createElement('small');small.textContent=c.zh;
  button.append(icon,text,small);
  button.onclick=()=>{if(c.id==='crosswalk'){showCrosswalk();return;}$('#commands-dialog').close();if(session.mode!=='direct'){message('先切到「直接操作」，再試一句完整指令。投票可以用上方設定更換三張牌。');return;}dispatch('instruction',{id:c.id});};
  grid.append(button);
 }
}
window.renderLanguage=()=>{
 if($('#commands-dialog').open)return;
 for(const s of $$('[data-choice-slot]'))if(document.activeElement!==s)s.value=(session.choices||I.defaults)[s.dataset.choiceSlot];
};
$('#command-library').onclick=()=>{renderLanguage();$('#commands-dialog').showModal();};
$('#save-choices').onclick=()=>{const choices=Object.fromEntries($$('[data-choice-slot]').map(s=>[s.dataset.choiceSlot,s.value]));dispatch('choices',{choices});$('#commands-dialog').close();};
function task(){return I.tasks[taskIndex];}
function feedback(text,success=false){$('#sentence-feedback').textContent=text;$('#sentence-feedback').classList.toggle('correct',success);}
function renderSentence(){
 const t=task();taskSelect.value=String(taskIndex);
 $('#sentence-prompt').textContent=t.prompt;
 $('#sentence-model').textContent='例句：'+t.phrase;$('#sentence-model').hidden=!model;
 $('#with-model').setAttribute('aria-pressed',String(model));$('#without-model').setAttribute('aria-pressed',String(!model));
 const answer=$('#sentence-answer');answer.replaceChildren();
 if(!chosen.length){const hint=document.createElement('span');hint.className='answer-placeholder';hint.textContent='點下面嘅詞塊，砌喺呢度。';answer.append(hint);}
 for(const [i,word] of chosen.entries()){
  const button=document.createElement('button');button.className='answer-word';button.textContent=word;button.title='移除呢一格';button.onclick=()=>{chosen.splice(i,1);checked=false;renderSentence();feedback('改好之後再核對。');};answer.append(button);
 }
 const wordBank=$('#word-bank');wordBank.replaceChildren();
 const order=t.chunks.map((text,index)=>({text,index})).sort((a,b)=>(a.index*7+3)%t.chunks.length-(b.index*7+3)%t.chunks.length);
 // Rotate a two-part sentence so the bank does not display the answer in order.
 if(order.every((c,i)=>c.index===i))order.push(order.shift());
 for(const part of order){
  const button=document.createElement('button');button.className='word-tile';button.textContent=part.text;
  const used=chosen.filter(w=>w===part.text).length>=t.chunks.filter((w,i)=>w===part.text&&i<=part.index).length;
  button.disabled=used;button.onclick=()=>{chosen.push(part.text);checked=false;renderSentence();feedback('砌好後，按「核對句子」。');};wordBank.append(button);
 }
 $('#sentence-undo').disabled=!chosen.length;$('#sentence-demo').disabled=!checked||!t.command;
 $('#sentence-demo').textContent=t.command==='crosswalk'?'行人線示範':t.command?'由起點試行':'呢句用嚟問路／說明位置';
}
function resetSentence(){chosen=[];checked=false;renderSentence();feedback('點詞塊，按次序砌一句。');}
$('#sentence-class').onclick=()=>{renderSentence();$('#sentence-dialog').showModal();};
taskSelect.onchange=()=>{taskIndex=Number(taskSelect.value);resetSentence();};
$('#with-model').onclick=()=>{model=true;renderSentence();};
$('#without-model').onclick=()=>{model=false;resetSentence();};
$('#sentence-undo').onclick=()=>{chosen.pop();checked=false;renderSentence();};
$('#sentence-reset').onclick=resetSentence;
$('#sentence-check').onclick=()=>{const result=I.check(task().id,chosen);checked=result.ok;renderSentence();feedback(result.message,result.ok);};
$('#sentence-next').onclick=()=>{taskIndex=(taskIndex+1)%I.tasks.length;resetSentence();};
$('#sentence-demo').onclick=()=>{if(!checked||!task().command)return;if(task().command==='crosswalk'){showCrosswalk();return;}$('#sentence-dialog').close();dispatch('demo',{id:task().command});};
$('#sentence-listen').onclick=()=>{
 if(!('speechSynthesis' in window)){feedback('呢個瀏覽器冇語音功能，請老師讀一次。');return;}
 const voices=speechSynthesis.getVoices(),voice=voices.find(v=>v.lang.toLowerCase()==='pt-pt');
 if(!voice){feedback('呢部裝置未有歐洲葡語聲線，請老師讀一次。');return;}
 speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(task().phrase);u.lang='pt-PT';u.voice=voice;u.rate=.8;speechSynthesis.speak(u);
};
function showCrosswalk(){
 const art=$('#facing img').src;$('.crosswalk-pawn').style.backgroundImage=`url("${art}")`;
 $('#crosswalk-dialog').showModal();
}
$('#crosswalk-play').onclick=()=>{
 const pawn=$('.crosswalk-pawn');pawn.getAnimations().forEach(a=>a.cancel());
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 pawn.animate([{top:'79%'},{top:'22%'}],{duration:reduced?1:2400,easing:'ease-in-out',fill:'forwards'});
};
renderLanguage();renderSentence();
})();
