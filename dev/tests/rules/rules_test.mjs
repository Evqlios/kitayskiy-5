// Проверка firestore.rules в эмуляторе: что разрешено, что запрещено (33 проверки). Нужны Java и пакеты, поставленные ВНЕ репозитория:
//   mkdir /tmp/rt && cd /tmp/rt && npm i firebase-tools@13.29.1 @firebase/rules-unit-testing@3.0.4 firebase@10.14.1 && cp <репозиторий>/dev/tests/rules/rules_test.mjs . && cp <репозиторий>/firestore.rules .
//   файлы firebase.json: {"firestore":{"rules":"firestore.rules"},"emulators":{"firestore":{"port":8089},"ui":{"enabled":false}}}; package.json: {"type":"module"}
//   запуск: npx firebase emulators:exec --only firestore --project demo-kitayskiy "node rules_test.mjs"
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import fs from 'fs';

const env = await initializeTestEnvironment({ projectId: 'demo-kitayskiy', firestore: { rules: fs.readFileSync(new URL('../../../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8089 } });
const res = [];
const t = async (name, expectOk, fn) => {
  try { await (expectOk ? assertSucceeds(fn()) : assertFails(fn())); res.push(['OK  ', name]); }
  catch (e) { res.push(['FAIL', name + ' → ' + String(e.message).slice(0, 90)]); }
};
const u1 = env.authenticatedContext('u1').firestore();
const u2 = env.authenticatedContext('u2').firestore();
const anon = env.unauthenticatedContext().firestore();
const row = (o = {}) => ({ n: 'Илья', w: '2026-11-23', s: 600, k: 3, m: 20, t: 1, l: 2, p: 1, b: serverTimestamp(), ...o });

// leaders
await t('leaders: свой корректный ряд создаётся', true, () => setDoc(doc(u1, 'leaders/u1'), row()));
await t('leaders: чужой uid нельзя', false, () => setDoc(doc(u1, 'leaders/u2'), row()));
await t('leaders: без входа нельзя', false, () => setDoc(doc(anon, 'leaders/x'), row()));
await t('leaders: s больше 6 ч при создании нельзя', false, () => setDoc(doc(u2, 'leaders/u2'), row({ s: 21600 + 600 })));
await t('leaders: ник 1 знак нельзя', false, () => setDoc(doc(u2, 'leaders/u2'), row({ n: 'a' })));
await t('leaders: ник 21 знак нельзя', false, () => setDoc(doc(u2, 'leaders/u2'), row({ n: 'a'.repeat(21) })));
await t('leaders: чтение другим вошедшим', true, () => getDoc(doc(u2, 'leaders/u1')));
await t('leaders: чтение без входа нельзя', false, () => getDoc(doc(anon, 'leaders/u1')));
await t('leaders: обновить s в той же неделе (b не менять)', true, async () => { const r = doc(u1, 'leaders/u1'); const snap = await getDoc(r); return setDoc(r, { ...row({ s: 900 }), b: snap.data().b }); });
await t('leaders: подмена b при той же неделе нельзя', false, () => setDoc(doc(u1, 'leaders/u1'), row({ s: 900 })));
await t('leaders: лишнее поле нельзя', false, () => setDoc(doc(u1, 'leaders/u1'), { ...row(), admin: true }));
await t('leaders: удалить свой', true, () => deleteDoc(doc(u1, 'leaders/u1')));
await t('leaders: ник со script (рендер экранирует, правила пропускают)', true, () => setDoc(doc(u2, 'leaders/u2'), row({ n: '<img src=x>' })));

// taskstats
await t('taskstats: gr99 a=1,c=1', true, () => setDoc(doc(u1, 'taskstats/gr99'), { a: 1, c: 1 }));
await t('taskstats: gr100 (3 цифры, реальный id в D.gram; аудит 1.1)', true, () => setDoc(doc(u1, 'taskstats/gr100'), { a: 1, c: 1 }));
await t('taskstats: pn84', true, () => setDoc(doc(u1, 'taskstats/pn84'), { a: 1, c: 0 }));
await t('taskstats: g570', true, () => setDoc(doc(u1, 'taskstats/g570'), { a: 1, c: 0 }));
await t('taskstats: произвольный id нельзя', false, () => setDoc(doc(u1, 'taskstats/foo'), { a: 1, c: 0 }));
await t('taskstats: a=51 при создании нельзя', false, () => setDoc(doc(u1, 'taskstats/gr98'), { a: 51, c: 0 }));
await t('taskstats: c>a нельзя', false, () => setDoc(doc(u1, 'taskstats/gr97'), { a: 1, c: 2 }));
await t('taskstats: уменьшить нельзя', false, async () => { await setDoc(doc(u1, 'taskstats/gr96'), { a: 10, c: 5 }); return setDoc(doc(u1, 'taskstats/gr96'), { a: 5, c: 2 }); });
await t('taskstats: прибавка 50', true, () => setDoc(doc(u1, 'taskstats/gr96'), { a: 60, c: 30 }));
await t('taskstats: прибавка 51 нельзя', false, () => setDoc(doc(u1, 'taskstats/gr96'), { a: 111, c: 30 }));
await t('taskstats: удалить нельзя', false, () => deleteDoc(doc(u1, 'taskstats/gr99')));

// reports
await t('reports: своя жалоба', true, () => setDoc(doc(u1, 'reports/u1_g001_err'), { i: 'g001', t: 'err', c: 'ошибка', d: 1, n: 'Илья' }));
await t('reports: чужой префикс нельзя', false, () => setDoc(doc(u1, 'reports/u2_g001_err'), { i: 'g001', t: 'err', c: 'x', d: 1, n: 'Илья' }));
await t('reports: чтение нельзя', false, () => getDoc(doc(u1, 'reports/u1_g001_err')));
await t('reports: c 201 знак нельзя', false, () => setDoc(doc(u1, 'reports/u1_g002_err'), { i: 'g002', t: 'err', c: 'x'.repeat(201), d: 1, n: 'a' }));

// users
await t('users: свой документ', true, () => setDoc(doc(u1, 'users/u1'), { ts: 1, data: '{"a":1}' }));
await t('users: чужой нельзя', false, () => getDoc(doc(u2, 'users/u1')));
await t('users: data 500000+ нельзя', false, () => setDoc(doc(u1, 'users/u1'), { ts: 1, data: 'x'.repeat(500000) }));
await t('users: удалить нельзя', false, () => deleteDoc(doc(u1, 'users/u1')));
await t('прочая коллекция закрыта', false, () => setDoc(doc(u1, 'misc/a'), { a: 1 }));

res.forEach(r => console.log(r.join(' ')));
console.log('FAILS:', res.filter(r => r[0] === 'FAIL').length, 'of', res.length);
await env.cleanup();
