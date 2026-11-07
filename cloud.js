import {initializeApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getAuth,onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,GoogleAuthProvider,signInWithPopup,browserLocalPersistence,setPersistence,signOut} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {getFirestore,doc,getDoc,setDoc,collection,addDoc} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import {firebaseConfig} from './firebase-config.js';
const authStatus=document.getElementById('authStatus'),syncStatus=document.getElementById('syncStatus'),fields=document.getElementById('authFields'),out=document.getElementById('signOutButton');
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);const googleProvider=new GoogleAuthProvider();setPersistence(auth,browserLocalPersistence).catch(e=>{syncStatus.textContent='⚠️ '+e.code});
let user=null;
const credentials=()=>[document.getElementById('authEmail').value.trim(),document.getElementById('authPassword').value];
const error=e=>{syncStatus.textContent='⚠️ '+(e.code||e.message)+' · Comprueba Authentication y Firestore en Firebase.'};
window.ritmoAuth={
 google:async()=>{try{authStatus.textContent='Abriendo Google…';await signInWithPopup(auth,googleProvider)}catch(e){authStatus.textContent='No se pudo iniciar sesión';error(e)}},
 login:async()=>{try{const [email,password]=credentials();await signInWithEmailAndPassword(auth,email,password)}catch(e){error(e)}},
 register:async()=>{try{const [email,password]=credentials();await createUserWithEmailAndPassword(auth,email,password)}catch(e){error(e)}},
 logout:async()=>{try{await signOut(auth)}catch(e){error(e)}}
};
window.ritmoCloud={
 saveProfiles:async profiles=>{if(!user)return;try{await setDoc(doc(db,'users',user.uid),{profiles,updatedAt:new Date().toISOString()},{merge:true});syncStatus.textContent='☁️ Perfiles sincronizados'}catch(e){error(e)}},
 saveSession:async session=>{if(!user)return;try{await addDoc(collection(db,'users',user.uid,'sessions'),session);syncStatus.textContent='☁️ Sesión guardada'}catch(e){error(e)}}
};
onAuthStateChanged(auth,async u=>{
 user=u;fields.classList.toggle('hidden',!!u);document.getElementById('profileArea').classList.toggle('hidden',!u);out.classList.toggle('hidden',!u);if(!u){document.getElementById('profilesView').classList.remove('hidden');document.getElementById('home').classList.add('hidden');document.getElementById('workout').classList.add('hidden')}
 authStatus.textContent=u?'Sesión iniciada: '+u.email:'Inicia sesión para guardar tus datos en la nube';
 syncStatus.textContent=u?'☁️ Cargando perfiles…':'📱 Sin sesión: los datos solo están en este dispositivo';
 if(!u)return;
 try{
 const snap=await getDoc(doc(db,'users',u.uid));
 if(snap.exists()&&Array.isArray(snap.data().profiles)){window.ritmoLoadCloudProfiles(snap.data().profiles);syncStatus.textContent='☁️ Perfiles recuperados';}
 else {window.ritmoLoadCloudProfiles([]);syncStatus.textContent='✨ ¡Bienvenida! Crea tu primer perfil.';}
 window.ritmoAfterLogin?.(u.uid);
 }catch(e){error(e)}
});