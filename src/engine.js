/* Shared by the offline board and the classroom server. No external dependencies. */
(function(root){
'use strict';
const places=[
 {id:'escola',name:'Escola',phrase:'à escola',x:130,y:240,node:'w0'},
 {id:'museu',name:'Museu',phrase:'ao museu',x:1436,y:240,node:'e0'},
 {id:'mercado',name:'Mercado',phrase:'ao mercado',x:130,y:450,node:'w1'},
 {id:'biblioteca',name:'Biblioteca',phrase:'à biblioteca',x:1436,y:450,node:'e1'},
 {id:'jardim',name:'Jardim',phrase:'ao jardim',x:130,y:660,node:'w2'},
 {id:'cafe',name:'Café',phrase:'ao café',x:1436,y:660,node:'e2'},
 {id:'banco',name:'Banco',phrase:'ao banco',x:350,y:90,node:'n0'},
 {id:'cinema',name:'Cinema',phrase:'ao cinema',x:1210,y:90,node:'n2'},
 {id:'hospital',name:'Hospital',phrase:'ao hospital',x:350,y:845,node:'s0'},
 {id:'farmacia',name:'Farmácia',phrase:'à farmácia',x:1210,y:845,node:'s2'}
];
const nodes={}; const xs=[350,780,1210],ys=[240,450,660];
function add(id,x,y){nodes[id]={x,y,edges:{}};}
function link(a,b){const p=nodes[a],q=nodes[b];const h=p.x===q.x?(q.y<p.y?0:2):(q.x>p.x?1:3);p.edges[h]=b;q.edges[(h+2)%4]=a;}
for(let r=0;r<3;r++)for(let c=0;c<3;c++)add(`${c}${r}`,xs[c],ys[r]);
for(let r=0;r<3;r++){
 for(let c=0;c<2;c++)link(`${c}${r}`,`${c+1}${r}`);
 add('w'+r,255,ys[r]);add('e'+r,1310,ys[r]);link('w'+r,'0'+r);link('2'+r,'e'+r);
}
for(let c=0;c<3;c++){
 for(let r=0;r<2;r++)link(`${c}${r}`,`${c}${r+1}`);
 add('n'+c,xs[c],c===1?150:170);link('n'+c,c+'0');
 add('s'+c,xs[c],c===1?832:770);link(c+'2','s'+c);
}
const commands={A:'Vire à esquerda.',B:'Siga em frente.',C:'Vire à direita.'};
// Split each street at every crossing. A move always ends at the next real junction.
function expandedGraph(){
 const segments=[
  [350,170,350,770],[780,150,780,832],[1210,170,1210,770],
  ...ys.map(y=>[255,y,1310,y]),
  [565,240,565,660],[995,240,995,660],[350,345,780,345],[780,555,1210,555]
 ];
 const out={},coordinates=new Map();
 const names=new Map(Object.entries(nodes).map(([id,p])=>[p.x+','+p.y,id]));
 function point(x,y){const key=x+','+y;if(!coordinates.has(key)){const id=names.get(key)||`p${x}_${y}`;coordinates.set(key,id);out[id]={x,y,edges:{}};}return coordinates.get(key);}
 function on(x,y,s){return x>=Math.min(s[0],s[2])&&x<=Math.max(s[0],s[2])&&y>=Math.min(s[1],s[3])&&y<=Math.max(s[1],s[3]);}
 for(const a of segments){point(a[0],a[1]);point(a[2],a[3]);
  for(const b of segments)if((a[0]===a[2])!==(b[0]===b[2])){
   const x=a[0]===a[2]?a[0]:b[0],y=a[0]===a[2]?b[1]:a[1];
   if(on(x,y,a)&&on(x,y,b))point(x,y);
  }
 }
 for(const s of segments){
  const ids=Object.keys(out).filter(id=>on(out[id].x,out[id].y,s)).sort((a,b)=>out[a].x-out[b].x||out[a].y-out[b].y);
  for(let i=1;i<ids.length;i++){
   const a=out[ids[i-1]],b=out[ids[i]],h=a.x===b.x?2:1;
   a.edges[h]=ids[i];b.edges[(h+2)%4]=ids[i-1];
  }
 }
 return out;
}
const maps={worksheet:{name:'練習地圖',nodes},city:{name:'城市探險',nodes:expandedGraph()}};
function graph(s){return maps[s.map||'worksheet'].nodes;}
function initial(target='escola',map='city'){return {map,node:'s1',heading:0,target,path:['s1'],history:[],moves:0,last:'Vamos começar! 先講指令，再一齊出發。',arrived:false};}
function copy(s){return JSON.parse(JSON.stringify(s));}
function destination(id){return places.find(p=>p.id===id);}
function action(s,choice){
 if(!['A','B','C'].includes(choice))throw new Error('Invalid command');
 const next=copy(s);
 if(s.arrived){next.last='Já chegámos! 已到達，請選另一個目的地。';return next;}
 const streets=graph(s);
 if(choice==='B'&&!streets[s.node].edges[s.heading]){next.last='Não pode seguir em frente. 前面冇路，請轉向。';return next;}
 const {history,...snapshot}=copy(s);next.history.push(snapshot);
 if(choice==='A')next.heading=(s.heading+3)%4;
 if(choice==='C')next.heading=(s.heading+1)%4;
 if(choice==='B'){next.node=streets[s.node].edges[s.heading];next.path.push(next.node);next.moves++;}
 next.last=commands[choice];
 next.arrived=!!s.target&&destination(s.target).node===next.node;
 if(next.arrived)next.last='Chegámos! 到達'+destination(s.target).name+'！';
 return next;
}
function undo(s){if(!s.history.length)return s;const stack=s.history.slice();const previous=stack.pop();return {...previous,history:stack,last:'Voltámos um passo atrás. 已撤回上一步。'};}
function winner(counts){
 const values=['A','B','C'].map(k=>counts[k]);
 if(values.some(v=>!Number.isInteger(v)||v<0||v>999))return {error:'票數必須係 0–999 嘅整數。'};
 const max=Math.max(...values);if(max===0)return {error:'未有票數，請先投票。'};
 const top=['A','B','C'].filter(k=>counts[k]===max);
 return top.length===1?{choice:top[0]}:{error:'同票！人物暫時唔郁，請重新投票。',tie:true};
}
const api={places,nodes,maps,graph,commands,initial,action,undo,winner,destination};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MapEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this);
