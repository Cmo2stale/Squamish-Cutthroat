/* CCT Stream Survey — a walked stream survey with a running clock, redd measurements and a redd age scale.
   Method basis: Losee et al. 2016; Gallagher et al. 2007; ODFW 2026. All data stays on this device. */
(function(){
'use strict';
var APP_VERSION='3.1.0';
var $=function(s,r){return (r||document).querySelector(s)};
var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

/* ---------- storage ---------- */
var K_DATA='cct3_surveys',K_SET='cct3_settings',K_V2='cct2_surveys',K_V2SET='cct2_settings',K_V1='cct_surveys',storageOk=true;
function lsGet(k){try{return localStorage.getItem(k)}catch(e){storageOk=false;return null}}
function lsSet(k,v){try{localStorage.setItem(k,v);return true}catch(e){storageOk=false;return false}}
function loadJSON(k,d){try{var v=JSON.parse(lsGet(k)||'null');return v==null?d:v}catch(e){return d}}
var surveys=loadJSON(K_DATA,null);
var settings=Object.assign({crew:'',fmt:'xlsx',lastBackup:0,customStreams:[]},loadJSON(K_SET,{}));
function saveData(){var ok=lsSet(K_DATA,JSON.stringify(surveys));if(!ok)toast('Could not save on this phone. Storage may be full or blocked.');return ok}
function saveSettings(){lsSet(K_SET,JSON.stringify(settings))}
function askPersist(){try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist()}catch(e){}}

/* ---------- project stream list (training-guide indicator creeks, priority list, original candidates) ---------- */
var CREEK_GROUPS=[
  {g:'Clear-water indicator creeks',items:['Little Stawamus Creek','Stawamus River','Brohm Lake outlet','Alice Creek','Mashiter Creek']},
  {g:'Priority creeks',items:['28.5 Mile Creek','Spring Creek','Shovelnose Creek','Kailtin Creek','Meighan (Meighn) Creek','Judd (Jimmy Jimmy) Slough','Mamquam spawning channels','Ashlu Creek','Ashlu spawning channels']},
  {g:'Other candidate creeks',items:['Frys Creek','Ring Creek','Mashiter spawning channels','Mykiss Channel','Cheakamus spawning channels','Brohm Creek','Cheekeye River','Chuck Chuck Creek']}
];
var PROJECT_STREAMS=[];CREEK_GROUPS.forEach(function(g){g.items.forEach(function(n){PROJECT_STREAMS.push(n)})});

/* ---------- chip sets ---------- */
var CHIPS={
  vis:[['1','1 · Can see the bottom of riffles and pools'],['2','2 · Can see riffles, not pools'],['3','3 · Can\'t see the bottom (not surveyable)']],
  flow:[['L','Low'],['N','Normal'],['H','High']],
  trend:[['F','Falling'],['S','Steady'],['R','Rising']],
  fish:[['A','None seen'],['P','Fish seen']],
  others:[['steelhead','Steelhead / rainbow'],['coho','Coho'],['chum','Chum'],['pink','Pink'],['chinook','Chinook'],['char','Bull trout / Dolly'],['lamprey','Lamprey']],
  conf:[['Confirmed','Confirmed · Clear pit and mound, cleaned gravel, or a fish on it'],
        ['Probable','Probable · Right shape in the right place, but something is unclear'],
        ['Possible','Possible · Could be scour, trampling or a test dig']],
  age:[['1','1 · Fresh — clean gravel, no algae growth'],['2','2 · Some algae growth, no fish present'],['3','3 · Full algae growth, no longer measurable']],
  adults:[['A','Absent'],['P','Present']],
  sp:[['CCT','Cutthroat'],['CCT/RB','CCT/RB unresolved'],['RB','Steelhead / rainbow'],['coho','Coho'],['unknown','Unknown']],
  beh:[['pair','Paired'],['digging','Digging'],['holding','Holding over redd'],['single','Single fish']],
  hab:[['tailout','Pool tail-out'],['glide','Glide crest'],['riffle','Riffle head'],['margin','Inside-bend margin'],['other','Other']],
  who:[['CCT','Cutthroat'],['RB','Steelhead / rainbow'],['coho','Coho'],['unknown','Unknown']]
};
var SHORT={vis:{'1':'1 Riffles and pools visible','2':'2 Riffles only','3':'3 Not surveyable'},flow:{L:'Low',N:'Normal',H:'High'},
  trend:{F:'Falling',S:'Steady',R:'Rising'},adults:{A:'Absent',P:'Present'},fish:{A:'None seen',P:'Fish seen'},
  age:{'1':'1 Fresh','2':'2 Some algae','3':'3 Full algae'}};
var AGE_WHAT={
  '1':'Built since the last high water. This one dates spawning to about the week of your survey, which is the whole point of walking weekly.',
  '2':'Older than a week or two, but the shape still reads. Measure it.',
  '3':'Too far gone to measure. Still worth recording — it is evidence the creek was used.'};
var AGE_FULL={'1':'Fresh, no algae growth','2':'Some algae growth, no fish present','3':'Full algae growth, no longer measurable'};
function lab(key,v){if(SHORT[key]&&SHORT[key][v])return SHORT[key][v];var o=CHIPS[key]||[];for(var i=0;i<o.length;i++){if(o[i][0]===v)return o[i][1].split(' · ')[0]}return v||''}

/* ---------- dates and numbers ---------- */
function pad(n){return String(n).padStart(2,'0')}
function ymd(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function todayStr(){return ymd(new Date())}
function nowHM(){var d=new Date();return pad(d.getHours())+':'+pad(d.getMinutes())}
function parseD(s){var p=String(s).split('-').map(Number);return new Date(p[0],p[1]-1,p[2])}
function fmtDate(s,dow){if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))return s||'';var dt=parseD(s),o={day:'numeric',month:'short'};if(dow)o.weekday='short';if(dt.getFullYear()!==new Date().getFullYear())o.year='numeric';return dt.toLocaleDateString('en-CA',o)}
function minutesBetween(a,b){if(!/^\d\d:\d\d$/.test(a||'')||!/^\d\d:\d\d$/.test(b||''))return '';var x=a.split(':').map(Number),y=b.split(':').map(Number),m=(y[0]*60+y[1])-(x[0]*60+x[1]);if(m<0)m+=1440;return m}
function newId(p){try{if(window.crypto&&crypto.randomUUID)return p+crypto.randomUUID().replace(/-/g,'').slice(0,16)}catch(e){}return p+Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
function num(v){if(v===''||v==null)return '';var n=Number(v);return isFinite(n)?n:''}
function int(v){var n=parseInt(v,10);return isFinite(n)&&n>0?n:0}
function plural(n,w,p){return n+' '+(n===1?w:(p||w+'s'))}

/* ---------- GPS text entered by hand ---------- */
/* Accepts decimal degrees ("49.70123, -123.15456", "N 49.701 W 123.154") or UTM ("10U 492345 5512345").
   Decimal degrees are parsed out so the export carries latitude and longitude columns. */
function parseGps(s){
  var t=String(s||'').trim();if(!t)return null;
  var dd=t.match(/^\s*([NnSs])?\s*(-?\d{1,3}(?:\.\d+)?)\s*°?\s*[,; ]\s*([EeWw])?\s*(-?\d{1,3}(?:\.\d+)?)\s*°?\s*([EeWw])?\s*$/);
  if(dd){
    var lat=parseFloat(dd[2]),lon=parseFloat(dd[4]);
    if(/[Ss]/.test(dd[1]||''))lat=-Math.abs(lat);
    var we=(dd[3]||dd[5]||'');if(/[Ww]/.test(we))lon=-Math.abs(lon);
    if(Math.abs(lat)<=90&&Math.abs(lon)<=180&&(Math.abs(lat)>0||Math.abs(lon)>0))return {kind:'dd',lat:lat,lon:lon};
  }
  var utm=t.match(/^\s*(\d{1,2})\s*([A-Za-z])?\s+(\d{5,7})\s*[,; ]?\s*(\d{6,8})\s*$/);
  if(utm)return {kind:'utm',zone:utm[1]+(utm[2]||'').toUpperCase(),easting:+utm[3],northing:+utm[4]};
  return {kind:'text'};
}
function gpsLat(g){var p=parseGps(g);return p&&p.kind==='dd'?+p.lat.toFixed(6):''}
function gpsLon(g){var p=parseGps(g);return p&&p.kind==='dd'?+p.lon.toFixed(6):''}

/* ---------- model ---------- */
function normSurvey(s){
  s.redds=Array.isArray(s.redds)?s.redds:[];s.others=Array.isArray(s.others)?s.others:[];
  s.stream=s.stream||'';s.reach=s.reach||'';s.crew=s.crew||'';s.notes=s.notes||'';
  s.accum=Math.max(0,num(s.accum)||0);s.running=!!s.running;s.runFrom=s.running?(num(s.runFrom)||0):0;
  if(s.running&&!s.runFrom)s.running=false;
  s.stopped=!!s.stopped;s.fishN=int(s.fishN);
  s.redds.forEach(function(r){
    if(!Array.isArray(r.beh))r.beh=[];
    r.n=int(r.n)||(r.adults==='P'?1:0);
    r.len=num(r.len);r.wid=num(r.wid);r.age=r.age||'';r.conf=r.conf||'';r.gps=typeof r.gps==='string'?r.gps:'';
  });
  return s;
}
/* carry over the v2 spawner-survey records */
function fromV2(o){
  var redds=(o.redds||[]).map(function(r){
    return {id:r.id||newId('r'),label:r.label||'',time:r.time||'',
      gps:r.gps&&r.gps.lat!=null?(+r.gps.lat).toFixed(5)+', '+(+r.gps.lon).toFixed(5):'',
      age:'',conf:r.conf||'',len:num(r.pitL),wid:num(r.pitW),adults:r.adults==='P'?'P':'A',n:int(r.n),sp:r.sp||'',beh:Array.isArray(r.beh)?r.beh:[],
      who:r.who||'',hab:r.hab||'',photos:[r.photos,r.rphotos].filter(Boolean).join(' '),notes:r.notes||''};
  });
  return normSurvey({id:o.id||newId('s'),v:3,stream:o.creek||'',reach:o.reach||'',date:o.date||todayStr(),crew:o.obs||'',
    start:o.start||'',end:o.end||'',accum:minutesBetween(o.start,o.end)?minutesBetween(o.start,o.end)*60000:0,running:false,runFrom:0,stopped:!!o.end,
    wt:num(o.wt),vis:o.vis||'',flow:o.flow||'',trend:o.trend||'',
    fish:int(o.adults)>0?'P':(o.vis?'A':''),fishN:int(o.adults),others:Array.isArray(o.others)?o.others:[],
    notes:o.notes||'',redds:redds,createdAt:o.createdAt||Date.now(),updatedAt:o.updatedAt||Date.now()});
}
/* carry over the original v1 C1/C2 datasheet records */
function fromV1(o){
  var mapSp={RB:'steelhead',coho:'coho',chum:'chum',pink:'pink',chinook:'chinook',char:'char'},others={},fishN=0;
  (o.obs||[]).forEach(function(x){if(x.species==='CCT'){if(x.kind!=='carcass')fishN+=int(x.count)}else if(mapSp[x.species])others[mapSp[x.species]]=1});
  var redds=(o.redds||[]).map(function(r){
    return {id:r.id||newId('r'),label:r.label||'',time:r.time||'',
      gps:r.gps&&r.gps.lat!=null?(+r.gps.lat).toFixed(5)+', '+(+r.gps.lon).toFixed(5):'',
      age:'',conf:r.confidence||'',len:num(r.pitL),wid:num(r.pitW),adults:r.adult==='Y'?'P':'A',n:r.adult==='Y'?1:0,
      sp:r.adult==='Y'?'unknown':'',beh:[],who:{CCT:'CCT',coho:'coho',steelhead:'RB'}[r.attrib]||'',hab:r.habitat||'',photos:r.photos||'',notes:r.notes||''};
  });
  return normSurvey({id:o.id||newId('s'),v:3,stream:o.stream||'',reach:o.reach||'',date:o.date||todayStr(),crew:o.observers||'',
    start:o.start||'',end:o.end||'',accum:minutesBetween(o.start,o.end)?minutesBetween(o.start,o.end)*60000:0,running:false,runFrom:0,stopped:!!o.end,
    wt:num(o.wt),vis:{clear:'1',slight:'2',turbid:'3',very:'3'}[o.turbidity]||'',flow:{H:'H',M:'N',L:'L'}[o.flow]||'',trend:'',
    fish:fishN>0?'P':'',fishN:fishN,others:Object.keys(others),
    notes:[o.notes,o.weather?'Weather: '+o.weather:''].filter(Boolean).join(' · '),redds:redds,
    createdAt:o.createdAt||Date.now(),updatedAt:o.updatedAt||Date.now()});
}
if(!Array.isArray(surveys)){
  surveys=[];
  var v2=loadJSON(K_V2,[]);if(Array.isArray(v2))v2.forEach(function(o){if(o&&(o.creek||(o.redds||[]).length))surveys.push(fromV2(o))});
  if(!surveys.length){var v1=loadJSON(K_V1,[]);if(Array.isArray(v1))v1.forEach(function(o){if(o&&(o.stream||(o.redds||[]).length||(o.obs||[]).length))surveys.push(fromV1(o))})}
  var v2s=loadJSON(K_V2SET,{});if(v2s&&v2s.obs&&!settings.crew)settings.crew=v2s.obs;
  if(v2s&&Array.isArray(v2s.customCreeks))v2s.customCreeks.forEach(function(n){if(settings.customStreams.indexOf(n)<0)settings.customStreams.push(n)});
  saveData();saveSettings();
}
surveys.forEach(normSurvey);

function findSurvey(id){return surveys.filter(function(s){return s.id===id})[0]||null}
function elapsedMs(s){return (s.accum||0)+(s.running&&s.runFrom?Math.max(0,Date.now()-s.runFrom):0)}
function durMin(s){var m=Math.round(elapsedMs(s)/60000);if(m>0)return m;var t=minutesBetween(s.start,s.end);return t===''?'':t}
function clockText(ms){
  var t=Math.max(0,Math.floor(ms/1000)),h=Math.floor(t/3600),m=Math.floor(t%3600/60),sec=t%60;
  return h?h+':'+pad(m)+':'+pad(sec):m+':'+pad(sec);
}
function ageCount(s,a){return s.redds.filter(function(r){return r.age===a}).length}
function confCount(s,c){return s.redds.filter(function(r){return r.conf===c}).length}
function reddsWithAdults(s){return s.redds.filter(function(r){return r.adults==='P'}).length}
function pairSeen(s){return s.redds.some(function(r){return r.adults==='P'&&(r.sp==='CCT'||r.sp==='CCT/RB')&&((r.n||0)>=2||r.beh.indexOf('pair')>-1)})}
function liveSurvey(){return surveys.filter(function(s){return s.running})[0]||null}

/* ---------- state ---------- */
var cur=null,curRedd=null,shown=20,year=null,toastTimer=null,saveTimer=null,tickTimer=null,deferredInstall=null,swWaiting=null,swReg=null;
var chipVal={};

/* ---------- render: home ---------- */
function yearsList(){var set={};set[new Date().getFullYear()]=1;surveys.forEach(function(s){if(s.date)set[+s.date.slice(0,4)]=1});return Object.keys(set).map(Number).sort(function(a,b){return b-a})}
function inYear(s){return year==='all'||String(s.date||'').slice(0,4)===String(year)}
function render(){renderNotice();renderYear();renderLive();renderSurveys();renderSeason();renderExport();renderSettings()}
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
function renderLive(){
  var s=liveSurvey();
  $('#liveSec').hidden=!s||(cur&&cur===s&&!$('#surveySheet').hidden);
  if(!s)return;
  $('#liveClock').textContent=clockText(elapsedMs(s));
  $('#liveWhere').textContent=(s.stream||'Stream not named')+(s.reach?' · '+s.reach:'')+' · started '+(s.start||'');
  $('#liveCard').setAttribute('data-id',s.id);
}
function resultLine(s){
  var n=s.redds.length,bits=[];
  if(s.vis==='3'&&!n&&s.fish!=='P')return 'Not surveyable (visibility 3)';
  bits.push(n?plural(n,'redd'):'No redds');
  if(n){var a1=ageCount(s,'1');if(a1)bits.push(a1+' fresh')}
  bits.push(s.fish==='P'?plural(s.fishN||1,'fish','fish')+' seen':s.fish==='A'?'no fish seen':'fish not recorded');
  var d=durMin(s);if(d!==''&&d>0)bits.push(d+' min');
  return bits.join(' · ');
}
function renderSurveys(){
  var list=surveys.filter(inYear).sort(function(a,b){return (a.date<b.date?1:a.date>b.date?-1:0)||((b.createdAt||0)-(a.createdAt||0))}),el=$('#surveys');
  if(!list.length){
    el.innerHTML='<div class="firstrun">'+
      '<p><b>No surveys '+(year==='all'?'yet':'in the '+year+' season')+'.</b></p>'+
      '<p>New to this? Open the <b>Field guide</b> below and read it through once \u2014 what a redd looks like, where to look, how to age and measure one, and why a walk that finds nothing still matters. Then try <b>Check yourself</b>.</p>'+
      '<p>When you are at the bottom of the reach, tap <b>Start a survey</b>.</p>'+
      '<div class="btnrow"><button type="button" class="ghost" data-jump="howto">Open the field guide</button>'+
      '<button type="button" class="ghost" data-jump="selfcheck">Check yourself</button></div></div>';
    $('#moreBtn').hidden=true;return;
  }
  el.innerHTML=list.slice(0,shown).map(function(s){
    var n=s.redds.length;
    var pill=s.running?'<span class="pill live">Running</span>':pairSeen(s)?'<span class="pill hit">Pair seen</span>':n?'<span class="pill hit">'+plural(n,'redd')+'</span>':s.vis==='3'?'<span class="pill blank">Vis 3</span>':'<span class="pill blank">Nil</span>';
    return '<button type="button" class="obs" data-open="'+esc(s.id)+'" style="grid-template-columns:1fr auto"><span class="d"><span class="e-date">'+esc(fmtDate(s.date,true))+(s.start?' · '+esc(s.start):'')+'</span>'+
      '<small>'+esc((s.stream||'Stream not named')+(s.reach?' · '+s.reach:''))+'</small><small>'+esc(resultLine(s))+'</small></span>'+pill+'</button>';
  }).join('');
  $('#moreBtn').hidden=list.length<=shown;
}
function streamKey(s){return s.stream+'||'+(s.reach||'')}
function seasonRows(list){
  var map={};
  list.slice().sort(function(a,b){return a.date<b.date?-1:1}).forEach(function(s){
    if(!s.stream)return;
    var k=streamKey(s)+'||'+s.date.slice(0,4);
    var r=map[k]||(map[k]={stream:s.stream,reach:s.reach||'',season:s.date.slice(0,4),visits:0,good:0,first:s.date,last:s.date,
      redds:0,a1:0,a2:0,a3:0,cC:0,cP:0,cPo:0,withAd:0,fishVisits:0,peakFish:0,pairs:0,minutes:0,timed:0,firstRedd:'',lastRedd:'',firstFresh:''});
    r.visits++;if(s.vis&&s.vis!=='3')r.good++;r.last=s.date;
    r.redds+=s.redds.length;r.a1+=ageCount(s,'1');r.a2+=ageCount(s,'2');r.a3+=ageCount(s,'3');
    r.cC+=confCount(s,'Confirmed');r.cP+=confCount(s,'Probable');r.cPo+=confCount(s,'Possible');
    r.withAd+=reddsWithAdults(s);
    if(s.fish==='P'){r.fishVisits++;r.peakFish=Math.max(r.peakFish,s.fishN||1)}
    if(pairSeen(s))r.pairs++;
    var d=durMin(s);if(d!==''&&d>0){r.minutes+=d;r.timed++}
    if(s.redds.length){if(!r.firstRedd)r.firstRedd=s.date;r.lastRedd=s.date}
    if(ageCount(s,'1')&&!r.firstFresh)r.firstFresh=s.date;
  });
  return Object.keys(map).map(function(k){var r=map[k];r.meanMin=r.timed?Math.round(r.minutes/r.timed):'';return r})
    .sort(function(a,b){return a.stream.localeCompare(b.stream)||a.reach.localeCompare(b.reach)||a.season.localeCompare(b.season)});
}
function renderSeason(){
  var rows=seasonRows(surveys.filter(inYear)),el=$('#season');
  $('#ss-sub').textContent=rows.length?plural(rows.length,'stream'):'';
  if(!rows.length){el.innerHTML='<p class="empty">Totals for each stream appear here once you log surveys.</p>';return}
  el.innerHTML='<div class="tablewrap"><table class="dt"><thead><tr><th>Stream · reach</th><th>Visits</th><th>Redds</th><th>Age<br>1</th><th>With<br>fish</th></tr></thead><tbody>'+rows.map(function(r){
    return '<tr><td>'+esc(r.stream)+(r.reach?' · '+esc(r.reach):'')+(year==='all'?' <small>'+r.season+'</small>':'')+
      '<br><small>last '+esc(fmtDate(r.last))+(r.meanMin?' · '+r.meanMin+' min avg':'')+(r.pairs?' · <b class="due">pair seen</b>':'')+'</small></td>'+
      '<td>'+r.visits+'</td><td>'+r.redds+'</td><td>'+r.a1+'</td><td>'+r.fishVisits+'</td></tr>';
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
  if(document.activeElement!==$('#s-crew'))$('#s-crew').value=settings.crew||'';
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
    box.innerHTML=(CHIPS[key]||[]).map(function(o){var p=o[1].split(' · ');
      return '<button type="button" class="chip" data-v="'+esc(o[0])+'" aria-pressed="false">'+(p.length>1?'<b>'+esc(p[0])+'</b> '+esc(p.slice(1).join(' · ')):esc(o[1]))+'</button>'}).join('');
  });
}
function isMulti(key){var b=$('.chips[data-chip="'+key+'"]');return !!(b&&b.getAttribute('data-multi'))}
function setChip(key,v){
  chipVal[key]=isMulti(key)?(Array.isArray(v)?v.slice():[]):(v||'');
  $$('.chips[data-chip="'+key+'"] .chip').forEach(function(b){
    var on=isMulti(key)?chipVal[key].indexOf(b.getAttribute('data-v'))>-1:chipVal[key]===b.getAttribute('data-v');
    b.setAttribute('aria-pressed',String(on));
  });
  if(key==='vis')$('#visWarn').hidden=chipVal.vis!=='3';
  if(key==='fish')$('#fishNBox').hidden=chipVal.fish!=='P';
  if(key==='adults')$('#adultBox').hidden=chipVal.adults!=='P';
  if(key==='age')applyAge();
  if(key==='adults'||key==='beh'||key==='sp')updatePairNote();
}
function getChip(key){var v=chipVal[key];return Array.isArray(v)?v.slice():(v||'')}
function applyAge(){
  var a=getChip('age'),old=a==='3',help=$('#ageHelp');
  $('#age3Warn').hidden=!old;
  $('#measBox').classList.toggle('dim',old);
  $('#rd-len').disabled=old;$('#rd-wid').disabled=old;
  if(old){$('#rd-len').value='';$('#rd-wid').value=''}
  if(a&&AGE_WHAT[a]){help.textContent=AGE_WHAT[a];help.hidden=false}else help.hidden=true;
  sizeRead();
}
function sizeRead(){
  var el=$('#sizeRead'),mark=$('#sizeBarHolder .sb-mark'),L=num($('#rd-len').value),W=num($('#rd-wid').value);
  var read=window.CCTLearn?CCTLearn.readLength(L):null;
  if(mark){
    if(read){mark.hidden=false;mark.style.left=CCTLearn.pct(L)+'%';mark.setAttribute('data-band',read.band);
      var v=mark.querySelector('.sb-val');if(v)v.textContent=L+' cm';}
    else mark.hidden=true;
  }
  if(!read){
    if(W!==''&&W>0){el.textContent='Width noted. Length is the measurement that separates the species, so get it if you safely can.';el.className='sizeread';el.hidden=false}
    else el.hidden=true;
    return;
  }
  el.textContent=read.text;el.hidden=false;
  el.className='sizeread'+(read.flag?' flag':read.band==='cct'?' good':'');
}
function updatePairNote(){
  var n=int($('#rd-n').value),sp=getChip('sp'),b=getChip('beh');
  $('#pairNote').hidden=!(getChip('adults')==='P'&&(sp==='CCT'||sp==='CCT/RB'||sp==='')&&(n>=2||b.indexOf('pair')>-1));
}

/* ---------- sheets ---------- */
var openStack=[];
function showSheet(id){var el=$('#'+id);el.hidden=false;document.body.style.overflow='hidden';openStack.push({id:id,opener:document.activeElement});var h=$('h2',el);if(h)h.focus();$('.sheet-scroll',el).scrollTop=0}
function hideSheet(id){
  $('#'+id).hidden=true;
  var i=openStack.map(function(x){return x.id}).lastIndexOf(id),entry=i>-1?openStack.splice(i,1)[0]:null;
  if(!openStack.length)document.body.style.overflow='';
  if(entry&&entry.opener&&document.contains(entry.opener)){try{entry.opener.focus()}catch(e){}}
}

/* ---------- stream + reach suggestions ---------- */
function allStreams(){
  var set={};PROJECT_STREAMS.forEach(function(n){set[n]=1});
  settings.customStreams.forEach(function(n){set[n]=1});
  surveys.forEach(function(s){if(s.stream)set[s.stream]=1});
  return Object.keys(set).sort();
}
function fillStreamList(){$('#streamList').innerHTML=allStreams().map(function(n){return '<option value="'+esc(n)+'">'}).join('')}
function fillReachList(){
  var re={},c=$('#sv-stream').value.trim();
  surveys.forEach(function(s){if(s.reach&&(!c||s.stream===c))re[s.reach]=1});
  $('#reachList').innerHTML=Object.keys(re).sort().map(function(x){return '<option value="'+esc(x)+'">'}).join('');
}

/* ---------- survey ---------- */
function blankSurvey(){
  return normSurvey({id:newId('s'),v:3,stream:'',reach:'',date:todayStr(),crew:settings.crew||'',start:'',end:'',
    accum:0,running:false,runFrom:0,stopped:false,wt:'',vis:'',flow:'',trend:'',fish:'',fishN:0,others:[],notes:'',redds:[],
    createdAt:Date.now(),updatedAt:Date.now()});
}
function openSurvey(id){
  var s=id?findSurvey(id):null,isNew=!s;
  if(isNew){s=blankSurvey();surveys.push(s)}
  cur=s;
  fillStreamList();
  $('#sv-stream').value=s.stream;$('#sv-reach').value=s.reach;$('#sv-date').value=s.date;$('#sv-date').max=todayStr();
  $('#sv-crew').value=s.crew||'';$('#sv-start').value=s.start||'';$('#sv-end').value=s.end||'';
  $('#sv-wt').value=s.wt==null?'':s.wt;$('#sv-fishn').value=s.fishN||1;$('#sv-notes').value=s.notes||'';
  ['vis','flow','trend','fish'].forEach(function(k){setChip(k,s[k])});setChip('others',s.others);
  fillReachList();renderReddList();renderTimer();renderSummary();
  $('#sv-title').textContent=isNew?'New survey':'Survey';
  $('#sv-saved').textContent='Saved on this phone as you go.';
  resetDel($('#delSurvey'),'Delete this survey');
  showSheet('surveySheet');renderLive();
  if(isNew)$('#sv-stream').focus();
}
function readSurvey(){
  if(!cur)return;
  cur.stream=$('#sv-stream').value.trim();cur.reach=$('#sv-reach').value.trim();
  cur.date=$('#sv-date').value||cur.date;cur.crew=$('#sv-crew').value.trim();
  cur.start=$('#sv-start').value;cur.end=$('#sv-end').value;
  cur.wt=num($('#sv-wt').value);cur.notes=$('#sv-notes').value.trim();
  ['vis','flow','trend','fish'].forEach(function(k){cur[k]=getChip(k)});cur.others=getChip('others');
  cur.fishN=cur.fish==='P'?Math.max(1,int($('#sv-fishn').value)):0;
  cur.updatedAt=Date.now();
}
function saveSurveySoon(){
  clearTimeout(saveTimer);
  saveTimer=setTimeout(function(){
    if(!cur)return;
    var beforeStream=cur.stream;
    readSurvey();saveData();
    if(beforeStream!==cur.stream)fillReachList();
    renderSummary();$('#sv-saved').textContent='Saved on this phone · '+nowHM();
  },250);
}
function isEmpty(s){return !s.stream&&!s.reach&&!s.redds.length&&!s.notes&&!s.vis&&!s.fish&&!s.accum&&!s.running&&s.wt===''}
function closeSurvey(){
  clearTimeout(saveTimer);readSurvey();
  if(cur&&isEmpty(cur)){surveys=surveys.filter(function(x){return x!==cur});toast('Empty survey discarded.')}
  else if(cur&&cur.stream&&PROJECT_STREAMS.indexOf(cur.stream)<0&&settings.customStreams.indexOf(cur.stream)<0){settings.customStreams.push(cur.stream);saveSettings()}
  saveData();askPersist();cur=null;hideSheet('surveySheet');render();
}

/* ---------- the clock ---------- */
function renderTimer(){
  if(!cur)return;
  var ms=elapsedMs(cur),main=$('#timerMain'),stop=$('#timerStop'),card=$('#timerCard');
  $('#clock').textContent=clockText(ms);
  card.classList.toggle('running',cur.running);
  if(cur.running){
    main.textContent='Pause';main.className='big-btn pause';stop.hidden=false;
    $('#clockSub').textContent='Running since '+(cur.start||nowHM())+'. Keep walking.';
  }else if(cur.stopped){
    main.textContent='Resume';main.className='big-btn go';stop.hidden=true;
    var d=durMin(cur);
    $('#clockSub').textContent=(d===''||d===0)
      ? 'The clock wasn\u2019t used. Type the start and end times by hand if you have them.'
      : 'Stopped'+(cur.end?' at '+cur.end:'')+'. Total survey time '+d+' min.';
  }else if(ms>0){
    main.textContent='Resume';main.className='big-btn go';stop.hidden=false;
    $('#clockSub').textContent='Paused at '+clockText(ms)+'.';
  }else{
    main.textContent='Start';main.className='big-btn go';stop.hidden=true;
    $('#clockSub').textContent='Tap start when you step in at the bottom of the reach.';
  }
}
function timerStart(){
  if(!cur||cur.running)return;
  var other=liveSurvey();
  if(other&&other!==cur){other.running=false;other.accum=elapsedMs(other);other.runFrom=0;other.stopped=true;if(!other.end)other.end=nowHM()}
  cur.running=true;cur.runFrom=Date.now();cur.stopped=false;
  if(!cur.start)cur.start=nowHM();
  $('#sv-start').value=cur.start;
  readSurvey();saveData();renderTimer();startTicking();
  toast(cur.accum?'Clock resumed.':'Clock started at '+cur.start+'.');
}
function timerPause(){
  if(!cur||!cur.running)return;
  cur.accum=elapsedMs(cur);cur.running=false;cur.runFrom=0;
  readSurvey();saveData();renderTimer();toast('Paused. Tap resume when you start walking again.');
}
function timerStop(){
  if(!cur)return;
  var ran=cur.running||cur.accum>0;
  cur.accum=elapsedMs(cur);cur.running=false;cur.runFrom=0;cur.stopped=true;
  if(ran&&!cur.end){cur.end=nowHM();$('#sv-end').value=cur.end}
  readSurvey();saveData();renderTimer();renderSummary();
  var d=durMin(cur);
  toast(d===''||d===0?'Clock stopped.':'Clock stopped. '+d+' min on the water.');
}
function startTicking(){
  if(tickTimer)return;
  tickTimer=setInterval(function(){
    var live=liveSurvey();
    if(!live){clearInterval(tickTimer);tickTimer=null;return}
    if(cur&&cur.running&&!$('#surveySheet').hidden)renderTimer();
    if($('#surveySheet').hidden)renderLive();
  },1000);
}

/* ---------- redds ---------- */
function initials(s){return String(s||'').replace(/\(.*?\)/g,' ').split(/[\s\-]+/).filter(function(w){return /[A-Za-z0-9]/.test(w)}).map(function(w){return w[0]}).join('').toUpperCase().slice(0,4)||'R'}
function suggestReddId(){
  var d=cur.date||todayStr(),n=cur.redds.length+1,base=initials(cur.stream)+'-'+d.slice(5,7)+d.slice(8,10)+'-',used={};
  surveys.forEach(function(s){s.redds.forEach(function(r){used[r.label]=1})});
  while(used[base+pad(n)])n++;
  return base+pad(n);
}
function renderReddList(){
  var el=$('#reddList');
  if(!cur.redds.length){el.innerHTML='<p class="empty" style="padding:8px 0">None yet. Tap <b>Redd found</b> for each one. Finding none is a result — save the survey either way.</p>';return}
  el.innerHTML=cur.redds.slice().sort(function(a,b){return (a.time||'')<(b.time||'')?-1:1}).map(function(r){
    var size=r.len!==''||r.wid!==''?(r.len!==''?r.len:'?')+' × '+(r.wid!==''?r.wid:'?')+' cm':(r.age==='3'?'not measurable':'not measured');
    var ad=r.adults==='P'?(r.n||1)+' '+(r.sp?lab('sp',r.sp):'adult')+(r.beh.indexOf('pair')>-1?', paired':''):'no adults';
    var tag=r.age?'<span class="rtag age-'+esc(r.age)+'">Age '+esc(r.age)+'</span>':'<span class="rtag">Redd</span>';
    var line1=[r.conf||'',size,ad].filter(Boolean).join(' · ');
    return '<button type="button" class="obs" data-redd="'+esc(r.id)+'"><span class="t">'+esc(r.time||'')+'</span><span class="d">'+esc(r.label||'Redd')+
      '<small>'+esc(line1)+'</small>'+(r.gps?'<small>'+esc(r.gps)+'</small>':'<small class="miss">no GPS point</small>')+'</span>'+tag+'</button>';
  }).join('');
}
function renderSummary(){
  if(!cur)return;
  var n=cur.redds.length,d=durMin(cur);
  $('#svSummary').innerHTML='<div><b>'+n+'</b><span>Redds</span></div>'+
    '<div><b>'+ageCount(cur,'1')+' / '+ageCount(cur,'2')+' / '+ageCount(cur,'3')+'</b><span>Age 1 / 2 / 3</span></div>'+
    '<div><b>'+confCount(cur,'Confirmed')+' / '+confCount(cur,'Probable')+' / '+confCount(cur,'Possible')+'</b><span>Conf / Prob / Poss</span></div>'+
    '<div><b>'+(d===''?'—':d)+'</b><span>Minutes surveyed</span></div>'+
    '<div><b>'+(cur.fish==='P'?(cur.fishN||1):cur.fish==='A'?'0':'—')+'</b><span>Cutthroat seen</span></div>'+
    '<div class="wide"><span>Result</span><b>'+esc(resultLine(cur))+(pairSeen(cur)?' · spawning pair recorded':'')+'</b></div>';
}
var RD_TEXT={label:'rd-id',time:'rd-time',gps:'rd-gps',photos:'rd-photos',notes:'rd-notes'};
function openRedd(id){
  readSurvey();
  if(!cur.stream){toast('Name the stream first, so the redd ID and the flag match.');$('#sv-stream').focus();return}
  var r=id?cur.redds.filter(function(x){return x.id===id})[0]:null;curRedd=r;
  Object.keys(RD_TEXT).forEach(function(k){$('#'+RD_TEXT[k]).value=r?(r[k]||''):''});
  $('#rd-len').value=r&&r.len!==''?r.len:'';$('#rd-wid').value=r&&r.wid!==''?r.wid:'';
  $('#rd-n').value=r&&r.n?r.n:1;
  if(!r){$('#rd-id').value=suggestReddId();$('#rd-time').value=nowHM()}
  setChip('conf',r?r.conf:'');setChip('age',r?r.age:'');setChip('adults',r?r.adults:'');setChip('sp',r?r.sp:'CCT');setChip('beh',r?r.beh:[]);
  setChip('who',r?r.who:'');setChip('hab',r?r.hab:'');
  $('#rd-more').open=!!r&&!!(r.hab||r.photos||r.notes);
  $('#isReddAid').open=false;
  gpsEcho();checkRanges();updatePairNote();$('#rd-msg').textContent='';
  $('#rd-title').textContent=r?'Edit redd':'Redd found';$('#rd-save').textContent=r?'Save changes':'Save redd';
  $('#rd-del').hidden=!r;resetDel($('#rd-del'),'Delete');
  showSheet('reddSheet');
}
function gpsEcho(){
  var el=$('#gpsRead'),v=$('#rd-gps').value.trim();
  if(!v){el.textContent='Read it off the handheld and type it in. Decimal degrees or UTM both work.';el.className='hint';return}
  var p=parseGps(v);
  if(p&&p.kind==='dd'){el.textContent='Decimal degrees: '+p.lat.toFixed(5)+', '+p.lon.toFixed(5)+'. Exports as latitude and longitude.';el.className='hint ok'}
  else if(p&&p.kind==='utm'){el.textContent='UTM zone '+p.zone+', '+p.easting+' E, '+p.northing+' N. Saved as typed.';el.className='hint ok'}
  else{el.textContent='Saved as typed. It won\'t export as latitude and longitude, which is fine if that\'s how the handheld reads.';el.className='hint'}
}
function checkRanges(){
  $$('#reddForm input[data-range]').forEach(function(inp){
    var r=inp.getAttribute('data-range').split(',').map(Number),v=parseFloat(inp.value),h=$('.range[data-for="'+inp.id+'"]');
    if(h)h.classList.toggle('out',!isNaN(v)&&(v<r[0]||v>r[1]));
  });
  sizeRead();
}
function saveRedd(e){
  e.preventDefault();
  if(!getChip('conf')){$('#rd-msg').textContent='How sure are you it is a redd? Confirmed, Probable or Possible.';return}
  if(!getChip('age')){$('#rd-msg').textContent='Pick the redd age: 1, 2 or 3.';return}
  if(!getChip('adults')){$('#rd-msg').textContent='Were adults on the redd? Pick present or absent.';return}
  if(!$('#rd-id').value.trim()){$('#rd-msg').textContent='Give the redd an ID. It goes on the flagging tape.';return}
  var r=curRedd||{id:newId('r')};
  Object.keys(RD_TEXT).forEach(function(k){r[k]=$('#'+RD_TEXT[k]).value.trim()});
  r.len=getChip('age')==='3'?'':num($('#rd-len').value);
  r.wid=getChip('age')==='3'?'':num($('#rd-wid').value);
  r.age=getChip('age');r.conf=getChip('conf');r.adults=getChip('adults');r.who=getChip('who');r.hab=getChip('hab');
  if(r.adults==='P'){r.n=Math.max(1,int($('#rd-n').value));r.sp=getChip('sp');r.beh=getChip('beh')}
  else{r.n=0;r.sp='';r.beh=[]}
  if(!curRedd)cur.redds.push(r);
  /* a fish on a redd means fish were seen in the reach */
  if(r.adults==='P'&&(r.sp==='CCT'||r.sp==='CCT/RB')){
    if(getChip('fish')!=='P'){setChip('fish','P');$('#sv-fishn').value=Math.max(1,r.n||1)}
    else if(int($('#sv-fishn').value)<(r.n||1))$('#sv-fishn').value=r.n||1;
  }
  readSurvey();saveData();hideSheet('reddSheet');renderReddList();renderSummary();
  if(r.adults==='P'&&(r.sp==='CCT'||r.sp==='CCT/RB')&&((r.n||0)>=2||r.beh.indexOf('pair')>-1))
    toast('Spawning pair recorded on '+r.label+'. A rare record — add a photo ID if you have one.');
  else toast('Redd '+r.label+' saved. Flag it before you move on: date, how many redds, the ID, your initials.');
}

/* ---------- delete with in-page confirm ---------- */
function resetDel(b,t){b.classList.remove('sure');b.textContent=t;b.setAttribute('data-t',t)}
function confirmDel(b,go){
  if(b.classList.contains('sure')){go();return}
  b.classList.add('sure');b.textContent='Tap again to delete';
  setTimeout(function(){if(document.contains(b))resetDel(b,b.getAttribute('data-t')||'Delete')},5000);
}

/* ---------- exports ---------- */
function exportList(){return surveys.filter(inYear).filter(function(s){return s.stream})
  .sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:((a.start||'')<(b.start||'')?-1:1)})}
