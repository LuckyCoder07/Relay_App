const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'relay-frontend/src/App.jsx');
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/o\.offer/g, "o.paymentOffer");
c = c.replace(/o\.delivery/g, "o.deliveryDays");
c = c.replace(/best\.offer/g, "best.paymentOffer");
c = c.replace(/offer\.offer/g, "offer.paymentOffer");
c = c.replace(/offer\.delivery/g, "offer.deliveryDays");
c = c.replace(/setOffer\\(i, "offer"/g, 'setOffer(i, "paymentOffer"');
c = c.replace(/setOffer\\(i, "delivery"/g, 'setOffer(i, "deliveryDays"');

c = c.replace(
  /<input placeholder="Offer text" value=\{o\.paymentOffer\} onChange=\{\(e\) => setOffer\(i, "paymentOffer", e\.target\.value\)\} \/>/,
  '<input placeholder="Offer text" value={o.paymentOffer} onChange={(e) => setOffer(i, "paymentOffer", e.target.value)} />' +
  '\\n            <input placeholder="URL" value={o.url || ""} onChange={(e) => setOffer(i, "url", e.target.value)} />'
);

fs.writeFileSync(file, c);
console.log('App.jsx fields patched');
