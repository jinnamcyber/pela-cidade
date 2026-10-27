'use strict';
(function(){
const P=MapPragmatics;let index=0,model=true,solved=false;
const select=$('#pragmatic-scene');P.scenes.forEach((s,i)=>select.add(new Option(`${i+1}. ${s.title}`,String(i))));
function render(){
 LessonAudio.stop();const s=P.scenes[index];select.value=String(index);$('#pragmatic-context').textContent=s.context;$('#pragmatic-lead').textContent=s.lead;$('#pragmatic-feedback').textContent='揀一句最切合情境嘅回應。';$('#pragmatic-feedback').className='';
 $('#pragmatic-dialogue').replaceChildren();$('#pragmatic-model').hidden=true;$('#pragmatic-options').replaceChildren();$('#pragmatic-options').hidden=false;$('#pragmatic-response-title').textContent='你會點回應？';
 s.options.forEach((text,i)=>{const row=document.createElement('div');row.className='pragmatic-option-row';const b=document.createElement('button');b.className='pragmatic-option';b.dataset.response=String(i);b.textContent=String.fromCharCode(65+i)+'　'+text;
 const listen=document.createElement('button');listen.className='response-listen';listen.textContent='▶';listen.setAttribute('aria-label','聽選項 '+String.fromCharCode(65+i));listen.onclick=()=>LessonAudio.say(text,b);
 b.onclick=()=>{const result=P.choose(s.id,i);$('#pragmatic-feedback').textContent=result.message;$('#pragmatic-feedback').classList.toggle('correct',result.ok);if(result.ok){solved=true;model=true;$('#pragmatic-options').hidden=true;$('#pragmatic-response-title').textContent='兩人對話試一次';showDialogue();b.classList.add('correct');$('#pragmatic-options').querySelectorAll('.pragmatic-option').forEach(x=>x.disabled=true);}else b.disabled=true;};row.append(b,listen);$('#pragmatic-options').append(row);});
}
function showDialogue(){
 $('#pragmatic-model').hidden=!solved;$('#pragmatic-dialogue').replaceChildren();if(!solved)return;
 P.dialogue(P.scenes[index].id).forEach((line,i)=>{const row=document.createElement('div');row.className='dialogue-line role-'+line.role;const role=document.createElement('b');role.textContent=line.role;const text=document.createElement('span');text.textContent=model?line.text:(i===0?'對方先開口':P.scenes[index].cues[i-1]);text.lang=model?'pt-PT':'zh-Hant';row.append(role,text);$('#pragmatic-dialogue').append(row);});
 $('#pragmatic-hide').textContent=model?'收起葡文，自己講':'顯示葡文';
}
select.onchange=()=>{index=Number(select.value);solved=false;render();};
$('#pragmatic-lead-listen').onclick=()=>LessonAudio.say(P.scenes[index].lead,$('#pragmatic-lead'),'B');
$('#pragmatic-hide').onclick=()=>{LessonAudio.stop();model=!model;showDialogue();};
$('#pragmatic-play').onclick=()=>{const rows=$$('#pragmatic-dialogue .dialogue-line');LessonAudio.sequence(P.dialogue(P.scenes[index].id).map((line,i)=>({...line,element:rows[i]})));};
$('#pragmatic-next').onclick=()=>{index=(index+1)%P.scenes.length;solved=false;render();};
render();
})();
