#! /usr/bin/env node
/*
Copyright (C) 2017 Igor Borges

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

'use strict';
const _ = require('lodash');
const docopt = require('docopt');
const modules = require('require-all')({
  dirname: __dirname + '/modules'
});

const doc = `Balances.

Usage:
  balances (${_.keys(modules).join('|')}) [auth]
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
