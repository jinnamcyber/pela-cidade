"""Create bundled pt-PT audio with the installed macOS Joana voice. No API key."""
from pathlib import Path
import subprocess,json,hashlib,tempfile,shutil
ROOT=Path(__file__).resolve().parents[1]
NODE=shutil.which('node')
if not NODE:raise RuntimeError('Node.js is required to read the lesson catalog.')
code="const I=require('./src/instructions'),P=require('./src/pragmatics');console.log(JSON.stringify([...I.items.map(x=>x.phrase),...I.tasks.map(x=>x.phrase),...P.scenes.flatMap(s=>[s.lead,...s.options,s.reply,s.end])]));"
phrases=sorted(set(json.loads(subprocess.check_output([NODE,'-e',code],cwd=ROOT))))
folder=ROOT/'assets/audio';folder.mkdir(parents=True,exist_ok=True);manifest={}
for phrase in phrases:
 name=hashlib.sha256(phrase.encode()).hexdigest()[:16]+'.m4a';out=folder/name
 if not out.exists() or out.stat().st_size<5000:
  with tempfile.TemporaryDirectory(prefix='pela-cidade-voice-') as temp:
   aiff=Path(temp)/'voice.aiff'
   subprocess.run(['/usr/bin/say','-v','Joana','-r','145','-o',str(aiff),phrase],check=True)
   subprocess.run(['/usr/bin/afconvert','-f','m4af','-d','aac ','-b','64000',str(aiff),str(out)],check=True)
  if out.stat().st_size<5000:raise RuntimeError('Empty speech: '+phrase)
 manifest[phrase]='assets/audio/'+name
(folder/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(f'{len(manifest)} pt-PT audio clips, {sum(p.stat().st_size for p in folder.glob("*.m4a")):,} bytes')
