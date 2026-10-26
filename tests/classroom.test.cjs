const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../src/engine');
const {createClassroom}=require('../server');

test('relative turns, moving to the next junction, blocked road and undo',()=>{
 let s=E.initial('','worksheet');
 s=E.action(s,'A');assert.equal(s.node,'s1');assert.equal(s.heading,3);
 const blocked=E.action(s,'B');assert.equal(blocked.node,'s1');assert.equal(blocked.history.length,1);
 s=E.action(s,'C');s=E.action(s,'B');assert.equal(s.node,'12');
 s=E.action(s,'C');s=E.action(s,'B');assert.equal(s.node,'22');
 s=E.action(s,'C');s=E.action(s,'B');assert.equal(s.node,'s2');
 s=E.undo(s);assert.equal(s.node,'22');assert.equal(s.heading,2);assert.equal(s.path.at(-1),'22');
 assert.equal(s.arrived,false);
});
test('worksheet route to Museu, Hospital, Banco and Biblioteca remains valid',()=>{
 for(const [target,route] of [
  ['museu','BCBABBCB'],
  ['hospital','BABAB'],
  ['banco','BBABCBB'],
  ['biblioteca','BCBABCB']
 ]){
  let s=E.initial(target,'worksheet');for(const c of route)s=E.action(s,c);
  assert.equal(s.node,E.destination(target).node,target);assert.equal(s.arrived,true,target);
 }
});
test('both maps connect all ten destinations, trigger arrival and can be undone',()=>{
 for(const map of Object.keys(E.maps))for(const place of E.places){
  const streets=E.maps[map].nodes;
  const queue=[{node:'s1',heading:0,route:''}],seen=new Set();let route;
  while(queue.length){
   const s=queue.shift(),id=s.node+':'+s.heading;if(seen.has(id))continue;seen.add(id);
   if(s.node===place.node){route=s.route;break;}
   queue.push({node:s.node,heading:(s.heading+3)%4,route:s.route+'A'},{node:s.node,heading:(s.heading+1)%4,route:s.route+'C'});
   const next=streets[s.node].edges[s.heading];if(next)queue.push({node:next,heading:s.heading,route:s.route+'B'});
  }
  assert.ok(route,place.id);let s=E.initial(place.id,map);
  for(const c of route)s=E.action(s,c);
  assert.equal(s.arrived,true);assert.equal(E.action(s,'B').node,place.node);
  assert.equal(E.undo(s).arrived,false);
 }
});
test('expanded city has additional real junctions and no move skips a junction',()=>{
 const city=E.maps.city.nodes;
 assert.equal(Object.keys(E.maps.worksheet.nodes).length,21);
 assert.equal(Object.keys(city).length,33);
 let s=E.initial('','city');s=E.action(s,'B');s=E.action(s,'B');
 assert.equal(s.node,'p780_555');s=E.action(s,'C');s=E.action(s,'B');assert.equal(s.node,'p995_555');
 s=E.action(s,'A');s=E.action(s,'B');assert.equal(s.node,'p995_450');
 for(const [id,p] of Object.entries(city))for(const [h,next] of Object.entries(p.edges)){
  const q=city[next];assert.equal(q.edges[(Number(h)+2)%4],id);
  assert.ok(p.x===q.x||p.y===q.y);
  for(const [other,r] of Object.entries(city))if(other!==id&&other!==next){
   const inside=p.x===q.x?r.x===p.x&&r.y>Math.min(p.y,q.y)&&r.y<Math.max(p.y,q.y):r.y===p.y&&r.x>Math.min(p.x,q.x)&&r.x<Math.max(p.x,q.x);
   assert.equal(inside,false,`${id} skips ${other}`);
  }
 }
 assert.equal(E.undo(s).map,'city');
});
test('manual voting rejects ties, empty, fractional and negative counts',()=>{
 assert.equal(E.winner({A:2,B:8,C:1}).choice,'B');
 for(const c of [{A:0,B:0,C:0},{A:3,B:3,C:0},{A:-1,B:2,C:0},{A:1.2,B:3,C:0},{A:null,B:1,C:0}])assert.ok(E.winner(c).error);
});

