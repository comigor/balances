const docopt = require('docopt');
const intermedium = require('./intermedium');

const doc = `Balances.

Usage:
  balances (easynvest|intermedium|oiwarren) [auth]
`
const opts = docopt.docopt(doc);

if (opts.intermedium) {
  intermedium.balances();
}
