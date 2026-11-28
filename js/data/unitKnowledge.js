// Original bilingual knowledge checks, researched from BIPM and NIST references.
// Each record keeps its supporting primary source beside the answer.
const sources = {
  base: ['BIPM · SI base units', 'BIPM · หน่วยฐาน SI', 'https://www.bipm.org/en/measurement-units/si-base-units'],
  history: ['BIPM · History of the SI', 'BIPM · ประวัติ SI', 'https://www.bipm.org/en/history-si'],
  si: ['BIPM · The SI', 'BIPM · ระบบ SI', 'https://www.bipm.org/en/measurement-units/'],
  prefixes: ['BIPM · SI prefixes', 'BIPM · คำนำหน้า SI', 'https://www.bipm.org/en/measurement-units/si-prefixes'],
  candela: ['NIST · Candela history and definition', 'NIST · ประวัติและนิยามแคนเดลา', 'https://www.nist.gov/si-redefinition/candela'],
  writing: ['NIST · SI writing rules', 'NIST · หลักการเขียนหน่วย SI', 'https://www.nist.gov/pml/special-publication-811/nist-guide-si-chapter-6-rules-and-style-conventions-printing-and-using']
};
const bi = (th, en) => ({ th, en });
const bank = [];
function add(topic, th, en, answer, distractors, explainTh, explainEn, source = 'base') {
  bank.push({ id: `unit-fact-${String(bank.length + 1).padStart(3, '0')}`, topic, prompt: bi(th, en), answer: bi(answer[0], answer[1]), distractors: distractors.map(([a, b]) => bi(a, b)), explanation: bi(explainTh, explainEn), source: sources[source] });
}

const bases = [
  ['length','ความยาว','length','เมตร','metre','m'],
  ['mass','มวล','mass','กิโลกรัม','kilogram','kg'],
  ['time','เวลา','time','วินาที','second','s'],
  ['current','กระแสไฟฟ้า','electric current','แอมแปร์','ampere','A'],
  ['temperature','อุณหภูมิเทอร์โมไดนามิก','thermodynamic temperature','เคลวิน','kelvin','K'],
  ['amount','ปริมาณสาร','amount of substance','โมล','mole','mol'],
  ['luminous','ความเข้มการส่องสว่าง','luminous intensity','แคนเดลา','candela','cd']
];
for (const [topic,qTh,qEn,uTh,uEn,symbol] of bases) {
  const correct = [uTh, uEn];
  const wrong = bases.filter(row => row[0] !== topic).slice(0,3).map(row => [row[3],row[4]]);
  add(topic, `หน่วยฐาน SI ของ${qTh}คือข้อใด?`, `Which is the SI base unit for ${qEn}?`, correct, wrong, `${uTh} (${symbol}) เป็นหน่วยฐาน SI ของ${qTh}`, `${uEn} (${symbol}) is the SI base unit for ${qEn}.`);
  const correctSymbol = [`${uTh} (${symbol})`, `${uEn} (${symbol})`];
  const wrongSymbols = bases.filter(row => row[0] !== topic).slice(0,3).map(row => [`${row[3]} (${row[5]})`,`${row[4]} (${row[5]})`]);
  add(topic, `สัญลักษณ์ ${symbol} ใช้แทนหน่วยใด?`, `What unit does the symbol ${symbol} represent?`, correctSymbol, wrongSymbols, `สัญลักษณ์หน่วยที่ถูกต้องคือ ${symbol}`, `The unit symbol is ${symbol}.`);
}

