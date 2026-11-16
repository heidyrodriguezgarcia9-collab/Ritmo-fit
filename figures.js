import {getApps} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {getFirestore,collection,addDoc,getDocs,doc,updateDoc} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import {getStorage,ref as storageRef,uploadBytes,getDownloadURL} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js';
const app=getApps()[0],auth=getAuth(app),db=getFirestore(app),storage=getStorage(app);
async function uploadFigurePhoto(file,figureId,kind){if(!file||!file.size)return null;if(!file.type.startsWith('image/'))throw Error('Selecciona una imagen.');if(file.size>8*1024*1024)throw Error('La foto debe pesar menos de 8 MB.');const path='users/'+uid+'/figures/'+figureId+'/'+kind+'-'+Date.now()+'-'+Math.random().toString(36).slice(2)+'.'+(file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg');const uploaded=await uploadBytes(storageRef(storage,path),file,{contentType:file.type});return getDownloadURL(uploaded.ref)}
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const statuses=['Pendiente','En progreso','Lograda','Dominada'];
let uid=null,profileId=null,figures=[],selected=null,filter='',statusFilter='Todos';
const collectionPath=()=>collection(db,'users',uid,'figures');
const statusOptions=v=>statuses.map(s=>'<option '+(v===s?'selected':'')+'>'+s+'</option>').join('');
const safeImage=url=>{try{let u=new URL(url);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}};
const cover=f=>safeImage(f.referencePhoto);
const ownPhoto=f=>safeImage(f.achievementPhoto);
function render(){
 const root=$('figureLibrary');if(!root)return;
 const shown=figures.filter(f=>(f.name||'').toLocaleLowerCase().includes(filter.toLocaleLowerCase())&&(statusFilter==='Todos'||(f.status||'Pendiente')===statusFilter));
 root.innerHTML='<div class="book-page"><h3>Mi galería de telas</h3><p class="muted">Tus figuras, la foto de tu profe como referencia y tu resultado cuando lo logres.</p><button class="btn" id="newPersonalFigure">＋ Agregar figura</button><div class="fig-toolbar"><input id="figureSearch" placeholder="🔎 Buscar figura" value="'+esc(filter)+'"><select id="figureStatusFilter"><option>Todos</option>'+statusOptions(statusFilter)+'</select></div><div class="fig-count">'+shown.length+' figuras</div><div class="fig-grid">'+shown.map(f=>'<button class="fig-tile" data-id="'+esc(f.id)+'">'+(cover(f)?'<img loading="lazy" src="'+esc(cover(f))+'" alt="Referencia: '+esc(f.name)+'">':'<div class="fig-placeholder">＋ Foto de tu profe</div>')+'<div class="fig-tile-body"><strong>'+esc(f.name)+'</strong><small>'+esc(f.status||'Pendiente')+(ownPhoto(f)?' · 📷 Mi resultado':'')+'</small></div></button>').join('')+'</div>'+(shown.length?'':'<p class="book-empty">Agrega tu primera figura para comenzar el libro.</p>')+'</div>';
 $('newPersonalFigure').onclick=()=>editFigure(null);
 $('figureSearch').oninput=e=>{filter=e.target.value;render();$('figureSearch').focus();$('figureSearch').setSelectionRange(filter.length,filter.length)};
 $('figureStatusFilter').value=statusFilter;$('figureStatusFilter').onchange=e=>{statusFilter=e.target.value;render()};
 root.querySelectorAll('.fig-tile').forEach(b=>b.onclick=()=>openFigure(b.dataset.id));
}
function showMessage(m){const el=$('figureMessage');if(el)el.textContent=m}
async function load(){if(!uid||!profileId)return;showMessage('Cargando figuras…');try{const snap=await getDocs(collectionPath());figures=snap.docs.map(d=>({id:d.id,...d.data()})).filter(f=>f.profileId===profileId).sort((a,b)=>(a.name||'').localeCompare(b.name||''));showMessage('');render()}catch(e){figures=[];showMessage('El catálogo está disponible. Para guardar avances hay que publicar las reglas de Firestore.');render()}}
function editFigure(f){
 $('figureLibrary').classList.add('hidden');const root=$('figureDetail');root.classList.remove('hidden');
 root.innerHTML='<button class="btn secondary" id="figBack">← Mi galería</button><div class="book-page"><h3>'+(f?'Editar figura':'Agregar figura')+'</h3><form id="figForm" class="fig-form"><label>Nombre de la figura *<input name="name" maxlength="100" required value="'+esc(f?.name||'')+'"></label><label>Categoría<input name="category" maxlength="80" placeholder="Ej. Flexibilidad" value="'+esc(f?.category||'')+'"></label><label>Foto de referencia (tu profe)<input name="referenceFile" type="file" accept="image/*"></label>'+(cover(f)?'<img class="fig-detail-cover" src="'+esc(cover(f))+'" alt="Referencia actual">':'')+'<label>Estado<select name="status">'+statusOptions(f?.status||'Pendiente')+'</select></label><button class="btn" type="submit">Guardar figura</button><p id="figUploadStatus" class="muted"></p></form></div>';
 $('figBack').onclick=closeDetail;
 $('figForm').onsubmit=async e=>{e.preventDefault();if(!uid||!profileId)return;const form=e.target,button=form.querySelector('button[type="submit"]');button.disabled=true;const data={name:form.elements.name.value.trim(),category:form.elements.category.value.trim(),status:form.elements.status.value,profileId,updatedAt:new Date().toISOString()};if(!data.name){button.disabled=false;return}
 try{let id=f?.id;if(!id){data.createdAt=data.updatedAt;data.firstAttemptDate=null;const created=await addDoc(collectionPath(),data);id=created.id}else await updateDoc(doc(db,'users',uid,'figures',id),data);
 const file=form.elements.referenceFile.files[0];if(file){$('figUploadStatus').textContent='Subiendo foto de referencia…';const url=await uploadFigurePhoto(file,id,'reference');await updateDoc(doc(db,'users',uid,'figures',id),{referencePhoto:url})}
 await load();closeDetail();openFigure(id);
 }catch(err){alert('No se pudo guardar la figura o su foto: '+err.message)}finally{button.disabled=false}};
}
function closeDetail(){$('figureDetail').classList.add('hidden');$('figureDetail').innerHTML='';$('figureLibrary').classList.remove('hidden')}
async function openFigure(id){
 const f=figures.find(x=>x.id===id);if(!f)return;selected=id;
 $('figureLibrary').classList.add('hidden');const root=$('figureDetail');root.classList.remove('hidden');
 const status=f.status||'Pendiente';
 root.innerHTML='<button class="btn secondary" id="figBack">← Mi galería</button><div class="book-page"><div class="eyebrow">'+esc(f.category||'Mis figuras')+'</div><h2>'+esc(f.name)+'</h2><div class="fig-progress-line"><strong>'+esc(status)+'</strong><button class="btn secondary" id="editFig">Editar figura</button></div><div class="fig-photos"><div>'+(cover(f)?'<img src="'+esc(cover(f))+'" alt="Mi referencia">':'<div class="fig-photo-empty">Foto de mi profe</div>')+'<small>Mi referencia</small></div><div>'+(ownPhoto(f)?'<img src="'+esc(ownPhoto(f))+'" alt="Mi resultado">':'<div class="fig-photo-empty">Mi resultado pendiente</div>')+'<small>Mi resultado</small></div></div><h3>Mi progreso</h3><div id="figAttempts">Cargando…</div><button class="btn" id="addAttempt" style="width:100%">＋ Registrar avance de hoy</button><form id="attemptForm" class="fig-form hidden"><label>¿Cómo te fue hoy?<textarea name="notes" rows="3" required placeholder="Qué logré, qué me faltó y qué mejoraré…"></textarea></label><button class="btn" type="submit">Guardar avance</button></form><div class="fig-progress-line"><h3>Mi logro</h3><button class="btn secondary" id="toggleAchievement">Actualizar</button></div><form id="achievementForm" class="fig-form hidden"><label>Estado<select name="status">'+statusOptions(status)+'</select></label><label>Nota final<textarea name="finalNote">'+esc(f.finalNote||'')+'</textarea></label><label>Mi foto<input type="file" name="achievementFile" accept="image/*"></label><button class="btn" type="submit">Guardar resultado</button></form></div>';
 $('figBack').onclick=closeDetail;$('editFig').onclick=()=>editFigure(f);
 $('addAttempt').onclick=()=>$('attemptForm').classList.toggle('hidden');
 $('toggleAchievement').onclick=()=>$('achievementForm').classList.toggle('hidden');
 const attemptsEl=$('figAttempts');
 try{const snap=await getDocs(collection(db,'users',uid,'figures',id,'attempts'));const attempts=snap.docs.map(d=>d.data()).sort((a,b)=>(b.createdAt||b.date||'').localeCompare(a.createdAt||a.date||''));attemptsEl.innerHTML='<p class="muted">'+attempts.length+' intentos registrados</p>'+(attempts.length?attempts.map((t,i)=>'<article class="fig-attempt"><strong>'+esc((t.date||t.createdAt||'').slice(0,10))+'</strong><p>'+esc(t.notes||'Sin anotaciones')+'</p></article>').join(''):'<p class="book-empty">Tu historia empieza con el primer intento.</p>')}catch(e){attemptsEl.textContent='No se pudo cargar el historial: '+e.message}
 $('attemptForm').onsubmit=async e=>{e.preventDefault();const notes=e.target.elements.notes.value.trim();if(!notes)return;const date=new Date().toLocaleDateString('en-CA');try{await addDoc(collection(db,'users',uid,'figures',id,'attempts'),{notes,date,createdAt:new Date().toISOString()});await updateDoc(doc(db,'users',uid,'figures',id),{firstAttemptDate:f.firstAttemptDate||date,status:status==='Pendiente'?'En progreso':status,updatedAt:new Date().toISOString()});await load();openFigure(id)}catch(err){alert('Error al guardar avance: '+err.message)}};
 $('achievementForm').onsubmit=async e=>{e.preventDefault();const form=e.target,d={status:form.elements.status.value,finalNote:form.elements.finalNote.value,updatedAt:new Date().toISOString()};if(['Lograda','Dominada'].includes(d.status)&&!f.achievedAt)d.achievedAt=new Date().toLocaleDateString('en-CA');try{const file=form.elements.achievementFile.files[0];if(file)d.achievementPhoto=await uploadFigurePhoto(file,id,'achievement');await updateDoc(doc(db,'users',uid,'figures',id),d);await load();openFigure(id)}catch(err){alert('Error al guardar resultado: '+err.message)}};
}
window.ritmoFigures={open:async()=>{const id=window.ritmoActiveProfileId;if(id!==profileId){profileId=id;closeDetail();await load()}else {closeDetail();render()}},reset:()=>{profileId=null;figures=[];selected=null}};
onAuthStateChanged(auth,u=>{uid=u?.uid||null;if(!uid){window.ritmoFigures.reset()}else if(profileId)load()});
