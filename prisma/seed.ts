// ---------------------------------------------------------------------------
// Prisma seed script — populates database with initial data
// Run with: npx prisma db seed
// ---------------------------------------------------------------------------

import { PrismaClient, Role, TenderStatus } from '@prisma/client';
import { createRequire } from 'node:module';
import { classifyTender } from '../src/services/classifier';
import { GEO_CITIES, GEO_STATES } from '../src/lib/geoMaster';

const req = createRequire(import.meta.url);
const bcrypt = req('bcryptjs');

const prisma = new PrismaClient();

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date();
const MONTH_START = new Date(NOW.getFullYear(), NOW.getMonth(), 1);

// Release date inside the current month (never in the past month, never future)
function releasedIn(offsetDays: number): Date {
  const candidate = new Date(MONTH_START.getTime() + offsetDays * DAY_MS);
  return candidate.getTime() > NOW.getTime() ? new Date(MONTH_START.getTime()) : candidate;
}

// Deadline in the future, so the tender counts as active
function deadlineIn(offsetDays: number): Date {
  return new Date(NOW.getTime() + offsetDays * DAY_MS);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main() {
  console.log('Starting seed...');

  // --- Users ---
  console.log('Creating users...');
  const adminPassword = await bcrypt.hash('admin123', 12);
  const userPassword = await bcrypt.hash('user123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@ddcpl.internal' },
    update: {},
    create: {
      email: 'admin@ddcpl.internal',
      name: 'DDCPL Admin',
      passwordHash: adminPassword,
      role: 'ADMIN',
      isActive: true,
      onboarded: true,
    },
  });

  const systemUser = await prisma.user.upsert({
    where: { email: 'system@ddcpl.internal' },
    update: {},
    create: {
      email: 'system@ddcpl.internal',
      name: 'System User',
      passwordHash: await bcrypt.hash('unused', 12),
      role: 'USER',
      isActive: true,
    },
  });

  console.log(`  ✓ Admin: ${admin.email}`);
  console.log(`  ✓ System: ${systemUser.email}`);

  // --- Categories ---
  console.log('Creating categories...');
  const categories = [
    { name: 'Security & Surveillance', slug: 'security-surveillance', description: 'CCTV, access control, alarm systems' },
    { name: 'IT Hardware & Software', slug: 'it-hardware-software', description: 'Computers, servers, networking, software licenses' },
    { name: 'Civil Works & Construction', slug: 'civil-works-construction', description: 'Building, roads, bridges, maintenance' },
    { name: 'Electrical & Mechanical', slug: 'electrical-mechanical', description: 'HVAC, generators, transformers, pumps' },
    { name: 'Medical & Healthcare', slug: 'medical-healthcare', description: 'Equipment, supplies, pharmaceuticals' },
    { name: 'Office Supplies & Stationery', slug: 'office-supplies-stationery', description: 'Furniture, consumables, printing' },
    { name: 'Vehicles & Transport', slug: 'vehicles-transport', description: 'Ambulances, trucks, fuel, spare parts' },
    { name: 'Training & Consultancy', slug: 'training-consultancy', description: 'Professional services, training programs' },
    { name: 'Security Services', slug: 'security-services', description: 'Guarding, manpower, patrol services' },
    { name: 'Facility Management', slug: 'facility-management', description: 'Housekeeping, pest control, landscaping' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log(`  ✓ ${categories.length} categories`);

  // --- Keywords ---
  console.log('Creating keywords...');
  const keywordData = [
    { keyword: 'cctv', categoryName: 'Security & Surveillance' },
    { keyword: 'surveillance', categoryName: 'Security & Surveillance' },
    { keyword: 'camera', categoryName: 'Security & Surveillance' },
    { keyword: 'installation', categoryName: 'Security & Surveillance' },
    { keyword: 'maintenance', categoryName: 'Security & Surveillance' },
    { keyword: 'security guard', categoryName: 'Security Services' },
    { keyword: 'manpower', categoryName: 'Security Services' },
    { keyword: 'patrolling', categoryName: 'Security Services' },
    { keyword: 'laptop', categoryName: 'IT Hardware & Software' },
    { keyword: 'server', categoryName: 'IT Hardware & Software' },
    { keyword: 'networking', categoryName: 'IT Hardware & Software' },
    { keyword: 'software', categoryName: 'IT Hardware & Software' },
    { keyword: 'construction', categoryName: 'Civil Works & Construction' },
    { keyword: 'renovation', categoryName: 'Civil Works & Construction' },
    { keyword: 'civil work', categoryName: 'Civil Works & Construction' },
    { keyword: 'electrical', categoryName: 'Electrical & Mechanical' },
    { keyword: 'generator', categoryName: 'Electrical & Mechanical' },
    { keyword: 'hvac', categoryName: 'Electrical & Mechanical' },
    { keyword: 'medical equipment', categoryName: 'Medical & Healthcare' },
    { keyword: 'ambulance', categoryName: 'Vehicles & Transport' },
    { keyword: 'furniture', categoryName: 'Office Supplies & Stationery' },
    { keyword: 'stationery', categoryName: 'Office Supplies & Stationery' },
    { keyword: 'training', categoryName: 'Training & Consultancy' },
    { keyword: 'consultancy', categoryName: 'Training & Consultancy' },
    { keyword: 'housekeeping', categoryName: 'Facility Management' },
    { keyword: 'pest control', categoryName: 'Facility Management' },
    { keyword: 'landscaping', categoryName: 'Facility Management' },
  ];

  for (const kw of keywordData) {
    const cat = await prisma.category.findUnique({ where: { slug: slugify(kw.categoryName) } });
    await prisma.keyword.upsert({
      where: { keyword: kw.keyword },
      update: {},
      create: { keyword: kw.keyword, categoryId: cat?.id },
    });
  }
  console.log(`  ✓ ${keywordData.length} keywords`);

  // --- Negative Keywords ---
  console.log('Creating negative keywords...');
  const negativeKeywords = [
    'photography', 'dslr', 'photographic', 'marriage photography', 'stock photo',
    'wedding photography', 'portrait', 'studio', 'album', 'videography',
    'camera rental', 'photo shoot', 'model', 'fashion photography',
  ];
  for (const kw of negativeKeywords) {
    await prisma.negativeKeyword.upsert({
      where: { id: kw },
      update: {},
      create: { id: kw, keyword: kw },
    });
  }
  console.log(`  ✓ ${negativeKeywords.length} negative keywords`);

  // --- Solution Categories & Keywords (Business Solution Classification) ---
  console.log('Creating solution categories & keywords...');
  const solutionCategories = [
    {
      name: 'CCTV & Surveillance',
      slug: 'cctv-surveillance',
      description: 'CCTV, Surveillance, IP Cameras, NVR, DVR, Surveillance Systems',
      icon: 'camera',
      color: '#3B82F6',
      sortOrder: 1,
      keywords: [
        { keyword: 'cctv', weight: 1.5, matchType: 'CONTAINS' },
        { keyword: 'cctv camera', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'ip camera', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'ip camera', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'surveillance camera', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'video surveillance', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'security camera', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'dome camera', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'bullet camera', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'ptz camera', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'ptz', weight: 1.0, matchType: 'CONTAINS' },
        { keyword: 'ip surveillance', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'cctv surveillance', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'nvr', weight: 1.5, matchType: 'CONTAINS' },
        { keyword: 'dvr', weight: 1.5, matchType: 'CONTAINS' },
        { keyword: 'cctv system', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'surveillance system', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'security camera', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'dome camera', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'bullet camera', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'ptz camera', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'ptz', weight: 1.0, matchType: 'CONTAINS' },
        { keyword: 'ip surveillance', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'cctv surveillance', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'nvr', weight: 1.5, matchType: 'CONTAINS' },
        { keyword: 'dvr', weight: 1.5, matchType: 'CONTAINS' },
        { keyword: 'cctv system', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'surveillance system', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'security camera', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'ip camera', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'network camera', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'surveillance camera', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'video surveillance', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'security camera', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'dome camera', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'bullet camera', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'ptz camera', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'ptz', weight: 1.0, matchType: 'CONTAINS' },
        { keyword: 'ip surveillance', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'cctv surveillance', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'nvr', weight: 1.5, matchType: 'CONTAINS' },
        { keyword: 'dvr', weight: 1.5, matchType: 'CONTAINS' },
        { keyword: 'cctv system', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'surveillance system', weight: 2.0, matchType: 'PHRASE' },
      ],
    },
    {
      name: 'Camera',
      slug: 'camera',
      description: 'Camera, IP Camera, Network Camera, Digital Camera, Security Camera',
      icon: 'video',
      color: '#8B5CF6',
      sortOrder: 2,
      keywords: [
        { keyword: 'camera', weight: 1.0, matchType: 'CONTAINS' },
        { keyword: 'ip camera', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'network camera', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'digital camera', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'security camera', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'dome camera', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'bullet camera', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'ptz camera', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'thermal camera', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'speed dome', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'anpr camera', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'lpr camera', weight: 1.5, matchType: 'PHRASE' },
      ],
    },
    {
      name: 'Audio Video',
      slug: 'audio-video',
      description: 'Audio Video, AV Solution, AV System, Professional Audio, Professional Video, PA System',
      icon: 'music',
      color: '#EC4899',
      sortOrder: 3,
      keywords: [
        { keyword: 'audio video', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'audio-visual', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'audiovisual', weight: 1.5, matchType: 'CONTAINS' },
        { keyword: 'av solution', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'av system', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'av equipment', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'av integration', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'audio visual system', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'professional audio', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'professional video', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'pa system', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'public address', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'sound system', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'amplifier', weight: 1.5, matchType: 'CONTAINS' },
        { keyword: 'speaker', weight: 1.5, matchType: 'CONTAINS' },
        { keyword: 'microphone', weight: 1.5, matchType: 'CONTAINS' },
        { keyword: 'video wall', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'led display', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'display system', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'projection system', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'projector', weight: 1.5, matchType: 'CONTAINS' },
      ],
    },
    {
      name: 'Video Conferencing',
      slug: 'video-conferencing',
      description: 'Video Conferencing, VC System, Video Conference, Collaboration, VC Room',
      icon: 'users',
      color: '#F59E0B',
      sortOrder: 4,
      keywords: [
        { keyword: 'video', weight: 1.0, matchType: 'CONTAINS' },
        { keyword: 'video conferencing', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'video conference', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'vc system', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'video conference system', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'video collaboration', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'conference camera', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'usb camera', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'ptz video conference', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'web conference', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'video meeting', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'collaboration system', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'lecture capture', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'streaming', weight: 1.0, matchType: 'CONTAINS' },
      ],
    },
    {
      name: 'Smart Classroom',
      slug: 'smart-classroom',
      description: 'Smart Classroom, Interactive Display, IFP, Classroom AV, Lecture Capture',
      icon: 'graduation-cap',
      color: '#10B981',
      sortOrder: 5,
      keywords: [
        { keyword: 'smart classroom', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'smart class', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'digital classroom', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'classroom av', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'class room av', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'classroom video', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'interactive classroom', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'interactive display', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'interactive flat panel', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'ifp', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'interactive panel', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'teaching display', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'digital teaching', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'lecture capture', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'education technology', weight: 1.0, matchType: 'PHRASE' },
        { keyword: 'classroom projector', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'classroom audio', weight: 1.5, matchType: 'PHRASE' },
      ],
    },
    {
      name: 'Fire Alarm & Fire Safety',
      slug: 'fire-alarm-fire-safety',
      description: 'Fire Alarm, Fire Detection, Smoke Detection, Emergency Alarm, Fire Fighting',
      icon: 'shield',
      color: '#EF4444',
      sortOrder: 6,
      keywords: [
        { keyword: 'fire alarm', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'fire alarm system', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'fire detection', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'fire detection system', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'fire safety', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'fire & safety', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'fas', weight: 1.5, matchType: 'CONTAINS' },
        { keyword: 'fire alarm panel', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'addressable fire alarm', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'conventional fire alarm', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'smoke detector', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'heat detector', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'mcp', weight: 1.5, matchType: 'CONTAINS' },
        { keyword: 'manual call point', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'fire detection system', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'emergency alarm', weight: 1.5, matchType: 'PHRASE' },
      ],
    },
    {
      name: 'Conference Room',
      slug: 'conference-room',
      description: 'Conference Room, Meeting Room, Board Room, Video Conferencing, Collaboration Room, VC Room, Room Booking',
      icon: 'users',
      color: '#8B5CF6',
      sortOrder: 7,
      keywords: [
        { keyword: 'conference room', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'conference room system', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'meeting room', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'meeting room system', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'board room', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'boardroom', weight: 1.5, matchType: 'CONTAINS' },
        { keyword: 'video conference room', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'meeting room av', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'conference room av', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'collaboration room', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'vc room', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'video conferencing', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'room booking system', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'wireless presentation', weight: 1.5, matchType: 'PHRASE' },
      ],
    },
    {
      name: 'Auditorium',
      slug: 'auditorium',
      description: 'Auditorium AV, Auditorium Audio, Auditorium Video, Stage Audio, Stage Lighting, PA System, Professional Audio, Projection System, LED Video Wall',
      icon: 'music',
      color: '#EC4899',
      sortOrder: 8,
      keywords: [
        { keyword: 'auditorium', weight: 1.5, matchType: 'CONTAINS' },
        { keyword: 'auditorium av', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'auditorium audio', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'auditorium video', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'auditorium sound', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'auditorium system', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'stage audio', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'stage lighting', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'public address', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'pa system', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'professional audio', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'projection system', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'large format display', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'led video wall', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'digital auditorium', weight: 1.5, matchType: 'PHRASE' },
      ],
    },
    {
      name: 'Access Control',
      slug: 'access-control',
      description: 'Access Control, Biometric Access, RFID Access, Door Access, Face Recognition, Turnstile, Boom Barrier',
      icon: 'lock',
      color: '#06B6D4',
      sortOrder: 9,
      keywords: [
        { keyword: 'access control', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'access control system', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'door access control', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'access control system', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'biometric access', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'biometric door access', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'rfid access', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'rfid reader', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'card reader', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'proximity reader', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'door controller', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'access controller', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'face recognition', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'facial recognition', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'turnstile', weight: 1.5, matchType: 'CONTAINS' },
        { keyword: 'boom barrier', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'entrance control', weight: 1.5, matchType: 'PHRASE' },
      ],
    },
    {
      name: 'Attendance System',
      slug: 'attendance-system',
      description: 'Attendance System, Time Attendance, Biometric Attendance, Face Attendance, RFID Attendance',
      icon: 'clock',
      color: '#84CC16',
      sortOrder: 10,
      keywords: [
        { keyword: 'attendance system', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'time attendance', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'time & attendance', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'biometric attendance', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'biometric time attendance', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'employee attendance', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'attendance management', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'face attendance', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'rfid attendance', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'fingerprint attendance', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'attendance device', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'attendance machine', weight: 1.5, matchType: 'PHRASE' },
      ],
    },
    {
      name: 'Networking & Wi-Fi',
      slug: 'networking-wifi',
      description: 'Networking, Wi-Fi, Access Point, Network Switch, Router, Firewall, Structured Cabling, Fiber Optic',
      icon: 'wifi',
      color: '#3B82F6',
      sortOrder: 11,
      keywords: [
        { keyword: 'networking', weight: 1.5, matchType: 'CONTAINS' },
        { keyword: 'wi-fi', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'wi fi', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'access point', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'network switch', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'router', weight: 1.5, matchType: 'CONTAINS' },
        { keyword: 'firewall', weight: 1.5, matchType: 'CONTAINS' },
        { keyword: 'structured cabling', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'fiber optic', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'network rack', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'data center', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'cat6', weight: 1.5, matchType: 'CONTAINS' },
        { keyword: 'cat6a', weight: 1.5, matchType: 'CONTAINS' },
        { keyword: 'fiber', weight: 1.0, matchType: 'CONTAINS' },
      ],
    },
    {
      name: 'LED Display / Video Wall',
      slug: 'led-display-video-wall',
      description: 'LED Display, Video Wall, Large Format Display, Digital Signage, LED Screen',
      icon: 'tv',
      color: '#F59E0B',
      sortOrder: 12,
      keywords: [
        { keyword: 'led display', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'video wall', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'large format display', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'digital signage', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'led screen', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'led video wall', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'led wall', weight: 1.5, matchType: 'PHRASE' },
      ],
    },
    {
      name: 'Projector & Projection',
      slug: 'projector-projection',
      description: 'Projector, Projection System, Projection Screen, Short Throw, Ultra Short Throw',
      icon: 'projector',
      color: '#8B5CF6',
      sortOrder: 13,
      keywords: [
        { keyword: 'projector', weight: 2.0, matchType: 'CONTAINS' },
        { keyword: 'projection system', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'projection screen', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'short throw', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'ultra short throw', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'laser projector', weight: 1.5, matchType: 'PHRASE' },
      ],
    },
    {
      name: 'Public Address / PA System',
      slug: 'public-address-pa-system',
      description: 'Public Address, PA System, Sound System, Amplifier, Speaker, Microphone',
      icon: 'megaphone',
      color: '#F59E0B',
      sortOrder: 14,
      keywords: [
        { keyword: 'public address', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'pa system', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'sound system', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'amplifier', weight: 1.5, matchType: 'CONTAINS' },
        { keyword: 'speaker', weight: 1.5, matchType: 'CONTAINS' },
        { keyword: 'microphone', weight: 1.5, matchType: 'CONTAINS' },
      ],
    },
    {
      name: 'Security Systems',
      slug: 'security-systems',
      description: 'Security Systems, Intrusion Alarm, Perimeter Security, Visitor Management, Barrier, Entrance Management',
      icon: 'shield',
      color: '#EF4444',
      sortOrder: 15,
      keywords: [
        { keyword: 'security system', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'intrusion alarm', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'perimeter security', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'visitor management', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'barrier', weight: 1.0, matchType: 'CONTAINS' },
        { keyword: 'entrance management', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'boom barrier', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'turnstile', weight: 1.5, matchType: 'CONTAINS' },
      ],
    },
    {
      name: 'Biometric',
      slug: 'biometric',
      description: 'Biometric, Fingerprint, Face Recognition, Iris Recognition, Palm Recognition',
      icon: 'fingerprint',
      color: '#8B5CF6',
      sortOrder: 16,
      keywords: [
        { keyword: 'biometric', weight: 2.0, matchType: 'CONTAINS' },
        { keyword: 'fingerprint', weight: 1.5, matchType: 'CONTAINS' },
        { keyword: 'face recognition', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'facial recognition', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'iris recognition', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'palm recognition', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'biometric attendance', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'biometric access', weight: 1.5, matchType: 'PHRASE' },
      ],
    },
    {
      name: 'Building Technology',
      slug: 'building-technology',
      description: 'BMS, Building Automation, Smart Building, Energy Management, Lighting Control',
      icon: 'building',
      color: '#64748B',
      sortOrder: 17,
      keywords: [
        { keyword: 'bms', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'building management system', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'building automation', weight: 2.0, matchType: 'PHRASE' },
        { keyword: 'smart building', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'energy management', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'lighting control', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'smart lighting', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'hvac control', weight: 1.5, matchType: 'PHRASE' },
        { keyword: 'building management', weight: 1.5, matchType: 'PHRASE' },
      ],
    },
  ];

  for (const sol of solutionCategories) {
    const solution = await prisma.solutionCategory.upsert({
      where: { slug: sol.slug },
      update: { name: sol.name, description: sol.description, icon: sol.icon, color: sol.color, sortOrder: sol.sortOrder },
      create: { name: sol.name, slug: sol.slug, description: sol.description, icon: sol.icon, color: sol.color, sortOrder: sol.sortOrder },
    });

    for (const kw of sol.keywords) {
      await prisma.solutionKeyword.upsert({
        where: { solutionId_keyword: { solutionId: solution.id, keyword: kw.keyword } },
        update: { weight: kw.weight, matchType: kw.matchType },
        create: { solutionId: solution.id, keyword: kw.keyword, weight: kw.weight, matchType: kw.matchType },
      });
    }
    console.log(`  ✓ Solution: ${sol.name} (${sol.keywords.length} keywords)`);
  }
  console.log(`  ✓ ${solutionCategories.length} solution categories`);
  console.log('Creating states & cities...');
  const statesData = GEO_STATES.map((s) => ({ name: s.name, code: s.code, shortName: s.code }));

  const stateMap = new Map<string, string>();
  for (const s of statesData) {
    const state = await prisma.state.upsert({
      where: { code: s.code },
      update: { name: s.name, shortName: s.shortName },
      create: s,
    });
    stateMap.set(s.code, state.id);
  }
  console.log(`  ✓ ${statesData.length} states`);

  const citiesData = GEO_CITIES;

  for (const c of citiesData) {
    const stateId = stateMap.get(c.stateCode);
    if (stateId) {
      await prisma.city.upsert({
        where: { id: `${stateId}-${c.name}` },
        update: {},
        create: { id: `${stateId}-${c.name}`, name: c.name, stateId, normalized: c.name.toLowerCase() },
      });
    }
  }
  console.log(`  ✓ ${citiesData.length} cities`);

  // --- Default Watchlist ---
  console.log('Creating default watchlist...');
  const watchlist = await prisma.watchlist.upsert({
    where: { userId_name: { userId: systemUser.id, name: 'DDCPL Government Tender Monitor' } },
    update: {},
    create: {
      name: 'DDCPL Government Tender Monitor',
      description: 'Default watchlist for Gujarat government tenders',
      userId: systemUser.id,
      isActive: true,
      notifyEmail: true,
      notifyBrowser: true,
      alert24h: true,
      alert12h: true,
      alert3h: true,
    },
  });

  // Add keywords to watchlist
  const watchKeywords = ['cctv', 'surveillance', 'camera', 'installation', 'maintenance', 'security guard'];
  for (const kw of watchKeywords) {
    const keyword = await prisma.keyword.findUnique({ where: { keyword: kw } });
    if (keyword) {
      await prisma.watchlistKeyword.upsert({
        where: { watchlistId_keywordId: { watchlistId: watchlist.id, keywordId: keyword.id } },
        update: {},
        create: { watchlistId: watchlist.id, keywordId: keyword.id, isActive: true },
      });
    }
  }

  // Add locations to watchlist (Gujarat state + key cities)
  const gujaratStateId = stateMap.get('GJ');
  if (gujaratStateId) {
    await prisma.watchlistLocation.upsert({
      where: { id: `${watchlist.id}-state-${gujaratStateId}` },
      update: {},
      create: {
        id: `${watchlist.id}-state-${gujaratStateId}`,
        watchlistId: watchlist.id,
        mode: 'STATE',
        stateId: gujaratStateId,
      },
    });
  }

  const gujaratCities = ['Ahmedabad', 'Gandhinagar', 'Vadodara', 'Surat', 'Rajkot'];
  for (const cityName of gujaratCities) {
    const city = await prisma.city.findFirst({ where: { name: cityName, stateId: gujaratStateId } });
    if (city) {
      await prisma.watchlistLocation.upsert({
        where: { id: `${watchlist.id}-city-${city.id}` },
        update: {},
        create: {
          id: `${watchlist.id}-city-${city.id}`,
          watchlistId: watchlist.id,
          mode: 'CITY',
          cityId: city.id,
        },
      });
    }
  }
  console.log(`  ✓ Default watchlist with ${watchKeywords.length} keywords and ${gujaratCities.length + 1} locations`);

  // --- System Config (stored as Setting) ---
  console.log('Creating default config...');
  const defaultConfig = {
    scanIntervalMinutes: 10,
    relevanceThreshold: 40,
    duplicationWindowHours: 72,
    dedupeWarm: true,
    requestTimeoutMs: 15000,
    maxConcurrentRequests: 2,
    dailyRequestLimit: 800,
    retryCount: 4,
    negativeList: ['photography', 'dslr', 'photographic', 'marriage photography', 'stock photo'],
    collectDocuments: true,
    enableEmailAlert: true,
    emailFrom: 'tender-monitor@ddcpl.internal',
    notificationStartHour: 8,
    notificationEndHour: 22,
    minRelevanceForAlert: 40,
    deadlineAlert: { at24h: true, at12h: true, at3h: true },
    channels: { email: true, browser: true, telegram: false, whatsapp: false },
    sourceDemoMode: false,
    defaultState: 'GJ',
    defaultStateName: 'Gujarat',
    defaultCities: ['Ahmedabad', 'Gandhinagar', 'Vadodara', 'Surat', 'Rajkot'],
    defaultKeywords: ['cctv', 'surveillance', 'camera', 'installation', 'maintenance'],
    exportPageSize: 100,
  };

  await prisma.setting.upsert({
    where: { key: 'app' },
    update: { value: JSON.stringify(defaultConfig) },
    create: { key: 'app', value: JSON.stringify(defaultConfig) },
  });
  console.log('  ✓ Default config stored');

  // --- Live source (no demo rows) ---
  await prisma.$executeRawUnsafe('DELETE FROM "Tender" WHERE "isDemo" = true');
  await prisma.$executeRawUnsafe(`DELETE FROM "Tender" WHERE "bidNumber" LIKE 'DEMO-%'`);
  console.log('  \u2713 demo tenders removed (live GeM source is authoritative)');

  // --- Solution classification -------------------------------------------
  console.log('Classifying tenders into solution categories...');
  const solutionKeywords = await prisma.solutionKeyword.findMany({
    where: { solution: { isActive: true } },
  });
  const allTenders = await prisma.tender.findMany({
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      subCategory: true,
      organization: true,
      ministry: true,
    },
  });
  let classifiedCount = 0;
  for (const tender of allTenders) {
    const matches = classifyTender(tender, solutionKeywords);
    await prisma.tenderSolution.deleteMany({ where: { tenderId: tender.id } });
    if (matches.length > 0) {
      await prisma.tenderSolution.createMany({
        data: matches.map((m) => ({
          tenderId: tender.id,
          solutionId: m.solutionId,
          confidence: m.confidence,
          matchedKeywords: m.matchedKeywords,
          detectedBy: 'AUTO',
        })),
      });
      classifiedCount += 1;
    }
  }
  console.log(
    `  -> ${classifiedCount}/${allTenders.length} tenders classified into ` +
      `${solutionKeywords.length} solution keywords`,
  );

  console.log('\n✅ Seed completed successfully!');
  console.log('\n📋 Default credentials:');
  console.log('  Admin: admin@ddcpl.internal / admin123');
  console.log('  System: system@ddcpl.internal (auto-created)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });