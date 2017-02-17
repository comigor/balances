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
const __ = require('lodash');
const neodoc = require('neodoc');

const modules = require('./modules/index');
const config = require('./file-config');
const common = require('./index')(config);
const utils = require('./cli-utils');

const doc = `Usage:
  balances [options] (${__.keys(modules).join('|')})...
  balances [options] all

Options:
  -d, --details  Show details.
  -g <regex>     Regex to grep portfolio name. Only works with -d.
  -v, --version  Show the version.
  -h, --help     Show this help.
`
// -a, --auth     Just authenticate.
const opts = neodoc.run(doc, {
  laxPlacement: true,
  smartOptions: true,
  versionFlags: ['-v', '--version']
});

const selected = opts.all ?
  __.keys(modules) :
  __.keys(modules).filter(m => opts[m]);

if (selected) {
  // if (opts['--auth'])
  //   modules[selected].authorize();
  if (opts['--details'])
    utils.printDetails(selected, opts['-g']);
  else
    utils.printBalance(selected);
}
