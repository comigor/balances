const docopt = require('docopt');
const intermedium = require('./intermedium');
const oiwarren = require('./oiwarren');
const easynvest = require('./easynvest');

const doc = `Balances.

Usage:
  balances (easynvest|intermedium|oiwarren) [auth]
`
const opts = docopt.docopt(doc);

if (opts.intermedium) {
  intermedium.balances();
} else if (opts.oiwarren) {
  opts.auth ? oiwarren.authorize() : oiwarren.balances();
} else if (opts.easynvest) {
  opts.auth ? easynvest.authorize() : easynvest.balances();
}