function visitNumbers(list){var c={},out={};list.forEach(function(s){var k=streamKey(s)+'||'+s.date.slice(0,4);c[k]=(c[k]||0)+1;out[s.id]=c[k]});return out}
function summaryRows(list){
  var rows=[['Stream','Reach','Season','Visits','Visits with visibility 1–2','First visit','Last visit','Total survey minutes','Mean minutes per visit',
    'Redds found','Age 1 (fresh)','Age 2','Age 3','Confirmed','Probable','Possible','Redds with adults present','Visits with cutthroat seen','Peak cutthroat (one visit)','Spawning pairs recorded',
    'First redd','First fresh (age 1) redd','Last redd']];
  seasonRows(list).forEach(function(r){rows.push([r.stream,r.reach,+r.season,r.visits,r.good,r.first,r.last,r.minutes||'',r.meanMin,
    r.redds,r.a1,r.a2,r.a3,r.cC,r.cP,r.cPo,r.withAd,r.fishVisits,r.peakFish,r.pairs,r.firstRedd,r.firstFresh,r.lastRedd])});
  return rows;
}
function surveyRows(list){
  var vn=visitNumbers(list),rows=[['Stream','Reach','Date','Visit # (season)','Crew','Start time','End time','Survey minutes','Water temp (°C)',
    'Visibility','Flow','Flow trend','Redds found','Age 1 (fresh)','Age 2','Age 3','Confirmed','Probable','Possible','Redds with adults','Cutthroat seen (1/0)','Cutthroat counted',
    'Spawning pair','Other species seen','Surveyable (1/0)','Notes','Survey ID']];
  list.forEach(function(s){
    rows.push([s.stream,s.reach,s.date,vn[s.id],s.crew,s.start,s.end,durMin(s),s.wt,
      lab('vis',s.vis),lab('flow',s.flow),lab('trend',s.trend),s.redds.length,ageCount(s,'1'),ageCount(s,'2'),ageCount(s,'3'),
      confCount(s,'Confirmed'),confCount(s,'Probable'),confCount(s,'Possible'),reddsWithAdults(s),s.fish==='P'?1:s.fish==='A'?0:'',s.fish==='P'?(s.fishN||1):s.fish==='A'?0:'',
      pairSeen(s)?'Yes':'No',s.others.map(function(o){return lab('others',o)}).join('; '),s.vis?(s.vis==='3'?0:1):'',s.notes,s.id]);
  });
  return rows;
}
function reddRows(list){
  var rows=[['Redd ID','Stream','Reach','Date','Time','GPS as entered','Latitude','Longitude','Confidence','Age','Age meaning',
    'Length (cm)','Width (cm)','Adults','Adults (#)','Adult species','Behaviour','Whose redd (best call)','Channel position','Photo/video IDs','Notes','Survey ID']];
  list.forEach(function(s){s.redds.forEach(function(r){
    rows.push([r.label,s.stream,s.reach,s.date,r.time,r.gps,gpsLat(r.gps),gpsLon(r.gps),r.conf,r.age?+r.age:'',AGE_FULL[r.age]||'',
      r.len,r.wid,lab('adults',r.adults),r.adults==='P'?(r.n||1):0,r.adults==='P'?lab('sp',r.sp):'',
      r.beh.map(function(b){return lab('beh',b)}).join('; '),lab('who',r.who),lab('hab',r.hab),r.photos,r.notes,s.id]);
  })});
  return rows;
}
function suffix(){return year==='all'?'all-seasons':String(year)}
function csvCell(v){var s=String(v==null?'':v);return /[",\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}
function toCsv(rows){return '\ufeff'+rows.map(function(r){return r.map(csvCell).join(',')}).join('\r\n')}
async function deliver(filename,data,mime){
  var blob=new Blob([data],{type:mime}),touch=window.matchMedia&&matchMedia('(pointer:coarse)').matches;
  if(touch&&navigator.canShare&&typeof File==='function'){
    try{var f=new File([blob],filename,{type:mime});if(navigator.canShare({files:[f]})){await navigator.share({files:[f],title:filename});return true}}
    catch(e){if(e&&e.name==='AbortError')return false}
  }
  var url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.rel='noopener';
  document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(url);a.remove()},4000);return true;
}
function exportBook(){
  var list=exportList();if(!list.length){toast('No surveys with a stream named in this season.');return}
  var bytes;
  try{bytes=window.makeXlsxBook([{name:'Season summary',rows:summaryRows(list)},{name:'Surveys',rows:surveyRows(list)},{name:'Redds',rows:reddRows(list)}])}
  catch(e){toast('Could not make the Excel file. Try CSV instead.');return}
  deliver('cct-stream-survey-'+suffix()+'.xlsx',bytes,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}
function exportCsv(which){
  var list=exportList();if(!list.length){toast('No surveys with a stream named in this season.');return}
  var m={summary:['cct-season-summary',summaryRows],surveys:['cct-surveys',surveyRows],redds:['cct-redds',reddRows]}[which];
  deliver(m[0]+'-'+suffix()+'.csv',toCsv(m[1](list)),'text/csv');
}

/* ---------- backup ---------- */
async function backup(){
  var data={app:'cct-stream-survey',format:3,exportedAt:new Date().toISOString(),settings:{crew:settings.crew,customStreams:settings.customStreams},surveys:surveys};
  var ok=await deliver('cct-stream-survey-backup-'+todayStr()+'.json',JSON.stringify(data,null,1),'application/json');
  if(ok){settings.lastBackup=Date.now();saveSettings();render();toast('Backup file made. Keep it somewhere safe.')}
}
function mergeBackup(data){
  if(!data||!Array.isArray(data.surveys))throw new Error('bad');
  var incoming;
  if(data.app==='cct-stream-survey')incoming=data.surveys.map(normSurvey);
  else if(data.app==='cct-spawner-survey')incoming=data.surveys.map(fromV2);
  else if(data.app==='cct-field-survey')incoming=data.surveys.map(fromV1);
  else throw new Error('not ours');
  var byId={},added=0,updated=0;surveys.forEach(function(s){byId[s.id]=s});
  incoming.forEach(function(s){if(!s||!s.id)return;var c=byId[s.id];if(!c){byId[s.id]=s;added++}else if((s.updatedAt||0)>(c.updatedAt||0)){byId[s.id]=s;updated++}});
  surveys=Object.keys(byId).map(function(k){return byId[k]});
  if(data.settings){
    if(!settings.crew&&(data.settings.crew||data.settings.obs))settings.crew=data.settings.crew||data.settings.obs;
    (data.settings.customStreams||data.settings.customCreeks||[]).forEach(function(n){if(settings.customStreams.indexOf(n)<0)settings.customStreams.push(n)});
  }
  return {added:added,updated:updated};
}
function restoreFile(file){
  var r=new FileReader();
  r.onload=function(){
    try{var res=mergeBackup(JSON.parse(r.result));saveData();saveSettings();year=null;render();
      toast(res.added||res.updated?'Restored: '+plural(res.added,'new survey')+(res.updated?', '+res.updated+' updated':'')+'.':'Nothing new in that backup. Your surveys are unchanged.')}
    catch(e){toast('That file is not a CCT survey backup.')}
  };
  r.onerror=function(){toast('Could not read that file.')};r.readAsText(file);
}

/* ---------- events ---------- */
function bind(){
  $('#startBtn').addEventListener('click',function(){openSurvey(null)});
  $('#liveOpen').addEventListener('click',function(){var id=$('#liveCard').getAttribute('data-id');if(id)openSurvey(id)});
  $('#surveys').addEventListener('click',function(e){
    var j=e.target.closest('[data-jump]');
    if(j){var panel=$('#'+j.getAttribute('data-jump'));panel.open=true;panel.scrollIntoView({behavior:'smooth',block:'start'});return}
    var b=e.target.closest('[data-open]');if(b)openSurvey(b.getAttribute('data-open'));
  });
  $('#moreBtn').addEventListener('click',function(){shown+=20;renderSurveys()});
  $('#yearSel').addEventListener('change',function(e){year=e.target.value==='all'?'all':+e.target.value;shown=20;render()});

  $('#timerMain').addEventListener('click',function(){if(!cur)return;if(cur.running)timerPause();else timerStart()});
  $('#timerStop').addEventListener('click',timerStop);

  document.addEventListener('click',function(e){
    var cl=e.target.closest('[data-close]');
    if(cl){var id=cl.getAttribute('data-close');if(id==='surveySheet')closeSurvey();else hideSheet(id);return}
    var ch=e.target.closest('.chips[data-chip] .chip');
    if(ch){
      var key=ch.closest('.chips').getAttribute('data-chip'),val=ch.getAttribute('data-v');
      if(isMulti(key)){var a=getChip(key),i=a.indexOf(val);if(i>-1)a.splice(i,1);else a.push(val);setChip(key,a)}
      else setChip(key,getChip(key)===val&&key!=='adults'&&key!=='fish'&&key!=='age'?'':val);
      if(ch.closest('#surveyForm'))saveSurveySoon();
      if(ch.closest('#reddForm'))$('#rd-msg').textContent='';
      return;
    }
    var st=e.target.closest('.stepper button');
    if(st){
      var box=st.closest('.stepper'),inp=$('input',box),min=+box.getAttribute('data-min'),max=+box.getAttribute('data-max'),v=parseInt(inp.value,10);
      if(isNaN(v))v=min;
      inp.value=Math.min(max,Math.max(min,v+parseInt(st.getAttribute('data-step'),10)));
      if(inp.closest('#surveyForm'))saveSurveySoon();
      if(inp.id==='rd-n')updatePairNote();
      return;
    }
  });
  $('#surveyForm').addEventListener('input',function(e){
    if(e.target.id==='sv-stream')fillReachList();
    saveSurveySoon();
  });
  $('#surveyForm').addEventListener('submit',function(e){e.preventDefault()});
  $('#addRedd').addEventListener('click',function(){openRedd(null)});
  $('#reddList').addEventListener('click',function(e){var r=e.target.closest('[data-redd]');if(r)openRedd(r.getAttribute('data-redd'))});
  $('#finishBtn').addEventListener('click',function(){
    readSurvey();
    if(!cur.stream){toast('Name the stream before finishing.');$('#sv-stream').focus();return}
    if(!cur.vis){toast('Pick the visibility (1, 2 or 3) before finishing.');$('.chips[data-chip="vis"] .chip').focus();return}
    if(!cur.fish){toast('Record whether cutthroat were seen — none seen is an answer.');$('.chips[data-chip="fish"] .chip').focus();return}
    if(cur.running||(!cur.stopped&&cur.accum>0))timerStop();
    else cur.stopped=true;
    readSurvey();saveData();
    var d=durMin(cur),tail=(d===''||d===0)?'.':' in '+d+' min.';
    toast(cur.redds.length?'Survey finished: '+plural(cur.redds.length,'redd')+tail:'Survey finished. Nil result recorded.');
    closeSurvey();
  });
  $('#delSurvey').addEventListener('click',function(e){
    confirmDel(e.currentTarget,function(){var s=cur;surveys=surveys.filter(function(x){return x!==s});cur=null;saveData();hideSheet('surveySheet');render();toast('Survey deleted.')});
  });
  $('#reddForm').addEventListener('submit',saveRedd);
  $('#reddForm').addEventListener('input',function(e){
    if(e.target.id==='rd-gps')gpsEcho();
    if(e.target.id==='rd-len'||e.target.id==='rd-wid')checkRanges();
    if(e.target.id==='rd-n')updatePairNote();
  });
  $('#rd-del').addEventListener('click',function(e){
    confirmDel(e.currentTarget,function(){cur.redds=cur.redds.filter(function(x){return x!==curRedd});readSurvey();saveData();hideSheet('reddSheet');renderReddList();renderSummary();toast('Redd deleted.')});
  });
  $('#fmt').addEventListener('click',function(e){var b=e.target.closest('button[data-v]');if(!b)return;settings.fmt=b.getAttribute('data-v');saveSettings();renderExport()});
  $('#exportBook').addEventListener('click',exportBook);
  $('#exportCsv').addEventListener('click',function(e){var b=e.target.closest('[data-csv]');if(b)exportCsv(b.getAttribute('data-csv'))});
  $('#s-crew').addEventListener('input',function(e){settings.crew=e.target.value.trim();saveSettings()});
  $('#backupBtn').addEventListener('click',backup);
  $('#restoreBtn').addEventListener('click',function(){$('#restoreFile').click()});
  $('#restoreFile').addEventListener('change',function(e){var f=e.target.files&&e.target.files[0];if(f)restoreFile(f);e.target.value=''});
  $('#notice').addEventListener('click',function(e){
    var b=e.target.closest('button[data-act]');if(!b)return;
    if(b.getAttribute('data-act')==='backup')backup();
    if(b.getAttribute('data-act')==='update'&&swWaiting)swWaiting.postMessage('skipWaiting');
  });
  $('#installBtn').addEventListener('click',async function(){if(!deferredInstall)return;deferredInstall.prompt();try{await deferredInstall.userChoice}catch(e){}deferredInstall=null;renderSettings()});
  $('#updateBtn').addEventListener('click',checkForUpdate);
  document.addEventListener('keydown',function(e){
    if(e.key!=='Escape'||!openStack.length)return;
    var top=openStack[openStack.length-1].id;
    if(top==='surveySheet')closeSurvey();else hideSheet(top);
  });
  window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferredInstall=e;renderSettings()});
  window.addEventListener('pagehide',function(){if(cur){readSurvey();saveData()}});
  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='hidden'&&cur){readSurvey();saveData()}
    if(document.visibilityState==='visible'){updateToday();if(cur&&!$('#surveySheet').hidden)renderTimer();else render();if(liveSurvey())startTicking()}
  });
  setInterval(updateToday,60000);
}
function updateToday(){$('#today').textContent=new Date().toLocaleDateString('en-CA',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}

/* ---------- service worker + updates ---------- */
function registerSW(){
  if(!('serviceWorker' in navigator))return;
  var reloading=false,had=!!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange',function(){
    if(reloading||!had)return;if(cur){readSurvey();saveData()}reloading=true;location.reload();
  });
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
  btn.disabled=true;btn.textContent='Checking…';
  try{await swReg.update()}catch(e){}
  await new Promise(function(r){setTimeout(r,1500)});
  btn.disabled=false;btn.textContent='Check for updates';
  var w=swReg.waiting||swReg.installing;
  if(w){toast('Updating…');if(swReg.waiting)swReg.waiting.postMessage('skipWaiting');else w.addEventListener('statechange',function(){if(w.state==='installed')w.postMessage('skipWaiting')})}
  else toast('You have the latest version ('+APP_VERSION+').');
}

