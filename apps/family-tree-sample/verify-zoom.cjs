const {chromium}=require('/tmp/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1400,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://app:8000');
 await page.locator('#zoom-in').click();assert.equal(await page.locator('#zoom-value').innerText(),'125%');
 await page.locator('#zoom-out').click();assert.equal(await page.locator('#zoom-value').innerText(),'100%');
 await page.locator('#zoom-out').click();assert.equal(await page.locator('#zoom-value').innerText(),'75%');
 await page.getByRole('button',{name:'佐藤 太郎を編集'}).click();await page.getByRole('button',{name:'保存する',exact:true}).click();assert.equal(await page.locator('#zoom-value').innerText(),'75%');
 await page.locator('#zoom-reset').click();assert.equal(await page.locator('#zoom-value').innerText(),'100%');
 await page.evaluate(()=>{const data=sample();data.people=[data.people[0],...Array.from({length:29},(_,i)=>({id:'child-'+i,kind:'child',name:'家族 '+(i+1),relation:'子',birth:'1980-01-01',death:'',address:'東京都'}))];data.applicant='child-0';localStorage.setItem(KEY,JSON.stringify(data));});await page.reload();
 await page.locator('#zoom-fit').click();
 async function assertFits(){const sizes=await page.evaluate(()=>{const v=document.querySelector('.tree-scroll'),s=document.querySelector('#tree-canvas svg').getBoundingClientRect();return {w:s.width,h:s.height,vw:v.clientWidth,vh:v.clientHeight}});assert.ok(sizes.w<=sizes.vw&&sizes.h<=sizes.vh,JSON.stringify(sizes));}
 await assertFits();assert.equal(await page.locator('.tree-node').count(),30);
 await page.screenshot({path:'/work/qa/zoom-fit.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);await assertFits();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('#zoom-reset').click();assert.ok(await page.evaluate(()=>document.querySelector('.tree-scroll').scrollWidth>document.querySelector('.tree-scroll').clientWidth));
 await page.locator('#zoom-in').click();await page.locator('#zoom-in').click();await page.locator('#zoom-in').click();assert.equal(await page.locator('#zoom-in').isDisabled(),true);
 const dl=page.waitForEvent('download');await page.locator('#export-svg').click();const file=await dl;await file.saveAs('/work/qa/zoom-export.svg');const svg=require('node:fs').readFileSync('/work/qa/zoom-export.svg','utf8');assert.ok(!/style="[^"]*(?:width|height):/.test(svg));assert.match(svg,/家族 29/);
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS: zoom steps/reset/limits, editing retains zoom, fit 30 people, responsive fit, overflow scroll, SVG original dimensions.');
})().catch(e=>{console.error(e);process.exit(1)});
