import { Season, Member, Building, Transaction, AuditLog } from './types';

export const initialSeason: Season = {
  id: '2026-2027',
  name: 'Ganesh Utsav 2026–27',
  startDate: '2026-09',
  endDate: '2027-08',
  openingBalance: 0,
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
  blockedMonths: ['2026-12', '2027-01', '2027-02', '2027-03', '2027-04', '2027-05'],
};

export const initialMembers: Member[] = [
  {
    id: 'm-piyush',
    name: 'PIYUSH',
    previousYearPending: 0,
    isHonorary: false,
    isPaused: false,
    monthlyOverrides: { '2026-09': 100, '2026-10': 100, '2026-11': 100 },
    payments: {},
  },
  {
    id: 'm-aryan',
    name: 'ARYAN',
    previousYearPending: 0,
    isHonorary: false,
    isPaused: false,
    monthlyOverrides: { '2026-09': 100, '2026-10': 100, '2026-11': 100 },
    payments: {},
  },
  {
    id: 'm-aman',
    name: 'AMAN',
    previousYearPending: 0,
    isHonorary: false,
    isPaused: false,
    monthlyOverrides: { '2026-09': 100, '2026-10': 100, '2026-11': 100 },
    payments: {},
  },
  {
    id: 'm-rishi',
    name: 'RISHI',
    previousYearPending: 0,
    isHonorary: false,
    isPaused: false,
    monthlyOverrides: { '2026-09': 100, '2026-10': 100, '2026-11': 100 },
    payments: {},
  },
  {
    id: 'm-pankaj',
    name: 'PANKAJ',
    previousYearPending: 0,
    isHonorary: false,
    isPaused: false,
    monthlyOverrides: { '2026-09': 100, '2026-10': 100, '2026-11': 100 },
    payments: {},
  },
  {
    id: 'm-pavan',
    name: 'PAVAN',
    previousYearPending: 0,
    isHonorary: false,
    isPaused: false,
    monthlyOverrides: { '2026-09': 100, '2026-10': 100, '2026-11': 100 },
    payments: {},
  },
  {
    id: 'm-ayush-s',
    name: 'AYUSH.S',
    previousYearPending: 0,
    isHonorary: false,
    isPaused: false,
    monthlyOverrides: { '2026-09': 100, '2026-10': 100, '2026-11': 100 },
    payments: {},
  },
  {
    id: 'm-ronik',
    name: 'RONIK',
    previousYearPending: 0,
    isHonorary: true,
    isPaused: false,
    monthlyOverrides: {},
    payments: {},
  },
  {
    id: 'm-suraj',
    name: 'SURAJ',
    previousYearPending: 0,
    isHonorary: true,
    isPaused: false,
    monthlyOverrides: {},
    payments: {},
  },
  {
    id: 'm-sharavan',
    name: 'SHARAVAN',
    previousYearPending: 0,
    isHonorary: false,
    isPaused: false,
    monthlyOverrides: { '2026-09': 0, '2026-10': 0, '2026-11': 0 },
    payments: {},
  },
];

export const initialBuildings: Building[] = [
  {
    id: 'b-a-wing',
    name: 'A Wing',
    code: 'A',
    floors: [
      {
        floorName: '3F',
        flats: [
          { flatNo: '301', residentName: 'Sharma Ji', amountPaid: 0, isPaid: false },
          { flatNo: '302', residentName: 'Gupta', amountPaid: 0, isPaid: false },
          { flatNo: '303', residentName: 'Verma', amountPaid: 0, isPaid: false },
          { flatNo: '304', residentName: 'Dubey', amountPaid: 0, isPaid: false },
        ],
      },
      {
        floorName: '2F',
        flats: [
          { flatNo: '201', residentName: 'Tiwari', amountPaid: 0, isPaid: false },
          { flatNo: '202', residentName: 'Pandey', amountPaid: 0, isPaid: false },
          { flatNo: '203', residentName: 'Mishra', amountPaid: 0, isPaid: false },
          { flatNo: '204', residentName: 'Singh', amountPaid: 0, isPaid: false },
        ],
      },
      {
        floorName: '1F',
        flats: [
          { flatNo: '101', residentName: 'Patel', amountPaid: 0, isPaid: false },
          { flatNo: '102', residentName: 'Chauhan', amountPaid: 0, isPaid: false },
          { flatNo: '103', residentName: 'Yadav', amountPaid: 0, isPaid: false },
          { flatNo: '104', residentName: 'Gaur', amountPaid: 0, isPaid: false },
        ],
      },
      {
        floorName: 'GR',
        flats: [
          { flatNo: '001', residentName: 'Rahul', amountPaid: 0, isPaid: false },
          { flatNo: '002', residentName: 'Kadam', amountPaid: 0, isPaid: false },
          { flatNo: '003', residentName: 'Shinde', amountPaid: 0, isPaid: false },
          { flatNo: '004', residentName: 'Bhosale', amountPaid: 0, isPaid: false },
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
          { flatNo: '301', residentName: 'Ananya', amountPaid: 0, isPaid: false },
          { flatNo: '302', residentName: 'Phoolchand', amountPaid: 0, isPaid: false },
          { flatNo: '303', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '304', residentName: '', amountPaid: 0, isPaid: false },
        ],
      },
      {
        floorName: '2F',
        flats: [
          { flatNo: '201', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '202', residentName: 'Maharaj', amountPaid: 0, isPaid: false },
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
          { flatNo: '002', residentName: 'Dimpu', amountPaid: 0, isPaid: false },
          { flatNo: '003', residentName: 'Mane', amountPaid: 0, isPaid: false },
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
          { flatNo: '301', residentName: 'Mehra', amountPaid: 0, isPaid: false },
          { flatNo: '302', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '303', residentName: 'Kulkarni', amountPaid: 0, isPaid: false },
          { flatNo: '304', residentName: '', amountPaid: 0, isPaid: false },
        ],
      },
      {
        floorName: '2F',
        flats: [
          { flatNo: '201', residentName: 'Wagh', amountPaid: 0, isPaid: false },
          { flatNo: '202', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '203', residentName: 'Deshmukh', amountPaid: 0, isPaid: false },
          { flatNo: '204', residentName: '', amountPaid: 0, isPaid: false },
        ],
      },
      {
        floorName: '1F',
        flats: [
          { flatNo: '101', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '102', residentName: 'Salunke', amountPaid: 0, isPaid: false },
          { flatNo: '103', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '104', residentName: 'Joshi', amountPaid: 0, isPaid: false },
        ],
      },
      {
        floorName: 'GR',
        flats: [
          { flatNo: '001', residentName: 'Pawar', amountPaid: 0, isPaid: false },
          { flatNo: '002', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '003', residentName: '', amountPaid: 0, isPaid: false },
          { flatNo: '004', residentName: '', amountPaid: 0, isPaid: false },
        ],
      },
    ],
  },
];

// Completely clean initial transactions (0 dummy transactions)
export const initialTransactions: Transaction[] = [];

// Completely clean initial audit logs (0 dummy logs)
export const initialAuditLogs: AuditLog[] = [];
