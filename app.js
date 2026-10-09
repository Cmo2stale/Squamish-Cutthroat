/* CCT Field Survey — digital C1 streamwalk + C2 redd datasheets. All data stays on this device (localStorage). */
(function(){
'use strict';
var APP_VERSION='1.0.0';
var $=function(s,r){return (r||document).querySelector(s)};
var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

/* ---------- storage ---------- */
var K_DATA='cct_surveys',K_SET='cct_settings',storageOk=true;
function lsGet(k){try{return localStorage.getItem(k)}catch(e){storageOk=false;return null}}
function lsSet(k,v){try{localStorage.setItem(k,v);return true}catch(e){storageOk=false;return false}}
function loadJSON(k,d){try{var v=JSON.parse(lsGet(k)||'null');return v==null?d:v}catch(e){return d}}
var surveys=loadJSON(K_DATA,[]);if(!Array.isArray(surveys))surveys=[];
var settings=Object.assign({obs:'',gps:'auto',fmt:'xlsx',lastBackup:0},loadJSON(K_SET,{}));
function saveData(){var ok=lsSet(K_DATA,JSON.stringify(surveys));if(!ok)toast('Could not save on this phone. Storage may be full or blocked.');return ok}
function saveSettings(){lsSet(K_SET,JSON.stringify(settings))}
function askPersist(){try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist()}catch(e){}}

/* ---------- reference lists (from the CCT Field Reference & Datasheet Package) ---------- */
var SPECIES=[['CCT','Cutthroat (CCT)'],['CCT/RB','CCT/RB unresolved'],['RB','Rainbow / steelhead'],['coho','Coho'],['chinook','Chinook'],['chum','Chum'],['pink','Pink'],['sockeye','Sockeye'],['char','Char (bull trout / Dolly)'],['unknown','Unknown']];
var CHIPS={
  layer:[['1','Layer 1'],['2','Layer 2'],['3','Layer 3']],
  turbidity:[['clear','Clear'],['slight','Slight tinge'],['turbid','Turbid'],['very','Very turbid']],
  flow:[['H','High'],['M','Medium'],['L','Low']],
  kind:[['live','Live fish'],['carcass','Carcass']],
  species:SPECIES,
  velMethod:[['est','Estimated'],['meas','Measured']],
  habitat:[['tailout','Pool tail-out'],['glide','Glide crest'],['riffle','Riffle head'],['margin','Inside-bend margin'],['other','Other']],
  confidence:[['Confirmed','Confirmed'],['Probable','Probable'],['Possible','Possible']],
  adult:[['Y','Yes'],['N','No']],
  attrib:[['CCT','CCT'],['coho','Coho'],['steelhead','Steelhead / RB'],['otherSalmon','Other salmon'],['unknown','Unknown']],
  basis:[['timing','Timing'],['adults','Adults present'],['juveniles','Juveniles present'],['form','Redd form']],
  window:[['Y','Yes'],['N','No']]
};
function lab(key,v){var o=CHIPS[key]||[];for(var i=0;i<o.length;i++){if(o[i][0]===v)return o[i][1]}return v||''}

/* ---------- dates ---------- */
function pad(n){return String(n).padStart(2,'0')}
function ymd(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function todayStr(){return ymd(new Date())}
function nowHM(){var d=new Date();return pad(d.getHours())+':'+pad(d.getMinutes())}
function fmtDate(s,dow){if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))return s||'';var p=s.split('-').map(Number),dt=new Date(p[0],p[1]-1,p[2]),o={day:'numeric',month:'short'};if(dow)o.weekday='short';if(p[0]!==new Date().getFullYear())o.year='numeric';return dt.toLocaleDateString('en-CA',o)}
function inWindow(s){var m=+String(s||'').slice(5,7);return m>=2&&m<=5}
function daysSince(s){var p=s.split('-').map(Number);return Math.round((new Date(todayStr()+'T00:00')-new Date(p[0],p[1]-1,p[2]))/864e5)}
function newId(p){try{if(window.crypto&&crypto.randomUUID)return p+crypto.randomUUID().replace(/-/g,'').slice(0,16)}catch(e){}return p+Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
function num(v){if(v===''||v==null)return '';var n=Number(v);return isFinite(n)?n:''}
function plural(n,w,p){return n+' '+(n===1?w:(p||w+'s'))}

/* ---------- derived numbers ---------- */
function reddsCCT(s){return s.redds.filter(function(r){return r.attrib==='CCT'})}
function confCount(list,c){return list.filter(function(r){return r.confidence===c}).length}
function liveCount(s,sp){var n=0;s.obs.forEach(function(o){if(o.kind==='live'&&o.species===sp)n+=o.count||0});return n}
function otherNoted(s){
  var m={};
  s.obs.forEach(function(o){if(o.species!=='CCT'&&o.species!=='CCT/RB'){var k=lab('species',o.species)+(o.kind==='carcass'?' carcass':'');m[k]=(m[k]||0)+(o.count||0)}});
  s.redds.forEach(function(r){if(r.attrib&&r.attrib!=='CCT'){var k=lab('attrib',r.attrib)+' redd';m[k]=(m[k]||0)+1}});
  return Object.keys(m).map(function(k){return k+' '+m[k]}).join(', ');
}
function surveyKey(s){return (s.date||'')+' '+(s.stream||'')+' '+(s.reach||'')+' #'+s.id.slice(-5)}
function gpsLat(g){return g?+g.lat.toFixed(6):''}function gpsLon(g){return g?+g.lon.toFixed(6):''}function gpsAcc(g){return g&&g.acc?Math.round(g.acc):''}
function gpsText(g){return g.lat.toFixed(5)+', '+g.lon.toFixed(5)+(g.acc?' (±'+Math.round(g.acc)+' m)':'')}

/* ---------- state ---------- */
var cur=null,curObs=null,curRedd=null,shown=20,year=null,toastTimer=null,saveTimer=null,deferredInstall=null,swWaiting=null,swReg=null;
var chipVal={};          /* key -> value or array, for whichever form is open */
var gpsVals={};          /* gps widget key -> {lat,lon,acc,at} */

/* ---------- render: home ---------- */
function yearsList(){var set={};set[new Date().getFullYear()]=1;surveys.forEach(function(s){if(s.date)set[+s.date.slice(0,4)]=1});return Object.keys(set).map(Number).sort(function(a,b){return b-a})}
function inYear(s){return year==='all'||String(s.date||'').slice(0,4)===String(year)}
function render(){renderNotice();renderYear();renderSurveys();renderReaches();renderExport();renderSettings()}
function renderNotice(){
  var el=$('#notice'),html='',newest=0;
  surveys.forEach(function(s){newest=Math.max(newest,s.updatedAt||0)});
  if(!storageOk)html='<p>This browser is blocking storage, so surveys cannot be saved. Turn off private browsing, or open the app from your home screen.</p>';
  else if(swWaiting)html='<p>A new version of the app is ready.</p><button type="button" data-act="update">Update now</button>';
  else if(surveys.length&&newest>(settings.lastBackup||0)&&Date.now()-newest>2*36e5)html='<p>Some survey data isn\'t in a backup yet. Surveys live only on this phone.</p><button type="button" data-act="backup">Save a backup</button>';
  el.innerHTML=html;el.hidden=!html;
}
function renderYear(){
  var ys=yearsList(),sel=$('#yearSel'),key=ys.join(',');
  if(year===null)year=ys[0];
  if(sel.getAttribute('data-built')!==key){sel.innerHTML=ys.map(function(y){return '<option value="'+y+'">'+y+'</option>'}).join('')+'<option value="all">All years</option>';sel.setAttribute('data-built',key)}
  sel.value=String(year);
}
function sortedSurveys(){return surveys.filter(inYear).sort(function(a,b){return (a.date<b.date?1:a.date>b.date?-1:0)||((b.start||'')>(a.start||'')?1:-1)})}
function renderSurveys(){
  var list=sortedSurveys(),el=$('#surveys');
  if(!list.length){el.innerHTML='<p class="empty" style="padding-top:14px">No surveys '+(year==='all'?'yet':'in '+year)+'. Tap “Start a survey” at the reach. A visit with no redds is still a record.</p>';$('#moreBtn').hidden=true;return}
  el.innerHTML=list.slice(0,shown).map(function(s){
    var cr=reddsCCT(s).length,live=liveCount(s,'CCT');
    var pill=cr?'<span class="pill hit">'+plural(cr,'CCT redd')+'</span>':'<span class="pill blank">No CCT redds</span>';
    var sub=[(s.stream||'Unnamed stream')+(s.reach?' · '+s.reach:''),s.layer?'Layer '+s.layer:'',live?live+' live CCT':'',s.obs.length+s.redds.length?plural(s.obs.length+s.redds.length,'record'):''].filter(Boolean).join(' · ');
    return '<button type="button" class="obs" data-open="'+esc(s.id)+'" style="grid-template-columns:1fr auto"><span class="d"><span class="e-date">'+esc(fmtDate(s.date,true))+(s.start?' · '+esc(s.start):'')+(s.end?'':' <span class="status-live">in progress</span>')+'</span><small>'+esc(sub)+'</small></span>'+pill+'</button>';
  }).join('');
  $('#moreBtn').hidden=list.length<=shown;
}
function renderReaches(){
  var map={},el=$('#reaches');
  surveys.filter(inYear).forEach(function(s){
    var k=(s.stream||'Unnamed stream')+'||'+(s.reach||'');
    var r=map[k]||(map[k]={stream:s.stream||'Unnamed stream',reach:s.reach||'',n:0,last:'',C:0,P:0,Po:0,live:0});
    r.n++;if((s.date||'')>r.last)r.last=s.date||'';
    var c=reddsCCT(s);r.C+=confCount(c,'Confirmed');r.P+=confCount(c,'Probable');r.Po+=confCount(c,'Possible');r.live+=liveCount(s,'CCT');
  });
  var rows=Object.keys(map).map(function(k){return map[k]}).sort(function(a,b){return a.stream.localeCompare(b.stream)||a.reach.localeCompare(b.reach)});
  $('#rs-sub').textContent=rows.length?plural(rows.length,'reach','reaches'):'';
  if(!rows.length){el.innerHTML='<p class="empty">Reach totals appear here once you log surveys.</p>';return}
  var showDue=inWindow(todayStr());
  el.innerHTML='<div class="tablewrap"><table class="dt"><thead><tr><th>Reach</th><th>Visits</th><th>Last</th><th>CCT redds<br>C / P / Po</th><th>Live<br>CCT</th></tr></thead><tbody>'+rows.map(function(r){
    var d=r.last?daysSince(r.last):null,due=showDue&&d!==null&&d>7;
    return '<tr><td>'+esc(r.stream)+(r.reach?' · '+esc(r.reach):'')+'</td><td>'+r.n+'</td><td'+(due?' class="due" title="Due for a revisit"':'')+'>'+esc(fmtDate(r.last))+(d!==null&&d>=0?'<br><small>'+(d===0?'today':d+'d ago')+(due?' · due':'')+'</small>':'')+'</td><td>'+r.C+' / '+r.P+' / '+r.Po+'</td><td>'+r.live+'</td></tr>';
  }).join('')+'</tbody></table></div>';
}
function renderExport(){
  var list=surveys.filter(inYear);
  $('#ex-sub').textContent=year==='all'?'all years':String(year);
  $$('#fmt button').forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-v')===settings.fmt))});
  $('#exportXlsx').hidden=settings.fmt!=='xlsx';$('#exportCsv').hidden=settings.fmt!=='csv';
  $('#exportBook').disabled=!list.length;$$('#exportCsv button').forEach(function(b){b.disabled=!list.length});
}
function renderSettings(){
  if(document.activeElement!==$('#s-obs'))$('#s-obs').value=settings.obs||'';
  $$('#s-gps .chip').forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-v')===settings.gps))});
  $('#bk-status').textContent=settings.lastBackup?'Last backup saved '+new Date(settings.lastBackup).toLocaleString('en-CA',{day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'})+'.':'No backup saved yet.';
  $('#bk-sub').textContent=plural(surveys.length,'survey')+' on this phone';
  var standalone=(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true;
  var ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
  $('#installHint').textContent=standalone?'Installed. Open it from your home screen, even with no signal.':(ios?'In Safari, tap the Share button, then “Add to Home Screen”. Open it from there and it works with no signal.':'Add this app to your home screen so it opens with no signal. In Chrome, use the menu, then “Add to Home screen” or “Install app”.');
  $('#installBtn').hidden=!deferredInstall||standalone;
  $('#version').textContent='Version '+APP_VERSION+' · data is stored only on this device.';
}
function toast(m){var el=$('#toast');el.textContent=m;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(function(){el.hidden=true},3600)}

/* ---------- chips ---------- */
function buildChips(){
  $$('.chips[data-chip]').forEach(function(box){
    var key=box.getAttribute('data-chip');
    box.innerHTML=(CHIPS[key]||[]).map(function(o){return '<button type="button" class="chip" data-v="'+esc(o[0])+'" aria-pressed="false">'+esc(o[1])+'</button>'}).join('');
  });
}
function isMulti(key){var b=$('.chips[data-chip="'+key+'"]');return !!(b&&b.getAttribute('data-multi'))}
function setChip(key,v){
  chipVal[key]=isMulti(key)?(Array.isArray(v)?v.slice():[]):(v||'');
  $$('.chips[data-chip="'+key+'"] .chip').forEach(function(b){
    var on=isMulti(key)?chipVal[key].indexOf(b.getAttribute('data-v'))>-1:chipVal[key]===b.getAttribute('data-v');
    b.setAttribute('aria-pressed',String(on));
  });
  if(key==='adult')$('#rd-adultSpWrap').hidden=chipVal.adult!=='Y';
  if(key==='attrib'||key==='basis')updateReddWarn();
}
function getChip(key){var v=chipVal[key];return Array.isArray(v)?v.slice():(v||'')}

/* ---------- GPS widgets ---------- */
var gpsActive=null;
function buildGps(){
  $$('[data-gps]').forEach(function(box){
    var k=box.getAttribute('data-gps');
    box.innerHTML='<div class="gps"><div class="gps-top"><span class="gps-val">No location yet</span><button type="button" class="ghost" data-gpsbtn="'+k+'">Use my location</button></div><div class="gps-help" hidden></div><button type="button" class="ghost" data-gpsclear="'+k+'" hidden>Remove location</button></div>';
  });
}
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
      if(!best||g.acc<best.acc)best=g;
      gpsVals[k]=best;renderGps(k,'Got ±'+Math.round(best.acc)+' m, refining…');
      if(best.acc<=15)finish();
    },function(err){if(err.code===1)finish('Location is blocked for this app on your phone.','denied')},{enableHighAccuracy:true,maximumAge:0,timeout:60000});
    a.t=setTimeout(function(){finish('Could not get a GPS fix. Try again in a more open spot.')},45000);
  }catch(e){finish('Location is not available here.')}
}

