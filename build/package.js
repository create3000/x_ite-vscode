#!/usr/bin/env node
"use strict";

const { systemSync } = require ("shell-tools");


function main ()
{
   systemSync ("rm *.vsix");
   systemSync ("vsce package");
}

main ();
