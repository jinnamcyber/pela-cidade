const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {createClassroom}=require('../server');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),app=createClassroom();
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+app.server.address().port;app.setUrls(app.server.address().port);
 const browser=await chromium.launch({headless:true});
 const errors=[];
 function track(page){page.on('pageerror',e=>errors.push(e.message));}
 try{
  const board=await browser.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce'});track(board);
  await board.goto(pathToFileURL(path.join(root,'指路互動地圖.html')).href);
  await board.waitForFunction(()=>document.querySelector('.city-art').complete&&document.querySelector('.city-art').naturalWidth>0);
  assert.equal(await board.locator('.city-art').evaluate(img=>img.complete&&img.naturalWidth>0),true);
  await board.locator('[data-command="B"]').click();
  assert.equal(await board.locator('#walker').getAttribute('data-node'),'12');
  await board.keyboard.press('ArrowRight');
  assert.equal(await board.locator('#facing').evaluate(el=>el.style.transform),'rotate(90deg)');
  await board.locator('#undo').click();assert.equal(await board.locator('#facing').evaluate(el=>el.style.transform),'rotate(0deg)');
  await board.locator('#reset').click();
  await board.locator('[data-mode="hands"]').click();
  await board.locator('[data-vote="A"]').fill('3');await board.locator('[data-vote="B"]').fill('3');
  await board.locator('#apply-vote').click();assert.match(await board.locator('#status').innerText(),/同票/);
  assert.equal(await board.locator('#walker').getAttribute('data-node'),'s1');
  await board.locator('[data-vote="B"]').fill('8');await board.locator('#apply-vote').click();
  assert.equal(await board.locator('#walker').getAttribute('data-node'),'12');
  await board.locator('#reset').click();await board.locator('[data-mode="direct"]').click();
  await board.screenshot({path:path.join(root,'screenshots/白板-1920.png'),fullPage:true});
  const layout=[];
  for(const [width,height] of [[1920,1080],[1366,768]]){
   await board.setViewportSize({width,height});
   layout.push(await board.evaluate(()=>({viewport:[innerWidth,innerHeight],page:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],map:document.querySelector('.map-wrap').getBoundingClientRect().toJSON(),controls:document.querySelector('.utility').getBoundingClientRect().toJSON()})));
   if(width===1366)await board.screenshot({path:path.join(root,'screenshots/白板-1366.png'),fullPage:true});
  }
  await board.goto(base+'/teacher?key='+app.teacherKey);
  await board.locator('#connection').filter({hasText:'課堂伺服器已連接'}).waitFor();
  await board.locator('[data-mode="devices"]').click();await board.locator('#open-round').click();
  const c1=await browser.newContext({viewport:{width:390,height:844}}),c2=await browser.newContext({viewport:{width:390,height:844}});
  const phone=await c1.newPage(),phone2=await c2.newPage();track(phone);track(phone2);
  for(const p of [phone,phone2])await p.goto(base+'/vote?room='+app.room);
  await phone.locator('[data-choice="B"]:enabled').waitFor();
  await phone.locator('[data-choice="B"]').click();await phone.locator('[data-choice="A"]:enabled').waitFor();await phone.locator('[data-choice="A"]').click();
  await phone2.locator('[data-choice="B"]:enabled').waitFor();await phone2.locator('[data-choice="B"]').click();
  await board.waitForFunction(()=>document.querySelector('[data-vote="A"]').value==='1'&&document.querySelector('[data-vote="B"]').value==='1');
  await board.locator('#apply-vote').click();await board.waitForFunction(()=>document.querySelector('#status').textContent.includes('同票'));
  await board.locator('#open-round').click();
  for(const p of [phone,phone2]){await p.waitForFunction(()=>document.querySelector('#round').textContent.includes('第 2 輪 · 投票中'));await p.locator('[data-choice="B"]:enabled').waitFor();await p.locator('[data-choice="B"]').click();}
  await board.waitForFunction(()=>document.querySelector('[data-vote="B"]').value==='2');
  await phone.screenshot({path:path.join(root,'screenshots/手機投票.png'),fullPage:true});
  await board.screenshot({path:path.join(root,'screenshots/裝置投票.png'),fullPage:true});
  await board.locator('#apply-vote').click();
  await board.waitForFunction(()=>document.querySelector('#walker').dataset.node==='12');
  await phone.locator('[data-choice="B"]:disabled').waitFor();
  await board.locator('#join').click();assert.ok((await board.locator('.join-url').first().innerText()).includes('/vote?room='));
  await board.locator('#join-dialog [data-close]').click();
  await board.locator('#help').click();assert.equal(await board.locator('#help-dialog').evaluate(d=>d.open),true);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({result:'Offline controls, keyboard, manual votes and two student browsers verified; no browser errors.',layout},null,2));
 }finally{await browser.close();await new Promise(r=>app.server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