/* ---------- sheets ---------- */
var openStack=[];
function showSheet(id){var el=$('#'+id);el.hidden=false;document.body.style.overflow='hidden';openStack.push({id:id,opener:document.activeElement});var h=$('h2',el);if(h)h.focus();$('.sheet-scroll',el).scrollTop=0}
function hideSheet(id){
  stopGps();
  var el=$('#'+id);el.hidden=true;
  var i=openStack.map(function(x){return x.id}).lastIndexOf(id),entry=i>-1?openStack.splice(i,1)[0]:null;
  if(!openStack.length)document.body.style.overflow='';
  if(entry&&entry.opener&&document.contains(entry.opener)){try{entry.opener.focus()}catch(e){}}
}

/* ---------- survey (C1) ---------- */
function blankSurvey(){
  return {id:newId('s'),stream:'',reach:'',date:todayStr(),observers:settings.obs||'',layer:'',start:nowHM(),end:'',gpsStart:null,gpsEnd:null,
    weather:'',wt:'',at:'',turbidity:'',flow:'',view:'',photos:'',notes:'',obs:[],redds:[],createdAt:Date.now(),updatedAt:Date.now()};
}
function normSurvey(s){
  s.obs=Array.isArray(s.obs)?s.obs:[];s.redds=Array.isArray(s.redds)?s.redds:[];
  s.redds.forEach(function(r){if(!Array.isArray(r.basis))r.basis=[]});return s;
}
surveys.forEach(normSurvey);
function findSurvey(id){return surveys.filter(function(s){return s.id===id})[0]||null}
var SV_FIELDS={stream:'sv-stream',reach:'sv-reach',date:'sv-date',observers:'sv-observers',start:'sv-start',end:'sv-end',weather:'sv-weather',wt:'sv-wt',at:'sv-at',view:'sv-view',photos:'sv-photos',notes:'sv-notes'};
function openSurvey(id){
  var s=id?findSurvey(id):null,isNew=!s;
  if(isNew){s=blankSurvey();surveys.push(s)}
  cur=s;
  $('#sv-date').max=todayStr();
  Object.keys(SV_FIELDS).forEach(function(k){$('#'+SV_FIELDS[k]).value=s[k]==null?'':s[k]});
  ['layer','turbidity','flow'].forEach(function(k){setChip(k,s[k])});
  gpsVals['sv-gpsStart']=s.gpsStart;gpsVals['sv-gpsEnd']=s.gpsEnd;renderGps('sv-gpsStart');renderGps('sv-gpsEnd');
  fillDatalists();renderObsList();renderSummary();
  $('#sv-title').textContent=isNew?'New streamwalk survey':'Streamwalk survey';
  resetDel($('#delSurvey'),'Delete this survey');
  showSheet('surveySheet');
  if(isNew){$('#sv-stream').focus();if(settings.gps==='auto')getGps('sv-gpsStart',true,function(){saveSurveySoon()})}
}
function readSurvey(){
  if(!cur)return;
  Object.keys(SV_FIELDS).forEach(function(k){var v=$('#'+SV_FIELDS[k]).value;cur[k]=(k==='wt'||k==='at'||k==='view')?num(v):v.trim?v.trim():v});
  ['layer','turbidity','flow'].forEach(function(k){cur[k]=getChip(k)});
  cur.gpsStart=gpsVals['sv-gpsStart']||null;cur.gpsEnd=gpsVals['sv-gpsEnd']||null;
  cur.updatedAt=Date.now();
}
function saveSurveySoon(){clearTimeout(saveTimer);saveTimer=setTimeout(function(){readSurvey();saveData();renderSummary();$('#sv-saved').textContent='Saved on this phone · '+nowHM()},250)}
function isEmptySurvey(s){return !s.stream&&!s.reach&&!s.obs.length&&!s.redds.length&&!s.notes}
function closeSurvey(){
  clearTimeout(saveTimer);readSurvey();
  if(cur&&isEmptySurvey(cur)){surveys=surveys.filter(function(x){return x!==cur});toast('Empty survey discarded.')}
  saveData();askPersist();cur=null;hideSheet('surveySheet');render();
}
function finishSurvey(){
  if(!$('#sv-end').value)$('#sv-end').value=nowHM();
  if(!$('#sv-stream').value.trim()){toast('Add the stream name before finishing.');$('#sv-stream').focus();return}
  var done=function(){readSurvey();saveData();toast('Survey finished and saved.');closeSurvey()};
  if(!gpsVals['sv-gpsEnd']&&settings.gps==='auto'&&'geolocation' in navigator){
    toast('Getting GPS end…');var waited=false;
    getGps('sv-gpsEnd',true,function(){if(!waited){waited=true;done()}});
    setTimeout(function(){if(!waited){waited=true;stopGps();done()}},20000);
  }else done();
}
function fillDatalists(){
  var st={},re={};surveys.forEach(function(s){if(s.stream)st[s.stream]=1;if(s.reach)re[s.reach]=1});
  $('#streamList').innerHTML=Object.keys(st).sort().map(function(x){return '<option value="'+esc(x)+'">'}).join('');
  $('#reachList').innerHTML=Object.keys(re).sort().map(function(x){return '<option value="'+esc(x)+'">'}).join('');
}
function renderObsList(){
  var el=$('#obsList'),items=[];
  cur.obs.forEach(function(o){items.push({t:o.time||'',html:'<button type="button" class="obs" data-obs="'+esc(o.id)+'"><span class="t">'+esc(o.time||'')+'</span><span class="d">'+esc(o.count+' × '+lab('species',o.species))+'<small>'+esc([lab('kind',o.kind),o.size?o.size+' cm':'',o.gps?'GPS':'',o.notes].filter(Boolean).join(' · '))+'</small></span><span class="rtag">'+(o.kind==='carcass'?'Carcass':'Fish')+'</span></button>'})});
  cur.redds.forEach(function(r){items.push({t:r.time||'',html:'<button type="button" class="obs" data-redd="'+esc(r.id)+'"><span class="t">'+esc(r.time||'')+'</span><span class="d">Redd '+esc(r.label||'')+'<small>'+esc([r.attrib?lab('attrib',r.attrib):'Not attributed',r.pitL&&r.pitW?'pit '+r.pitL+'×'+r.pitW+' cm':'',lab('habitat',r.habitat),r.gps?'GPS':''].filter(Boolean).join(' · '))+'</small></span><span class="rtag conf-'+esc(r.confidence)+'">'+esc(r.confidence||'Redd')+'</span></button>'})});
  items.sort(function(a,b){return a.t<b.t?-1:a.t>b.t?1:0});
  el.innerHTML=items.length?items.map(function(i){return i.html}).join(''):'<p class="empty" style="padding:10px 0">Nothing logged yet. Add fish, carcasses and redds as you walk upstream. A nil result is still data.</p>';
}
function renderSummary(){
  if(!cur)return;
  var c=reddsCCT(cur),other=otherNoted(cur);
  $('#svSummary').innerHTML='<div><b>'+c.length+'</b><span>Total CCT redds</span></div><div><b>'+liveCount(cur,'CCT')+'</b><span>Total live CCT</span></div>'+
    '<div><b>'+confCount(c,'Confirmed')+' / '+confCount(c,'Probable')+' / '+confCount(c,'Possible')+'</b><span>Confirmed / Probable / Possible</span></div><div><b>'+liveCount(cur,'CCT/RB')+'</b><span>CCT/RB unresolved</span></div>'+
    '<div class="wide"><span>Coho / other spp. noted</span><b>'+esc(other||'None')+'</b></div>';
}