test('classroom HTTP flow: authority, changed votes, ties, stale votes, reset and repeat confirmation',async t=>{
 const app=createClassroom();await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 t.after(()=>new Promise(r=>app.server.close(r)));
 const base='http://127.0.0.1:'+app.server.address().port;app.setUrls(app.server.address().port);
 async function get(url,headers={}){const r=await fetch(base+url,{headers});return {status:r.status,data:await r.json()};}
 async function post(url,data,headers={}){const r=await fetch(base+url,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(data)});return {status:r.status,data:await r.json()};}
 async function teacher(kind,data={}){const r=await post('/api/teacher',{kind,...data},{'X-Teacher-Key':app.teacherKey});assert.equal(r.status,200,JSON.stringify(r.data));return r.data;}
 async function join(){const r=await fetch(base+'/vote?room='+app.room);assert.equal(r.status,200);await r.text();return {Cookie:r.headers.get('set-cookie').split(';')[0]};}
 const one=await join(),two=await join();
 assert.equal((await post('/api/teacher',{kind:'reset'})).status,403);
 assert.equal((await post('/api/vote',{choice:'A',roundId:1})).status,403);
 assert.equal(JSON.stringify((await get('/api/state')).data).includes(app.teacherKey),false);
 assert.equal((await get('/api/join')).status,403);
 await teacher('mode',{mode:'devices'});
 let s=await teacher('open'),id=s.round.id;
 assert.equal((await post('/api/vote',{choice:'B',roundId:id},one)).status,200);
 assert.equal((await post('/api/vote',{choice:'A',roundId:id},one)).status,200);
 let r=await post('/api/vote',{choice:'B',roundId:id},two);
 assert.deepEqual(r.data.round.counts,{A:1,B:1,C:0});assert.equal(r.data.round.total,2);
 s=await teacher('apply',{roundId:id});assert.equal(s.state.node,'s1');assert.equal(s.state.heading,0);assert.equal(s.round.open,false);assert.match(s.state.last,/同票/);
 assert.equal((await post('/api/vote',{choice:'C',roundId:id},one)).status,409);
 assert.equal((await post('/api/teacher',{kind:'apply',roundId:id},{'X-Teacher-Key':app.teacherKey})).status,409);
 s=await teacher('open');assert.ok(s.round.id>id);id=s.round.id;
 await post('/api/vote',{choice:'B',roundId:id},one);await post('/api/vote',{choice:'B',roundId:id},two);
 s=await teacher('apply',{roundId:id});assert.equal(s.state.node,'12');assert.equal(s.round.outcome,'B');
 assert.equal((await get('/api/student',one)).data.myChoice,'B');
 s=await teacher('undo');assert.equal(s.state.node,'s1');assert.equal(s.round,null);
 s=await teacher('open');id=s.round.id;
 s=await teacher('apply',{roundId:id});assert.equal(s.state.node,'s1');assert.match(s.state.last,/未有票數/);
 s=await teacher('open');id=s.round.id;await teacher('reset');
 assert.equal((await post('/api/vote',{choice:'B',roundId:id},one)).status,409);
 s=await teacher('open');id=s.round.id;s=await teacher('map',{map:'worksheet'});assert.equal(s.state.map,'worksheet');assert.equal(s.round,null);
 assert.equal((await post('/api/vote',{choice:'B',roundId:id},one)).status,409);
 await teacher('mode',{mode:'hands'});s=await teacher('apply',{counts:{A:0,B:10,C:1}});assert.equal(s.state.node,'12');
 await teacher('mode',{mode:'direct'});s=await teacher('action',{choice:'C'});assert.equal(s.state.heading,1);
 assert.equal((await post('/api/teacher',{kind:'target',target:'missing'},{'X-Teacher-Key':app.teacherKey})).status,400);
 assert.equal((await post('/api/teacher',{kind:'reset'},{'X-Teacher-Key':app.teacherKey,Origin:'https://another.example'})).status,403);
});