/* ---------- the teaching layer (learn.js) ---------- */
function buildLearning(){
  if(!window.CCTLearn)return;
  $('#measDgm').innerHTML=CCTLearn.anatomySvg()+CCTLearn.planSvg();
  $('#sizeBarHolder').innerHTML=CCTLearn.sizeBarHtml(true);
  $('#isReddBody').innerHTML=CCTLearn.compareHtml()+
    '<p class="teach-key">Pit, mound, cleaned gravel \u2014 all three together. The usual false alarms are freshet scour, a ford or animal crossing, and a female\u2019s test dig.</p>';
  var guide=$('#howto'),quiz=$('#selfcheck');
  guide.addEventListener('toggle',function(){
    if(guide.open&&!$('#guide').innerHTML)$('#guide').innerHTML=CCTLearn.guideHtml();
  });
  quiz.addEventListener('toggle',function(){
    if(quiz.open&&!$('#quizHolder').innerHTML){$('#quizHolder').innerHTML=CCTLearn.quizHtml();CCTLearn.startQuiz($('#quizHolder'))}
  });
}

/* ---------- start ---------- */
buildChips();buildLearning();bind();updateToday();fillStreamList();render();
if(liveSurvey())startTicking();
registerSW();
window.__cct={surveys:function(){return surveys},summaryRows:summaryRows,surveyRows:surveyRows,reddRows:reddRows,parseGps:parseGps,clockText:clockText};
})();