/* ---------- fish observation ---------- */
function openObs(id){
  var o=id?cur.obs.filter(function(x){return x.id===id})[0]:null;curObs=o;
  setChip('kind',o?o.kind:'live');setChip('species',o?o.species:'');
  $('#ob-count').value=o?o.count:1;$('#ob-size').value=o?o.size||'':'';$('#ob-time').value=o?o.time:nowHM();
  $('#ob-photos').value=o?o.photos||'':'';$('#ob-notes').value=o?o.notes||'':'';$('#ob-msg').textContent='';
  gpsVals['ob-gps']=o?o.gps:null;renderGps('ob-gps');
  $('#ob-title').textContent=o?'Edit fish observation':'Fish observation';$('#ob-save').textContent=o?'Save changes':'Save observation';
  $('#ob-del').hidden=!o;resetDel($('#ob-del'),'Delete');
  showSheet('obsSheet');
  if(!o&&settings.gps==='auto')getGps('ob-gps',true);
}
function saveObs(e){
  e.preventDefault();
  var sp=getChip('species');if(!sp){$('#ob-msg').textContent='Pick the species, or Unknown.';return}
  var n=parseInt($('#ob-count').value,10);if(!(n>=1)){$('#ob-msg').textContent='Enter a count of at least 1.';return}
  var o=curObs||{id:newId('o')};
  Object.assign(o,{kind:getChip('kind')||'live',species:sp,count:Math.min(n,999),size:$('#ob-size').value.trim(),time:$('#ob-time').value,photos:$('#ob-photos').value.trim(),notes:$('#ob-notes').value.trim(),gps:gpsVals['ob-gps']||null});
  if(!curObs)cur.obs.push(o);
  readSurvey();saveData();hideSheet('obsSheet');renderObsList();renderSummary();toast('Observation saved.');
}

