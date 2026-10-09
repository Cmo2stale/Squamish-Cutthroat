/* CCT Spawner Survey — weekly index-reach redd and spawning-adult survey (Losee et al. 2016; Gallagher et al. 2007; ODFW 2026).
   All data stays on this device (localStorage). */
(function(){
'use strict';
var APP_VERSION='2.0.0';
var $=function(s,r){return (r||document).querySelector(s)};
var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

/* ---------- storage ---------- */
var K_DATA='cct2_surveys',K_SET='cct2_settings',K_V1='cct_surveys',K_V1SET='cct_settings',storageOk=true;
function lsGet(k){try{return localStorage.getItem(k)}catch(e){storageOk=false;return null}}
function lsSet(k,v){try{localStorage.setItem(k,v);return true}catch(e){storageOk=false;return false}}
function loadJSON(k,d){try{var v=JSON.parse(lsGet(k)||'null');return v==null?d:v}catch(e){return d}}
var surveys=loadJSON(K_DATA,null);
var settings=Object.assign({obs:'',gps:'auto',fmt:'xlsx',lastBackup:0,customCreeks:[]},loadJSON(K_SET,{}));
function saveData(){var ok=lsSet(K_DATA,JSON.stringify(surveys));if(!ok)toast('Could not save on this phone. Storage may be full or blocked.');return ok}
function saveSettings(){lsSet(K_SET,JSON.stringify(settings))}
function askPersist(){try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist()}catch(e){}}

/* ---------- creeks (project lists: training-guide indicator creeks, priority list, original candidate list) ---------- */
var CREEKS=[
  {g:'Clear-water indicator creeks',items:['Little Stawamus Creek','Stawamus River','Brohm Lake outlet','Alice Creek','Mashiter Creek']},
  {g:'Priority creeks',items:['28.5 Mile Creek','Spring Creek','Shovelnose Creek','Kailtin Creek','Meighan (Meighn) Creek','Judd (Jimmy Jimmy) Slough','Mamquam spawning channels','Ashlu Creek','Ashlu spawning channels']},
  {g:'Other candidate creeks',items:['Frys Creek','Ring Creek','Mashiter spawning channels','Mykiss Channel','Cheakamus spawning channels','Brohm Creek','Cheekeye River','Chuck Chuck Creek']}
];
var BUILTIN={};CREEKS.forEach(function(g){g.items.forEach(function(n){BUILTIN[n]=1})});

/* ---------- chip sets ---------- */
var CHIPS={
  vis:[['1','1 · Can see the bottom of riffles and pools'],['2','2 · Can see riffles, not pools'],['3','3 · Can\'t see the bottom (not surveyable)']],
  flow:[['L','Low'],['N','Normal'],['H','High']],
  trend:[['F','Falling'],['S','Steady'],['R','Rising']],
  others:[['steelhead','Steelhead / rainbow'],['coho','Coho'],['chum','Chum'],['pink','Pink'],['chinook','Chinook'],['char','Bull trout / Dolly'],['lamprey','Lamprey']],
  conf:[['Confirmed','Confirmed · clear pit and tailspill, cleaned gravel'],['Probable','Probable · right shape and place, some doubt'],['Possible','Possible · could be scour, trampling or a test dig']],
  adults:[['A','Absent'],['P','Present']],
  sp:[['CCT','Cutthroat'],['CCT/RB','CCT/RB unresolved'],['RB','Steelhead / rainbow'],['coho','Coho'],['unknown','Unknown']],
  beh:[['pair','Paired'],['digging','Digging'],['holding','Holding over redd'],['single','Single fish']],
  hab:[['tailout','Pool tail-out'],['glide','Glide crest'],['riffle','Riffle head'],['margin','Inside-bend margin'],['other','Other']],
  who:[['CCT','Cutthroat'],['RB','Steelhead / rainbow'],['coho','Coho'],['unknown','Unknown']]
};
var SHORT={vis:{'1':'1 Riffles and pools visible','2':'2 Riffles only','3':'3 Not surveyable'},flow:{L:'Low',N:'Normal',H:'High'},trend:{F:'Falling',S:'Steady',R:'Rising'},adults:{A:'Absent',P:'Present'}};
function lab(key,v){if(SHORT[key]&&SHORT[key][v])return SHORT[key][v];var o=CHIPS[key]||[];for(var i=0;i<o.length;i++){if(o[i][0]===v)return o[i][1].split(' · ')[0]}return v||''}

/* ---------- dates ---------- */
function pad(n){return String(n).padStart(2,'0')}
function ymd(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function todayStr(){return ymd(new Date())}
function nowHM(){var d=new Date();return pad(d.getHours())+':'+pad(d.getMinutes())}
function parseD(s){var p=String(s).split('-').map(Number);return new Date(p[0],p[1]-1,p[2])}
function daysBetween(a,b){return Math.round((parseD(b)-parseD(a))/864e5)}
function fmtDate(s,dow){if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))return s||'';var dt=parseD(s),o={day:'numeric',month:'short'};if(dow)o.weekday='short';if(dt.getFullYear()!==new Date().getFullYear())o.year='numeric';return dt.toLocaleDateString('en-CA',o)}
function inWindow(s){var m=+String(s||'').slice(5,7);return m>=2&&m<=5}
function minutes(a,b){if(!/^\d\d:\d\d$/.test(a||'')||!/^\d\d:\d\d$/.test(b||''))return '';var x=a.split(':').map(Number),y=b.split(':').map(Number),m=(y[0]*60+y[1])-(x[0]*60+x[1]);return m>=0?m:''}
function newId(p){try{if(window.crypto&&crypto.randomUUID)return p+crypto.randomUUID().replace(/-/g,'').slice(0,16)}catch(e){}return p+Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
function num(v){if(v===''||v==null)return '';var n=Number(v);return isFinite(n)?n:''}
function int(v){var n=parseInt(v,10);return isFinite(n)&&n>0?n:0}
function plural(n,w,p){return n+' '+(n===1?w:(p||w+'s'))}
function gpsLat(g){return g?+g.lat.toFixed(6):''}function gpsLon(g){return g?+g.lon.toFixed(6):''}function gpsAcc(g){return g&&g.acc?Math.round(g.acc):''}
function gpsText(g){return g.lat.toFixed(5)+', '+g.lon.toFixed(5)+(g.acc?' (±'+Math.round(g.acc)+' m)':'')}

/* ---------- model ---------- */
function normSurvey(s){
  s.redds=Array.isArray(s.redds)?s.redds:[];s.checks=s.checks&&typeof s.checks==='object'?s.checks:{};s.others=Array.isArray(s.others)?s.others:[];
  s.adults=int(s.adults);s.carc=int(s.carc);s.reach=s.reach||'';s.creek=s.creek||'';
  s.redds.forEach(function(r){if(!Array.isArray(r.beh))r.beh=[];r.n=int(r.n)||(r.adults==='P'?1:0)});
  return s;
}
/* carry over anything entered in v1 (C1/C2 datasheet version) */
function fromV1(o){
  var mapSp={RB:'steelhead',coho:'coho',chum:'chum',pink:'pink',chinook:'chinook',char:'char',sockeye:''},others={},adults=0,carc=0;
  (o.obs||[]).forEach(function(x){
    if(x.species==='CCT'){if(x.kind==='carcass')carc+=int(x.count);else adults+=int(x.count)}
    else if(mapSp[x.species])others[mapSp[x.species]]=1;
  });
  var redds=(o.redds||[]).map(function(r){
    var sp=r.adult==='Y'?(/cct|cut/i.test(r.adultSp||'')?'CCT':'unknown'):'';
    if(r.attrib==='coho')others.coho=1;if(r.attrib==='steelhead')others.steelhead=1;
    return {id:r.id||newId('r'),label:r.label||'',time:r.time||'',gps:r.gps||null,conf:r.confidence||'Possible',adults:r.adult==='Y'?'P':'A',n:r.adult==='Y'?1:0,sp:sp,beh:[],photos:'',
      pitL:r.pitL,pitW:r.pitW,hab:r.habitat||'',who:{CCT:'CCT',coho:'coho',steelhead:'RB'}[r.attrib]||(r.attrib?'unknown':''),rphotos:r.photos||'',notes:r.notes||''};
  });
  var notes=[o.notes,o.weather?'Weather: '+o.weather:'',o.photos?'Photos: '+o.photos:''].filter(Boolean).join(' · ');
  return normSurvey({id:o.id||newId('s'),v:2,creek:o.stream||'',reach:o.reach||'',date:o.date||todayStr(),obs:o.observers||'',start:o.start||'',end:o.end||'',
    gpsStart:o.gpsStart||null,gpsEnd:o.gpsEnd||null,vis:{clear:'1',slight:'2',turbid:'3',very:'3'}[o.turbidity]||'',flow:{H:'H',M:'N',L:'L'}[o.flow]||'',trend:'',wt:o.wt,
    adults:Math.max(adults,redds.filter(function(r){return r.sp==='CCT'}).length),carc:carc,others:Object.keys(others),notes:notes,redds:redds,checks:{},
    createdAt:o.createdAt||Date.now(),updatedAt:o.updatedAt||Date.now(),fromV1:true});
}
if(!Array.isArray(surveys)){
  surveys=[];
  var v1=loadJSON(K_V1,[]);if(Array.isArray(v1))v1.forEach(function(o){if(o&&(o.stream||(o.redds||[]).length||(o.obs||[]).length))surveys.push(fromV1(o))});
  var v1s=loadJSON(K_V1SET,{});if(v1s&&v1s.observers&&!settings.obs)settings.obs=v1s.observers;if(v1s&&v1s.obs&&!settings.obs)settings.obs=v1s.obs;
  saveData();saveSettings();
}
surveys.forEach(normSurvey);

function sameReach(a,b){return a.creek===b.creek&&(a.reach||'')===(b.reach||'')}
function findSurvey(id){return surveys.filter(function(s){return s.id===id})[0]||null}
/* flagged redds from earlier visits to this reach that may still be visible (redd life ≤ ~20 d) */
function priorRedds(s){
  if(!s.creek||!s.date)return [];
  var out=[];
  surveys.forEach(function(o){
    if(o===s||!sameReach(o,s)||!(o.date<s.date)||daysBetween(o.date,s.date)>21)return;
    o.redds.forEach(function(r){
      var gone=surveys.some(function(x){return x!==s&&sameReach(x,s)&&x.date<s.date&&x.date>=o.date&&x.checks[r.id]&&x.checks[r.id].vis==='N'});
      if(!gone)out.push({r:r,o:o});
    });
  });
  return out.sort(function(a,b){return a.o.date<b.o.date?-1:a.o.date>b.o.date?1:0});
}
function adultsOnNew(s,cctOnly){var n=0;s.redds.forEach(function(r){if(r.adults==='P'&&(!cctOnly||r.sp==='CCT'))n+=r.n||1});return n}
function reddsWithAdults(s){var n=s.redds.filter(function(r){return r.adults==='P'}).length;Object.keys(s.checks).forEach(function(k){if(s.checks[k].adults==='P')n++});return n}
function pairSeen(s){return s.redds.some(function(r){return r.adults==='P'&&(r.sp==='CCT'||r.sp==='CCT/RB')&&((r.n||0)>=2||r.beh.indexOf('pair')>-1)})}
function conf(s,c){return s.redds.filter(function(r){return r.conf===c}).length}
function reddHistory(r,o){
  var last=o.date,gone='',adults=r.adults==='P';
  surveys.forEach(function(x){
    var c=x.checks[r.id];if(!c||!sameReach(x,o))return;
    if(c.vis==='Y'&&x.date>last)last=x.date;
    if(c.vis==='N'&&(!gone||x.date<gone))gone=x.date;
    if(c.adults==='P')adults=true;
  });
  return {lastVisible:last,goneBy:gone,visibleDays:daysBetween(o.date,last),adultsEver:adults};
}

/* ---------- state ---------- */
var cur=null,curIsNew=false,curRedd=null,shown=20,year=null,toastTimer=null,saveTimer=null,deferredInstall=null,swWaiting=null,swReg=null;
var chipVal={},gpsVals={};

/* ---------- render: home ---------- */
function yearsList(){var set={};set[new Date().getFullYear()]=1;surveys.forEach(function(s){if(s.date)set[+s.date.slice(0,4)]=1});return Object.keys(set).map(Number).sort(function(a,b){return b-a})}
function inYear(s){return year==='all'||String(s.date||'').slice(0,4)===String(year)}
function render(){renderNotice();renderYear();renderDue();renderSurveys();renderSeason();renderExport();renderSettings()}
function renderNotice(){
  var el=$('#notice'),html='',newest=0;surveys.forEach(function(s){newest=Math.max(newest,s.updatedAt||0)});
  if(!storageOk)html='<p>This browser is blocking storage, so surveys cannot be saved. Turn off private browsing, or open the app from your home screen.</p>';
  else if(swWaiting)html='<p>A new version of the app is ready.</p><button type="button" data-act="update">Update now</button>';
  else if(surveys.length&&newest>(settings.lastBackup||0)&&Date.now()-newest>2*36e5)html='<p>Some survey data isn\'t in a backup yet. Surveys live only on this phone.</p><button type="button" data-act="backup">Save a backup</button>';
  el.innerHTML=html;el.hidden=!html;
}
function renderYear(){
  var ys=yearsList(),sel=$('#yearSel'),key=ys.join(',');
  if(year===null)year=ys[0];
  if(sel.getAttribute('data-built')!==key){sel.innerHTML=ys.map(function(y){return '<option value="'+y+'">'+y+' season</option>'}).join('')+'<option value="all">All seasons</option>';sel.setAttribute('data-built',key)}
  sel.value=String(year);
}
function reachKey(s){return s.creek+'||'+(s.reach||'')}
function renderDue(){
  var sec=$('#dueSec'),t=todayStr();
  if(!inWindow(t)){sec.hidden=true;return}
  var last={};surveys.forEach(function(s){if(!s.creek||s.date.slice(0,4)!==t.slice(0,4))return;var k=reachKey(s);if(!last[k]||s.date>last[k].date)last[k]=s});
  var due=Object.keys(last).map(function(k){return last[k]}).filter(function(s){return daysBetween(s.date,t)>7}).sort(function(a,b){return a.date<b.date?-1:1});
  sec.hidden=!due.length;
  $('#dueList').innerHTML=due.map(function(s){return '<button type="button" class="chip" data-due="'+esc(s.id)+'">'+esc(s.creek+(s.reach?' · '+s.reach:''))+' <small>'+daysBetween(s.date,t)+' d</small></button>'}).join('');
}
function sortedSurveys(){return surveys.filter(inYear).sort(function(a,b){return (a.date<b.date?1:a.date>b.date?-1:0)||((b.start||'')>(a.start||'')?1:-1)})}
function resultLine(s){
  var n=s.redds.length,w=reddsWithAdults(s);
  if(s.vis==='3'&&!n&&!s.adults)return 'Not surveyable (visibility 3)';
  var bits=[];
  bits.push(n?plural(n,'new redd'):'No new redds');
  if(n||Object.keys(s.checks).length)bits.push(w?w+' with adults':'adults absent');
  if(s.adults)bits.push(plural(s.adults,'adult')+' seen');
  return bits.join(' · ');
}
function renderSurveys(){
  var list=sortedSurveys(),el=$('#surveys');
  if(!list.length){el.innerHTML='<p class="empty" style="padding-top:14px">No surveys '+(year==='all'?'yet':'in the '+year+' season')+'. Tap “Start a survey” at the bottom of the reach. A walk with nothing found is still a record.</p>';$('#moreBtn').hidden=true;return}
  el.innerHTML=list.slice(0,shown).map(function(s){
    var n=s.redds.length,pill=pairSeen(s)?'<span class="pill hit">Pair seen</span>':n?'<span class="pill hit">'+plural(n,'redd')+'</span>':s.vis==='3'?'<span class="pill blank">Vis 3</span>':'<span class="pill blank">Nil</span>';
    return '<button type="button" class="obs" data-open="'+esc(s.id)+'" style="grid-template-columns:1fr auto"><span class="d"><span class="e-date">'+esc(fmtDate(s.date,true))+(s.start?' · '+esc(s.start):'')+(s.end?'':' <span class="status-live">in progress</span>')+'</span>'+
      '<small>'+esc((s.creek||'Creek not set')+(s.reach?' · '+s.reach:''))+'</small><small>'+esc(resultLine(s))+'</small></span>'+pill+'</button>';
  }).join('');
  $('#moreBtn').hidden=list.length<=shown;
}
function seasonRows(list){
  var map={};
  list.slice().sort(function(a,b){return a.date<b.date?-1:1}).forEach(function(s){
    if(!s.creek)return;
    var k=reachKey(s)+'||'+s.date.slice(0,4);
    var r=map[k]||(map[k]={creek:s.creek,reach:s.reach||'',season:s.date.slice(0,4),visits:0,good:0,first:s.date,last:s.date,redds:0,C:0,P:0,Po:0,withAd:{},peak:0,adVisits:0,firstRedd:'',lastRedd:'',pairs:0,carc:0});
    r.visits++;if(s.vis==='1'||s.vis==='2')r.good++;r.last=s.date;
    r.redds+=s.redds.length;r.C+=conf(s,'Confirmed');r.P+=conf(s,'Probable');r.Po+=conf(s,'Possible');
    s.redds.forEach(function(x){if(x.adults==='P')r.withAd[x.id]=1});
    Object.keys(s.checks).forEach(function(id){if(s.checks[id].adults==='P')r.withAd[id]=1});
    r.peak=Math.max(r.peak,s.adults);if(s.adults>0)r.adVisits++;r.carc+=s.carc;
    if(s.redds.length){if(!r.firstRedd)r.firstRedd=s.date;r.lastRedd=s.date}
    if(pairSeen(s))r.pairs++;
  });
  return Object.keys(map).map(function(k){var r=map[k];r.nAd=Object.keys(r.withAd).length;return r}).sort(function(a,b){return a.creek.localeCompare(b.creek)||a.reach.localeCompare(b.reach)||a.season.localeCompare(b.season)});
}
function renderSeason(){
  var rows=seasonRows(surveys.filter(inYear)),el=$('#season');
  $('#ss-sub').textContent=rows.length?plural(rows.length,'reach','reaches'):'';
  if(!rows.length){el.innerHTML='<p class="empty">Totals for each creek appear here once you log surveys.</p>';return}
  el.innerHTML='<div class="tablewrap"><table class="dt"><thead><tr><th>Creek · reach</th><th>Visits</th><th>New<br>redds</th><th>With<br>adults</th><th>Peak<br>adults</th></tr></thead><tbody>'+rows.map(function(r){
    return '<tr><td>'+esc(r.creek)+(r.reach?' · '+esc(r.reach):'')+(year==='all'?' <small>'+r.season+'</small>':'')+'<br><small>last '+esc(fmtDate(r.last))+(r.pairs?' · <b class="due">pair seen</b>':'')+'</small></td><td>'+r.visits+'</td><td>'+r.redds+'</td><td>'+r.nAd+'</td><td>'+r.peak+'</td></tr>';
  }).join('')+'</tbody></table></div>';
}
function renderExport(){
  var list=surveys.filter(inYear);
  $('#ex-sub').textContent=year==='all'?'all seasons':year+' season';
  $$('#fmt button').forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-v')===settings.fmt))});
  $('#exportXlsx').hidden=settings.fmt!=='xlsx';$('#exportCsv').hidden=settings.fmt!=='csv';
  $('#exportBook').disabled=!list.length;$$('#exportCsv button').forEach(function(b){b.disabled=!list.length});
}
function renderSettings(){
  if(document.activeElement!==$('#s-obs'))$('#s-obs').value=settings.obs||'';
  $$('#s-gps .chip').forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-v')===settings.gps))});
  $('#bk-status').textContent=settings.lastBackup?'Last backup saved '+new Date(settings.lastBackup).toLocaleString('en-CA',{day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'})+'.':'No backup saved yet.';
  $('#bk-sub').textContent=plural(surveys.length,'survey')+' on this phone';
  var standalone=(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true,ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
  $('#installHint').textContent=standalone?'Installed. Open it from your home screen, even with no signal.':(ios?'In Safari, tap the Share button, then “Add to Home Screen”. Open it from there and it works with no signal.':'Add this app to your home screen so it opens with no signal. In Chrome, use the menu, then “Add to Home screen” or “Install app”.');
  $('#installBtn').hidden=!deferredInstall||standalone;
  $('#version').textContent='Version '+APP_VERSION+' · data is stored only on this device.';
}
function toast(m){var el=$('#toast');el.textContent=m;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(function(){el.hidden=true},4000)}

/* ---------- chips ---------- */
function buildChips(){
  $$('.chips[data-chip]').forEach(function(box){
    var key=box.getAttribute('data-chip');
    box.innerHTML=(CHIPS[key]||[]).map(function(o){var p=o[1].split(' · ');return '<button type="button" class="chip" data-v="'+esc(o[0])+'" aria-pressed="false">'+(p.length>1?'<b>'+esc(p[0])+'</b> '+esc(p.slice(1).join(' · ')):esc(o[1]))+'</button>'}).join('');
  });
}
function isMulti(key){var b=$('.chips[data-chip="'+key+'"]');return !!(b&&b.getAttribute('data-multi'))}
function setChip(key,v){
  chipVal[key]=isMulti(key)?(Array.isArray(v)?v.slice():[]):(v||'');
  $$('.chips[data-chip="'+key+'"] .chip').forEach(function(b){var on=isMulti(key)?chipVal[key].indexOf(b.getAttribute('data-v'))>-1:chipVal[key]===b.getAttribute('data-v');b.setAttribute('aria-pressed',String(on))});
  if(key==='vis')$('#visWarn').hidden=chipVal.vis!=='3';
  if(key==='adults')$('#adultBox').hidden=chipVal.adults!=='P';
  if(key==='adults'||key==='beh'||key==='sp')updatePairNote();
}
function getChip(key){var v=chipVal[key];return Array.isArray(v)?v.slice():(v||'')}
function updatePairNote(){var n=int($('#rd-n').value),sp=getChip('sp'),b=getChip('beh');$('#pairNote').hidden=!(getChip('adults')==='P'&&(sp==='CCT'||sp==='CCT/RB'||sp==='')&&(n>=2||b.indexOf('pair')>-1))}

/* ---------- GPS widgets ---------- */
var gpsActive=null;
function buildGps(){$$('[data-gps]').forEach(function(box){var k=box.getAttribute('data-gps');box.innerHTML='<div class="gps"><div class="gps-top"><span class="gps-val">No location yet</span><button type="button" class="ghost" data-gpsbtn="'+k+'">Use my location</button></div><div class="gps-help" hidden></div><button type="button" class="ghost" data-gpsclear="'+k+'" hidden>Remove location</button></div>'})}
function gpsBox(k){return $('[data-gps="'+k+'"]')}
function renderGps(k,msg,err){
  var box=gpsBox(k);if(!box)return;
  var v=$('.gps-val',box),btn=$('[data-gpsbtn]',box),clr=$('[data-gpsclear]',box),help=$('.gps-help',box),busy=gpsActive&&gpsActive.k===k;
  help.hidden=true;
  if(busy){v.textContent=msg||'Finding your location…';v.className='gps-val';btn.textContent='Stop';clr.hidden=true;return}
  if(gpsVals[k]){v.textContent=gpsText(gpsVals[k]);v.className='gps-val ok';btn.textContent='Update location';clr.hidden=false;return}
  v.textContent=msg||'No location yet';v.className='gps-val'+(err?' err':'');btn.textContent=err?'Try again':'Use my location';clr.hidden=true;
  if(err==='denied'){help.innerHTML=gpsHelpHtml();help.hidden=false}
}
function gpsHelpHtml(){
  var ios=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  if(ios)return '<b>To allow location on iPhone:</b><ol><li>Open <b>Settings → Privacy &amp; Security → Location Services</b> and turn it on.</li><li>Scroll to <b>Safari Websites</b> and choose <b>While Using the App</b>.</li><li>Close this app completely, reopen it from the home screen, and tap <b>Try again</b>.</li></ol>';
  return '<b>To allow location on Android:</b><ol><li>Swipe down and make sure <b>Location</b> is on.</li><li>In <b>Chrome → ⋮ → Settings → Site settings → Location</b>, allow this site.</li><li>Close this app completely, reopen it, and tap <b>Try again</b>.</li></ol>';
}
function stopGps(){if(!gpsActive)return;var k=gpsActive.k;try{navigator.geolocation.clearWatch(gpsActive.w)}catch(e){}clearTimeout(gpsActive.t);gpsActive=null;renderGps(k)}
function getGps(k,auto,onDone){
  if(!('geolocation' in navigator)){renderGps(k,'This phone or browser does not offer location.',true);return}
  if(gpsActive)stopGps();
  var best=null,a={k:k};gpsActive=a;renderGps(k);
  function finish(msg,kind){
    if(gpsActive!==a)return;
    try{navigator.geolocation.clearWatch(a.w)}catch(e){}clearTimeout(a.t);gpsActive=null;
    if(best)gpsVals[k]=best;renderGps(k,best?null:msg,best?false:(kind||true));
    if(!best&&!auto&&kind==='denied')toast('Location is blocked on this phone. See the steps under the GPS box.');
    if(best&&onDone)onDone(best);
  }
  try{
    a.w=navigator.geolocation.watchPosition(function(p){
      var g={lat:p.coords.latitude,lon:p.coords.longitude,acc:p.coords.accuracy||0,at:p.timestamp||Date.now()};
      if(!best||g.acc<best.acc)best=g;gpsVals[k]=best;renderGps(k,'Got ±'+Math.round(best.acc)+' m, refining…');
      if(best.acc<=15)finish();
    },function(err){if(err.code===1)finish('Location is blocked for this app on your phone.','denied')},{enableHighAccuracy:true,maximumAge:0,timeout:60000});
    a.t=setTimeout(function(){finish('Could not get a GPS fix. Try again in a more open spot.')},45000);
  }catch(e){finish('Location is not available here.')}
}

/* ---------- sheets ---------- */
var openStack=[];
function showSheet(id){var el=$('#'+id);el.hidden=false;document.body.style.overflow='hidden';openStack.push({id:id,opener:document.activeElement});var h=$('h2',el);if(h)h.focus();$('.sheet-scroll',el).scrollTop=0}
function hideSheet(id){
  stopGps();$('#'+id).hidden=true;
  var i=openStack.map(function(x){return x.id}).lastIndexOf(id),entry=i>-1?openStack.splice(i,1)[0]:null;
  if(!openStack.length)document.body.style.overflow='';
  if(entry&&entry.opener&&document.contains(entry.opener)){try{entry.opener.focus()}catch(e){}}
}

/* ---------- survey ---------- */
function allCreeks(){var set={};settings.customCreeks.forEach(function(n){if(!BUILTIN[n])set[n]=1});surveys.forEach(function(s){if(s.creek&&!BUILTIN[s.creek])set[s.creek]=1});return Object.keys(set).sort()}
function buildCreekSelect(value){
  var extra=allCreeks(),html='<option value="">Choose the creek…</option>'+CREEKS.map(function(g){return '<optgroup label="'+esc(g.g)+'">'+g.items.map(function(n){return '<option>'+esc(n)+'</option>'}).join('')+'</optgroup>'}).join('');
  if(extra.length)html+='<optgroup label="Added by you">'+extra.map(function(n){return '<option>'+esc(n)+'</option>'}).join('')+'</optgroup>';
  html+='<option value="__new">+ Add another creek…</option>';
  $('#sv-creek').innerHTML=html;$('#sv-creek').value=value||'';$('#sv-creekNew').hidden=true;$('#sv-creekNew').value='';
}
function fillReachList(){var re={},c=currentCreek();surveys.forEach(function(s){if(s.reach&&(!c||s.creek===c))re[s.reach]=1});$('#reachList').innerHTML=Object.keys(re).sort().map(function(x){return '<option value="'+esc(x)+'">'}).join('')}
function currentCreek(){var v=$('#sv-creek').value;return v==='__new'?$('#sv-creekNew').value.trim():v}
function blankSurvey(prefill){
  return normSurvey({id:newId('s'),v:2,creek:prefill?prefill.creek:'',reach:prefill?prefill.reach:'',date:todayStr(),obs:settings.obs||'',start:nowHM(),end:'',gpsStart:null,gpsEnd:null,
    vis:'',flow:'',trend:'',wt:'',adults:0,carc:0,others:[],notes:'',redds:[],checks:{},createdAt:Date.now(),updatedAt:Date.now()});
}
function openSurvey(id,prefill){
  var s=id?findSurvey(id):null,isNew=!s;
  if(isNew){s=blankSurvey(prefill);surveys.push(s)}
  cur=s;curIsNew=isNew;
  buildCreekSelect(s.creek);
  $('#sv-reach').value=s.reach;$('#sv-date').value=s.date;$('#sv-date').max=todayStr();$('#sv-obs').value=s.obs||'';$('#sv-start').value=s.start||'';$('#sv-end').value=s.end||'';
  $('#sv-wt').value=s.wt==null?'':s.wt;$('#sv-adults').value=s.adults;$('#sv-carc').value=s.carc;$('#sv-notes').value=s.notes||'';
  ['vis','flow','trend'].forEach(function(k){setChip(k,s[k])});setChip('others',s.others);
  gpsVals['sv-gpsStart']=s.gpsStart;gpsVals['sv-gpsEnd']=s.gpsEnd;renderGps('sv-gpsStart');renderGps('sv-gpsEnd');
  fillReachList();renderChecks();renderReddList();renderSummary();
  $('#sv-title').textContent=isNew?'New survey':'Survey';$('#sv-saved').textContent='Saved on this phone as you go.';
  resetDel($('#delSurvey'),'Delete this survey');
  showSheet('surveySheet');
  if(isNew){if(!s.creek)$('#sv-creek').focus();if(settings.gps==='auto')getGps('sv-gpsStart',true,function(){saveSurveySoon()})}
}
function readSurvey(){
  if(!cur)return;
  var c=currentCreek();
  if(c!==cur.creek){cur.creek=c}
  cur.reach=$('#sv-reach').value.trim();cur.date=$('#sv-date').value||cur.date;cur.obs=$('#sv-obs').value.trim();cur.start=$('#sv-start').value;cur.end=$('#sv-end').value;
  cur.wt=num($('#sv-wt').value);cur.adults=int($('#sv-adults').value);cur.carc=int($('#sv-carc').value);cur.notes=$('#sv-notes').value.trim();
  ['vis','flow','trend'].forEach(function(k){cur[k]=getChip(k)});cur.others=getChip('others');
  cur.gpsStart=gpsVals['sv-gpsStart']||null;cur.gpsEnd=gpsVals['sv-gpsEnd']||null;cur.updatedAt=Date.now();
}
function saveSurveySoon(){clearTimeout(saveTimer);saveTimer=setTimeout(function(){var before=reachKey(cur)+cur.date;readSurvey();saveData();if(before!==reachKey(cur)+cur.date)renderChecks();renderSummary();$('#sv-saved').textContent='Saved on this phone · '+nowHM()},250)}
function nothingRecorded(s){return !s.vis&&!s.redds.length&&!s.adults&&!s.carc&&!s.notes&&!Object.keys(s.checks).some(function(k){return s.checks[k].vis||s.checks[k].adults})}
function isEmpty(s){return (!s.creek&&!s.reach&&!s.redds.length&&!s.adults&&!s.notes)||(curIsNew&&nothingRecorded(s))}
function closeSurvey(){
  clearTimeout(saveTimer);readSurvey();
  if(cur&&isEmpty(cur)){surveys=surveys.filter(function(x){return x!==cur});toast('Nothing recorded, so the survey wasn\'t saved.')}
  else if(cur&&$('#sv-creek').value==='__new'&&cur.creek&&settings.customCreeks.indexOf(cur.creek)<0){settings.customCreeks.push(cur.creek);saveSettings()}
  saveData();askPersist();cur=null;hideSheet('surveySheet');render();
}
function finishSurvey(){
  readSurvey();
  if(!cur.creek){toast('Choose the creek before finishing.');$('#sv-creek').focus();return}
  if(!cur.vis){toast('Pick the visibility (1, 2 or 3) before finishing.');$('.chips[data-chip="vis"] .chip').focus();return}
  var unchecked=priorRedds(cur).filter(function(x){return !cur.checks[x.r.id]||!cur.checks[x.r.id].vis}).length;
  if(unchecked&&!finishSurvey.warned){finishSurvey.warned=true;toast(plural(unchecked,'flagged redd')+' not checked yet. Check them, or tap Finish again to skip.');$('#checksWrap').scrollIntoView({block:'center'});return}
  finishSurvey.warned=false;
  if(!$('#sv-end').value)$('#sv-end').value=nowHM();
  var done=function(){readSurvey();saveData();toast(cur.redds.length?'Survey finished: '+plural(cur.redds.length,'new redd')+'.':'Survey finished. Nil result recorded.');closeSurvey()};
  if(!gpsVals['sv-gpsEnd']&&settings.gps==='auto'&&'geolocation' in navigator){
    toast('Getting GPS end…');var waited=false;
    getGps('sv-gpsEnd',true,function(){if(!waited){waited=true;done()}});
    setTimeout(function(){if(!waited){waited=true;stopGps();done()}},20000);
  }else done();
}
function renderChecks(){
  var list=priorRedds(cur),wrap=$('#checksWrap');
  wrap.hidden=!list.length;
  /* drop checks for redds no longer in range (e.g. date or reach changed) */
  var ids={};list.forEach(function(x){ids[x.r.id]=1});Object.keys(cur.checks).forEach(function(k){if(!ids[k])delete cur.checks[k]});
  $('#checksList').innerHTML=list.map(function(x){
    var c=cur.checks[x.r.id]||{},age=daysBetween(x.o.date,cur.date);
    function ch(field,v,t){return '<button type="button" class="chip mini" data-check="'+esc(x.r.id)+'" data-f="'+field+'" data-v="'+v+'" aria-pressed="'+(c[field]===v)+'">'+t+'</button>'}
    return '<div class="check"><div><b>'+esc(x.r.label||'Redd')+'</b> <small>flagged '+esc(fmtDate(x.o.date))+' · '+age+' d ago · '+esc(x.r.conf||'')+'</small></div>'+
      '<div class="chips">'+ch('vis','Y','Still visible')+ch('vis','N','Gone')+'</div>'+
      (c.vis==='N'?'':'<div class="chips">'+ch('adults','A','Adults absent')+ch('adults','P','Adults present')+'</div>')+'</div>';
  }).join('');
}
function renderReddList(){
  var el=$('#reddList');
  el.innerHTML=cur.redds.length?cur.redds.slice().sort(function(a,b){return (a.time||'')<(b.time||'')?-1:1}).map(function(r){
    var ad=r.adults==='P'?(r.n||1)+' '+(r.sp?lab('sp',r.sp):'adult')+(r.beh.indexOf('pair')>-1?' · paired':''):'Adults absent';
    return '<button type="button" class="obs" data-redd="'+esc(r.id)+'"><span class="t">'+esc(r.time||'')+'</span><span class="d">'+esc(r.label||'Redd')+'<small>'+esc([ad,r.gps?'GPS':'No GPS',r.pitL&&r.pitW?'pit '+r.pitL+'×'+r.pitW+' cm':''].filter(Boolean).join(' · '))+'</small></span><span class="rtag conf-'+esc(r.conf)+'">'+esc(r.conf||'Redd')+'</span></button>';
  }).join(''):'<p class="empty" style="padding:8px 0">None yet. Tap “+ New redd” for each unflagged redd you find. If you find none, that\'s the result.</p>';
}
function renderSummary(){
  if(!cur)return;
  var n=cur.redds.length,w=reddsWithAdults(cur),onR=adultsOnNew(cur,true);
  $('#adultsHint').textContent=onR?'Include fish on redds ('+onR+' so far on new redds). Count each fish once.':'Include fish on redds. Count each fish once.';
  $('#svSummary').innerHTML='<div><b>'+n+'</b><span>New redds</span></div><div><b>'+w+'</b><span>Redds with adults</span></div>'+
    '<div><b>'+conf(cur,'Confirmed')+' / '+conf(cur,'Probable')+' / '+conf(cur,'Possible')+'</b><span>Confirmed / Probable / Possible</span></div><div><b>'+cur.adults+'</b><span>Adult cutthroat seen</span></div>'+
    '<div class="wide"><span>Result</span><b>'+esc(resultLine(cur))+(pairSeen(cur)?' · spawning pair recorded':'')+'</b></div>';
}

/* ---------- redd ---------- */
var RD_TEXT={label:'rd-id',time:'rd-time',photos:'rd-photos',rphotos:'rd-rphotos',notes:'rd-notes'};
function initials(s){return String(s||'').replace(/\(.*?\)/g,' ').split(/[\s\-]+/).filter(function(w){return /[A-Za-z0-9]/.test(w)}).map(function(w){return w[0]}).join('').toUpperCase().slice(0,4)||'R'}
function suggestReddId(){
  var d=cur.date||todayStr(),n=cur.redds.length+1,base=initials(cur.creek)+'-'+d.slice(5,7)+d.slice(8,10)+'-';
  var used={};surveys.forEach(function(s){s.redds.forEach(function(r){used[r.label]=1})});
  while(used[base+pad(n)])n++;
  return base+pad(n);
}
function openRedd(id){
  readSurvey();
  if(!cur.creek){toast('Choose the creek first, so the redd ID and flag match.');$('#sv-creek').focus();return}
  var r=id?cur.redds.filter(function(x){return x.id===id})[0]:null;curRedd=r;
  Object.keys(RD_TEXT).forEach(function(k){$('#'+RD_TEXT[k]).value=r?(r[k]||''):''});
  $('#rd-pitL').value=r&&r.pitL!==''&&r.pitL!=null?r.pitL:'';$('#rd-pitW').value=r&&r.pitW!==''&&r.pitW!=null?r.pitW:'';
  $('#rd-n').value=r&&r.n?r.n:1;
  if(!r){$('#rd-id').value=suggestReddId();$('#rd-time').value=nowHM()}
  setChip('conf',r?r.conf:'');setChip('adults',r?r.adults:'');setChip('sp',r?r.sp:'CCT');setChip('beh',r?r.beh:[]);setChip('hab',r?r.hab:'');setChip('who',r?r.who:'');
  gpsVals['rd-gps']=r?r.gps:null;renderGps('rd-gps');
  $('#rd-more').open=!!r&&!!(r.pitL||r.pitW||r.hab||r.who||r.rphotos||r.notes);
  checkRanges();updatePairNote();$('#rd-msg').textContent='';
  $('#rd-title').textContent=r?'Edit redd':'New redd';$('#rd-save').textContent=r?'Save changes':'Save redd';
  $('#rd-del').hidden=!r;resetDel($('#rd-del'),'Delete');
  showSheet('reddSheet');
  if(!r&&settings.gps==='auto')getGps('rd-gps',true);
}
function checkRanges(){$$('#reddForm input[data-range]').forEach(function(inp){var r=inp.getAttribute('data-range').split(',').map(Number),v=parseFloat(inp.value),h=$('.range[data-for="'+inp.id+'"]');if(h)h.classList.toggle('out',!isNaN(v)&&(v<r[0]||v>r[1]))})}
function saveRedd(e){
  e.preventDefault();
  if(!getChip('conf')){$('#rd-msg').textContent='Pick a confidence: Confirmed, Probable or Possible.';return}
  if(!getChip('adults')){$('#rd-msg').textContent='Were adults on the redd? Pick Present or Absent.';return}
  if(!$('#rd-id').value.trim()){$('#rd-msg').textContent='Give the redd an ID. It goes on the flag.';return}
  var r=curRedd||{id:newId('r')};
  Object.keys(RD_TEXT).forEach(function(k){r[k]=$('#'+RD_TEXT[k]).value.trim()});
  r.pitL=num($('#rd-pitL').value);r.pitW=num($('#rd-pitW').value);
  r.conf=getChip('conf');r.adults=getChip('adults');r.hab=getChip('hab');r.who=getChip('who');r.gps=gpsVals['rd-gps']||null;
  if(r.adults==='P'){r.n=Math.max(1,int($('#rd-n').value));r.sp=getChip('sp');r.beh=getChip('beh')}else{r.n=0;r.sp='';r.beh=[];r.photos=''}
  if(!curRedd)cur.redds.push(r);
  /* the reach count of adult cutthroat can't be lower than the cutthroat counted on redds */
  var onR=adultsOnNew(cur,true);if(int($('#sv-adults').value)<onR)$('#sv-adults').value=onR;
  readSurvey();saveData();hideSheet('reddSheet');renderReddList();renderSummary();
  if(r.adults==='P'&&(r.sp==='CCT'||r.sp==='CCT/RB')&&((r.n||0)>=2||r.beh.indexOf('pair')>-1))toast('Spawning pair recorded on '+r.label+'. A rare record: add a photo or video ID if you have one.');
  else toast('Redd '+r.label+' saved. Flag it before you move on.');
}

/* ---------- delete with in-page confirm ---------- */
function resetDel(b,t){b.classList.remove('sure');b.textContent=t;b.setAttribute('data-t',t)}
function confirmDel(b,go){if(b.classList.contains('sure')){go();return}b.classList.add('sure');b.textContent='Tap again to delete';setTimeout(function(){if(document.contains(b))resetDel(b,b.getAttribute('data-t')||'Delete')},5000)}

/* ---------- exports ---------- */
function exportList(){return surveys.filter(inYear).filter(function(s){return s.creek}).sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:((a.start||'')<(b.start||'')?-1:1)})}
function visitNumbers(list){var c={},out={};list.forEach(function(s){var k=reachKey(s)+'||'+s.date.slice(0,4);c[k]=(c[k]||0)+1;out[s.id]=c[k]});return out}
function summaryRows(list){
  var rows=[['Creek','Reach','Season','Visits','Visits with visibility 1–2','First visit','Last visit','New redds','Confirmed','Probable','Possible','Redds with adults present','% of redds with adults','Peak adult CCT (one visit)','Visits with adult CCT seen','Spawning pairs recorded','CCT carcasses','First new redd','Last new redd']];
  seasonRows(list).forEach(function(r){rows.push([r.creek,r.reach,+r.season,r.visits,r.good,r.first,r.last,r.redds,r.C,r.P,r.Po,r.nAd,r.redds?Math.round(1000*r.nAd/r.redds)/10:'',r.peak,r.adVisits,r.pairs,r.carc,r.firstRedd,r.lastRedd])});
  return rows;
}
function surveyRows(list){
  var vn=visitNumbers(list),rows=[['Creek','Reach','Date','Visit # (season)','Surveyors','Start time','End time','Minutes','GPS start lat','GPS start lon','GPS end lat','GPS end lon','Visibility','Flow','Flow trend','Water temp (°C)','New redds','Confirmed','Probable','Possible','New redds with adults','Flagged redds checked','Still visible','Gone','Redds with adults (new + checked)','Adult CCT seen','Adult CCT on new redds','Spawning pair recorded','CCT carcasses','Other spawners seen','Notes','Survey ID']];
  list.forEach(function(s){
    var ck=Object.keys(s.checks).map(function(k){return s.checks[k]});
    rows.push([s.creek,s.reach,s.date,vn[s.id],s.obs,s.start,s.end,minutes(s.start,s.end),gpsLat(s.gpsStart),gpsLon(s.gpsStart),gpsLat(s.gpsEnd),gpsLon(s.gpsEnd),lab('vis',s.vis),lab('flow',s.flow),lab('trend',s.trend),s.wt,
      s.redds.length,conf(s,'Confirmed'),conf(s,'Probable'),conf(s,'Possible'),s.redds.filter(function(r){return r.adults==='P'}).length,ck.filter(function(c){return c.vis}).length,ck.filter(function(c){return c.vis==='Y'}).length,ck.filter(function(c){return c.vis==='N'}).length,
      reddsWithAdults(s),s.adults,adultsOnNew(s,true),pairSeen(s)?'Yes':'No',s.carc,s.others.map(function(o){return lab('others',o)}).join('; '),s.notes,s.id]);
  });
  return rows;
}
function reddRows(list){
  var rows=[['Redd ID','Creek','Reach','Date first seen','Time','Latitude','Longitude','GPS accuracy (m)','Confidence','Adults when found','Adults (#)','Adult species','Behaviour','Photo/video IDs','Adults present on any visit','Last seen visible','Gone by','Visible for at least (days)','Pit length (cm)','Pit width (cm)','Channel position','Whose redd (best call)','Within Feb–May window','Redd photo IDs','Notes','Survey ID']];
  list.forEach(function(s){s.redds.forEach(function(r){var h=reddHistory(r,s);
    rows.push([r.label,s.creek,s.reach,s.date,r.time,gpsLat(r.gps),gpsLon(r.gps),gpsAcc(r.gps),r.conf,lab('adults',r.adults),r.adults==='P'?(r.n||1):0,r.adults==='P'?lab('sp',r.sp):'',r.beh.map(function(b){return lab('beh',b)}).join('; '),r.photos,h.adultsEver?'Yes':'No',h.lastVisible,h.goneBy,h.visibleDays,r.pitL,r.pitW,lab('hab',r.hab),lab('who',r.who),inWindow(s.date)?'Yes':'No',r.rphotos,r.notes,s.id]);
  })});
  return rows;
}
function detectionRows(list){
  var vn=visitNumbers(list),rows=[['Creek','Reach','Season','Visit #','Date','Visibility','Surveyable (1/0)','New redds','Redds detected (1/0)','Adult CCT seen','Adults detected (1/0)','Redds with adults','Spawning pair (1/0)','Survey ID']];
  list.forEach(function(s){var n=s.redds.length;rows.push([s.creek,s.reach,+s.date.slice(0,4),vn[s.id],s.date,s.vis?+s.vis:'',s.vis==='3'?0:(s.vis?1:''),n,n?1:0,s.adults,s.adults?1:0,reddsWithAdults(s),pairSeen(s)?1:0,s.id])});
  return rows;
}
function suffix(){return year==='all'?'all-seasons':String(year)}
function csvCell(v){var s=String(v==null?'':v);return /[",\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}
function toCsv(rows){return '\ufeff'+rows.map(function(r){return r.map(csvCell).join(',')}).join('\r\n')}
async function deliver(filename,data,mime){
  var blob=new Blob([data],{type:mime}),touch=window.matchMedia&&matchMedia('(pointer:coarse)').matches;
  if(touch&&navigator.canShare&&typeof File==='function'){try{var f=new File([blob],filename,{type:mime});if(navigator.canShare({files:[f]})){await navigator.share({files:[f],title:filename});return true}}catch(e){if(e&&e.name==='AbortError')return false}}
  var url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.rel='noopener';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(url);a.remove()},4000);return true;
}
function exportBook(){
  var list=exportList();if(!list.length){toast('No surveys with a creek set in this season.');return}
  var bytes;try{bytes=window.makeXlsxBook([{name:'Season summary',rows:summaryRows(list)},{name:'Surveys',rows:surveyRows(list)},{name:'Redds',rows:reddRows(list)},{name:'Detections',rows:detectionRows(list)}])}catch(e){toast('Could not make the Excel file. Try CSV instead.');return}
  deliver('cct-spawner-survey-'+suffix()+'.xlsx',bytes,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}
function exportCsv(which){
  var list=exportList();if(!list.length){toast('No surveys with a creek set in this season.');return}
  var m={summary:['cct-season-summary',summaryRows],surveys:['cct-surveys',surveyRows],redds:['cct-redds',reddRows],detections:['cct-detections',detectionRows]}[which];
  deliver(m[0]+'-'+suffix()+'.csv',toCsv(m[1](list)),'text/csv');
}

/* ---------- backup ---------- */
async function backup(){
  var data={app:'cct-spawner-survey',format:2,exportedAt:new Date().toISOString(),settings:{obs:settings.obs,customCreeks:settings.customCreeks},surveys:surveys};
  var ok=await deliver('cct-spawner-survey-backup-'+todayStr()+'.json',JSON.stringify(data,null,1),'application/json');
  if(ok){settings.lastBackup=Date.now();saveSettings();render();toast('Backup file made. Keep it somewhere safe.')}
}
function mergeBackup(data){
  if(!data||!Array.isArray(data.surveys))throw new Error('bad');
  var incoming;
  if(data.app==='cct-spawner-survey')incoming=data.surveys.map(normSurvey);
  else if(data.app==='cct-field-survey')incoming=data.surveys.map(fromV1);
  else throw new Error('not ours');
  var byId={},added=0,updated=0;surveys.forEach(function(s){byId[s.id]=s});
  incoming.forEach(function(s){if(!s||!s.id)return;var c=byId[s.id];if(!c){byId[s.id]=s;added++}else if((s.updatedAt||0)>(c.updatedAt||0)){byId[s.id]=s;updated++}});
  surveys=Object.keys(byId).map(function(k){return byId[k]});
  if(data.settings){if(!settings.obs&&data.settings.obs)settings.obs=data.settings.obs;(data.settings.customCreeks||[]).forEach(function(n){if(settings.customCreeks.indexOf(n)<0)settings.customCreeks.push(n)})}
  return {added:added,updated:updated};
}
function restoreFile(file){
  var r=new FileReader();
  r.onload=function(){try{var res=mergeBackup(JSON.parse(r.result));saveData();saveSettings();year=null;render();toast(res.added||res.updated?'Restored: '+plural(res.added,'new survey')+(res.updated?', '+res.updated+' updated':'')+'.':'Nothing new in that backup. Your surveys are unchanged.')}catch(e){toast('That file is not a CCT survey backup.')}};
  r.onerror=function(){toast('Could not read that file.')};r.readAsText(file);
}

/* ---------- events ---------- */
function bind(){
  $('#startBtn').addEventListener('click',function(){openSurvey(null)});
  $('#surveys').addEventListener('click',function(e){var b=e.target.closest('[data-open]');if(b)openSurvey(b.getAttribute('data-open'))});
  $('#dueList').addEventListener('click',function(e){var b=e.target.closest('[data-due]');if(!b)return;var s=findSurvey(b.getAttribute('data-due'));if(s)openSurvey(null,{creek:s.creek,reach:s.reach})});
  $('#moreBtn').addEventListener('click',function(){shown+=20;renderSurveys()});
  $('#yearSel').addEventListener('change',function(e){year=e.target.value==='all'?'all':+e.target.value;shown=20;render()});
  $('#sv-creek').addEventListener('change',function(e){var isNew=e.target.value==='__new';$('#sv-creekNew').hidden=!isNew;if(isNew)$('#sv-creekNew').focus();fillReachList();saveSurveySoon()});
  document.addEventListener('click',function(e){
    var cl=e.target.closest('[data-close]');
    if(cl){var id=cl.getAttribute('data-close');if(id==='surveySheet')closeSurvey();else hideSheet(id);return}
    var ck=e.target.closest('[data-check]');
    if(ck){var rid=ck.getAttribute('data-check'),f=ck.getAttribute('data-f'),v=ck.getAttribute('data-v'),c=cur.checks[rid]||(cur.checks[rid]={});c[f]=c[f]===v?'':v;if(f==='vis'&&c.vis==='N'&&c.adults==='P')c.adults='';renderChecks();saveSurveySoon();return}
    var ch=e.target.closest('.chips[data-chip] .chip');
    if(ch){
      var key=ch.closest('.chips').getAttribute('data-chip'),val=ch.getAttribute('data-v');
      if(isMulti(key)){var a=getChip(key),i=a.indexOf(val);if(i>-1)a.splice(i,1);else a.push(val);setChip(key,a)}else setChip(key,getChip(key)===val&&key!=='adults'?'':val);
      if(ch.closest('#surveyForm'))saveSurveySoon();
      if(ch.closest('#reddForm'))$('#rd-msg').textContent='';
      return;
    }
    var gb=e.target.closest('[data-gpsbtn]');
    if(gb){var k=gb.getAttribute('data-gpsbtn');if(gpsActive&&gpsActive.k===k)stopGps();else getGps(k,false,function(){if(k.indexOf('sv-')===0)saveSurveySoon()});return}
    var gc=e.target.closest('[data-gpsclear]');
    if(gc){var k2=gc.getAttribute('data-gpsclear');gpsVals[k2]=null;renderGps(k2);if(k2.indexOf('sv-')===0)saveSurveySoon();return}
    var st=e.target.closest('.stepper button');
    if(st){var box=st.closest('.stepper'),inp=$('input',box),min=+box.getAttribute('data-min'),max=+box.getAttribute('data-max'),v2=parseInt(inp.value,10);if(isNaN(v2))v2=min;inp.value=Math.min(max,Math.max(min,v2+parseInt(st.getAttribute('data-step'),10)));
      if(inp.closest('#surveyForm'))saveSurveySoon();if(inp.id==='rd-n')updatePairNote();return}
  });
  $('#surveyForm').addEventListener('input',saveSurveySoon);
  $('#surveyForm').addEventListener('submit',function(e){e.preventDefault()});
  $('#addRedd').addEventListener('click',function(){openRedd(null)});
  $('#reddList').addEventListener('click',function(e){var r=e.target.closest('[data-redd]');if(r)openRedd(r.getAttribute('data-redd'))});
  $('#finishBtn').addEventListener('click',finishSurvey);
  $('#delSurvey').addEventListener('click',function(e){confirmDel(e.currentTarget,function(){var s=cur;surveys=surveys.filter(function(x){return x!==s});cur=null;saveData();hideSheet('surveySheet');render();toast('Survey deleted.')})});
  $('#reddForm').addEventListener('submit',saveRedd);
  $('#reddForm').addEventListener('input',function(e){checkRanges();if(e.target.id==='rd-n')updatePairNote()});
  $('#rd-del').addEventListener('click',function(e){confirmDel(e.currentTarget,function(){cur.redds=cur.redds.filter(function(x){return x!==curRedd});readSurvey();saveData();hideSheet('reddSheet');renderReddList();renderSummary();toast('Redd deleted.')})});
  $('#fmt').addEventListener('click',function(e){var b=e.target.closest('button[data-v]');if(!b)return;settings.fmt=b.getAttribute('data-v');saveSettings();renderExport()});
  $('#exportBook').addEventListener('click',exportBook);
  $('#exportCsv').addEventListener('click',function(e){var b=e.target.closest('[data-csv]');if(b)exportCsv(b.getAttribute('data-csv'))});
  $('#s-obs').addEventListener('input',function(e){settings.obs=e.target.value.trim();saveSettings()});
  $('#s-gps').addEventListener('click',function(e){var b=e.target.closest('.chip');if(!b)return;settings.gps=b.getAttribute('data-v');saveSettings();renderSettings()});
  $('#backupBtn').addEventListener('click',backup);
  $('#restoreBtn').addEventListener('click',function(){$('#restoreFile').click()});
  $('#restoreFile').addEventListener('change',function(e){var f=e.target.files&&e.target.files[0];if(f)restoreFile(f);e.target.value=''});
  $('#notice').addEventListener('click',function(e){var b=e.target.closest('button[data-act]');if(!b)return;if(b.getAttribute('data-act')==='backup')backup();if(b.getAttribute('data-act')==='update'&&swWaiting)swWaiting.postMessage('skipWaiting')});
  $('#installBtn').addEventListener('click',async function(){if(!deferredInstall)return;deferredInstall.prompt();try{await deferredInstall.userChoice}catch(e){}deferredInstall=null;renderSettings()});
  $('#updateBtn').addEventListener('click',checkForUpdate);
  document.addEventListener('keydown',function(e){if(e.key!=='Escape'||!openStack.length)return;var top=openStack[openStack.length-1].id;if(top==='surveySheet')closeSurvey();else hideSheet(top)});
  window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferredInstall=e;renderSettings()});
  window.addEventListener('pagehide',function(){if(cur){readSurvey();saveData()}});
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden'&&cur){readSurvey();saveData()}if(document.visibilityState==='visible'){updateToday();if(!cur)render()}});
  setInterval(updateToday,60000);
}
function updateToday(){$('#today').textContent=new Date().toLocaleDateString('en-CA',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}

/* ---------- service worker + updates ---------- */
function registerSW(){
  if(!('serviceWorker' in navigator))return;
  var reloading=false,had=!!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange',function(){if(reloading||!had)return;if(cur){readSurvey();saveData()}reloading=true;location.reload()});
  navigator.serviceWorker.register('sw.js').then(function(reg){
    swReg=reg;
    function watch(w){w.addEventListener('statechange',function(){if(w.state==='installed'&&navigator.serviceWorker.controller){swWaiting=w;renderNotice()}})}
    if(reg.waiting&&navigator.serviceWorker.controller){swWaiting=reg.waiting;renderNotice()}
    if(reg.installing)watch(reg.installing);
    reg.addEventListener('updatefound',function(){if(reg.installing)watch(reg.installing)});
    document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'&&navigator.onLine!==false){try{reg.update()}catch(e){}}});
    setInterval(function(){if(navigator.onLine!==false){try{reg.update()}catch(e){}}},30*60*1000);
  }).catch(function(){});
}
async function checkForUpdate(){
  var btn=$('#updateBtn');
  if(navigator.onLine===false){toast('No signal. Check for updates when you\'re back in service.');return}
  if(!swReg){location.reload();return}
  btn.disabled=true;btn.textContent='Checking…';try{await swReg.update()}catch(e){}
  await new Promise(function(r){setTimeout(r,1500)});btn.disabled=false;btn.textContent='Check for updates';
  var w=swReg.waiting||swReg.installing;
  if(w){toast('Updating…');if(swReg.waiting)swReg.waiting.postMessage('skipWaiting');else w.addEventListener('statechange',function(){if(w.state==='installed')w.postMessage('skipWaiting')})}
  else toast('You have the latest version ('+APP_VERSION+').');
}

/* ---------- start ---------- */
buildChips();buildGps();bind();updateToday();render();registerSW();
window.__cct={surveys:function(){return surveys},summaryRows:summaryRows,detectionRows:detectionRows,reddRows:reddRows};
})();
