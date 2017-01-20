#! /usr/bin/env node
'use strict';
const _ = require('lodash');
const docopt = require('docopt');
const modules = require('require-all')({
  dirname: __dirname + '/modules'
});

const doc = `Balances.

Usage:
  balances ${_.keys(modules).join('|')} [auth]
  balances all
`
const opts = docopt.docopt(doc);

const selected = _.keys(modules).filter(m => opts[m])[0];
if (selected) {
  opts.auth ?
    modules[selected].authorize() : modules[selected].balances();
} else if (opts.all) {
  Promise.all(_.keys(modules).map(m => modules[m].balances()));
}
