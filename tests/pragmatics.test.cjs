const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const P=require('../src/pragmatics'),I=require('../src/instructions');
test('eight pragmatic situations have one appropriate response and a complete model dialogue',()=>{
 assert.equal(P.scenes.length,8);assert.equal(new Set(P.scenes.map(s=>s.id)).size,8);
 for(const s of P.scenes){assert.equal(s.options.filter((_,i)=>P.choose(s.id,i).ok).length,1);assert.deepEqual(P.dialogue(s.id).map(x=>x.role),['B','A','B','A']);assert.equal(P.dialogue(s.id)[1].text,s.options[s.correct]);assert.equal(s.cues.length,3);}
 assert.equal(P.choose('missing',0).ok,false);assert.deepEqual(P.dialogue('missing'),[]);
});
test('bundled audio covers every instruction, sentence and pragmatic dialogue without empty clips',()=>{
 const manifest=require('../assets/audio/manifest.json'),phrases=[...I.items.map(x=>x.phrase),...I.tasks.map(x=>x.phrase),...P.scenes.flatMap(s=>[s.lead,...s.options,s.reply,s.end])];
 for(const phrase of phrases){const file=manifest[phrase];assert.ok(file,phrase);assert.match(file,/^assets\/audio\/[a-f0-9]{16}\.m4a$/);const audio=fs.readFileSync(path.join(__dirname,'..',file));assert.ok(audio.length>5000,phrase);assert.equal(audio.toString('ascii',4,8),'ftyp');}
});
test('neural voice bundle includes distinct European Portuguese partner recordings for all B turns',()=>{
 const manifest=require('../assets/audio/manifest.json'),source=require('../assets/audio/provenance.json');
 assert.equal(source.voiceA,'pt-PT-RaquelNeural');assert.equal(source.voiceB,'pt-PT-DuarteNeural');assert.equal(source.locale,'pt-PT');assert.equal(source.synthetic,true);assert.equal(source.clips,Object.keys(manifest).length);
 for(const scene of P.scenes)for(const phrase of [scene.lead,scene.reply]){
  const partner=manifest['B|'+phrase];assert.ok(partner,phrase);assert.notEqual(partner,manifest[phrase]);assert.ok(fs.statSync(path.join(__dirname,'..',partner)).size>5000);
 }
});
