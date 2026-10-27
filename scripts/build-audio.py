"""Bundle European Portuguese neural speech with edge-tts (pip install edge-tts).

Only fixed public lesson phrases are submitted. No credentials or student audio.
Writes the manifest only after every clip succeeds, preserving the previous set
on a failed generation. Requires macOS afconvert for the existing M4A format.
"""
from pathlib import Path
import asyncio,hashlib,json,shutil,subprocess,tempfile
import edge_tts
ROOT=Path(__file__).resolve().parents[1]
NODE=shutil.which('node')
if not NODE:raise RuntimeError('Node.js is required to read the lesson catalog.')
VOICE_A='pt-PT-RaquelNeural'
VOICE_B='pt-PT-DuarteNeural'
RATE='-5%'
code="const I=require('./src/instructions'),P=require('./src/pragmatics');console.log(JSON.stringify({phrases:[...I.items.map(x=>x.phrase),...I.tasks.map(x=>x.phrase),...P.scenes.flatMap(s=>[s.lead,...s.options,s.reply,s.end])],partner:P.scenes.flatMap(s=>[s.lead,s.reply])}));"
source=json.loads(subprocess.check_output([NODE,'-e',code],cwd=ROOT))
folder=ROOT/'assets/audio';folder.mkdir(parents=True,exist_ok=True)
manifest_path=folder/'manifest.json';old=json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
jobs=[(phrase,phrase,VOICE_A) for phrase in sorted(set(source['phrases']))]+[('B|'+phrase,phrase,VOICE_B) for phrase in sorted(set(source['partner']))]
manifest={};limit=asyncio.Semaphore(3)
async def make(key,phrase,voice):
 name=hashlib.sha256((voice+'|'+RATE+'|'+phrase).encode()).hexdigest()[:16]+'.m4a';out=folder/name
 async with limit:
  if not out.exists() or out.stat().st_size<5000:
   for attempt in range(3):
    try:
     with tempfile.TemporaryDirectory(prefix='pela-cidade-neural-') as temp:
      mp3=Path(temp)/'voice.mp3';converted=Path(temp)/'voice.m4a'
      await asyncio.wait_for(edge_tts.Communicate(phrase,voice=voice,rate=RATE).save(str(mp3)),timeout=45)
      subprocess.run(['/usr/bin/afconvert','-f','m4af','-d','aac ','-b','64000',str(mp3),str(converted)],check=True,capture_output=True)
      if converted.stat().st_size<5000:raise RuntimeError('Empty speech: '+phrase)
      info=subprocess.check_output(['/usr/bin/afinfo',str(converted)],text=True)
      if 'estimated duration: 0.000000' in info:raise RuntimeError('Zero-duration speech: '+phrase)
      converted.replace(out)
     break
    except Exception:
     if attempt==2:raise
     await asyncio.sleep(attempt+1)
  manifest[key]='assets/audio/'+name
  if len(manifest)%10==0:print(f'{len(manifest)}/{len(jobs)} clips ready',flush=True)
async def main():
 await asyncio.gather(*(make(*job) for job in jobs))
 manifest_path.write_text(json.dumps(dict(sorted(manifest.items())),ensure_ascii=False,indent=2)+'\n')
 provenance={'provider':'Microsoft neural speech via edge-tts','locale':'pt-PT','voiceA':VOICE_A,'voiceB':VOICE_B,'rate':RATE,'clips':len(manifest),'format':'AAC mono M4A 64 kb/s','synthetic':True}
 (folder/'provenance.json').write_text(json.dumps(provenance,ensure_ascii=False,indent=2)+'\n')
 for previous in set(old.values())-set(manifest.values()):
  old_path=ROOT/previous
  if old_path.parent==folder and old_path.suffix=='.m4a':old_path.unlink(missing_ok=True)
 print(f'{len(manifest)} neural clips ready; {sum((ROOT/p).stat().st_size for p in manifest.values()):,} bytes',flush=True)
asyncio.run(main())
