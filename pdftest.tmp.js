const fs = require('fs');
const pdf = require('pdf-parse');

const file = process.argv[2];
const buf = fs.readFileSync(file);
pdf(buf).then((d) => {
  const t = d.text || '';
  console.log('PAGES=' + d.numpages + ' TEXT_LEN=' + t.length);
  const low = t.toLowerCase();
  for (const k of ['delivery address', 'consignee', 'address', 'state', 'district', 'city', 'pin', 'gujarat', 'vadodara', 'ahmedabad']) {
    const c = low.split(k).length - 1;
    console.log(k + ' => ' + c);
  }
  const i = low.indexOf('delivery address');
  if (i >= 0) console.log('CTX_DELIVERY: ' + JSON.stringify(t.slice(Math.max(0, i - 120), i + 500)));
  const j = low.indexOf('consignee');
  if (j >= 0) console.log('CTX_CONSIGNEE: ' + JSON.stringify(t.slice(Math.max(0, j - 120), j + 500)));
  console.log('--- HEAD 800 ---');
  console.log(JSON.stringify(t.slice(0, 800)));
}).catch((e) => { console.error('ERR', e.message); process.exit(1); });