const prefixes = [
  ['quetta','เควตตะ','Q','10³⁰'],['ronna','รอนนา','R','10²⁷'],['yotta','ยอตตะ','Y','10²⁴'],['zetta','เซตตะ','Z','10²¹'],
  ['exa','เอกซะ','E','10¹⁸'],['peta','เพตะ','P','10¹⁵'],['tera','เทระ','T','10¹²'],['giga','จิกะ','G','10⁹'],
  ['mega','เมกะ','M','10⁶'],['kilo','กิโล','k','10³'],['hecto','เฮกโต','h','10²'],['deca','เดคา','da','10¹'],
  ['deci','เดซิ','d','10⁻¹'],['centi','เซนติ','c','10⁻²'],['milli','มิลลิ','m','10⁻³'],['micro','ไมโคร','µ','10⁻⁶'],
  ['nano','นาโน','n','10⁻⁹'],['pico','พิโก','p','10⁻¹²'],['femto','เฟมโต','f','10⁻¹⁵'],['atto','อัตโต','a','10⁻¹⁸']
];
for (let i=0;i<prefixes.length;i++) {
  const [en,th,symbol,power]=prefixes[i];
  const distractorRows=[prefixes[(i+3)%20],prefixes[(i+7)%20],prefixes[(i+12)%20]];
  add('general', `คำนำหน้า ${th} (${symbol}) หมายถึงตัวคูณใด?`, `What factor does the SI prefix ${en} (${symbol}) represent?`, [power,power], distractorRows.map(row=>[row[3],row[3]]), `${th} หมายถึง ${power}`, `${en} means ${power}.`, 'prefixes');
  add('general', `ตัวคูณ ${power} ใช้คำนำหน้า SI ข้อใด?`, `Which SI prefix represents a factor of ${power}?`, [th,en], distractorRows.map(row=>[row[1],row[0]]), `คำนำหน้า ${th} ใช้สัญลักษณ์ ${symbol}`, `The prefix is ${en}, symbol ${symbol}.`, 'prefixes');
}

