'use strict';
(function(){
const manifest=JSON.parse($('#lesson-audio-manifest').textContent);let current=null,serial=0;
const status=$('#audio-status');
const boardStop=document.createElement('button');boardStop.textContent='■ 停止朗讀';boardStop.hidden=true;boardStop.className='board-audio-stop';$('.utility').append(boardStop);boardStop.onclick=stop;
function stop(){serial++;if(current){current.pause();current.removeAttribute('src');current.remove();current=null;}status.textContent='';boardStop.hidden=true;$$('.speaking').forEach(e=>e.classList.remove('speaking'));}
function play(text,element,token){
 const url=manifest[text];
 if(!url){status.textContent='呢句暫時冇錄音，請老師示範。';return Promise.resolve(false);}
 const audio=new Audio(url);audio.hidden=true;audio.id='active-lesson-audio';document.body.append(audio);current=audio;audio.playbackRate=$('#audio-slow').checked?.8:1;
 return new Promise(resolve=>{
  audio.onplaying=()=>{if(token!==serial)return;status.textContent='播放中：'+text;boardStop.hidden=false;if(element)element.classList.add('speaking');};
  const done=ok=>{if(element)element.classList.remove('speaking');audio.remove();if(token===serial){status.textContent=ok?'播放完畢。':'未能播放，請再按一次，或檢查裝置音量。';current=null;boardStop.hidden=true;}resolve(ok&&token===serial);};
  audio.onended=()=>done(true);audio.onerror=()=>done(false);audio.onpause=()=>{if(token!==serial)done(false);};audio.play().catch(()=>done(false));
 });
}
function say(text,element){stop();return play(text,element,serial);}
async function sequence(lines){stop();const token=serial;for(const line of lines){if(serial!==token)return;if(!await play(line.text,line.element,token))return;}}
window.LessonAudio={say,stop,sequence};$('#audio-stop').onclick=stop;
$('#audio-slow').onchange=()=>{if(current)current.playbackRate=$('#audio-slow').checked?.8:1;};
$('#sentence-dialog').addEventListener('close',stop);
$('#sentence-listen').onclick=()=>say(I.tasks[Number($('#sentence-task').value)].phrase);
for(const row of $$('.command-row')){const letter=row.querySelector('[data-command]').dataset.command,b=document.createElement('button');b.className='listen-command';b.textContent='▶';b.title='聽 '+letter+' 指令';b.setAttribute('aria-label','聽 '+letter+' 葡文指令');b.onclick=()=>say(I.get((session.choices||I.defaults)[letter]).phrase);row.append(b);}
})();
