// Общий помощник тестов: определяет текущую версию сайта по index.html (например site68.html)
// и отдаёт путь к файлу и file://-адрес. Так тесты не ломаются при смене версии.
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const m = /url=(site\d+\.html)/.exec(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'));
if (!m) throw new Error('index.html не указывает на siteNN.html');
const FILE = path.join(ROOT, m[1]);
module.exports = { ROOT, FILE, URL: 'file://' + FILE, NAME: m[1] };