const history = [
  ['ชื่อ “International System of Units (SI)” ได้รับการรับรองในปีใด?','In what year was the name “International System of Units (SI)” adopted?',['1960','1960'],[['1799','1799'],['1875','1875'],['1971','1971']],'CGPM รับรองชื่อ SI ในปี 1960.','The CGPM adopted the name SI in 1960.','history'],
  ['ระบบ SI ใช้หน่วยฐานทั้งหมดกี่หน่วย?','How many base units are in the SI?',['7','7'],[['5','5'],['6','6'],['9','9']],'SI มีหน่วยฐานเจ็ดหน่วย.','The SI has seven base units.','base'],
  ['หน่วยฐานลำดับที่เจ็ดที่เพิ่มในปี 1971 คือหน่วยใด?','Which unit was added as the seventh SI base unit in 1971?',['โมล','mole'],[['แคนเดลา','candela'],['แอมแปร์','ampere'],['เคลวิน','kelvin']],'CGPM เพิ่มโมลเป็นหน่วยฐานที่เจ็ดในปี 1971.','The mole was added as the seventh base unit in 1971.','history'],
  ['ต้นกำเนิดระบบเมตริกสัมพันธ์กับเหตุการณ์ใดในฝรั่งเศส?','The metric system originated in connection with which event in France?',['การปฏิวัติฝรั่งเศส','the French Revolution'],[['การปฏิวัติอุตสาหกรรม','the Industrial Revolution'],['สงครามโลกครั้งที่หนึ่ง','World War I'],['ยุคฟื้นฟูศิลปวิทยา','the Renaissance']],'ระบบเมตริกเริ่มพัฒนาขึ้นในยุคการปฏิวัติฝรั่งเศส.','The metric system began developing during the French Revolution.','history'],
  ['สนธิสัญญาเมตริกลงนามในปีใด?','In what year was the Metre Convention signed?',['1875','1875'],[['1799','1799'],['1889','1889'],['1960','1960']],'สนธิสัญญาเมตริกลงนามในปี 1875.','The Metre Convention was signed in 1875.','history'],
  ['องค์กรระหว่างประเทศด้านมาตรวิทยา BIPM ก่อตั้งจากสนธิสัญญาใด?','Which treaty established the BIPM?',['สนธิสัญญาเมตริก','the Metre Convention'],[['สนธิสัญญาแวร์ซาย','the Treaty of Versailles'],['สนธิสัญญาปารีส','the Treaty of Paris'],['สนธิสัญญาโรม','the Treaty of Rome']],'สนธิสัญญาเมตริกปี 1875 ก่อตั้ง BIPM.','The 1875 Metre Convention established the BIPM.','history'],
  ['การประชุม CGPM ลงมติปรับนิยาม SI ครั้งใหญ่ในปีใด?','In what year did the CGPM vote for the major SI revision?',['2018','2018'],[['2000','2000'],['2010','2010'],['2022','2022']],'การลงมติปรับนิยามเกิดขึ้นในปี 2018.','The vote to revise the SI took place in 2018.','si'],
  ['นิยาม SI ที่แก้ไขใหม่มีผลใช้ตั้งแต่วันใด?','When did the revised SI definitions take effect?',['20 พฤษภาคม 2019','20 May 2019'],[['1 มกราคม 2018','1 January 2018'],['20 พฤษภาคม 2018','20 May 2018'],['1 มกราคม 2020','1 January 2020']],'นิยามใหม่มีผลในวันที่ 20 พฤษภาคม 2019.','The revised definitions took effect on 20 May 2019.','si'],
  ['การแก้ไขปี 2018 เปลี่ยนนิยามหน่วยฐานใด 4 หน่วย?','Which four base units were redefined in the 2018 revision?',['กิโลกรัม แอมแปร์ เคลวิน และโมล','kilogram, ampere, kelvin, and mole'],[['เมตร วินาที โมล และแคนเดลา','metre, second, mole, and candela'],['กิโลกรัม เมตร วินาที และแอมแปร์','kilogram, metre, second, and ampere'],['แอมแปร์ เคลวิน แคนเดลา และเมตร','ampere, kelvin, candela, and metre']],'สี่หน่วยนี้เปลี่ยนนิยามโดยอิงค่าคงที่พื้นฐาน.','These four units were redefined using defining constants.','si'],
  ['ค่าคงที่ใดใช้กำหนดกิโลกรัมใน SI ปัจจุบัน?','Which constant defines the kilogram in the current SI?',['ค่าคงที่พลังค์','Planck constant'],[['ค่าคงที่อาโวกาโดร','Avogadro constant'],['ประจุมูลฐาน','elementary charge'],['ค่าคงที่โบลต์ซมันน์','Boltzmann constant']],'กิโลกรัมอิงค่าคงที่พลังค์ h.','The kilogram is defined using the Planck constant h.','si'],
  ['วัตถุมาตรฐานกิโลกรัมระหว่างประเทศเดิมทำจากวัสดุใด?','What material was the former International Prototype of the Kilogram made from?',['แพลทินัม-อิริเดียม','platinum-iridium'],[['ทองแดง','copper'],['อะลูมิเนียม','aluminium'],['เหล็กกล้า','steel']],'ต้นแบบเป็นทรงกระบอกโลหะผสมแพลทินัม-อิริเดียม.','The prototype was a platinum-iridium alloy cylinder.','history'],
  ['ปัจจุบันนิยามเมตรอิงค่าคงที่ใด?','Which constant defines the metre in the current SI?',['ความเร็วแสงในสุญญากาศ','speed of light in vacuum'],[['ค่าคงที่พลังค์','Planck constant'],['ความถี่ซีเซียม','caesium frequency'],['ค่าคงที่อาโวกาโดร','Avogadro constant']],'เมตรอิงค่าความเร็วแสง c ที่กำหนดแน่นอน.','The metre uses the fixed value of the speed of light c.','si'],
  ['นิยามวินาทีอิงการเปลี่ยนผ่านของอะตอมชนิดใด?','The SI second is defined using a transition in which atom?',['ซีเซียม-133','caesium-133'],[['คาร์บอน-12','carbon-12'],['ไฮโดรเจน-1','hydrogen-1'],['ออกซิเจน-16','oxygen-16']],'วินาทีอิงความถี่การเปลี่ยนผ่านไฮเปอร์ไฟน์ของซีเซียม-133.','The second uses the caesium-133 hyperfine transition frequency.','si'],
  ['ชื่อ candela มาจากคำภาษาละตินที่หมายถึงอะไร?','The name candela comes from a Latin word meaning what?',['เทียน','candle'],[['แสงจันทร์','moonlight'],['ดวงดาว','star'],['เปลวไฟ','flame']],'candela เป็นคำภาษาละตินหมายถึงเทียน.','Candela is Latin for candle.','candela'],
  ['หน่วย candela ได้รับชื่อสากลนี้ในปีใด?','In what year was the unit given the international name candela?',['1948','1948'],[['1909','1909'],['1933','1933'],['1979','1979']],'CGPM รับรองชื่อ candela ในปี 1948.','The CGPM adopted the name candela in 1948.','candela']
];
for (const [th,en,answer,wrong,expTh,expEn,source] of history) {
  add('general',th,en,answer,wrong,expTh,expEn,source);
  add('general',`${expTh} คำตอบข้อใดสอดคล้องกับข้อเท็จจริงนี้?`,`${expEn} Which statement matches this fact?`,answer,wrong,expTh,expEn,source);
}

