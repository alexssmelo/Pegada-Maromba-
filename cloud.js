// Contas (login) e sincronização na nuvem com Firebase Auth + Firestore.
// Funciona "local primeiro": o app usa o celular e sincroniza quando há internet.
import { firebaseConfig } from './firebase-config.js';

const V = '10.12.5';
const CDN = `https://www.gstatic.com/firebasejs/${V}/`;

(async () => {
  if (!firebaseConfig || !firebaseConfig.apiKey) {                 // nuvem não configurada: app abre sem login
    window.dispatchEvent(new Event('treino:cloud-off'));
    return;
  }
  const T = window.TreinoApp;
  if (!T) return;

  let A, AU, FS;
  try {
    [A, AU, FS] = await Promise.all([
      import(CDN + 'firebase-app.js'),
      import(CDN + 'firebase-auth.js'),
      import(CDN + 'firebase-firestore.js')
    ]);
  } catch {                                                        // sem internet para carregar o Firebase
    window.dispatchEvent(new Event('treino:cloud-fail'));
    return;
  }

  const app = A.initializeApp(firebaseConfig);
  const auth = AU.getAuth(app);
  const db = FS.getFirestore(app);

  const emit = state => window.dispatchEvent(new CustomEvent('treino:sync', { detail: { state } }));
  const clean = o => JSON.parse(JSON.stringify(o));
  // Firestore não aceita listas dentro de listas: o trajeto vai como texto.
  const toDoc = h => { const { route, ...rest } = h; return clean({ ...rest, routeJson: JSON.stringify(route || []) }); };
  const fromDoc = d => {
    const { routeJson, ...rest } = d;
    let route = []; try { route = JSON.parse(routeJson || '[]'); } catch {}
    return { ...rest, route };
  };

  let lastStat = '';
  let syncing = false, again = false, timer = null, lastProf = 0;

  // Resumo do usuário para o painel do administrador (sem trajetos, cargas, peso ou fotos).
  async function writeProfile(u, merged) {
    if (Date.now() - lastProf < 10 * 60 * 1000) return;
    lastProf = Date.now();
    try {
      const h = merged.history || [];
      await FS.setDoc(FS.doc(db, 'profiles', u.uid), clean({
        name: u.displayName || '', email: u.email || '',
        createdAt: u.metadata && u.metadata.creationTime ? new Date(u.metadata.creationTime).toISOString() : null,
        lastSeen: new Date().toISOString(), workouts: h.length,
        km: Math.round(h.reduce((a, x) => a + (x.dist || 0), 0) / 10) / 100,
        lastWorkout: h.length ? h.reduce((m, x) => (x.date > m ? x.date : m), '') : null
      }), { merge: true });
    } catch { lastProf = 0; }                                         // regras ainda não publicadas: o app segue normal
  }

  async function sync() {
    const u = auth.currentUser;
    if (!u) return;
    if (!navigator.onLine) { emit('offline'); return; }
    if (syncing) { again = true; return; }
    syncing = true; emit('syncing');
    try {
      const uref = FS.doc(db, 'users', u.uid);
      const wcol = FS.collection(db, 'users', u.uid, 'workouts');
      const [snap, ws] = await Promise.all([FS.getDoc(uref), FS.getDocs(wcol)]);
      const r = snap.exists() ? snap.data() : {};
      const remote = {
        done: r.done || {}, evo: r.evo || {}, deleted: r.deleted || {},
        settings: r.settings || null, settingsT: r.settingsT || 0, gym: r.gym || {},
        history: ws.docs.map(d => fromDoc(d.data()))
      };
      const merged = T.merge(remote);

      const remoteIds = new Set(remote.history.map(h => String(h.id)));
      const ops = [];
      merged.history.filter(h => !remoteIds.has(String(h.id))).forEach(h => ops.push(['set', h]));
      remote.history.filter(h => merged.deleted[h.id]).forEach(h => ops.push(['del', h]));
      for (let i = 0; i < ops.length; i += 400) {
        const b = FS.writeBatch(db);
        ops.slice(i, i + 400).forEach(([k, h]) => {
          const ref = FS.doc(db, 'users', u.uid, 'workouts', String(h.id));
          if (k === 'set') b.set(ref, toDoc(h)); else b.delete(ref);
        });
        await b.commit();
      }
      await FS.setDoc(uref, clean({
        done: merged.done, evo: merged.evo, deleted: merged.deleted,
        settings: merged.settings, settingsT: merged.settingsT || 0, gym: merged.gym || {}
      }), { merge: true });
      await writeProfile(u, merged);
      try {                                                          // aluno de academia: o professor acompanha os treinos feitos depois de entrar
        const g = await gymInfo();
        if (g && g.role === 'student') {
          const col = FS.collection(db, 'gyms', g.id, 'students', u.uid, 'workouts');
          const have = new Set((await FS.getDocs(col)).docs.map(d => d.id));
          const novos = merged.history.filter(h => h.date >= (g.desde || '') && !have.has(String(h.id)) && !merged.deleted[h.id]);
          const meus = merged.history.filter(h => h.date >= (g.desde || '') && !merged.deleted[h.id]);
          if (meus.length) {                                         // resumo para o painel: "sem treinar há X dias"
            const ult = meus.reduce((m, h) => (h.date > m ? h.date : m), ''), chave = ult + '|' + meus.length;
            if (chave !== lastStat) { await FS.updateDoc(FS.doc(db, 'gyms', g.id, 'students', u.uid), { ultimoTreino: ult, treinos: meus.length }); lastStat = chave; }
          }
          for (let i = 0; i < novos.length; i += 400) {
            const b = FS.writeBatch(db);
            novos.slice(i, i + 400).forEach(h => b.set(FS.doc(db, 'gyms', g.id, 'students', u.uid, 'workouts', String(h.id)), clean(resumo(h))));
            await b.commit();
          }
        }
      } catch (e) { console.warn('Envio à academia falhou', e); }
      emit('ok');
    } catch (e) {
      console.warn('Sincronização falhou', e);
      emit(navigator.onLine ? 'error' : 'offline');
    } finally {
      syncing = false;
      if (again) { again = false; sync(); }
    }
  }

  // ---------- academia (aluno entra com o código do professor) ----------
  const erroCode = c => Object.assign(new Error(c), { code: c });
  let gymCache = null;
  async function gymInfo(force) {
    const u = auth.currentUser; if (!u) return null;
    if (!force && gymCache && gymCache.uid === u.uid && Date.now() - gymCache.t < 5 * 60 * 1000) return gymCache.v;
    const v = await gymInfoRaw(u); gymCache = { uid: u.uid, t: Date.now(), v }; return v;
  }
  async function gymInfoRaw(u) {
    const us = await FS.getDoc(FS.doc(db, 'users', u.uid));
    const gid = us.exists() ? us.data().gymId : null; if (!gid) return null;
    const m = await FS.getDoc(FS.doc(db, 'gyms', gid, 'members', u.uid)); if (!m.exists()) return null;
    const g = await FS.getDoc(FS.doc(db, 'gyms', gid));
    const gd = g.exists() ? g.data() : {};
    return { id: gid, nome: gd.nome || '', cor: gd.corDestaque || '', logo: gd.logoUrl || '', role: m.data().role, desde: m.data().criadoEm || '' };
  }
  async function joinGym(code) {
    const u = auth.currentUser; if (!u) throw erroCode('auth/no-user');
    code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 8) throw erroCode('treino/convite-invalido');
    if (await gymInfo(true)) throw erroCode('treino/ja-na-academia');
    const inv = await FS.getDoc(FS.doc(db, 'invites', code));
    if (!inv.exists() || inv.data().ativo !== true) throw erroCode('treino/convite-invalido');
    const gid = inv.data().gymId, now = new Date().toISOString();
    const nome = u.displayName || (u.email || '').split('@')[0] || 'Aluno';
    await FS.setDoc(FS.doc(db, 'gyms', gid, 'members', u.uid), { role: 'student', inviteCode: code, nome, email: u.email || '', criadoEm: now });
    await FS.setDoc(FS.doc(db, 'gyms', gid, 'students', u.uid), { nome, email: u.email || '', status: 'ativo', criadoEm: now });
    await FS.setDoc(FS.doc(db, 'gyms', gid, 'students', u.uid, 'consent', 'termo'), { aceito: true, em: now, versao: '2026-10' });
    await FS.setDoc(FS.doc(db, 'users', u.uid), { gymId: gid }, { merge: true });
    return gymInfo(true);
  }
  async function getPlan() {
    const g = await gymInfo(); if (!g || g.role !== 'student') return null;
    const d = await FS.getDoc(FS.doc(db, 'gyms', g.id, 'students', auth.currentUser.uid, 'plans', 'atual'));
    return d.exists() ? d.data() : null;
  }
  async function getMe() {
    const g = await gymInfo(); if (!g || g.role !== 'student') return null;
    const d = await FS.getDoc(FS.doc(db, 'gyms', g.id, 'students', auth.currentUser.uid)); return d.exists() ? d.data() : null;
  }
  async function getRecado() {
    const g = await gymInfo(); if (!g || g.role !== 'student') return null;
    const d = await FS.getDoc(FS.doc(db, 'gyms', g.id, 'students', auth.currentUser.uid, 'plans', 'recado')); return d.exists() ? d.data() : null;
  }
  const hojeLocal = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  async function checkin(ref) {                                       // QR da academia: "idDaAcademia.token"
    const [gid, token] = String(ref || '').split('.'); const g = await gymInfo();
    if (!g || g.role !== 'student') throw erroCode('treino/checkin-sem-academia');
    if (!gid || !token || g.id !== gid) throw erroCode('treino/checkin-outra');
    const u = auth.currentUser, dia = hojeLocal(), agora = new Date().toISOString();
    await FS.setDoc(FS.doc(db, 'gyms', g.id, 'students', u.uid, 'checkins', dia), { token, data: dia, em: agora });
    try { await FS.updateDoc(FS.doc(db, 'gyms', g.id, 'students', u.uid), { ultimoCheckin: agora }); } catch {}
    return { academia: g.nome, dia };
  }
  async function getAssessments() {
    const g = await gymInfo(); if (!g || g.role !== 'student') return [];
    const s = await FS.getDocs(FS.collection(db, 'gyms', g.id, 'students', auth.currentUser.uid, 'assessments'));
    return s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => String(a.data || '').localeCompare(String(b.data || '')));
  }
  const resumo = h => ({ id: h.id, date: h.date, act: h.act, ms: h.ms || 0, kcal: Math.round(h.kcal || 0), dist: Math.round(h.dist || 0), n: h.n || 0, plan: String(h.plan || '').slice(0, 80), weight: h.weight || null,
    gym: (h.gym || []).map(e => ({ n: e.n, sets: e.sets, r: String(e.r || ''), kg: String(e.kg || '') })) });

  async function fotoUrl(path) {
    const S = await import(CDN + 'firebase-storage.js');
    return S.getDownloadURL(S.ref(S.getStorage(app), path));
  }

  window.TreinoCloud = {
    gymInfo, joinGym, getPlan, getAssessments, fotoUrl, getMe, getRecado, checkin,
    sync,
    async signIn(email, pass) { await AU.signInWithEmailAndPassword(auth, email, pass); },
    async signUp(name, email, pass) {
      const c = await AU.createUserWithEmailAndPassword(auth, email, pass);
      if (name) { try { await AU.updateProfile(c.user, { displayName: name }); } catch {} }
      T.setUser({ uid: c.user.uid, name, email });
      sync();
    },
    async google() {
      const p = new AU.GoogleAuthProvider();
      p.setCustomParameters({ prompt: 'select_account' });
      try { await AU.signInWithPopup(auth, p); }
      catch (e) {
        if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) {
          const er = new Error('popup-blocked'); er.code = 'treino/google-indisponivel'; throw er;
        }
        throw e;
      }
    },
    async deleteAccount() {
      const u = auth.currentUser;
      if (!u) throw Object.assign(new Error('sem usuário'), { code: 'auth/no-user' });
      const tr = await u.getIdTokenResult();                         // o Firebase exige login recente para excluir a conta
      if (Date.now() - new Date(tr.authTime).getTime() > 4 * 60 * 1000) throw Object.assign(new Error('login antigo'), { code: 'auth/requires-recent-login' });
      const snap = await FS.getDocs(FS.collection(db, 'users', u.uid, 'workouts'));
      let batch = FS.writeBatch(db), n = 0;
      for (const d of snap.docs) { batch.delete(d.ref); if (++n % 400 === 0) { await batch.commit(); batch = FS.writeBatch(db); } }
      await batch.commit();
      try {                                                          // sai da academia: apaga o que o aluno pode apagar (avaliações e ficha ficam com a equipe, que pode apagar)
        const g = await gymInfo(true);
        if (g && g.role === 'student') {
          const ws = await FS.getDocs(FS.collection(db, 'gyms', g.id, 'students', u.uid, 'workouts'));
          for (const d of ws.docs) await FS.deleteDoc(d.ref);
          await FS.deleteDoc(FS.doc(db, 'gyms', g.id, 'students', u.uid));
          await FS.deleteDoc(FS.doc(db, 'gyms', g.id, 'members', u.uid));
        }
      } catch (e) { console.warn('Saída da academia falhou', e); }
      await FS.deleteDoc(FS.doc(db, 'users', u.uid));
      try { await FS.deleteDoc(FS.doc(db, 'profiles', u.uid)); } catch {}
      await AU.deleteUser(u);
    },
    async isAdmin() {
      const u = auth.currentUser; if (!u) return false;
      try { return (await FS.getDoc(FS.doc(db, 'admins', u.uid))).exists(); } catch { return false; }
    },
    async adminList() {
      const s = await FS.getDocs(FS.collection(db, 'profiles'));
      return s.docs.map(d => ({ uid: d.id, ...d.data() }));
    },
    reset(email) { return AU.sendPasswordResetEmail(auth, email); },
    signOut() { return AU.signOut(auth); }
  };

  AU.onAuthStateChanged(auth, u => {
    if (u) { T.setUser({ uid: u.uid, name: u.displayName || '', email: u.email || '' }); sync(); }
    else T.setUser(null);
  });
  AU.getRedirectResult(auth).catch(() => {});                      // conclui o login por redirecionamento
  window.dispatchEvent(new Event('treino:cloud-ready'));

  window.addEventListener('treino:changed', () => { clearTimeout(timer); timer = setTimeout(sync, 1500); });
  window.addEventListener('online', sync);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sync(); });
})();
