/* CCT Stream Survey — the teaching layer: diagrams, the field guide and the self-check.
   Kept separate from app.js so the training content can be edited without touching the survey logic. */
(function(){
'use strict';

/* =========================================================
   1 · Diagrams (inline SVG, themed from the CSS variables)
   ========================================================= */

/* Side view of a redd, cut along the line of flow. Shows what LENGTH means.
   Geometry note: the bed sits at y=66. The pit is a quadratic bowl crossing y=66 at x=88 and x=152;
   the mound is a quadratic cap crossing y=66 at x=152 and x=228. Those exact crossings are what the
   dimension line is pinned to, so the drawing and the definition cannot drift apart. */
var PROFILE='M0,66 L88,66 Q120,118 152,66 Q190,14 228,66 L340,66';
function anatomySvg(){
  return '<svg class="dgm" viewBox="0 0 340 162" role="img" aria-label="Side view of a redd cut along the direction of flow. The fish digs a pit, and the gravel she moves piles into a raised tailspill mound immediately downstream. Length is measured from the upstream edge of the pit to the downstream end of the mound.">'+
    '<rect class="d-water" x="0" y="10" width="340" height="102"/>'+
    /* the bed, with the pit cut out of it and the mound added to it */
    '<path class="d-bed" d="'+PROFILE+' L340,112 L0,112 Z"/>'+
    /* gravel piled here */
    '<path class="d-moved" d="M152,66 Q190,14 228,66 Z"/>'+
    /* where the bed used to be */
    '<line class="d-was" x1="0" y1="66" x2="340" y2="66"/>'+
    '<path class="d-bedline" d="'+PROFILE+'"/>'+
    '<g class="d-flow"><line x1="16" y1="34" x2="70" y2="34"/><path d="M70,34 l-8,-4 v8 z"/><text x="16" y="28">FLOW</text></g>'+
    '<text class="d-in" x="120" y="86" text-anchor="middle">PIT</text>'+
    '<text class="d-in" x="190" y="30" text-anchor="middle">TAILSPILL</text>'+
    '<text class="d-note" x="2" y="155">dashed = original bed</text>'+
    /* length: pinned to the two crossings */
    '<g class="d-dim"><line x1="88" y1="66" x2="88" y2="138"/><line x1="228" y1="66" x2="228" y2="138"/>'+
    '<line x1="88" y1="132" x2="228" y2="132"/><path d="M88,132 l9,-4 v8 z"/><path d="M228,132 l-9,-4 v8 z"/>'+
    '<text x="158" y="155" text-anchor="middle">LENGTH</text></g>'+
  '</svg>';
}

/* Looking down on the same redd from the bank. Shows what WIDTH means. */
function planSvg(){
  return '<svg class="dgm" viewBox="0 0 340 150" role="img" aria-label="Plan view of the same redd looking down from above. An oval pit opens into a fan of displaced gravel spreading downstream. Width is measured across the widest point of the disturbed gravel.">'+
    '<rect class="d-water" x="0" y="16" width="340" height="106"/>'+
    '<rect class="d-bank" x="0" y="0" width="340" height="16"/><rect class="d-bank" x="0" y="122" width="340" height="28"/>'+
    '<text class="d-bankt" x="6" y="11">BANK</text><text class="d-bankt" x="6" y="140">BANK</text>'+
    /* fan of moved gravel, springing from the middle of the pit so the two read as one disturbance */
    '<path class="d-moved" d="M104,69 C130,40 200,38 246,58 C256,62 256,76 246,80 C200,100 130,98 104,69 Z"/>'+
    '<ellipse class="d-gone2" cx="104" cy="69" rx="30" ry="25"/>'+
    '<g class="d-flow"><line x1="16" y1="34" x2="70" y2="34"/><path d="M70,34 l-8,-4 v8 z"/><text x="16" y="28">FLOW</text></g>'+
    '<text class="d-in" x="104" y="73" text-anchor="middle">PIT</text>'+
    '<text class="d-in" x="186" y="73" text-anchor="middle">TAILSPILL</text>'+
    /* width: taken at the widest point of the disturbance, dimensioned clear of it */
    '<g class="d-dim"><line x1="190" y1="42" x2="300" y2="42"/><line x1="190" y1="96" x2="300" y2="96"/>'+
    '<line x1="294" y1="42" x2="294" y2="96"/><path d="M294,42 l-4,9 h8 z"/><path d="M294,96 l-4,-9 h8 z"/>'+
    '<text transform="rotate(-90 318 69)" x="318" y="69" text-anchor="middle">WIDTH</text></g>'+
  '</svg>';
}

/* A live scale showing where an entered length falls against the measured species ranges. */
var SPAN=260; /* cm across the full bar */
var BANDS=[
  {id:'cct',name:'Cutthroat',from:19,to:80},
  {id:'rb',name:'Steelhead',from:80,to:150},
  {id:'salmon',name:'Coho / salmon',from:150,to:SPAN}
];
function pct(cm){return Math.max(0,Math.min(100,cm/SPAN*100))}
function sizeBarHtml(withMark){
  var bands=BANDS.map(function(b){
    return '<div class="sb-band sb-'+b.id+'" style="left:'+pct(b.from)+'%;width:'+(pct(b.to)-pct(b.from))+'%"><span>'+b.name+'</span></div>';
  }).join('');
  var ticks=[0,50,100,150,200].map(function(c){
    return '<span class="sb-tick" style="left:'+pct(c)+'%">'+c+'</span>';
  }).join('');
  return '<div class="sizebar'+(withMark?' live':'')+'"><div class="sb-track">'+bands+'</div>'+
    (withMark?'<div class="sb-mark" hidden><span class="sb-val"></span><i></i></div>':'')+
    '<div class="sb-axis">'+ticks+'<span class="sb-end">250 cm</span></div></div>';
}
/* Returns {band, text, flag} for a measured length, or null. */
function readLength(cm){
  if(cm===''||cm==null||!isFinite(cm)||cm<=0)return null;
  if(cm<19)return {band:'small',flag:false,
    text:'Smaller than any cutthroat redd measured in the Puget Sound study (the smallest pit there was 19 cm). Check you measured the whole disturbance — pit and mound together — and not just the pit.'};
  if(cm<=80)return {band:'cct',flag:false,
    text:'Squarely in the cutthroat range. Measured cutthroat pits ran 19 to 75 cm and averaged 48 cm long by 43 cm wide.'};
  if(cm<=150)return {band:'rb',flag:false,
    text:'Bigger than a typical cutthroat redd. A large cutthroat or a steelhead — and steelhead overlap the cutthroat window, so the size alone will not settle it. Weigh the timing and any fish you saw.'};
  return {band:'salmon',flag:true,
    text:'Much larger than a cutthroat redd. Most likely coho or another salmon from the fall. Their redds stay on the bed through the cutthroat window. Record it, mark it as theirs, and say so in the notes.'};
}

/* =========================================================
   2 · Field guide
   ========================================================= */
function guideHtml(){
  return ''+
  '<div class="lesson">'+
    '<h3>1 · What you are looking for</h3>'+
    '<p>A spawning female turns gravel with her tail. That leaves two things together, and it is the <b>pair</b> that makes a redd: a scooped-out <b>pit</b>, and the gravel she moved piled into a raised <b>tailspill mound</b> immediately downstream of it.</p>'+
    anatomySvg()+
    '<p>The disturbed patch also reads <b>brighter and cleaner</b> than the bed around it, because the digging flushed out the algae and fine sediment that coat undisturbed gravel. In a productive creek that contrast is the first thing you will notice — often before you can make out the shape at all.</p>'+
    '<p class="lesson-key">Pit, mound, clean gravel. Two out of three is a maybe.</p>'+
  '</div>'+

  '<div class="lesson">'+
    '<h3>2 · Where to look</h3>'+
    '<p>Do not scan the whole channel. Cutthroat spawn in a narrow set of places, and searching everywhere means seeing less:</p>'+
    '<ul class="tightlist">'+
      '<li><b>Pool tail-outs</b> — where a pool shallows and speeds up into the next riffle. The single best place to look.</li>'+
      '<li><b>Glide crests</b> — the lip where a smooth glide starts to drop.</li>'+
      '<li><b>Riffle heads</b>.</li>'+
      '<li><b>Protected inside-bend margins</b>.</li>'+
    '</ul>'+
    '<p>Depth of roughly <b>15 to 45 cm</b>, over <b>small gravel</b> in the 13 to 38 mm range. Measured cutthroat redds sat at an average depth of 18 cm with water moving about 0.6 m/s at the upstream edge of the pit.</p>'+
    '<p class="lesson-key">Walk upstream, slowly, off the gravel. Polarized glasses and a brimmed cap. Sun behind you.</p>'+
  '</div>'+

  '<div class="lesson">'+
    '<h3>3 · Is it a redd?</h3>'+
    '<p>Most of what catches your eye will not be a redd. The common false positives are freshet scour, a place where people or animals cross, and a female’s test dig.</p>'+
    compareHtml()+
    '<p class="lesson-key">Over-calling is the classic beginner error. Recording something as <i>Possible</i> is not a failure — it is the honest answer, and it keeps the dataset usable.</p>'+
  '</div>'+

  '<div class="lesson">'+
    '<h3>4 · How fresh is it?</h3>'+
    '<p>Algae is a clock. Clean gravel starts growing a film within days of being turned, so how much has regrown tells you roughly when the fish was there. That is what the age scale records, and it is what lets a season of surveys show <i>when</i> spawning happened rather than only <i>that</i> it did.</p>'+
    ageKeyHtml(true)+
    '<p>Cutthroat redds do not last. In the six-year Skookum Creek study the average redd stayed visible for <b>13.4 days</b>, 56% were still there a week later, and none could be made out past 14 to 20 days. A redd you find at age 1 will usually be gone inside a fortnight.</p>'+
    '<p class="lesson-key">Age 1 is the valuable one. It dates spawning to about the week of your survey.</p>'+
  '</div>'+

  '<div class="lesson">'+
    '<h3>5 · Measuring it</h3>'+
    '<p><b>Length</b> runs along the line of flow, from the <b>upstream edge of the pit</b> to the <b>downstream end of the tailspill mound</b>. It is the whole disturbance, not just the hole.</p>'+
    '<p><b>Width</b> is measured across the channel, at the <b>widest point</b> of the disturbed gravel.</p>'+
    planSvg()+
    '<p>Measure from the bank or from beside the redd — never from on top of it. Put something in the photo for scale.</p>'+
    '<p class="lesson-key">Do not use the tailspill length on its own to identify the species. It varied from 0.11 m to 2.32 m in the measured population, which makes it useless for telling fish apart.</p>'+
  '</div>'+

  '<div class="lesson">'+
    '<h3>6 · Whose redd is it?</h3>'+
    '<p>Coho and chum finish spawning before the cutthroat window opens, but <b>their redds are still on the bed</b> while you are walking. They are considerably bigger. Size is the main thing separating them:</p>'+
    sizeBarHtml()+
    '<p class="sb-legend">Cutthroat 19–75 cm measured, averaging 48 cm. Steelhead overlap above that and also overlap the cutthroat <i>season</i>, so they are the genuine source of confusion in spring. Anything past about 150 cm is salmon-scale.</p>'+
    '<p>Three things decide it together: <b>the measurement</b>, <b>the timing</b> (how far into the season, and what has been running), and <b>any fish you actually saw</b>. Never the shape alone.</p>'+
    '<p class="lesson-key">In the Squamish the coho run carries into February and sometimes early March, so an early-season redd needs more care here than the published studies suggest.</p>'+
  '</div>'+

  '<div class="lesson">'+
    '<h3>7 · You will almost never see the fish</h3>'+
    '<p>This is the part that surprises people, so expect it from the start. Across six seasons of weekly surveys at Skookum Creek, surveyors recorded <b>544 cutthroat redds</b> and found a fish on <b>fewer than 3% of them</b>. Counts of live adults did not track redd counts from year to year at all, which is why this survey counts redds rather than fish.</p>'+
    '<p>In 22 years of work in this watershed, the project lead has never seen a spawning pair.</p>'+
    '<p class="lesson-key">“Adults absent” is the normal answer and it is real data. If you <i>do</i> find a pair, you may be documenting a first for this watershed: note the time, record the behaviour, and photograph from the bank without going near them.</p>'+
  '</div>'+

  '<div class="lesson">'+
    '<h3>8 · A walk that finds nothing is a survey</h3>'+
    '<p>It is tempting to think a day with no redds was wasted. It is the opposite. The project is trying to work out <i>which</i> creeks cutthroat use, and you cannot show a creek is not being used without recorded visits that found nothing.</p>'+
    '<p>A creek with ten clear-water visits and no redds is a strong statement. A creek with one turbid visit and no redds says nothing at all. The difference is only visible if both were written down, with the visibility and the time spent.</p>'+
    '<p class="lesson-key">Save every survey. Especially the empty ones.</p>'+
  '</div>'+

  '<div class="lesson">'+
    '<h3>9 · Before you walk</h3>'+
    '<ul class="tightlist">'+
      '<li>Two people minimum. Tell someone the reach and your expected return, and agree a check-in time.</li>'+
      '<li>Carry polarized glasses, a brimmed cap, a tape or metre stick, flagging tape, a permanent marker, a camera, a thermometer, first aid and comms.</li>'+
      '<li><b>Never step on a redd</b>, or on gravel that might be one. This is the rule with no exceptions.</li>'+
      '<li>Stay out of the water where you can. Do not crowd holding or spawning fish.</li>'+
      '<li>Cold water and swiftwater hazards here are real. A survey is never worth an injury — if the water is wrong, go home and come back.</li>'+
    '</ul>'+
    '<p class="lesson-key">Flag every redd on the bank just upstream: the date, how many redds are at that spot, the redd ID, and your initials.</p>'+
    '<p class="flagdemo">14 Mar 27 · 3 redds · LSC-0314-05 to 07 · CM</p>'+
  '</div>';
}

function compareHtml(){
  var yes=[
    'A distinct <b>pit</b> with a mounded <b>tailspill</b> downstream of it',
    'Gravel visibly <b>cleaner and brighter</b> than the bed around it',
    'At a <b>pool tail-out or glide crest</b>, 15–45 cm deep, over small gravel',
    'Pit roughly <b>20–75 cm</b> across',
    '<b>Not there last week</b>'
  ];
  var no=[
    'Clean gravel with <b>no pit-and-mound shape</b> — freshet scour',
    'Disturbance along a <b>trail, ford or animal crossing</b>',
    'In <b>fast riffle or deep slow water</b>, or over the wrong substrate',
    '<b>Salmon-scale</b>, well over a metre, or shapeless',
    '<b>Algae-covered</b> and dating to the previous fall'
  ];
  return '<div class="compare">'+
    '<div class="cmp yes"><h4>Looks like a redd</h4><ul>'+yes.map(function(t){return '<li>'+t+'</li>'}).join('')+'</ul></div>'+
    '<div class="cmp no"><h4>Probably not</h4><ul>'+no.map(function(t){return '<li>'+t+'</li>'}).join('')+'</ul></div>'+
  '</div>';
}

function ageKeyHtml(full){
  var rows=[
    {n:'1',t:'Fresh',d:'Clean, bright gravel. <b>No algae growth at all.</b>',
     x:'Built since the last high water. Dates spawning to roughly the week of your survey — this is the one that carries the timing signal.'},
    {n:'2',t:'Some algae',d:'A visible film of algae has started, and <b>no fish are present.</b>',
     x:'Older than a week or two, but the shape is still clear. Measure it.'},
    {n:'3',t:'Full algae',d:'<b>Fully re-colonised</b> by algae, and the shape has gone soft.',
     x:'No longer measurable. Record that it is there and leave the measurements blank — the app locks them so nobody enters a number they could not actually take.'}
  ];
  return '<div class="agekey">'+rows.map(function(r){
    return '<div><b>'+r.n+'</b><span><i>'+r.t+'.</i> '+r.d+(full?'<em>'+r.x+'</em>':'')+'</span></div>';
  }).join('')+'</div>';
}

/* =========================================================
   3 · Self-check
   ========================================================= */
var QUIZ=[
  {q:'After a freshet you find a patch of clean, bright gravel on a straight riffle. There is no pit and no mound. What is it?',
   a:['Most likely freshet scour, not a redd','A redd — record it as confirmed','A redd — record it at age 1'],
   c:0,
   why:'Clean gravel on its own is not enough. A freshet scrubs algae off the bed and leaves bright patches everywhere. Without a pit and a tailspill mound together, there is no redd.'},
  {q:'A redd measures 165 cm from the upstream edge of the pit to the end of the mound. Whose is it, most likely?',
   a:['Coho or another salmon from the fall','A cutthroat — a big one','A steelhead'],
   c:0,
   why:'Cutthroat pits measured 19 to 75 cm and averaged 48 cm. At 165 cm you are well past steelhead scale and into salmon. Coho finish before the cutthroat window but their redds stay on the bed through it.'},
  {q:'You find a redd that is completely covered in algae and the edges have gone soft. What do you record?',
   a:['Age 3, and leave the measurements blank','Age 3, with your best guess at the measurements','Nothing — it is too old to be useful'],
   c:0,
   why:'Age 3 means no longer measurable, so a measurement would be invented. The app locks those fields for you. The redd still gets recorded — it is evidence the creek has been used.'},
  {q:'Perfect visibility, you walk the whole reach carefully, and you find no redds and no fish. What now?',
   a:['Save it as a nil result — it is real data','Delete it, there is nothing to report','Leave the survey open and come back next week'],
   c:0,
   why:'A clear-water visit that found nothing is one of the most useful records the project can get. It is how absence gets shown. A creek with ten clean visits and no redds says something; a creek with no records says nothing.'},
  {q:'Out of 544 cutthroat redds recorded over six seasons, about how many had a fish sitting on them?',
   a:['Fewer than 3%','About a third','More than half'],
   c:0,
   why:'25 of 544 — under 3%. Cutthroat are cryptic spawners. “Adults absent” is the normal answer on a redd, not a sign you missed something.'},
  {q:'The water is up and you cannot see the bottom of the riffles. You walk it anyway and find nothing. How is that recorded?',
   a:['Visibility 3 — recorded, but not an absence','Visibility 1, nil result','Do not record the visit'],
   c:0,
   why:'Visibility 3 means not surveyable. The visit is still worth recording — it shows the effort and the conditions — but zero redds in water you cannot see through is not evidence of absence, and the export marks it that way.'},
  {q:'Which measurement should you NOT use on its own to work out the species?',
   a:['Tailspill length','Pit width','Pit length'],
   c:0,
   why:'Tailspill length varied from 0.11 m to 2.32 m in the measured population — it stretches with flow and gravel size, so it tells you almost nothing about the fish. Pit dimensions are the reliable ones.'},
  {q:'Which way do you walk the reach, and why?',
   a:['Upstream, so you are not looking through your own silt','Downstream, so you cover ground faster','Either — it makes no difference'],
   c:0,
   why:'Walking downstream pushes your own silt plume into the water ahead of you, and you lose the bottom just as you reach it. Always upstream, slowly, and stay off the gravel.'}
];
function quizHtml(){
  return '<div class="quiz" id="quizBox">'+
    '<div class="quiz-head"><span class="quiz-count" id="quizCount"></span><span class="quiz-score" id="quizScore"></span></div>'+
    '<p class="quiz-q" id="quizQ"></p>'+
    '<div class="quiz-opts" id="quizOpts"></div>'+
    '<div class="quiz-why" id="quizWhy" hidden></div>'+
    '<div class="quiz-foot"><button type="button" class="ghost" id="quizNext" hidden>Next question</button>'+
    '<button type="button" class="ghost" id="quizAgain" hidden>Start again</button></div>'+
  '</div>';
}
function startQuiz(root){
  var order=QUIZ.map(function(_,i){return i}).sort(function(){return Math.random()-0.5}).slice(0,6);
  var at=0,score=0,answered=false;
  var $=function(s){return root.querySelector(s)};
  function draw(){
    var q=QUIZ[order[at]];answered=false;
    $('#quizCount').textContent='Question '+(at+1)+' of '+order.length;
    $('#quizScore').textContent=at?score+' right so far':'';
    $('#quizQ').textContent=q.q;
    $('#quizOpts').innerHTML=q.a.map(function(t,i){return '<button type="button" class="quiz-opt" data-i="'+i+'">'+t+'</button>'}).join('');
    $('#quizWhy').hidden=true;$('#quizNext').hidden=true;$('#quizAgain').hidden=true;
  }
  function answer(i){
    if(answered)return;answered=true;
    var q=QUIZ[order[at]],right=i===q.c;
    if(right)score++;
    Array.prototype.forEach.call($('#quizOpts').children,function(b,bi){
      b.disabled=true;
      if(bi===q.c)b.classList.add('right');
      else if(bi===i)b.classList.add('wrong');
    });
    var w=$('#quizWhy');
    w.className='quiz-why '+(right?'ok':'no');
    w.innerHTML='<b>'+(right?'That’s right.':'Not quite.')+'</b> '+q.why;
    w.hidden=false;
    $('#quizScore').textContent=score+' of '+(at+1)+' right';
    if(at<order.length-1)$('#quizNext').hidden=false;
    else{
      $('#quizAgain').hidden=false;
      w.innerHTML+='<br><br><b>'+score+' out of '+order.length+'.</b> '+
        (score===order.length?'Every one. You are ready for the creek.':
         score>=order.length-2?'Close. Read back over the section the misses came from before you go out.':
         'Worth another read of the field guide above before your first survey.');
    }
  }
  $('#quizOpts').addEventListener('click',function(e){var b=e.target.closest('.quiz-opt');if(b)answer(+b.getAttribute('data-i'))});
  $('#quizNext').addEventListener('click',function(){at++;draw()});
  $('#quizAgain').addEventListener('click',function(){order=QUIZ.map(function(_,i){return i}).sort(function(){return Math.random()-0.5}).slice(0,6);at=0;score=0;draw()});
  draw();
}

window.CCTLearn={anatomySvg:anatomySvg,planSvg:planSvg,sizeBarHtml:sizeBarHtml,readLength:readLength,
  guideHtml:guideHtml,compareHtml:compareHtml,ageKeyHtml:ageKeyHtml,quizHtml:quizHtml,startQuiz:startQuiz,pct:pct};
})();
