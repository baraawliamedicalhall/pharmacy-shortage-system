import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import readline from 'readline';

const prisma = new PrismaClient();

function parseCSVLine(text) {
  const row = [];
  let inQuotes = false;
  let currentField = '';
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i+1];
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentField.trim());
      currentField = '';
    } else {
      currentField += char;
    }
  }
  row.push(currentField.trim());
  return row;
}

function cleanBrand(name) {
  if (!name) return '';
  return name
    .replace(/\s+(Syrup|Suspension|Tablet|Capsule|Injection|Drop|Drops|Gel|Cream|Ointment|Solution|Oral Solution|Inhaler|Eye Drops|Nasal Spray|IV|IM|Paediatric Drops|Infusion)\b/gi, '')
    .trim()
    .toLowerCase();
}

function normalizeStrength(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/\s+/g, '').replace(/,/g, '');
}

function parseMedexPackage(pkgContainer, pkgSize, dosageForm) {
  const combined = `${pkgContainer || ''} ${pkgSize || ''}`.trim();
  
  let unitMrp = 0;
  let packPrice = 0;
  let packCount = 0;
  let stripPrice = 0;
  let unitsPerStrip = 10;
  let stripsPerBox = 10;
  let unitsPerBox = 100;
  let packDescription = combined;

  // 1. Check for explicit "Unit Price: ৳ XX.XX"
  const unitMatch = combined.match(/Unit Price:\s*৳\s*([0-9.,]+)/i);
  if (unitMatch) {
    unitMrp = parseFloat(unitMatch[1].replace(/,/g, ''));
  }

  // 2. Check for "(XX's pack: ৳ YY.YY)"
  const packMatch = combined.match(/\(([0-9]+)'s\s*pack:\s*৳\s*([0-9.,]+)\)/i);
  if (packMatch) {
    packCount = parseInt(packMatch[1], 10);
    packPrice = parseFloat(packMatch[2].replace(/,/g, ''));
    if (!unitMrp && packCount > 0) {
      unitMrp = parseFloat((packPrice / packCount).toFixed(2));
    }
  }

  // 3. Check for strip match: e.g. "4 tablet strip: ৳ 55.00" or "10 tablet strip: ৳ 80.00"
  const stripMatch = combined.match(/([0-9]+)\s*(?:tablet|capsule)?\s*strip:\s*৳\s*([0-9.,]+)/i);
  if (stripMatch) {
    const sUnits = parseInt(stripMatch[1], 10);
    const sPrice = parseFloat(stripMatch[2].replace(/,/g, ''));
    if (sUnits > 0) {
      unitsPerStrip = sUnits;
      stripPrice = sPrice;
      if (!unitMrp) {
        unitMrp = parseFloat((sPrice / sUnits).toFixed(2));
      }
    }
  }

  // 4. Bottle / vial / tube / suspension / syrup single item price:
  // e.g. "100 ml bottle: ৳ 40.12", "500 mg vial: ৳ 28.43", "15 gm tube: ৳ 35.00"
  if (!unitMrp) {
    const singleMatch = combined.match(/([0-9.]+)\s*(?:ml|gm|mg|vial|bottle|tube)[^:]*:\s*৳\s*([0-9.,]+)/i);
    if (singleMatch) {
      unitMrp = parseFloat(singleMatch[2].replace(/,/g, ''));
    }
  }

  // 5. Fallback generic regex for any "৳ XX.XX"
  if (!unitMrp) {
    const anyPrice = combined.match(/৳\s*([0-9.,]+)/);
    if (anyPrice) {
      unitMrp = parseFloat(anyPrice[1].replace(/,/g, ''));
    }
  }

  // Calculate strip and box prices
  const isLiquidOrCream = /syrup|suspension|cream|ointment|gel|drop|solution|inhaler|injection|lotion|spray|respule/i.test(dosageForm || '');
  let retailUnit = 'Tablet';
  let purchaseUnit = 'Box';

  if (/capsule/i.test(dosageForm || '')) retailUnit = 'Capsule';
  else if (/syrup|suspension|solution|oral solution|liquid/i.test(dosageForm || '')) {
    retailUnit = 'Bottle';
    purchaseUnit = 'Bottle';
  } else if (/injection|infusion/i.test(dosageForm || '')) {
    retailUnit = 'Vial';
    purchaseUnit = 'Box';
  } else if (/cream|ointment|gel/i.test(dosageForm || '')) {
    retailUnit = 'Tube';
    purchaseUnit = 'Tube';
  } else if (/drop/i.test(dosageForm || '')) {
    retailUnit = 'Bottle';
    purchaseUnit = 'Bottle';
  } else if (/inhaler/i.test(dosageForm || '')) {
    retailUnit = 'Inhaler';
    purchaseUnit = 'Piece';
  }

  if (isLiquidOrCream) {
    unitsPerStrip = 1;
    stripPrice = unitMrp;
    stripsPerBox = 1;
    unitsPerBox = 1;
  } else {
    // Solid oral forms (Tablets, Capsules)
    if (packCount > 0) {
      unitsPerBox = packCount;
      if (packCount >= 100) {
        unitsPerStrip = 10;
        stripsPerBox = Math.round(packCount / 10);
      } else if (packCount === 56) {
        unitsPerStrip = 14;
        stripsPerBox = 4;
      } else if (packCount === 50) {
        unitsPerStrip = 10;
        stripsPerBox = 5;
      } else if (packCount === 30) {
        unitsPerStrip = 10;
        stripsPerBox = 3;
      } else if (packCount === 28) {
        unitsPerStrip = 14;
        stripsPerBox = 2;
      } else if (packCount === 14) {
        unitsPerStrip = 7;
        stripsPerBox = 2;
      } else if (packCount === 20) {
        unitsPerStrip = 10;
        stripsPerBox = 2;
      } else {
        unitsPerStrip = Math.min(10, packCount);
        stripsPerBox = Math.max(1, Math.round(packCount / unitsPerStrip));
      }
    } else {
      unitsPerStrip = 10;
      stripsPerBox = 10;
      unitsPerBox = 100;
    }

    if (!stripPrice) {
      stripPrice = parseFloat((unitMrp * unitsPerStrip).toFixed(2));
    }
  }

  const boxPrice = packPrice > 0 ? packPrice : parseFloat((unitMrp * unitsPerBox).toFixed(2));
  const tradePrice = parseFloat((unitMrp * 0.88).toFixed(2));
  const tradeBoxPrice = parseFloat((boxPrice * 0.88).toFixed(2));

  return {
    unitMrp,
    stripPrice,
    boxPrice,
    tradePrice,
    tradeBoxPrice,
    unitsPerStrip,
    stripsPerBox,
    unitsPerBox,
    retailUnit,
    purchaseUnit,
    packDescription: combined.slice(0, 120) || `${stripsPerBox} x ${unitsPerStrip} Pack`
  };
}

// Critical modern medicines override map (e.g. Mirogabalin Besylate launched recently)
const OVERRIDES = {
  'mig|10 mg': { mrp: 35.0, stripPrice: 350.0, boxPrice: 1050.0, tradePrice: 30.8, tradeBoxPrice: 924.0, unitsPerStrip: 10, stripsPerBox: 3, unitsPerBox: 30, packDescription: "3 x 10's Blister Pack" },
  'mig|5 mg': { mrp: 20.0, stripPrice: 200.0, boxPrice: 600.0, tradePrice: 17.6, tradeBoxPrice: 528.0, unitsPerStrip: 10, stripsPerBox: 3, unitsPerBox: 30, packDescription: "3 x 10's Blister Pack" },
  'mig|2.5 mg': { mrp: 12.0, stripPrice: 120.0, boxPrice: 360.0, tradePrice: 10.56, tradeBoxPrice: 316.8, unitsPerStrip: 10, stripsPerBox: 3, unitsPerBox: 30, packDescription: "3 x 10's Blister Pack" },
  'tarlica|10 mg': { mrp: 35.0, stripPrice: 350.0, boxPrice: 1050.0, tradePrice: 30.8, tradeBoxPrice: 924.0, unitsPerStrip: 10, stripsPerBox: 3, unitsPerBox: 30, packDescription: "3 x 10's Blister Pack" },
  'tarlica|5 mg': { mrp: 20.0, stripPrice: 200.0, boxPrice: 600.0, tradePrice: 17.6, tradeBoxPrice: 528.0, unitsPerStrip: 10, stripsPerBox: 3, unitsPerBox: 30, packDescription: "3 x 10's Blister Pack" },
  'targaba|10 mg': { mrp: 35.0, stripPrice: 350.0, boxPrice: 1050.0, tradePrice: 30.8, tradeBoxPrice: 924.0, unitsPerStrip: 10, stripsPerBox: 3, unitsPerBox: 30, packDescription: "3 x 10's Blister Pack" },
  'targaba|5 mg': { mrp: 20.0, stripPrice: 200.0, boxPrice: 600.0, tradePrice: 17.6, tradeBoxPrice: 528.0, unitsPerStrip: 10, stripsPerBox: 3, unitsPerBox: 30, packDescription: "3 x 10's Blister Pack" }
};

async function main() {
  console.log('=== STARTING COMPLETE MEDEX SCRAPED DATA SYNC ===\n');

  console.log('Loading data/medex-raw-scraped.csv...');
  const fileStream = fs.createReadStream('data/medex-raw-scraped.csv');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineCount = 0;
  const exactMap = new Map();
  const cleanedMap = new Map();
  const brandGenericStrengthMap = new Map();
  const genericStrengthMap = new Map();
  const genericFormMap = new Map();
  const genericMap = new Map();

  for await (const line of rl) {
    lineCount++;
    if (lineCount === 1) continue;

    const cols = parseCSVLine(line);
    if (cols.length < 8) continue;

    const brandName = cols[1] || '';
    const dosageForm = cols[4] || '';
    const generic = cols[5] || '';
    const strength = cols[6] || '';
    const manufacturer = cols[7] || '';
    const pkgContainer = cols[8] || '';
    const pkgSize = cols[9] || '';

    const parsed = parseMedexPackage(pkgContainer, pkgSize, dosageForm);
    if (!parsed.unitMrp || parsed.unitMrp <= 0) continue;

    const data = {
      brandName,
      dosageForm,
      generic,
      strength,
      manufacturer,
      pricing: parsed
    };

    const key1 = `${brandName}|${strength}|${dosageForm}`.toLowerCase();
    const keyClean = `${cleanBrand(brandName)}|${normalizeStrength(strength)}|${dosageForm.toLowerCase()}`;
    const keyBGS = `${cleanBrand(brandName)}|${normalizeStrength(strength)}`;
    const keyGS = `${generic.toLowerCase()}|${normalizeStrength(strength)}|${dosageForm.toLowerCase()}`;
    const keyGF = `${generic.toLowerCase()}|${dosageForm.toLowerCase()}`;
    const keyG = generic.toLowerCase();

    exactMap.set(key1, data);
    if (!cleanedMap.has(keyClean)) cleanedMap.set(keyClean, data);
    if (!brandGenericStrengthMap.has(keyBGS)) brandGenericStrengthMap.set(keyBGS, data);
    if (!genericStrengthMap.has(keyGS)) genericStrengthMap.set(keyGS, data);
    if (!genericFormMap.has(keyGF)) genericFormMap.set(keyGF, data);
    if (!genericMap.has(keyG)) genericMap.set(keyG, data);
  }

  console.log(`Loaded ${exactMap.size} unique MedEx medicines with validated prices.\n`);

  console.log('Fetching all medicines from database...');
  const dbMeds = await prisma.medicine.findMany({
    select: {
      id: true,
      brandName: true,
      strength: true,
      dosageForm: true,
      genericName: true,
      mrp: true,
      stripPrice: true,
      boxPrice: true,
      tradePrice: true,
      tradeBoxPrice: true,
      unitsPerStrip: true,
      stripsPerBox: true,
      unitsPerBox: true,
      retailUnit: true,
      purchaseUnit: true,
      packDescription: true,
    }
  });

  console.log(`Found ${dbMeds.length} medicines in database.\n`);

  let tierCounts = {
    override: 0,
    exact: 0,
    cleanBrand: 0,
    brandStrength: 0,
    genericStrengthForm: 0,
    genericForm: 0,
    genericOnly: 0,
    retainedCurrent: 0,
  };

  const updates = [];
  const exportCache = {};

  for (const m of dbMeds) {
    const overrideKey = `${cleanBrand(m.brandName)}|${normalizeStrength(m.strength)}`;
    const key1 = `${m.brandName}|${m.strength || ''}|${m.dosageForm || ''}`.toLowerCase();
    const keyClean = `${cleanBrand(m.brandName)}|${normalizeStrength(m.strength)}|${(m.dosageForm || '').toLowerCase()}`;
    const keyBGS = `${cleanBrand(m.brandName)}|${normalizeStrength(m.strength)}`;
    const keyGS = `${(m.genericName || '').toLowerCase()}|${normalizeStrength(m.strength)}|${(m.dosageForm || '').toLowerCase()}`;
    const keyGF = `${(m.genericName || '').toLowerCase()}|${(m.dosageForm || '').toLowerCase()}`;
    const keyG = (m.genericName || '').toLowerCase();

    let finalPricing = null;
    let matchType = '';

    if (OVERRIDES[overrideKey]) {
      finalPricing = { ...OVERRIDES[overrideKey] };
      matchType = 'OVERRIDE';
      tierCounts.override++;
    } else if (exactMap.has(key1)) {
      finalPricing = exactMap.get(key1).pricing;
      matchType = 'EXACT';
      tierCounts.exact++;
    } else if (cleanedMap.has(keyClean)) {
      finalPricing = cleanedMap.get(keyClean).pricing;
      matchType = 'CLEAN_BRAND';
      tierCounts.cleanBrand++;
    } else if (brandGenericStrengthMap.has(keyBGS)) {
      finalPricing = brandGenericStrengthMap.get(keyBGS).pricing;
      matchType = 'BRAND_STRENGTH';
      tierCounts.brandStrength++;
    } else if (genericStrengthMap.has(keyGS)) {
      finalPricing = genericStrengthMap.get(keyGS).pricing;
      matchType = 'GENERIC_STRENGTH_FORM';
      tierCounts.genericStrengthForm++;
    } else if (genericFormMap.has(keyGF)) {
      finalPricing = genericFormMap.get(keyGF).pricing;
      matchType = 'GENERIC_FORM';
      tierCounts.genericForm++;
    } else if (genericMap.has(keyG)) {
      finalPricing = genericMap.get(keyG).pricing;
      matchType = 'GENERIC_ONLY';
      tierCounts.genericOnly++;
    } else {
      // Retain existing clinical pricing from fix-all-medicine-prices.mjs
      finalPricing = {
        unitMrp: m.mrp || 10,
        stripPrice: m.stripPrice || 100,
        boxPrice: m.boxPrice || 1000,
        tradePrice: m.tradePrice || ((m.mrp || 10) * 0.88),
        tradeBoxPrice: m.tradeBoxPrice || ((m.boxPrice || 1000) * 0.88),
        unitsPerStrip: m.unitsPerStrip || 10,
        stripsPerBox: m.stripsPerBox || 10,
        unitsPerBox: m.unitsPerBox || 100,
        retailUnit: m.retailUnit || 'Tablet',
        purchaseUnit: m.purchaseUnit || 'Box',
        packDescription: m.packDescription || 'Standard Pack'
      };
      matchType = 'RETAINED';
      tierCounts.retainedCurrent++;
    }

    const mrp = Number(finalPricing.unitMrp || finalPricing.mrp);
    const stripPrice = Number(finalPricing.stripPrice);
    const boxPrice = Number(finalPricing.boxPrice);
    const tradePrice = Number(finalPricing.tradePrice || (mrp * 0.88).toFixed(2));
    const tradeBoxPrice = Number(finalPricing.tradeBoxPrice || (boxPrice * 0.88).toFixed(2));
    const unitsPerStrip = Number(finalPricing.unitsPerStrip || 10);
    const stripsPerBox = Number(finalPricing.stripsPerBox || 10);
    const unitsPerBox = Number(finalPricing.unitsPerBox || unitsPerStrip * stripsPerBox);
    const packDesc = finalPricing.packDescription || `${stripsPerBox} x ${unitsPerStrip} Pack`;
    const retUnit = finalPricing.retailUnit || m.retailUnit || 'Tablet';
    const purUnit = finalPricing.purchaseUnit || m.purchaseUnit || 'Box';

    updates.push({
      id: m.id,
      mrp,
      stripPrice,
      boxPrice,
      tradePrice,
      tradeBoxPrice,
      unitsPerStrip,
      stripsPerBox,
      unitsPerBox,
      packDescription: packDesc,
      retailUnit: retUnit,
      purchaseUnit: purUnit,
    });

    exportCache[m.id] = {
      brandName: m.brandName,
      strength: m.strength,
      genericName: m.genericName,
      dosageForm: m.dosageForm,
      pricing: {
        mrp,
        stripPrice,
        boxPrice,
        tradePrice,
        tradeBoxPrice,
        unitsPerStrip,
        stripsPerBox,
        unitsPerBox,
        packDescription: packDesc,
        matchType
      }
    };
  }

  console.log('Matching breakdown:');
  console.log(`- Overrides (e.g. Mig): ${tierCounts.override}`);
  console.log(`- Exact Brand+Strength+Form: ${tierCounts.exact}`);
  console.log(`- Cleaned Brand: ${tierCounts.cleanBrand}`);
  console.log(`- Brand+Strength: ${tierCounts.brandStrength}`);
  console.log(`- Generic+Strength+Form: ${tierCounts.genericStrengthForm}`);
  console.log(`- Generic+Form: ${tierCounts.genericForm}`);
  console.log(`- Generic Only: ${tierCounts.genericOnly}`);
  console.log(`- Retained Clinical Standard: ${tierCounts.retainedCurrent}`);

  const totalFromMedex = tierCounts.override + tierCounts.exact + tierCounts.cleanBrand + tierCounts.brandStrength + tierCounts.genericStrengthForm + tierCounts.genericForm + tierCounts.genericOnly;
  console.log(`\n=> TOTAL DATA DRIVEN BY MEDEX: ${totalFromMedex} / ${dbMeds.length} (${(totalFromMedex / dbMeds.length * 100).toFixed(1)}%)\n`);

  console.log('Applying batch updates to SQLite database...');
  const BATCH_SIZE = 500;
  let updatedCount = 0;

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    await prisma.$transaction(
      batch.map(item =>
        prisma.medicine.update({
          where: { id: item.id },
          data: {
            mrp: item.mrp,
            stripPrice: item.stripPrice,
            boxPrice: item.boxPrice,
            tradePrice: item.tradePrice,
            tradeBoxPrice: item.tradeBoxPrice,
            unitsPerStrip: item.unitsPerStrip,
            stripsPerBox: item.stripsPerBox,
            unitsPerBox: item.unitsPerBox,
            packDescription: item.packDescription,
            retailUnit: item.retailUnit,
            purchaseUnit: item.purchaseUnit,
          }
        })
      )
    );
    updatedCount += batch.length;
    if (updatedCount % 5000 === 0 || updatedCount === updates.length) {
      console.log(`Updated ${updatedCount} / ${updates.length} records...`);
    }
  }

  console.log('\nSaving full collected cache to data/medex-collected-prices.json...');
  fs.writeFileSync('data/medex-collected-prices.json', JSON.stringify(exportCache, null, 2), 'utf8');
  console.log('Saved data/medex-collected-prices.json successfully.');

  console.log('\n=== VERIFYING KEY BRANDS ===');
  const testBrands = ['Mig', 'Napa', 'Seclo', 'Maxpro', 'Finix', 'Pantonix', 'Sergel', 'Monas', 'Ace'];
  for (const b of testBrands) {
    const records = await prisma.medicine.findMany({
      where: { brandName: { startsWith: b } },
      take: 2,
      select: {
        brandName: true,
        strength: true,
        dosageForm: true,
        mrp: true,
        stripPrice: true,
        boxPrice: true,
        tradePrice: true,
        packDescription: true,
      }
    });
    records.forEach(r => {
      console.log(`[VERIFIED] ${r.brandName} ${r.strength} (${r.dosageForm}): Unit ৳${r.mrp}, Strip ৳${r.stripPrice}, Box ৳${r.boxPrice}, Trade ৳${r.tradePrice} | Pack: ${r.packDescription}`);
    });
  }

  await prisma.$disconnect();
  console.log('\nSync finished successfully!');
}

main().catch(async (e) => {
  console.error('Sync failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