/* ---------- redd (C2) ---------- */
var RD_FIELDS={label:'rd-id',time:'rd-time',observer:'rd-observer',photos:'rd-photos',pitL:'rd-pitL',pitW:'rd-pitW',tailL:'rd-tailL',tailW:'rd-tailW',depth:'rd-depth',vel:'rd-vel',dom:'rd-dom',sub:'rd-sub',adultSp:'rd-adultSp',notes:'rd-notes'};
var RD_NUM={pitL:1,pitW:1,tailL:1,tailW:1,depth:1,vel:1,dom:1,sub:1};
function initials(s){return String(s||'').split(/[\s\-]+/).filter(Boolean).map(function(w){return w[0]}).join('').toUpperCase().slice(0,4)||'R'}
function suggestReddId(){
  var n=0;surveys.forEach(function(s){if(s.stream===cur.stream&&s.reach===cur.reach)n+=s.redds.length});
  return initials(cur.stream)+(cur.reach?'-'+cur.reach:'')+'-'+pad(n+1);
}
function openRedd(id){
  readSurvey();
  var r=id?cur.redds.filter(function(x){return x.id===id})[0]:null;curRedd=r;
  Object.keys(RD_FIELDS).forEach(function(k){$('#'+RD_FIELDS[k]).value=r?(r[k]==null?'':r[k]):''});
  if(!r){$('#rd-id').value=suggestReddId();$('#rd-time').value=nowHM();$('#rd-observer').value=cur.observers||''}
  ['velMethod','habitat','confidence','adult','attrib','window'].forEach(function(k){setChip(k,r?r[k]:'')});
  setChip('basis',r?r.basis:[]);
  if(!r){setChip('velMethod','est');setChip('window',inWindow(cur.date)?'Y':'N')}
  $('#rd-winHint').textContent=cur.date?('Survey date '+fmtDate(cur.date)+(inWindow(cur.date)?' is inside':' is outside')+' the Feb–May CCT window.'):'';
  gpsVals['rd-gps']=r?r.gps:null;renderGps('rd-gps');
  checkRanges();updateReddWarn();$('#rd-msg').textContent='';
  $('#rd-title').textContent=r?'Edit redd (C2)':'Redd (C2)';$('#rd-save').textContent=r?'Save changes':'Save redd';
  $('#rd-del').hidden=!r;resetDel($('#rd-del'),'Delete');
  showSheet('reddSheet');
  if(!r&&settings.gps==='auto')getGps('rd-gps',true);
}
function checkRanges(){
  $$('#reddForm input[data-range]').forEach(function(inp){
    var r=inp.getAttribute('data-range').split(',').map(Number),v=parseFloat(inp.value),hint=$('.range[data-for="'+inp.id+'"]');
    if(hint)hint.classList.toggle('out',!isNaN(v)&&(v<r[0]||v>r[1]));
  });
}
function updateReddWarn(){
  var w=$('#rd-warn');if(!w)return;
  var b=getChip('basis');
  w.hidden=!(getChip('attrib')==='CCT'&&!(b.indexOf('timing')>-1||b.indexOf('adults')>-1||b.indexOf('juveniles')>-1));
}
function saveRedd(e){
  e.preventDefault();
  if(!getChip('confidence')){$('#rd-msg').textContent='Pick a confidence: Confirmed, Probable or Possible.';return}
  if(!$('#rd-id').value.trim()){$('#rd-msg').textContent='Give the redd an ID (it goes on the bank flag).';return}
  var r=curRedd||{id:newId('r')};
  Object.keys(RD_FIELDS).forEach(function(k){var v=$('#'+RD_FIELDS[k]).value;r[k]=RD_NUM[k]?num(v):v.trim()});
  ['velMethod','habitat','confidence','adult','attrib','window'].forEach(function(k){r[k]=getChip(k)});
  r.basis=getChip('basis');if(r.adult!=='Y')r.adultSp='';
  r.gps=gpsVals['rd-gps']||null;
  if(!curRedd)cur.redds.push(r);
  readSurvey();saveData();hideSheet('reddSheet');renderObsList();renderSummary();toast('Redd '+r.label+' saved.');
}

