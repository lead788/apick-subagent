'use strict';

// 공개 문서·스킬·브리지 설명에는 청구되는 결과(사용량 기준·기본요금·올림)만 적는다.
// 요금을 만드는 내부 산정 방식이 다시 들어오지 않게 막는다.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const BLOCKED = /(?<!회|매출)원가(?!입)|×\s?1\.[24](?![\d배])|cost plus \d+%|model cost|[24]0%\s?(를\s?)?(가산|더)|markup|peak-hour rate/i;

test('공개 문서·스킬·브리지에 요금 산정 방식이 없다', () => {
	const found = [];
	const targets = ['README.md', 'README.en.md', 'CHANGELOG.md', 'skill/SKILL.md'].concat(fs.readdirSync(path.join(root, 'src')).map(name => path.join('src', name)));
	for (const rel of targets) {
		if (!fs.existsSync(path.join(root, rel))) continue;
		fs.readFileSync(path.join(root, rel), 'utf8').split(/\r?\n/).forEach((line, i) => {
			const m = line.match(BLOCKED);
			if (m) found.push(rel + ':' + (i + 1) + ' ' + line.slice(Math.max(0, m.index - 30), m.index + 50));
		});
	}
	assert.deepEqual(found, []);
});
