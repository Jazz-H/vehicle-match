global.window = {};
require('./data.js');
const V = global.window.VM.VEHICLES;
const S = require('./scoring.js');
function names(r){return r.results.map(x=>x.vehicle.name+' ('+x.score+')');}

console.log('1) towing + space, any type:');
console.log('   ', names(S.match(V,{type:'any',priorities:['towing','space'],priceMax:100000,seats:2,drivetrain:'any'})));

console.log('2) budget + efficiency, any type:');
console.log('   ', names(S.match(V,{type:'any',priorities:['budget','efficiency'],priceMax:100000,seats:2,drivetrain:'any'})));

console.log('3) electric type, technology + performance:');
console.log('   ', names(S.match(V,{type:'electric',priorities:['technology','performance'],priceMax:100000,seats:2,drivetrain:'any'})));

console.log('4) performance, coupe, budget<=35k:');
const r4=S.match(V,{type:'coupe',priorities:['performance'],priceMax:35000,seats:2,drivetrain:'any'});
console.log('   ', names(r4));

console.log('5) fallback — coupe under $25k (none exist):');
const r5=S.match(V,{type:'coupe',priorities:['performance'],priceMax:25000,seats:2,drivetrain:'any'});
console.log('   relaxed:',r5.relaxed,'| note:',r5.note);
console.log('   ', names(r5));

console.log('6) filter — priceMax 30k returns only <=30k, seats>=7 (3-row):');
const r6=S.match(V,{type:'any',priorities:['space'],priceMax:45000,seats:7,drivetrain:'any'});
console.log('   ', names(r6), '(should be Telluride only-ish)');

console.log('7) why/reasons — F150 with towing priority:');
const r7=S.match(V,{type:'truck',priorities:['towing','space'],priceMax:100000,seats:2,drivetrain:'any'});
console.log('   top:',r7.results[0].vehicle.name,'why:',r7.results[0].why);
