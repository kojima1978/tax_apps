const {chromium}=require('/tmp/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1400,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://app:8000');await page.waitForTimeout(100);
 const position=()=>page.locator('.tree-scroll').evaluate(e=>({x:e.scrollLeft,y:e.scrollTop}));
 const bounds=await page.locator('.tree-scroll').boundingBox();let before=await position();
 await page.mouse.move(bounds.x+40,bounds.y+60);await page.mouse.down();await page.mouse.move(bounds.x+130,bounds.y+130,{steps:8});await page.mouse.up();let after=await position();assert.ok(Math.abs(after.x-before.x+90)<3);assert.ok(Math.abs(after.y-before.y+70)<3);assert.equal(await page.locator('#person-dialog').isVisible(),false);
 await page.locator('#zoom-fit').click();await page.waitForTimeout(450);
 const node=page.getByRole('button',{name:'佐藤 太郎を編集'});const card=await node.boundingBox();before=await position();await page.mouse.move(card.x+40,card.y+45);await page.mouse.down();await page.mouse.move(card.x+110,card.y+85,{steps:8});await page.mouse.up();after=await position();assert.ok(after.x<before.x-65);assert.equal(await page.locator('#person-dialog').isVisible(),false);
 await page.waitForTimeout(450);await node.click();assert.equal(await page.locator('#person-dialog').isVisible(),true);await page.locator('#cancel-dialog').click();
 await page.locator('#zoom-fit').click();await page.waitForTimeout(100);const centered=await page.evaluate(()=>{const v=document.querySelector('.tree-scroll'),a=v.getBoundingClientRect(),s=document.querySelector('#tree-canvas svg').getBoundingClientRect();return {dx:Math.abs((a.left+v.clientWidth/2)-(s.left+s.width/2)),dy:Math.abs((a.top+v.clientHeight/2)-(s.top+s.height/2))};});assert.ok(centered.dx<3&&centered.dy<3,JSON.stringify(centered));
 before=await position();await page.mouse.move(bounds.x+40,bounds.y+60);await page.mouse.down({button:'right'});await page.mouse.move(bounds.x+80,bounds.y+80);await page.mouse.up({button:'right'});after=await position();assert.deepEqual(after,before);
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS: drag background and nodes, both axes, click edit preserved, fit recenters, right click ignored.');
})().catch(e=>{console.error(e);process.exit(1)});
