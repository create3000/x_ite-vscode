#!/usr/bin/env node
"use strict";

const { systemSync, sh } = require ("shell-tools");

function bump ()
{
	const current = sh (`npm pkg get version | sed 's/"//g'`) .trim ();

	console .log (`Current version ${current}`);

   const last = sh (`ls *.vsix`) .trim () .match (/(\d+\.\d+\.\d+)/) ?.[1];

   if (current !== last)
      return;

	systemSync (`npm version patch --no-git-tag-version --force`);

   const version = sh (`npm pkg get version | sed 's/"//g'`) .trim ();

	console .log (`New version ${version}`);
}

function commit (version)
{
	systemSync (`git commit -am 'Published version ${version}'`);
	systemSync (`git push origin`);
}

function tags (version)
{
	systemSync (`git tag ${version}`);
	systemSync (`git push origin --tags`);
}

function main ()
{
   bump ();

   const version = sh (`npm pkg get version | sed 's/"//g'`) .trim ();

   commit (version);
   tags (version);

   systemSync ("rm *.vsix");
   systemSync ("vsce package");
}

main ();