const rules = [
  ['หน่วย SI มีกี่หน่วยฐาน?','How many SI base units are there?',['7','7'],[['6','6'],['8','8'],['10','10']],'มีหน่วยฐานเจ็ดหน่วย.','There are seven base units.','base'],
  ['ควรเขียนค่า 12 เมตรในรูปแบบใด?','Which is the correctly written value for twelve metres?',['12 m','12 m'],[['12m','12m'],['12 ms','12 ms'],['12 mts','12 mts']],'เว้นวรรคระหว่างตัวเลขกับสัญลักษณ์หน่วย.','Leave a space between the number and unit symbol.','writing'],
  ['รูปพหูพจน์ของสัญลักษณ์ kg เขียนอย่างไร?','How is the plural of the symbol kg written?',['kg','kg'],[['kgs','kgs'],['kg.','kg.'],['k-g','k-g']],'สัญลักษณ์หน่วยไม่เติม s เมื่อเป็นพหูพจน์.','Unit symbols do not take a plural s.','writing'],
  ['สัญลักษณ์ของหน่วยที่ตั้งตามชื่อนักวิทยาศาสตร์มักเขียนอย่างไร?','How are symbols for units named after scientists usually written?',['ขึ้นต้นด้วยตัวพิมพ์ใหญ่','with an initial capital letter'],[['ตัวพิมพ์เล็กทั้งหมด','all lowercase'],['เติมจุดท้ายเสมอ','always with a final period'],['เขียนตัวเอียง','in italics']],'เช่น N สำหรับ newton และ Pa สำหรับ pascal.','For example, N for newton and Pa for pascal.','writing'],
  ['ชื่อหน่วย SI ที่สะกดเต็มโดยทั่วไปขึ้นต้นด้วยตัวพิมพ์แบบใด?','How are spelled-out SI unit names generally capitalized?',['ตัวพิมพ์เล็ก','lowercase'],[['ตัวพิมพ์ใหญ่ทั้งหมด','all uppercase'],['ตัวพิมพ์ใหญ่ทุกคำ','title case'],['ตัวเอียง','italic']],'ชื่อหน่วยเป็นคำนามทั่วไป เช่น newton; สัญลักษณ์จึงค่อยใช้ N.','Unit names are common nouns, such as newton; the symbol is N.','writing'],
  ['เมื่อเขียน prefix กับสัญลักษณ์หน่วย ต้องเว้นวรรคระหว่างกันหรือไม่?','Is a space placed between a prefix symbol and a unit symbol?',['ไม่เว้นวรรค','No space'],[['เว้นหนึ่งช่อง','One space'],['ใช้ขีดกลาง','Use a hyphen'],['ใส่จุด','Insert a dot']],'เขียน millimetre เป็น mm โดยไม่เว้นวรรค.','Write millimetre as mm, with no space.','writing'],
  ['สัญลักษณ์ SI เหมือนกันในภาษาต่าง ๆ หรือไม่?','Are SI unit symbols the same across languages?',['ใช่','Yes'],[['ไม่ใช่ ต้องแปลชื่อย่อ','No, abbreviations must be translated'],['เหมือนกันเฉพาะภาษาอังกฤษ','Only in English'],['ต่างกันตามประเทศ','They vary by country']],'สัญลักษณ์หน่วยเป็นมาตรฐานสากล ไม่ขึ้นกับภาษา.','Unit symbols are international and language-independent.','writing'],
  ['หน่วยใดเป็นข้อยกเว้นที่นิยมใช้สัญลักษณ์ L ตัวใหญ่เพื่อไม่ให้สับสนกับเลข 1?','Which unit commonly uses a capital L to avoid confusion with the number 1?',['ลิตร','litre'],[['ลูเมน','lumen'],['เคลวิน','kelvin'],['แอมแปร์','ampere']],'NIST ใช้ L สำหรับ litre เพื่อแยกจากเลข 1.','NIST uses L for litre to distinguish it from the numeral 1.','writing']
];
for (const [th,en,answer,wrong,expTh,expEn,source] of rules) {
  add('general',th,en,answer,wrong,expTh,expEn,source);
  add('general',`ข้อใดเป็นหลักการเขียน SI ที่ถูกต้อง: ${th}`,`Which statement follows the SI convention: ${en}`,answer,wrong,expTh,expEn,source);
}

if (bank.length !== 100) throw new Error(`Expected 100 unit knowledge questions, found ${bank.length}`);
export const UNIT_KNOWLEDGE_QUESTIONS = bank;
export const UNIT_KNOWLEDGE_SOURCES = sources;
