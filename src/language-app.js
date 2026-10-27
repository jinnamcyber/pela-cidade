'use strict';
(function(){
let taskIndex=0,chosen=[],model=true,checked=false;
const taskSelect=$('#sentence-task');
function taskGroup(t){
 if(t.command)return 'move';
 return ['location','near','beside','opposite','between','on-right','on-left','far','at-end'].includes(t.id)?'place':'ask';
}
function filterTasks(){
 const filter=$('#sentence-group').value,available=I.tasks.map((t,i)=>({t,i})).filter(({t})=>filter==='all'||taskGroup(t)===filter);
 taskSelect.replaceChildren();for(const {t,i} of available)taskSelect.add(new Option(t.prompt,String(i)));
 if(!available.some(x=>x.i===taskIndex))taskIndex=available[0].i;
}
filterTasks();
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
 $('#sentence-context').textContent=taskGroup(t)==='place'?'口語情境例句：用嚟練習描述位置，唔係呢張城市地圖嘅資料。':taskGroup(t)==='ask'?'兩人一組：一人問路／求助，另一人用帶路指令回答。':'留意：動詞講做咩，後面嘅詞塊講方向或停點。';
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
 $('#sentence-demo').textContent=t.command==='crosswalk'?'行人線示範':t.command?'睇人物示範':'呢句用嚟問路／說明位置';
}
function resetSentence(){chosen=[];checked=false;renderSentence();feedback('點詞塊，按次序砌一句。');}
$('#sentence-class').onclick=()=>{renderSentence();$('#sentence-dialog').showModal();};
taskSelect.onchange=()=>{if(window.LessonAudio)LessonAudio.stop();taskIndex=Number(taskSelect.value);resetSentence();};
$('#sentence-group').onchange=()=>{filterTasks();resetSentence();};
$('#with-model').onclick=()=>{model=true;renderSentence();};
$('#without-model').onclick=()=>{model=false;resetSentence();};
$('#sentence-undo').onclick=()=>{chosen.pop();checked=false;renderSentence();};
$('#sentence-reset').onclick=resetSentence;
$('#sentence-check').onclick=()=>{const result=I.check(task().id,chosen);checked=result.ok;renderSentence();feedback(result.message,result.ok);};
$('#sentence-next').onclick=()=>{const options=Array.from(taskSelect.options).map(o=>Number(o.value));taskIndex=options[(options.indexOf(taskIndex)+1)%options.length];resetSentence();};
$('#sentence-demo').onclick=()=>{if(!checked||!task().command)return;if(task().command==='crosswalk'){showCrosswalk();return;}window.previewSentence(task().command);};
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
