import {FIGURE_CATALOG} from './figure-catalog.js';
import {getApps} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {getFirestore,collection,addDoc,getDocs,doc,updateDoc} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
const app=getApps()[0],auth=getAuth(app),db=getFirestore(app);
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const statuses=['Pendiente','En progreso','Lograda','Dominada'];
let uid=null,profileId=null,figures=[],selected=null,filter='',statusFilter='Todos';
const collectionPath=()=>collection(db,'users',uid,'figures');
const statusOptions=v=>statuses.map(s=>'<option '+(v===s?'selected':'')+'>'+s+'</option>').join('');
const safeImage=url=>{try{let u=new URL(url);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}};
const cover=f=>safeImage(FIGURE_CATALOG.find(x=>x.id===f.catalogId)?.photo)||safeImage(f.referencePhoto);
function render(){
 const root=$('figureLibrary');if(!root)return;
 const items=FIGURE_CATALOG.map(item=>({...item,progress:figures.find(f=>f.catalogId===item.id)}))
  .filter(item=>item.name.toLocaleLowerCase().includes(filter.toLocaleLowerCase()))
  .filter(item=>statusFilter==='Todos'||(item.progress?.status||'Pendiente')===statusFilter);
 const tile=item=>'<button class="fig-tile catalog-tile" data-catalog="'+esc(item.id)+'">'+
   (safeImage(item.photo)?'<img loading="lazy" src="'+esc(safeImage(item.photo))+'" alt="Posición final: '+esc(item.name)+'" onerror="this.replaceWith(Object.assign(document.createElement(\'div\'),{className:\'fig-placeholder\',textContent:\'Imagen no disponible\'}))">':'<div class="fig-placeholder">Imagen pendiente</div>')+
   '<div class="fig-tile-body"><strong>'+esc(item.name)+'</strong><small>'+esc(item.category)+' · '+esc(item.progress?.status||'Pendiente')+'</small></div></button>';
 root.innerHTML='<div class="book-page"><h3>Galería de figuras aéreas</h3><p class="muted">Solo posiciones finales en telas. Toca una figura para llevar tu diario de intentos.</p><div class="fig-toolbar"><input id="figureSearch" placeholder="🔎 Buscar figura" aria-label="Buscar figura" value="'+esc(filter)+'"><select id="figureStatusFilter" aria-label="Filtrar por estado"><option>Todos</option>'+statusOptions(statusFilter)+'</select></div><div class="fig-count">'+items.length+' figuras · '+figures.filter(f=>f.catalogId).length+' en seguimiento</div><div class="fig-grid">'+items.map(tile).join('')+'</div>'+(items.length?'':'<p class="book-empty">No encontramos figuras con ese filtro.</p>')+'</div>';
 $('figureSearch').oninput=e=>{filter=e.target.value;render();$('figureSearch').focus();$('figureSearch').setSelectionRange(filter.length,filter.length)};
 $('figureStatusFilter').value=statusFilter;
 $('figureStatusFilter').onchange=e=>{statusFilter=e.target.value;render()};
 root.querySelectorAll('.catalog-tile').forEach(b=>b.onclick=async()=>{
  const item=FIGURE_CATALOG.find(f=>f.id===b.dataset.catalog);if(!item)return;
  const existing=figures.find(f=>f.catalogId===item.id);if(existing){openFigure(existing.id);return}
  try{
   const ref=await addDoc(collectionPath(),{profileId,name:item.name,category:item.category,difficulty:item.difficulty,referencePhoto:item.photo,catalogId:item.id,status:'Pendiente',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
   await load();openFigure(ref.id);
  }catch(e){alert('No se pudo abrir el seguimiento de esta figura: '+e.message)}
 });
}
function showMessage(m){const el=$('figureMessage');if(el)el.textContent=m}
async function load(){if(!uid||!profileId)return;showMessage('Cargando figuras…');try{const snap=await getDocs(collectionPath());figures=snap.docs.map(d=>({id:d.id,...d.data()})).filter(f=>f.profileId===profileId).sort((a,b)=>(a.name||'').localeCompare(b.name||''));showMessage('');render()}catch(e){figures=[];showMessage('El catálogo está disponible. Para guardar avances hay que publicar las reglas de Firestore.');render()}}
function editFigure(f){
 $('figureLibrary').classList.add('hidden');const root=$('figureDetail');root.classList.remove('hidden');
 root.innerHTML='<button class="btn secondary" id="figBack">← Biblioteca</button><div class="book-page"><h3>'+(f?'Editar figura':'Nueva figura')+'</h3><form id="figForm" class="fig-form"><label>Nombre *<input name="name" maxlength="100" required value="'+esc(f?.name||'')+'"></label><label>Categoría<input name="category" maxlength="80" placeholder="Ej. Inversiones, flexibilidad" value="'+esc(f?.category||'')+'"></label><label>Dificultad (opcional)<input name="difficulty" maxlength="60" value="'+esc(f?.difficulty||'')+'"></label><label>Estado<select name="status">'+statusOptions(f?.status||'Pendiente')+'</select></label><button class="btn" type="submit">Guardar figura</button></form></div>';
 $('figBack').onclick=closeDetail;
 $('figForm').onsubmit=async e=>{e.preventDefault();if(!uid||!profileId)return;const data=Object.fromEntries(new FormData(e.target));data.name=data.name.trim();if(!data.name)return;data.profileId=profileId;data.updatedAt=new Date().toISOString();try{if(f){await updateDoc(doc(db,'users',uid,'figures',f.id),data)}else{data.createdAt=data.updatedAt;data.firstAttemptDate=null;data.achievedAt=null;data.masteredAt=null;await addDoc(collectionPath(),data)}await load();closeDetail()}catch(err){alert('Error al guardar: '+err.message)}};
}
function closeDetail(){$('figureDetail').classList.add('hidden');$('figureDetail').innerHTML='';$('figureLibrary').classList.remove('hidden')}
async function openFigure(id){
 const f=figures.find(x=>x.id===id);if(!f)return;selected=id;
 $('figureLibrary').classList.add('hidden');const root=$('figureDetail');root.classList.remove('hidden');
 root.innerHTML='<button class="btn secondary" id="figBack">← Biblioteca</button><div class="book-page">'+(cover(f)?'<img class="fig-detail-cover" src="'+esc(cover(f))+'" alt="'+esc(f.name)+'">':'')+'<div class="eyebrow">'+esc(f.category||'Mi figura')+'</div><h2>'+esc(f.name)+'</h2><p>Estado: <strong>'+esc(f.status||'Pendiente')+'</strong></p><p>Primer intento: '+esc(f.firstAttemptDate||'Sin registrar')+'</p><div class="actions"><button class="btn secondary" id="editFig">Editar figura</button></div><h3>Mi diario de intentos</h3><div id="figAttempts">Cargando historial…</div><form id="attemptForm" class="fig-form"><h3>Registrar nuevo intento</h3><label>Fecha<input type="date" name="date" required value="'+new Date().toISOString().slice(0,10)+'"></label><label>Intento o semana<input name="week" placeholder="Ej. Semana 2"></label><label>Mis anotaciones<textarea name="notes" rows="3"></textarea></label><label>Qué salió bien<textarea name="successes" rows="2"></textarea></label><label>Qué salió mal<textarea name="difficulties" rows="2"></textarea></label><label>Qué mejoraré<textarea name="improvements" rows="2"></textarea></label><label>Dificultad principal<select name="difficulty"><option value="">Sin seleccionar</option>'+['Fuerza','Resistencia','Miedo','Técnica','Coordinación','Memoria','Otra'].map(x=>'<option>'+x+'</option>').join('')+'</select></label><label>Confianza (opcional, 1–5)<input type="number" min="1" max="5" name="confidence"></label><label>Foto o video (URL opcional)<input name="media" type="url" placeholder="https://…"></label><button class="btn" type="submit">Guardar intento</button></form><h3>Mi logro</h3><form id="achievementForm" class="fig-form"><label>Estado<select name="status">'+statusOptions(f.status||'Pendiente')+'</select></label><label>Fecha del logro<input name="achievementDate" type="date" value="'+esc(f.achievementDate||'')+'"></label><label>Qué aprendí<textarea name="learned">'+esc(f.learned||'')+'</textarea></label><label>Qué fue lo más difícil<textarea name="hardest">'+esc(f.hardest||'')+'</textarea></label><label>Cómo lo superé<textarea name="overcame">'+esc(f.overcame||'')+'</textarea></label><label>Anotación final<textarea name="finalNote">'+esc(f.finalNote||'')+'</textarea></label><label>Mi foto del logro (URL opcional)<input type="url" name="achievementPhoto" value="'+esc(f.achievementPhoto||'')+'"></label><button class="btn" type="submit">Guardar mi logro</button></form></div>';
 $('figBack').onclick=closeDetail;
 const attemptsEl=$('figAttempts');
 try{const snap=await getDocs(collection(db,'users',uid,'figures',id,'attempts'));const attempts=snap.docs.map(d=>d.data()).sort((a,b)=>(a.date||'').localeCompare(b.date||''));attemptsEl.innerHTML=attempts.length?attempts.map((a,i)=>'<article class="fig-attempt"><strong>'+esc(a.week||'Intento '+(i+1))+' · '+esc(a.date)+'</strong>'+[['notes','Notas'],['successes','Qué salió bien'],['difficulties','Qué salió mal'],['improvements','Qué mejorar'],['difficulty','Dificultad'],['confidence','Confianza']].filter(([k])=>a[k]).map(([k,label])=>'<p><b>'+label+':</b> '+esc(a[k])+'</p>').join('')+(safeImage(a.media)?'<a href="'+esc(safeImage(a.media))+'" target="_blank" rel="noopener noreferrer">Ver foto o video</a>':'')+'</article>').join(''):'<p class="book-empty">Todavía no hay intentos registrados.</p>'}catch(e){attemptsEl.textContent='No se pudo cargar el historial: '+e.message}
 $('attemptForm').onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));d.createdAt=new Date().toISOString();try{await addDoc(collection(db,'users',uid,'figures',id,'attempts'),d);if(!f.firstAttemptDate||d.date<f.firstAttemptDate)await updateDoc(doc(db,'users',uid,'figures',id),{firstAttemptDate:d.date,status:f.status==='Pendiente'?'En progreso':f.status});await load();openFigure(id)}catch(err){alert('Error al guardar intento: '+err.message)}};
 $('achievementForm').onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));const now=new Date().toISOString();d.updatedAt=now;if((d.status==='Lograda'||d.status==='Dominada')&&!f.achievedAt)d.achievedAt=d.achievementDate||now.slice(0,10);if(d.status==='Dominada'&&!f.masteredAt)d.masteredAt=d.achievementDate||now.slice(0,10);try{await updateDoc(doc(db,'users',uid,'figures',id),d);await load();openFigure(id)}catch(err){alert('Error al guardar logro: '+err.message)}};
}
window.ritmoFigures={open:async()=>{const id=window.ritmoActiveProfileId;if(id!==profileId){profileId=id;closeDetail();await load()}else {closeDetail();render()}},reset:()=>{profileId=null;figures=[];selected=null}};
onAuthStateChanged(auth,u=>{uid=u?.uid||null;if(!uid){window.ritmoFigures.reset()}else if(profileId)load()});