/* ---------- delete with in-page confirm ---------- */
function resetDel(b,t){b.classList.remove('sure');b.textContent=t;b.setAttribute('data-t',t)}
function confirmDel(b,go){
  if(b.classList.contains('sure')){go();return}
  b.classList.add('sure');b.textContent='Tap again to delete';
  setTimeout(function(){if(document.contains(b))resetDel(b,b.getAttribute('data-t')||'Delete')},5000);
}

/* ---------- exports ---------- */
function surveyRows(list){
  var rows=[['Stream','Reach ID','Date','Observers','Start time','End time','GPS start lat','GPS start lon','GPS end lat','GPS end lon','Survey layer','Weather / light','Water temp (°C)','Air temp (°C)','Turbidity / visibility','Flow (H/M/L)','% reach viewable','Total CCT redds','CCT redds confirmed','CCT redds probable','CCT redds possible','All redds','Total live CCT','CCT/RB unresolved','Coho / other spp. noted','Photos (IDs)','Notes','Survey key']];
  list.forEach(function(s){var c=reddsCCT(s);rows.push([s.stream,s.reach,s.date,s.observers,s.start,s.end,gpsLat(s.gpsStart),gpsLon(s.gpsStart),gpsLat(s.gpsEnd),gpsLon(s.gpsEnd),s.layer?+s.layer:'',s.weather,s.wt,s.at,lab('turbidity',s.turbidity),s.flow,s.view,c.length,confCount(c,'Confirmed'),confCount(c,'Probable'),confCount(c,'Possible'),s.redds.length,liveCount(s,'CCT'),liveCount(s,'CCT/RB'),otherNoted(s),s.photos,s.notes,surveyKey(s)])});
  return rows;
}
function obsRows(list){
  var rows=[['Stream','Reach ID','Date','Time','Latitude','Longitude','GPS accuracy (m)','Type','Species','Count','Size (cm)','Photo IDs','Notes','Survey key']];
  list.forEach(function(s){s.obs.slice().sort(function(a,b){return (a.time||'')<(b.time||'')?-1:1}).forEach(function(o){rows.push([s.stream,s.reach,s.date,o.time,gpsLat(o.gps),gpsLon(o.gps),gpsAcc(o.gps),lab('kind',o.kind),lab('species',o.species),o.count,o.size,o.photos,o.notes,surveyKey(s)])})});
  return rows;
}
function reddRows(list){
  var rows=[['Redd ID','Stream','Reach ID','Date','Time','Latitude','Longitude','GPS accuracy (m)','Observer','Photo IDs','Pit length (cm)','Pit width (cm)','Water depth over redd (cm)','Tailspill length (cm)','Tailspill width (cm)','Velocity (m/s)','Velocity method','Dominant substrate (mm)','Subdominant substrate (mm)','Habitat unit','Confidence','Adult on redd','Adult species','Species attribution','Basis','Within CCT window','Sketch / notes','Survey key']];
  list.forEach(function(s){s.redds.slice().sort(function(a,b){return (a.time||'')<(b.time||'')?-1:1}).forEach(function(r){rows.push([r.label,s.stream,s.reach,s.date,r.time,gpsLat(r.gps),gpsLon(r.gps),gpsAcc(r.gps),r.observer,r.photos,r.pitL,r.pitW,r.depth,r.tailL,r.tailW,r.vel,lab('velMethod',r.velMethod),r.dom,r.sub,lab('habitat',r.habitat),r.confidence,lab('adult',r.adult),r.adultSp,lab('attrib',r.attrib),r.basis.map(function(b){return lab('basis',b)}).join('; '),lab('window',r.window),r.notes,surveyKey(s)])})});
  return rows;
}
function exportList(){return surveys.filter(inYear).sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:((a.start||'')<(b.start||'')?-1:1)})}
function suffix(){return (year==='all'?'all-years':String(year))}
function csvCell(v){var s=String(v==null?'':v);return /[",\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}
function toCsv(rows){return '﻿'+rows.map(function(r){return r.map(csvCell).join(',')}).join('\r\n')}
async function deliver(filename,data,mime){
  var blob=new Blob([data],{type:mime}),touch=window.matchMedia&&matchMedia('(pointer:coarse)').matches;
  if(touch&&navigator.canShare&&typeof File==='function'){
    try{var f=new File([blob],filename,{type:mime});if(navigator.canShare({files:[f]})){await navigator.share({files:[f],title:filename});return true}}
    catch(e){if(e&&e.name==='AbortError')return false}
  }
  var url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.rel='noopener';document.body.appendChild(a);a.click();
  setTimeout(function(){URL.revokeObjectURL(url);a.remove()},4000);return true;
}
function exportBook(){
  var list=exportList();if(!list.length)return;
  var bytes;try{bytes=window.makeXlsxBook([{name:'Surveys (C1)',rows:surveyRows(list)},{name:'Fish observations',rows:obsRows(list)},{name:'Redds (C2)',rows:reddRows(list)}])}catch(e){toast('Could not make the Excel file. Try CSV instead.');return}
  deliver('cct-field-surveys-'+suffix()+'.xlsx',bytes,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}
function exportCsv(which){
  var list=exportList();if(!list.length)return;
  var map={surveys:['cct-surveys-c1',surveyRows],obs:['cct-fish-observations',obsRows],redds:['cct-redds-c2',reddRows]}[which];
  deliver(map[0]+'-'+suffix()+'.csv',toCsv(map[1](list)),'text/csv');
}

/* ---------- backup ---------- */
async function backup(){
  var data={app:'cct-field-survey',format:1,exportedAt:new Date().toISOString(),settings:{obs:settings.obs},surveys:surveys};
  var ok=await deliver('cct-field-survey-backup-'+todayStr()+'.json',JSON.stringify(data,null,1),'application/json');
  if(ok){settings.lastBackup=Date.now();saveSettings();render();toast('Backup file made. Keep it somewhere safe.')}
}
function mergeBackup(data){
  if(!data||data.app!=='cct-field-survey'||!Array.isArray(data.surveys))throw new Error('not ours');
  var byId={},added=0,updated=0;surveys.forEach(function(s){byId[s.id]=s});
  data.surveys.forEach(function(s){
    if(!s||!s.id)return;normSurvey(s);var c=byId[s.id];
    if(!c){byId[s.id]=s;added++}else if((s.updatedAt||0)>(c.updatedAt||0)){byId[s.id]=s;updated++}
  });
  surveys=Object.keys(byId).map(function(k){return byId[k]});
  if(data.settings&&!settings.obs&&data.settings.obs)settings.obs=data.settings.obs;
  return {added:added,updated:updated};
}
function restoreFile(file){
  var r=new FileReader();
  r.onload=function(){try{var res=mergeBackup(JSON.parse(r.result));saveData();saveSettings();year=null;render();toast(res.added||res.updated?'Restored: '+plural(res.added,'new survey')+(res.updated?', '+res.updated+' updated':'')+'.':'Nothing new in that backup. Your surveys are unchanged.')}catch(e){toast('That file is not a CCT Field Survey backup.')}};
  r.onerror=function(){toast('Could not read that file.')};r.readAsText(file);
}

/* ---------- events ---------- */
function bind(){
  $('#startBtn').addEventListener('click',function(){openSurvey(null)});
  $('#surveys').addEventListener('click',function(e){var b=e.target.closest('[data-open]');if(b)openSurvey(b.getAttribute('data-open'))});
  $('#moreBtn').addEventListener('click',function(){shown+=20;renderSurveys()});
  $('#yearSel').addEventListener('change',function(e){year=e.target.value==='all'?'all':+e.target.value;shown=20;render()});
  document.addEventListener('click',function(e){
    var cl=e.target.closest('[data-close]');
    if(cl){var id=cl.getAttribute('data-close');if(id==='surveySheet')closeSurvey();else hideSheet(id);return}
    var ch=e.target.closest('.chips[data-chip] .chip');
    if(ch){
      var key=ch.closest('.chips').getAttribute('data-chip'),v=ch.getAttribute('data-v');
      if(isMulti(key)){var a=getChip(key),i=a.indexOf(v);if(i>-1)a.splice(i,1);else a.push(v);setChip(key,a)}
      else setChip(key,getChip(key)===v?'':v);
      if(ch.closest('#surveyForm'))saveSurveySoon();
      if(ch.closest('#reddForm'))$('#rd-msg').textContent='';
      if(ch.closest('#obsForm'))$('#ob-msg').textContent='';
      return;
    }
    var gb=e.target.closest('[data-gpsbtn]');
    if(gb){var k=gb.getAttribute('data-gpsbtn');if(gpsActive&&gpsActive.k===k)stopGps();else getGps(k,false,function(){if(k.indexOf('sv-')===0)saveSurveySoon()});return}
    var gc=e.target.closest('[data-gpsclear]');
    if(gc){var k2=gc.getAttribute('data-gpsclear');gpsVals[k2]=null;renderGps(k2);if(k2.indexOf('sv-')===0)saveSurveySoon();return}
    var st=e.target.closest('.stepper button');
    if(st){var box=st.closest('.stepper'),inp=$('input',box),min=+box.getAttribute('data-min'),max=+box.getAttribute('data-max'),v2=parseInt(inp.value,10);if(isNaN(v2))v2=min;inp.value=Math.min(max,Math.max(min,v2+parseInt(st.getAttribute('data-step'),10)));return}
  });
  $('#surveyForm').addEventListener('input',saveSurveySoon);
  $('#surveyForm').addEventListener('submit',function(e){e.preventDefault()});
  $('#addFish').addEventListener('click',function(){openObs(null)});
  $('#addRedd').addEventListener('click',function(){openRedd(null)});
  $('#obsList').addEventListener('click',function(e){var o=e.target.closest('[data-obs]'),r=e.target.closest('[data-redd]');if(o)openObs(o.getAttribute('data-obs'));if(r)openRedd(r.getAttribute('data-redd'))});
  $('#finishBtn').addEventListener('click',finishSurvey);
  $('#delSurvey').addEventListener('click',function(e){confirmDel(e.currentTarget,function(){var s=cur;surveys=surveys.filter(function(x){return x!==s});cur=null;saveData();hideSheet('surveySheet');render();toast('Survey deleted.')})});
  $('#obsForm').addEventListener('submit',saveObs);
  $('#ob-del').addEventListener('click',function(e){confirmDel(e.currentTarget,function(){cur.obs=cur.obs.filter(function(x){return x!==curObs});readSurvey();saveData();hideSheet('obsSheet');renderObsList();renderSummary();toast('Observation deleted.')})});
  $('#reddForm').addEventListener('submit',saveRedd);
  $('#reddForm').addEventListener('input',checkRanges);
  $('#rd-del').addEventListener('click',function(e){confirmDel(e.currentTarget,function(){cur.redds=cur.redds.filter(function(x){return x!==curRedd});readSurvey();saveData();hideSheet('reddSheet');renderObsList();renderSummary();toast('Redd deleted.')})});
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
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden'&&cur){readSurvey();saveData()}if(document.visibilityState==='visible')updateToday()});
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
  btn.disabled=true;btn.textContent='Checking…';
  try{await swReg.update()}catch(e){}
  await new Promise(function(r){setTimeout(r,1500)});
  btn.disabled=false;btn.textContent='Check for updates';
  var w=swReg.waiting||swReg.installing;
  if(w){toast('Updating…');if(swReg.waiting)swReg.waiting.postMessage('skipWaiting');else w.addEventListener('statechange',function(){if(w.state==='installed')w.postMessage('skipWaiting')})}
  else toast('You have the latest version ('+APP_VERSION+').');
}

/* ---------- start ---------- */
buildChips();buildGps();bind();updateToday();render();registerSW();
})();
