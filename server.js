'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const {execFile}=require('node:child_process');
const E=require('./src/engine');
const I=require('./src/instructions');

function createClassroom(options={}){
 const teacherKey=options.teacherKey||crypto.randomBytes(24).toString('hex');
 const room=crypto.randomBytes(4).toString('hex');
 const cookieName='mapa_'+room;
 const voters=new Set();
 let votes=new Map(),roundNumber=0;
 let session={state:E.initial(),mode:'direct',round:null,revision:0,choices:{...I.defaults}};
 let urls=[];
 function snapshot(){return {...session,choiceLabels:Object.fromEntries(['A','B','C'].map(k=>[k,I.get(session.choices[k])])),round:session.round?{...session.round,counts:{...session.round.counts}}:null};}
 function closeRound(){if(session.round)session.round.open=false;}
 function fail(message,status=400){const e=new Error(message);e.status=status;throw e;}
 function teacher(data){
  const s=session;
  switch(data.kind){
   case 'mode':
    if(!['direct','hands','devices'].includes(data.mode))fail('操作方式無效。');
    s.mode=data.mode;closeRound();s.round=null;break;
   case 'target':
    if(data.target!==''&&!E.destination(data.target))fail('目的地無效。');
    s.state=E.initial(data.target,s.state.map);closeRound();s.round=null;break;
   case 'map':
    if(!Object.hasOwn(E.maps,data.map))fail('地圖無效。');
    s.state=E.initial(s.state.target,data.map);closeRound();s.round=null;break;
   case 'reset':s.state=E.initial(s.state.target,s.state.map);closeRound();s.round=null;break;
   case 'undo':s.state=E.undo(s.state);closeRound();s.round=null;break;
   case 'action':
    if(s.mode!=='direct'||!['A','B','C'].includes(data.choice))fail('請用目前操作方式執行指令。');
    try{s.state=I.run(s.state,s.choices[data.choice]);}catch(e){fail(e.message);}break;
   case 'choices':
    if(!I.validateChoices(data.choices))fail('請選擇三句地圖指令。');
    s.choices={...data.choices};closeRound();s.round=null;break;
   case 'instruction':
    if(s.mode!=='direct')fail('請先切到直接操作，再試行句子。');
    try{s.state=I.run(s.state,data.id);}catch(e){fail(e.message);}break;
   case 'demo':
    if(!I.get(data.id)||data.id==='crosswalk')fail('指令無效。');
    try{s.state=I.run(E.initial('','worksheet'),data.id);}catch(e){fail(e.message);}closeRound();s.round=null;s.mode='direct';break;
   case 'open':
    if(s.mode!=='devices'||s.state.arrived||s.round?.open)fail('而家未能開新一輪。');
    votes=new Map();
    s.round={id:++roundNumber,open:true,counts:{A:0,B:0,C:0},total:0,outcome:null};
    s.state.last='投票開始！請先討論，再揀 A、B 或 C。';break;
   case 'apply':{
    if(s.state.arrived)fail('已到達，請開始新任務。');
    if(s.mode==='direct')fail('請先選擇投票方式。');
    const devices=s.mode==='devices';
    if(devices&&(!s.round?.open||s.round.id!==data.roundId))fail('呢輪已截止，請開新一輪。',409);
    const counts=devices?s.round.counts:data.counts;
    if(!counts||typeof counts!=='object')fail('請輸入票數。');
    const result=E.winner(counts);
    if(devices)closeRound();
    if(result.error){s.state.last=result.error;if(s.round)s.round.outcome=null;}
    else{
     try{s.state=I.run(s.state,s.choices[result.choice]);}catch(e){s.state.last=e.message;s.revision++;return snapshot();}
     s.state.last=`${result.choice} 勝出（${counts[result.choice]} 票） · ${s.state.last}`;
     if(devices)s.round.outcome=result.choice;
    }
    break;
   }
   default:fail('操作無效。');
  }
  s.revision++;return snapshot();
 }
 function json(res,status,data,extra={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...extra});res.end(JSON.stringify(data));}
 async function body(req){
  let raw='';for await(const part of req){raw+=part;if(raw.length>4096)fail('資料太長。',413);}
  try{return JSON.parse(raw);}catch{fail('資料格式無效。');}
 }
 function studentId(req){
  const cookies=Object.fromEntries((req.headers.cookie||'').split(';').map(s=>s.trim().split('=')));
  return voters.has(cookies[cookieName])?cookies[cookieName]:null;
 }
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('X-Frame-Options','DENY');
  try{
   const url=new URL(req.url,'http://localhost');
   const teacherAuth=req.headers['x-teacher-key']===teacherKey;
   if(req.method==='POST'){
    // JSON and a same-origin request prevent another web page from submitting classroom actions.
    if(!String(req.headers['content-type']).startsWith('application/json'))fail('請用課堂頁面操作。',415);
    if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`)fail('來源無效。',403);
   }
   if(req.method==='GET'&&url.pathname==='/teacher'){
    if(url.searchParams.get('key')!==teacherKey)fail('請用啟動視窗顯示嘅老師網址。',403);
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
    return res.end(fs.readFileSync(path.join(__dirname,'指路互動地圖.html')));
   }
   if(req.method==='GET'&&url.pathname==='/vote'){
    if(url.searchParams.get('room')!==room)fail('加入網址已失效，請用老師今次提供嘅網址。',403);
    let id=studentId(req);
    if(!id){id=crypto.randomBytes(20).toString('hex');voters.add(id);res.setHeader('Set-Cookie',`${cookieName}=${id}; HttpOnly; SameSite=Lax; Path=/`);}
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
    return res.end(fs.readFileSync(path.join(__dirname,'src/student.html')));
   }
   if(req.method==='GET'&&url.pathname==='/api/state')return json(res,200,snapshot());
   if(req.method==='GET'&&url.pathname==='/api/join'){
    if(!teacherAuth)fail('只限老師操作。',403);
    return json(res,200,{urls,qr:false});
   }
   if(req.method==='POST'&&url.pathname==='/api/teacher'){
    if(!teacherAuth)fail('只限老師操作。',403);
    return json(res,200,teacher(await body(req)));
   }
   if(req.method==='GET'&&url.pathname==='/api/student'){
    const id=studentId(req);if(!id)fail('請重新用老師提供嘅網址加入。',403);
    return json(res,200,{...snapshot(),myChoice:session.round?votes.get(id)||null:null});
   }
   if(req.method==='POST'&&url.pathname==='/api/vote'){
    const id=studentId(req);if(!id)fail('請重新加入課堂。',403);
    const data=await body(req),r=session.round;
    if(session.mode!=='devices'||!r?.open||r.id!==data.roundId)fail('呢輪已截止，等老師開新一輪。',409);
    if(!['A','B','C'].includes(data.choice))fail('請揀 A、B 或 C。');
    const previous=votes.get(id);if(previous)r.counts[previous]--;
    votes.set(id,data.choice);r.counts[data.choice]++;r.total=votes.size;session.revision++;
    return json(res,200,{...snapshot(),myChoice:data.choice});
   }
   fail('請用老師提供嘅課堂網址。',404);
  }catch(e){json(res,e.status||500,{error:e.status?e.message:'伺服器未能完成操作，請重試。'});}
 });
 function setUrls(port){
  const ips=Object.values(os.networkInterfaces()).flat().filter(n=>n.family==='IPv4'&&!n.internal).map(n=>n.address);
  urls=[...new Set(ips)].map(ip=>`http://${ip}:${port}/vote?room=${room}`);
  if(!urls.length)urls=[`http://localhost:${port}/vote?room=${room}`];
 }
 return {server,teacherKey,room,setUrls,snapshot,studentUrls:()=>urls};
}

if(require.main===module){
 const classroom=createClassroom({teacherKey:process.env.MAPA_TEACHER_KEY});
 const port=Number(process.env.MAPA_PORT||8765);
 classroom.server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`連接埠 ${port} 已使用。可用 MAPA_PORT=8766 node server.js 重開。`:e.message);process.exitCode=1;});
 classroom.server.listen(port,'0.0.0.0',()=>{
  classroom.setUrls(classroom.server.address().port);
  const teacherUrl=`http://localhost:${port}/teacher?key=${classroom.teacherKey}`;
  console.log('\n指路互動地圖已開啟。保持呢個視窗開住。\n');
  console.log('老師控制頁：'+teacherUrl);
  console.log('\n學生同電腦連同一個 Wi-Fi，開以下網址：');
  classroom.studentUrls().forEach(u=>console.log(u));
  console.log('\n按 Ctrl+C 關閉。重新啟動後，請學生用新網址加入。\n');
  if(!process.argv.includes('--no-open')&&process.platform==='darwin')execFile('open',[teacherUrl],()=>{});
 });
}
module.exports={createClassroom};
