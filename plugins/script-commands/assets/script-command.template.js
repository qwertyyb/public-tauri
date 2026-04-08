#!/usr/bin/env node

// Public Script Command Template
//
// Dependency: This script requires Nodejs.
// Install Node: https://nodejs.org/en/download/
//
// Duplicate this file and remove ".template" from the filename to get started.
//
// @public
// Required parameters:
// @public.schemaVersion 1
// @public.name My First Script
// @public.mode fullOutput
//
// Optional parameters:
// @public.icon 🤖
// @public.argument1 { "type": "text", "placeholder": "js, css, html", "optional": true}
// @public.argument2 { "type": "text", "placeholder": "query" }
//
// Documentation:
// @public.description Write a nice and descriptive summary about your script command here
// @public.author Your name
// @public.authorURL An URL for one of your social medias

/*

	ABOUT THIS TEMPLATE:

	This template is meant to be a quick starting point for creating a script command using Nodejs.

	This template demonstrates the following ideas:

	* Extracting passed arguments.
	* Using both required and optional arguments
	* URI Encoding
	* Outputting result to Raycast
	* Opening a url using exec and the unix open command
	* Use of destructuring
	* Use of template literals

*/

const { exec } = require('child_process')

// Use destructuring to grab arguments.
// Use slice to start from position 3.
let [topic, query] = process.argv.slice(2)
let uri = `https://developer.mozilla.org/search?topic=${topic}&q=${encodeURIComponent(query)}`

// console.log() displays output in fullOutput mode.
console.log(`The arguments are: \n   ${process.argv.join('\n   ')}\n`)
console.log(`Your topic is "${topic}"`)
console.log(`Your query is "${query}"`)
console.log(`Your query uri encoded is "${encodeURIComponent(query)}"`)
console.log(`The uri is "${uri}"`)

// Uncomment the exec line below to open this query in your web browser.
// Use double quotes around the uri to avoid processing issues.
//exec(`open "${uri}"`)
