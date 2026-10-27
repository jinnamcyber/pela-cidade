const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../src/engine'),I=require('../src/instructions');
const start=()=>E.initial('','worksheet');
test('forward, next junction and street end have three distinct stopping positions',()=>{
 const s=start(),a=I.run(s,'forward'),b=I.run(s,'junction'),c=I.run(s,'end');
 assert.deepEqual(I.position(a),{x:780,y:762});assert.equal(a.node,'s1');assert.ok(a.edge);
 assert.equal(b.node,'12');assert.equal(b.edge,null);
 assert.equal(c.node,'n1');assert.deepEqual(c.path,['s1','12','11','10','n1']);
 assert.equal(s.edge,undefined);assert.deepEqual(s.path,['s1']);
});
test('a partial walk can continue exactly to the next junction and undo as one command',()=>{
 const a=I.run(start(),'forward'),b=I.run(a,'junction');assert.equal(b.node,'12');
 const undo=E.undo(b);assert.deepEqual(undo.edge,a.edge);assert.equal(undo.node,a.node);
 assert.equal(b.history.length,2);
});
test('ordinal turns count eligible streets and obey traveler heading',()=>{
 let s=I.run(start(),'second-left');assert.equal(s.node,'11');assert.equal(s.heading,3);
 s=I.run(s,'junction');assert.equal(s.node,'01');s=I.run(s,'right');s=I.run(s,'end');assert.equal(s.node,'n0');
 const first=I.run(start(),'first-right');assert.equal(first.node,'12');assert.equal(first.heading,1);
 const third=I.run(start(),'third-right');assert.equal(third.node,'10');
});
test('new city side streets change ordinal counting',()=>{
 const a=I.run(E.initial('','city'),'second-right');assert.equal(a.node,'p780_555');assert.equal(a.heading,1);
 const b=I.run(a,'junction');assert.equal(b.node,'p995_555');
});
test('crossing passes the junction and stops beyond it, not at the junction',()=>{
 const s=I.run(start(),'crossing');assert.equal(s.node,'12');assert.ok(s.edge);assert.deepEqual(I.position(s),{x:780,y:615});
});
test('unreachable instructions are atomic and a traveler cannot walk into buildings',()=>{
 const s=I.run(start(),'forward'),a=I.run(s,'left'),before=JSON.stringify(a);
 assert.throws(()=>I.run(a,'forward'),/先沿/);assert.equal(JSON.stringify(a),before);
 assert.throws(()=>I.run(I.run(start(),'first-right'),'second-right'));
 const end=I.run(start(),'end');assert.throws(()=>I.run(end,'junction'));
});
test('named street, stop and turn around have corresponding behavior',()=>{
 const s=I.run(start(),'mercado-right');assert.equal(s.node,'11');assert.equal(s.heading,1);
 const a=I.run(start(),'forward'),b=I.run(a,'back'),c=I.run(b,'forward');assert.deepEqual(I.position(c),{x:780,y:832});assert.equal(c.edge,null);
 assert.deepEqual(I.position(I.run(a,'stop')),I.position(a));
 assert.throws(()=>I.run(start(),'crosswalk'),/情境/);assert.throws(()=>I.run(start(),'toString'));
});
test('sentence workshop checks word order, gives retry hints and covers source commands',()=>{
 assert.equal(I.tasks.length,12);
 for(const t of I.tasks){assert.equal(I.check(t.id,t.chunks).ok,true);assert.equal(I.check(t.id,[...t.chunks].reverse()).ok,false);assert.equal(I.check(t.id,[]).ok,false);}
 for(const id of ['forward','junction','end','first-right','second-left','crossing','central','mercado-right'])assert.ok(I.run(start(),id));
 assert.equal(I.validateChoices({A:'forward',B:'junction',C:'end'}),true);
 assert.equal(I.validateChoices({A:'crosswalk',B:'junction',C:'end'}),false);
});
