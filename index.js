#! /usr/bin/env node
'use strict';
const docopt = require('docopt');
const intermedium = require('./intermedium');
const oiwarren = require('./oiwarren');
const easynvest = require('./easynvest');

const doc = `Balances.

Usage:
  balances easynvest [auth]
  balances oiwarren [auth]
  balances intermedium
  balances all
`
const opts = docopt.docopt(doc);

if (opts.intermedium) {
  intermedium.balances();
} else if (opts.oiwarren) {
  opts.auth ? oiwarren.authorize() : oiwarren.balances();
} else if (opts.easynvest) {
  opts.auth ? easynvest.authorize() : easynvest.balances();
} else if (opts.all) {
  Promise.resolve()
    .then(intermedium.balances)
    .then(oiwarren.balances)
    .then(easynvest.balances);
}
