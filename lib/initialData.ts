import { Season, Member, Building, Transaction, AuditLog } from './types';

// Default completely empty uninitialized season (0 dummy data)
export const initialSeason: Season = {
  id: '',
  name: '',
  startDate: '',
  endDate: '',
  openingBalance: 0,
  isActive: false,
  liveMonth: '',
  defaultMonthlyQuota: 200,
  months: [],
  blockedMonths: [],
};

// Default completely empty arrays (0 dummy data)
export const initialMembers: Member[] = [];
export const initialBuildings: Building[] = [];
export const initialTransactions: Transaction[] = [];
export const initialAuditLogs: AuditLog[] = [];

// =========================================================================
// SNAPSHOT TEMPLATES (Deployable to Firebase Firestore with 1 Click)
// =========================================================================

export const siyaramTemplateSeason = (openingBalance = 6500): Season => ({
  id: '2026-2027',
  name: 'Ganesh Utsav 2026–27',
  startDate: '2026-09',
  endDate: '2027-08',
  openingBalance,
  isActive: true,
  liveMonth: '2026-09',
  defaultMonthlyQuota: 200,
  months: [
    '2026-09',
    '2026-10',
    '2026-11',
    '2026-12',
    '2027-01',
    '2027-02',
    '2027-03',
    '2027-04',
    '2027-05',
    '2027-06',
    '2027-07',
    '2027-08',
  ],
  blockedMonths: [],
});

export const siyaramTemplateMembers: Member[] = [
  { id: 'm-piyush', name: 'PIYUSH', previousYearPending: 0, isHonorary: false, isPaused: false, monthlyOverrides: {}, payments: {} },
  { id: 'm-aryan', name: 'ARYAN', previousYearPending: 0, isHonorary: false, isPaused: false, monthlyOverrides: {}, payments: {} },
  { id: 'm-aman', name: 'AMAN', previousYearPending: 0, isHonorary: false, isPaused: false, monthlyOverrides: {}, payments: {} },
  { id: 'm-rishi', name: 'RISHI', previousYearPending: 0, isHonorary: false, isPaused: false, monthlyOverrides: {}, payments: {} },
  { id: 'm-pankaj', name: 'PANKAJ', previousYearPending: 0, isHonorary: false, isPaused: false, monthlyOverrides: {}, payments: {} },
  { id: 'm-pavan', name: 'PAVAN', previousYearPending: 0, isHonorary: false, isPaused: false, monthlyOverrides: {}, payments: {} },
  { id: 'm-ayush-s', name: 'AYUSH.S', previousYearPending: 0, isHonorary: false, isPaused: false, monthlyOverrides: {}, payments: {} },
  { id: 'm-ronik', name: 'RONIK', previousYearPending: 0, isHonorary: true, isPaused: false, monthlyOverrides: {}, payments: {} },
  { id: 'm-suraj', name: 'SURAJ', previousYearPending: 0, isHonorary: true, isPaused: false, monthlyOverrides: {}, payments: {} },
  { id: 'm-sharavan', name: 'SHARAVAN', previousYearPending: 0, isHonorary: false, isPaused: false, monthlyOverrides: {}, payments: {} },
];

export const siyaramTemplateBuildings: Building[] = [
  {
    id: 'b-a-wing',
    name: 'A Wing',
    code: 'A',
    floors: [
      {
        floorName: '3F',
        flats: [
          { flatNo: '301', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '302', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '303', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '304', residentName: '', amountPaid: 0, isPaid: false },
        ],
      },
      {
        floorName: '2F',
        flats: [
          { flatNo: '201', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '202', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '203', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '204', residentName: '', amountPaid: 0, isPaid: false },
        ],
      },
      {
        floorName: '1F',
        flats: [
          { flatNo: '101', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '102', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '103', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '104', residentName: '', amountPaid: 0, isPaid: false },
        ],
      },
      {
        floorName: 'GR',
        flats: [
          { flatNo: '001', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '002', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '003', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '004', residentName: '', amountPaid: 0, isPaid: false },
        ],
      },
    ],
  },
  {
    id: 'b-b-wing',
    name: 'B Wing',
    code: 'B',
    floors: [
      {
        floorName: '3F',
        flats: [
          { flatNo: '301', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '302', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '303', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '304', residentName: '', amountPaid: 0, isPaid: false },
        ],
      },
      {
        floorName: '2F',
        flats: [
          { flatNo: '201', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '202', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '203', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '204', residentName: '', amountPaid: 0, isPaid: false },
        ],
      },
      {
        floorName: '1F',
        flats: [
          { flatNo: '101', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '102', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '103', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '104', residentName: '', amountPaid: 0, isPaid: false },
        ],
      },
      {
        floorName: 'GR',
        flats: [
          { flatNo: '001', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '002', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '003', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '004', residentName: '', amountPaid: 0, isPaid: false },
        ],
      },
    ],
  },
  {
    id: 'b-b2-wing',
    name: 'B2 Wing',
    code: 'B2',
    floors: [
      {
        floorName: '3F',
        flats: [
          { flatNo: '301', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '302', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '303', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '304', residentName: '', amountPaid: 0, isPaid: false },
        ],
      },
      {
        floorName: '2F',
        flats: [
          { flatNo: '201', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '202', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '203', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '204', residentName: '', amountPaid: 0, isPaid: false },
        ],
      },
      {
        floorName: '1F',
        flats: [
          { flatNo: '101', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '102', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '103', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '104', residentName: '', amountPaid: 0, isPaid: false },
        ],
      },
      {
        floorName: 'GR',
        flats: [
          { flatNo: '001', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '002', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '003', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '004', residentName: '', amountPaid: 0, isPaid: false },
        ],
      },
    ],
  },
];
