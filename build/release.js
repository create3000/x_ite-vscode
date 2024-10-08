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

	console .log ("Waiting for confirmation ...");

	const
		version = sh (`npm pkg get version | sed 's/"//g'`) .trim (),
		result  = systemSync (`zenity --question '--text=Do you really want to publish X_ITE VS Code Extension v${version} now?' --ok-label=Yes --cancel-label=No`);

	if (result !== 0)
   {
      systemSync ("git checkout -- package.json");
		process .exit (1);
   }

	console .log (`Publishing X_ITE VS Code Extension v${version} now.`);

   commit (version);
   tags (version);

   systemSync ("rm *.vsix");
   systemSync ("vsce package");
}

main ();
