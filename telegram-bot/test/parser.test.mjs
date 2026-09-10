import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTelegramMessage } from '../src/parser.ts';

const mockMembers = [
  { id: 'm1', name: 'Rahul', previousYearPending: 0, isHonorary: false, isPaused: false, monthlyOverrides: {}, payments: {} },
  { id: 'm2', name: 'Piyush', previousYearPending: 200, isHonorary: false, isPaused: false, monthlyOverrides: {}, payments: {} },
  { id: 'm3', name: 'Ronik', previousYearPending: 0, isHonorary: true, isPaused: false, monthlyOverrides: {}, payments: {} },
];

const mockBuildings = [
  { id: 'b1', name: 'A Wing', code: 'A', floors: [] },
  { id: 'b2', name: 'B Wing', code: 'B', floors: [] },
];

test('Positional O Rule: Standalone O indicates Online UPI', () => {
  const res1 = parseTelegramMessage('Rahul 200 O', mockMembers, mockBuildings);
  assert.equal(res1.type, 'MEMBER_PAYMENT');
  assert.equal(res1.amount, 200);
  assert.equal(res1.isOnline, true);

  const res2 = parseTelegramMessage('Rahul 200', mockMembers, mockBuildings);
  assert.equal(res2.type, 'MEMBER_PAYMENT');
  assert.equal(res2.amount, 200);
  assert.equal(res2.isOnline, false);
});

test('Positional O Rule: Words containing O do not trigger Online (e.g. - 500 Oil)', () => {
  const res = parseTelegramMessage('- 500 Oil', mockMembers, mockBuildings);
  assert.equal(res.type, 'EXPENSE');
  assert.equal(res.amount, 500);
  assert.equal(res.description, 'Oil');
  assert.equal(res.isOnline, false); // Must NOT be online!
});

test('Expense with Online flag', () => {
  const res = parseTelegramMessage('- 191 StripLight O', mockMembers, mockBuildings);
  assert.equal(res.type, 'EXPENSE');
  assert.equal(res.amount, 191);
  assert.equal(res.description, 'StripLight');
  assert.equal(res.isOnline, true);
});

test('Building Flat Collection parsing', () => {
  const res1 = parseTelegramMessage('A 101 200', mockMembers, mockBuildings);
  assert.equal(res1.type, 'BUILDING_FLAT');
  assert.equal(res1.wingCode, 'A');
  assert.equal(res1.flatNo, '101');
  assert.equal(res1.amount, 200);
  assert.equal(res1.isOnline, false);

  const res2 = parseTelegramMessage('Rahul A 001 500 O', mockMembers, mockBuildings);
  assert.equal(res2.type, 'BUILDING_FLAT');
  assert.equal(res2.wingCode, 'A');
  assert.equal(res2.flatNo, '001');
  assert.equal(res2.residentName, 'Rahul');
  assert.equal(res2.amount, 500);
  assert.equal(res2.isOnline, true);
});

test('General Chanda when name is not registered member', () => {
  const res = parseTelegramMessage('SumitKirana 101', mockMembers, mockBuildings);
  assert.equal(res.type, 'CHANDA');
  assert.equal(res.donorName, 'SumitKirana');
  assert.equal(res.amount, 101);
  assert.equal(res.isOnline, false);
});

test('Undo command parsing', () => {
  const res1 = parseTelegramMessage('3 undo', mockMembers, mockBuildings);
  assert.equal(res1.type, 'UNDO');
  assert.equal(res1.sequenceNumber, 3);

  const res2 = parseTelegramMessage('#105 undo', mockMembers, mockBuildings);
  assert.equal(res2.type, 'UNDO');
  assert.equal(res2.sequenceNumber, 105);
});

test('Slash command aliases', () => {
  assert.equal(parseTelegramMessage('/summary', mockMembers, mockBuildings).command, '/1');
  assert.equal(parseTelegramMessage('/dues', mockMembers, mockBuildings).command, '/2');
  assert.equal(parseTelegramMessage('/help', mockMembers, mockBuildings).command, '/9');
});

test('Single name lookup', () => {
  const res = parseTelegramMessage('Rahul', mockMembers, mockBuildings);
  assert.equal(res.type, 'MEMBER_LOOKUP');
  assert.equal(res.memberName, 'Rahul');
});
