(function(root){
'use strict';
const E=typeof module!=='undefined'&&module.exports?require('./engine'):root.MapEngine;
const items=[
 ['forward','Siga em frente.','向前行一段','走一段', 'walk','↑'],
 ['junction','Vá até ao cruzamento.','行到下一個路口停低','到路口','walk','⊞'],
 ['end','Continue até ao fim da rua.','經過路口，一直行到路盡頭','到盡頭','walk','⇥'],
 ['continue','Continue em frente.','繼續向前行一段','繼續行','walk','↑'],
 ['left','Vire à esquerda.','原地轉向左邊','左轉','turn','↰'],
 ['right','Vire à direita.','原地轉向右邊','右轉','turn','↱'],
 ['first-left','Vire na primeira rua à esquerda.','到前面第一條可轉左嘅街先轉向','第一條左','turn','1↰'],
 ['first-right','Vire na primeira rua à direita.','到前面第一條可轉右嘅街先轉向','第一條右','turn','1↱'],
 ['second-left','Vire na segunda rua à esquerda.','經過第一條，到第二條可轉左嘅街先轉向','第二條左','turn','2↰'],
 ['second-right','Vire na segunda rua à direita.','經過第一條，到第二條可轉右嘅街先轉向','第二條右','turn','2↱'],
 ['third-left','Vire na terceira rua à esquerda.','數到第三條可轉左嘅街先轉向','第三條左','turn','3↰'],
 ['third-right','Vire na terceira rua à direita.','數到第三條可轉右嘅街先轉向','第三條右','turn','3↱'],
 ['crossing','Atravesse o cruzamento.','經過路口，行到路口另一邊','穿過路口','walk','⇧'],
 ['mercado-right','Vire à direita na Rua do Mercado.','到 Rua do Mercado 先轉向右邊','指定街轉右','turn','↱'],
 ['central','Siga em frente pela Rua Central.','沿 Rua Central 向前行一段','沿指定街','walk','↑'],
 ['stop','Pare!','停低','停低','walk','■'],
 ['back','Volte para trás.','原地轉身，面向來路','轉身回頭','turn','↶'],
 ['crosswalk','Atravesse a rua na passadeira.','喺行人線由路邊行去對面','過馬路情境','scene','▤']
].map(([id,phrase,zh,short,group,icon])=>({id,phrase,zh,short,group,icon}));
const catalog=Object.fromEntries(items.map(x=>[x.id,x]));
const defaults={A:'left',B:'forward',C:'right'};
function get(id){return Object.hasOwn(catalog,id)?catalog[id]:null;}
function validateChoices(c){return c&&['A','B','C'].every(k=>get(c[k])&&c[k]!=='crosswalk');}
function position(s){
 const g=E.graph(s);if(!s.edge)return {x:g[s.node].x,y:g[s.node].y};const a=g[s.edge.a],b=g[s.edge.b];
 return {x:a.x+(b.x-a.x)*s.edge.t,y:a.y+(b.y-a.y)*s.edge.t};
}
function facing(a,b){return a.x===b.x?(b.y>a.y?2:0):(b.x>a.x?1:3);}
function run(state,id){
 const command=get(id);if(!command)throw new Error('指令無效。');
 if(id==='crosswalk')throw new Error('呢句請用「過馬路情境」示範。');
 const s=JSON.parse(JSON.stringify(state)),g=E.graph(s);
 if(s.arrived&&id!=='stop')throw new Error('已到達，請先揀另一個目的地或返回起點。');
 const start=JSON.stringify({node:s.node,heading:s.heading,edge:s.edge||null});
 function at(){return g[s.node];}
 function stepNode(){
  let next;
  if(s.edge){
   const edge=s.edge,h=facing(g[edge.a],g[edge.b]);
   if(s.heading===h)next=edge.b;
   else if(s.heading===(h+2)%4)next=edge.a;
   else throw new Error('而家喺兩個路口之間。先沿條街行到路口，先可以轉入另一條街。');
  }else next=at().edges[s.heading];
  if(!next)throw new Error('呢個方向已經冇路。試下轉向，或者用「轉身回頭」。');
  s.node=next;s.edge=null;if(s.path.at(-1)!==next)s.path.push(next);s.moves++;
  if(s.target&&E.destination(s.target).node===next)s.arrived=true;
 }
 function walk(distance){
  while(distance>0.001){
   if(!s.edge){const next=at().edges[s.heading];if(!next)throw new Error('呢個方向已到路盡頭，請轉向。');s.edge={a:s.node,b:next,t:0};}
   const edge=s.edge,a=g[edge.a],b=g[edge.b],length=Math.hypot(b.x-a.x,b.y-a.y),h=facing(a,b);
   if(s.heading!==h&&s.heading!==(h+2)%4)throw new Error('先沿條街行到路口，再轉入另一條街。');
   const sign=s.heading===h?1:-1,remaining=(sign===1?1-edge.t:edge.t)*length;
   if(distance<remaining-.001){edge.t+=sign*distance/length;distance=0;}
   else{distance-=remaining;stepNode();if(s.arrived)break;}
  }
 }
 function nextJunction(){
  for(let i=0;i<80;i++){stepNode();if(Object.keys(at().edges).length>=3)return;if(s.arrived)throw new Error('前面係路盡頭，唔係路口。試下「行到盡頭」。');}
  throw new Error('前面搵唔到路口。');
 }
 if(id==='left'||id==='right')s.heading=(s.heading+(id==='left'?3:1))%4;
 else if(id==='back')s.heading=(s.heading+2)%4;
 else if(id==='stop'){}
 else if(id==='forward'||id==='continue')walk(70);
 else if(id==='central'){
  const p=position(s);if(p.x!==780||![0,2].includes(s.heading))throw new Error('要先喺 Rua Central，並沿住條街嘅方向行。');walk(70);
 }
 else if(id==='junction')nextJunction();
 else if(id==='end'){
  if(!s.edge&&!at().edges[s.heading])throw new Error('已經喺路盡頭。可以轉身或者換方向。');
  for(let i=0;i<80;i++){stepNode();if(s.arrived||!at().edges[s.heading])break;}
 }
 else if(id==='crossing'){
  if(s.edge||Object.keys(at().edges).length<3)nextJunction();
  if(!at().edges[s.heading])throw new Error('呢個路口前面冇直路，請選擇轉向。');walk(45);
 }
 else if(id==='mercado-right'){
  let found=false;
  for(let i=0;i<80;i++){
   if(!s.edge&&at().y===450&&at().edges[(s.heading+1)%4]){s.heading=(s.heading+1)%4;found=true;break;}
   stepNode();
  }
  if(!found)throw new Error('沿住呢個方向去唔到 Rua do Mercado。');
 }
 else{
  const match=id.match(/^(first|second|third)-(left|right)$/);if(!match)throw new Error('指令無效。');
  const count={first:1,second:2,third:3}[match[1]],turn=match[2]==='left'?3:1;let seen=0,found=false;
  for(let i=0;i<80;i++){
   try{stepNode();}catch{throw new Error(`前面冇第 ${count} 條可以轉${turn===3?'左':'右'}嘅街，請換一句或返回起點。`);}
   if(at().edges[(s.heading+turn)%4]&&++seen===count){s.heading=(s.heading+turn)%4;found=true;break;}
  }
  if(!found)throw new Error('前面搵唔到指定嘅街。');
 }
 if(id!=='stop'&&start!==JSON.stringify({node:s.node,heading:s.heading,edge:s.edge||null})){
  const {history,...previous}=JSON.parse(JSON.stringify(state));s.history=[...state.history,previous];
 }
 s.last=command.phrase+' '+command.zh;
 if(s.arrived)s.last='Chegámos! 到達 '+E.destination(s.target).name+'！';
 s.lastInstruction=id;
 return s;
}
const tasks=[
 ['forward','向前行一段',['Siga','em frente.'],'forward'],
 ['left','叫旅人轉向左邊',['Vire','à esquerda.'],'left'],
 ['junction','行到路口就停低',['Vá','até ao','cruzamento.'],'junction'],
 ['end','經過路口，一直行到盡頭',['Continue','até ao fim','da rua.'],'end'],
 ['first-right','前面第一條右街先轉',['Vire','na primeira rua','à direita.'],'first-right'],
 ['second-left','前面第二條左街先轉',['Vire','na segunda rua','à esquerda.'],'second-left'],
 ['crossing','穿過十字路口去另一邊',['Atravesse','o cruzamento.'],'crossing'],
 ['crosswalk','喺行人線過馬路',['Atravesse','a rua','na passadeira.'],'crosswalk'],
 ['central','沿 Rua Central 向前行',['Siga','em frente','pela Rua Central.'],'central'],
 ['named','到 Rua do Mercado 先轉右',['Vire','à direita','na Rua do Mercado.'],'mercado-right'],
 ['ask','有禮貌咁問點去學校',['Desculpe,','como posso ir','para a escola?'],null],
 ['location','話畀對方知咖啡店喺街尾',['O café','fica','no fim da rua.'],null]
].map(([id,prompt,chunks,command])=>({id,prompt,chunks,command,phrase:chunks.join(' ')}));
function check(taskId,chosen){
 const t=tasks.find(t=>t.id===taskId);if(!t||!Array.isArray(chosen))return {ok:false,message:'先揀一個任務。'};
 if(chosen.length!==t.chunks.length)return {ok:false,message:'仲有詞塊未用到。試下將佢哋砌成一句。'};
 const index=chosen.findIndex((c,i)=>c!==t.chunks[i]);
 if(index>=0)return {ok:false,message:`睇下第 ${index+1} 格。呢度要用「${t.chunks[index]}」。再試一次。`};
 return {ok:true,message:'句子砌好喇！讀畀同學聽，再試下人物會點行。'};
}
const api={items,catalog,get,defaults,validateChoices,run,position,tasks,check};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MapInstructions=api;
})(typeof globalThis!=='undefined'?globalThis:this);
