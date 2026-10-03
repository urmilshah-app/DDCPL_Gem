// ---------------------------------------------------------------------------
// Bid document (PDF) fact extraction: publication date, ministry/state,
// department, organisation, office and consignee city/state/address.
// ---------------------------------------------------------------------------

export interface BidDocumentFacts {
  publishedAt: Date | null;
  stateName: string | null;
  cityName: string | null;
  addressText: string | null;
  ministry: string | null;
  department: string | null;
  organisation: string | null;
  office: string | null;
}

export const INDIAN_STATES: string[] = [
  'Andaman & Nicobar',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra & Nagar Haveli',
  'Daman & Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu & Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

export const CITY_NAMES: string[] = [
  'ahmedabad', 'vadodara', 'surat', 'rajkot', 'gandhinagar', 'bhavnagar', 'jamnagar', 'junagadh',
  'anand', 'nadiad', 'kheda', 'bharuch', 'navsari', 'valsad', 'bhuj', 'morbi', 'mehsana', 'patan',
  'surendranagar', 'deesa', 'godhra', 'palanpur', 'amreli', 'porbandar', 'veraval', 'gandhidham',
  'mumbai', 'thane', 'navi mumbai', 'pune', 'nagpur', 'nashik', 'aurangabad', 'kolhapur', 'solapur',
  'amravati', 'jalgaon', 'bhusawal', 'satara', 'sangli', 'ahmednagar', 'chandrapur', 'nanded',
  'delhi', 'new delhi', 'bengaluru', 'bangalore', 'mysuru', 'mysore', 'mangaluru', 'hubballi',
  'belagavi', 'dharwad', 'ballari', 'tumakuru', 'shivamogga', 'udupi', 'hassan', 'gangtok',
  'hyderabad', 'secunderabad', 'warangal', 'nizamabad', 'karimnagar', 'vizianagaram', 'khammam',
  'chennai', 'coimbatore', 'madurai', 'tiruchirappalli', 'tirunelveli', 'salem', 'erode', 'tirupati',
  'vellore', 'thoothukudi', 'thanjavur', 'dindigul', 'kanchipuram', 'cuddalore', 'nagercoil',
  'kolkata', 'howrah', 'siliguri', 'durgapur', 'asansol', 'kharagpur', 'haldia', 'bardhaman',
  'lucknow', 'kanpur', 'agra', 'varanasi', 'meerut', 'prayagraj', 'bareilly', 'gorakhpur',
  'noida', 'ghaziabad', 'aligarh', 'moradabad', 'jalandhar', 'dehradun', 'haridwar', 'haldwani',
  'jaipur', 'jodhpur', 'kota', 'bikaner', 'udaipur', 'ajmer', 'alwar', 'bhilwara',
  'bhopal', 'indore', 'jabalpur', 'gwalior', 'ujjain', 'sagar', 'ratlam', 'rewa',
  'patna', 'gaya', 'bhagalpur', 'muzaffarpur', 'darbhanga', 'purnia', 'hajipur', 'arrah',
  'ranchi', 'jamshedpur', 'dhanbad', 'bokaro', 'deoghar',
  'raipur', 'bhilai', 'bilaspur', 'korba', 'durg',
  'visakhapatnam', 'vijayawada', 'guntur', 'nellore', 'kurnool', 'tirupati', 'kakinada', 'rajamahendravaram',
  'thiruvananthapuram', 'kochi', 'kozhikode', 'thrissur', 'kollam', 'alappuzha', 'kannur', 'palakkad',
  'guwahati', 'silchar', 'dibrugarh', 'jorhat', 'nagaon',
  'shillong', 'imphal', 'aizawl', 'agartala', 'itnagar', 'kohima', 'dimapur', 'churachandpur',
  'chandigarh', 'ludhiana', 'amritsar', 'patiala', 'hoshiarpur', 'mohali', 'bathinda',
  'srinagar', 'jammu', 'leh', 'panaji', 'mapusa', 'puducherry', 'karaikal', 'port blair',
  'shimla', 'manali', 'dharamshala', 'hamirpur',
  // cities observed in live GeM documents that were missing from the list
  'dahod', 'dhrangadhra', 'ahwa', 'rajpipla', 'kachchh',
  'bahraich', 'banda', 'faizabad', 'baghpat', 'jhansi',
  'betul', 'mhow',
  'jagdalpur',
  'bhubaneswar', 'cuttack', 'jharsuguda', 'khordha', 'sambalpur', 'bargarh',
  'kalyani', 'burnpur', 'sahibganj',
  'panipat', 'panchkula', 'karnal', 'nuh', 'faridabad',
  'sangrur', 'fazilka',
  'ratnagiri', 'ahilyanagar',
  'tiruppur', 'tuticorin', 'ernakulam', 'thiruvalla', 'kadapa', 'renigunta',
  'kashipur', 'daman', 'kirandul',
];

// city (lowercase, as in CITY_NAMES) -> state name
export const CITY_STATE: Record<string, string> = {
  ahmedabad: 'Gujarat', vadodara: 'Gujarat', surat: 'Gujarat', rajkot: 'Gujarat',
  gandhinagar: 'Gujarat', bhavnagar: 'Gujarat', jamnagar: 'Gujarat', junagadh: 'Gujarat',
  anand: 'Gujarat', nadiad: 'Gujarat', kheda: 'Gujarat', bharuch: 'Gujarat', navsari: 'Gujarat',
  valsad: 'Gujarat', bhuj: 'Gujarat', morbi: 'Gujarat', mehsana: 'Gujarat', patan: 'Gujarat',
  surendranagar: 'Gujarat', deesa: 'Gujarat', godhra: 'Gujarat', palanpur: 'Gujarat',
  amreli: 'Gujarat', porbandar: 'Gujarat', veraval: 'Gujarat', gandhidham: 'Gujarat',
  dahod: 'Gujarat', dhrangadhra: 'Gujarat', ahwa: 'Gujarat', rajpipla: 'Gujarat',
  kachchh: 'Gujarat', kutch: 'Gujarat',

  mumbai: 'Maharashtra', thane: 'Maharashtra', 'navi mumbai': 'Maharashtra',
  pune: 'Maharashtra', nagpur: 'Maharashtra', nashik: 'Maharashtra',
  aurangabad: 'Maharashtra', kolhapur: 'Maharashtra', solapur: 'Maharashtra',
  amravati: 'Maharashtra', jalgaon: 'Maharashtra', bhusawal: 'Maharashtra',
  satara: 'Maharashtra', sangli: 'Maharashtra', ahmednagar: 'Maharashtra',
  chandrapur: 'Maharashtra', nanded: 'Maharashtra', ratnagiri: 'Maharashtra',
  ahilyanagar: 'Maharashtra',

  bengaluru: 'Karnataka', bangalore: 'Karnataka', mysuru: 'Karnataka', mysore: 'Karnataka',
  mangaluru: 'Karnataka', hubballi: 'Karnataka', belagavi: 'Karnataka', dharwad: 'Karnataka',
  ballari: 'Karnataka', tumakuru: 'Karnataka', shivamogga: 'Karnataka', udupi: 'Karnataka',
  hassan: 'Karnataka',

  chennai: 'Tamil Nadu', coimbatore: 'Tamil Nadu', madurai: 'Tamil Nadu',
  tiruchirappalli: 'Tamil Nadu', tirunelveli: 'Tamil Nadu', salem: 'Tamil Nadu',
  erode: 'Tamil Nadu', vellore: 'Tamil Nadu', thoothukudi: 'Tamil Nadu',
  thanjavur: 'Tamil Nadu', dindigul: 'Tamil Nadu', kanchipuram: 'Tamil Nadu',
  cuddalore: 'Tamil Nadu', nagercoil: 'Tamil Nadu', tiruppur: 'Tamil Nadu',
  tuticorin: 'Tamil Nadu',

  thiruvananthapuram: 'Kerala', kochi: 'Kerala', kozhikode: 'Kerala',
  thrissur: 'Kerala', kollam: 'Kerala', alappuzha: 'Kerala',
  kannur: 'Kerala', palakkad: 'Kerala', ernakulam: 'Kerala', thiruvalla: 'Kerala',

  visakhapatnam: 'Andhra Pradesh', vijayawada: 'Andhra Pradesh', guntur: 'Andhra Pradesh',
  nellore: 'Andhra Pradesh', kurnool: 'Andhra Pradesh', tirupati: 'Andhra Pradesh',
  kakinada: 'Andhra Pradesh', rajamahendravaram: 'Andhra Pradesh', kadapa: 'Andhra Pradesh',
  renigunta: 'Andhra Pradesh', vizianagaram: 'Andhra Pradesh',

  hyderabad: 'Telangana', secunderabad: 'Telangana', warangal: 'Telangana',
  nizamabad: 'Telangana', karimnagar: 'Telangana', khammam: 'Telangana',

  kolkata: 'West Bengal', howrah: 'West Bengal', siliguri: 'West Bengal',
  durgapur: 'West Bengal', asansol: 'West Bengal', kharagpur: 'West Bengal',
  haldia: 'West Bengal', bardhaman: 'West Bengal', kalyani: 'West Bengal',
  burnpur: 'West Bengal',

  lucknow: 'Uttar Pradesh', kanpur: 'Uttar Pradesh', agra: 'Uttar Pradesh',
  varanasi: 'Uttar Pradesh', meerut: 'Uttar Pradesh', prayagraj: 'Uttar Pradesh',
  bareilly: 'Uttar Pradesh', gorakhpur: 'Uttar Pradesh', noida: 'Uttar Pradesh',
  ghaziabad: 'Uttar Pradesh', aligarh: 'Uttar Pradesh', moradabad: 'Uttar Pradesh',
  faizabad: 'Uttar Pradesh', bahraich: 'Uttar Pradesh', banda: 'Uttar Pradesh',
  baghpat: 'Uttar Pradesh', jhansi: 'Uttar Pradesh',

  delhi: 'Delhi', 'new delhi': 'Delhi',

  panipat: 'Haryana', panchkula: 'Haryana', karnal: 'Haryana', nuh: 'Haryana',
  faridabad: 'Haryana',

  jalandhar: 'Punjab', ludhiana: 'Punjab', amritsar: 'Punjab', patiala: 'Punjab',
  hoshiarpur: 'Punjab', mohali: 'Punjab', bathinda: 'Punjab', sangrur: 'Punjab',
  fazilka: 'Punjab',

  jaipur: 'Rajasthan', jodhpur: 'Rajasthan', kota: 'Rajasthan', bikaner: 'Rajasthan',
  udaipur: 'Rajasthan', ajmer: 'Rajasthan', alwar: 'Rajasthan', bhilwara: 'Rajasthan',

  bhopal: 'Madhya Pradesh', indore: 'Madhya Pradesh', jabalpur: 'Madhya Pradesh',
  gwalior: 'Madhya Pradesh', ujjain: 'Madhya Pradesh', sagar: 'Madhya Pradesh',
  ratlam: 'Madhya Pradesh', rewa: 'Madhya Pradesh', betul: 'Madhya Pradesh',
  mhow: 'Madhya Pradesh',

  patna: 'Bihar', gaya: 'Bihar', bhagalpur: 'Bihar', muzaffarpur: 'Bihar',
  darbhanga: 'Bihar', purnia: 'Bihar', hajipur: 'Bihar', arrah: 'Bihar',

  ranchi: 'Jharkhand', jamshedpur: 'Jharkhand', dhanbad: 'Jharkhand',
  bokaro: 'Jharkhand', deoghar: 'Jharkhand', sahibganj: 'Jharkhand',

  raipur: 'Chhattisgarh', bhilai: 'Chhattisgarh', bilaspur: 'Chhattisgarh',
  korba: 'Chhattisgarh', durg: 'Chhattisgarh', jagdalpur: 'Chhattisgarh',

  bhubaneswar: 'Odisha', cuttack: 'Odisha', jharsuguda: 'Odisha', khordha: 'Odisha',
  sambalpur: 'Odisha', bargarh: 'Odisha',

  guwahati: 'Assam', silchar: 'Assam', dibrugarh: 'Assam', jorhat: 'Assam',
  nagaon: 'Assam',

  shillong: 'Meghalaya', imphal: 'Manipur', aizawl: 'Mizoram', agartala: 'Tripura',
  itnagar: 'Arunachal Pradesh', kohima: 'Nagaland', dimapur: 'Nagaland',
  churachandpur: 'Manipur', gangtok: 'Sikkim',

  dehradun: 'Uttarakhand', haridwar: 'Uttarakhand', haldwani: 'Uttarakhand',
  kashipur: 'Uttarakhand',

  chandigarh: 'Chandigarh', shimla: 'Himachal Pradesh', manali: 'Himachal Pradesh',
  dharamshala: 'Himachal Pradesh', hamirpur: 'Himachal Pradesh',

  srinagar: 'Jammu and Kashmir', jammu: 'Jammu and Kashmir', leh: 'Ladakh',
  panaji: 'Goa', mapusa: 'Goa', puducherry: 'Puducherry', karaikal: 'Puducherry',
  'port blair': 'Andaman and Nicobar Islands', daman: 'Dadra and Nagar Haveli and Daman and Diu',
  kirandul: 'Chhattisgarh',
};

export function stateForCity(city: string | null | undefined): string | null {
  if (!city) return null;
  return CITY_STATE[normalize(city)] ?? null;
}

function normalize(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().replace(/[^a-z& ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function stateListNormalized(): string[] {
  return INDIAN_STATES.map(normalize);
}

export function parseDocDate(text: string): Date | null {
  const match = text.match(/Dated:\s*(\d{1,2})-(\d{1,2})-(\d{4})/i);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (!day || !month || !year || month > 12 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function labeledValue(text: string, label: string): string | null {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp(`${escaped}([^\\n]+)`));
  if (!match) return null;
  const raw = match[1].replace(/\s+/g, ' ').trim();
  if (!raw) return null;
  if (/^(n\/?a|na|none|-|not applicable)$/i.test(raw)) return null;
  if (raw.length > 200) return null;
  return raw;
}

export function matchState(value: string | null | undefined): string | null {
  const norm = ` ${normalize(value)} `;
  if (!norm.trim()) return null;
  const states = stateListNormalized();
  for (let i = 0; i < states.length; i += 1) {
    if (norm === ` ${states[i]} `) return INDIAN_STATES[i];
  }
  for (let i = 0; i < states.length; i += 1) {
    if (norm.includes(` ${states[i]} `)) return INDIAN_STATES[i];
  }
  return null;
}

export function extractStateFromText(text: string): string | null {
  const norm = ` ${normalize(text)} `;
  if (!norm.trim()) return null;
  const states = stateListNormalized();
  let best: { name: string; at: number } | null = null;
  for (let i = 0; i < states.length; i += 1) {
    const at = norm.indexOf(` ${states[i]} `);
    if (at >= 0 && (!best || at < best.at)) best = { name: INDIAN_STATES[i], at };
  }
  return best ? best.name : null;
}

// Right-to-left scan for a token that is a known city. Precision over recall:
// unknown office/district fragments are rejected instead of stored as cities.
export function findKnownCity(text: string | null | undefined): string | null {
  if (!text) return null;
  const tokens = normalize(text).split(' ').filter(Boolean);
  if (tokens.length === 0) return null;
  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    if (i >= 1) {
      const two = `${tokens[i - 1]} ${tokens[i]}`;
      if (CITY_NAMES.includes(two)) return titleCase(two);
    }
    const one = tokens[i];
    if (CITY_NAMES.includes(one)) return titleCase(one);
  }
  return null;
}

export function cityFromAddress(address: string | null | undefined): string | null {
  if (!address) return null;
  const text = address.replace(/\s+/g, ' ');
  const pinIndex = text.search(/[-–]\s*\d{6}\b/);
  if (pinIndex > 0) {
    const beforePin = findKnownCity(text.slice(0, pinIndex));
    if (beforePin) return beforePin;
  }
  return findKnownCity(text);
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(' ')
    .map((part) => (part.length > 2 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
    .trim();
}

export function extractAddressBlocks(text: string): string[] {
  const blocks: string[] = [];
  const lines = text.split(/\n/);
  let current: string[] = [];
  const pinRe = /\b\d{6}\b/;
  for (const line of lines) {
    const trimmed = line.trim();
    if (pinRe.test(trimmed)) {
      current.push(trimmed);
      const next = current.join(' ');
      if (/\b\d{6}\b[\s\S]{0,120}[-–]\s*\d{6}\b/.test(next) || /[-–]\s*\d{6}\b/.test(next)) {
        blocks.push(next);
        current = [];
      }
    } else if (current.length > 0) {
      current.push(trimmed);
      if (current.length > 6) {
        blocks.push(current.join(' '));
        current = [];
      }
    }
  }
  if (current.length > 0) blocks.push(current.join(' '));
  return blocks.map((b) => b.replace(/\s+/g, ' ').trim()).filter((b) => /\b\d{6}\b/.test(b));
}

export function cityFromOffice(office: string | null | undefined): string | null {
  if (!office) return null;
  return findKnownCity(office);
}

export function parseBidDocument(text: string): BidDocumentFacts {
  const ministryLabel = labeledValue(text, 'Ministry/State Name');
  const department = labeledValue(text, 'Department Name');
  const organisation = labeledValue(text, 'Organisation Name');
  const office = labeledValue(text, 'Office Name');

  const stateFieldMatch = text.match(/^\s*State\s*([A-Za-z][A-Za-z &]{1,29})\s*$/m);
  const stateField = stateFieldMatch ? matchState(stateFieldMatch[1]) : null;
  const ministryState = matchState(ministryLabel);
  const blocks = extractAddressBlocks(text);
  const addressText = blocks.length > 0 ? blocks.join(' | ').slice(0, 900) : null;

  let cityName: string | null = null;
  for (const block of blocks) {
    cityName = cityFromAddress(block);
    if (cityName) break;
  }
  if (!cityName && addressText) cityName = cityFromAddress(addressText);
  if (!cityName) cityName = cityFromOffice(office);

  let stateName = stateField ?? ministryState;
  if (!stateName && addressText) stateName = extractStateFromText(addressText);
  if (!stateName) {
    stateName = extractStateFromText(
      [organisation, department, office].filter(Boolean).join(' '),
    );
  }

  return {
    publishedAt: parseDocDate(text),
    stateName,
    cityName,
    addressText,
    ministry: ministryLabel,
    department,
    organisation,
    office,
  };
}
