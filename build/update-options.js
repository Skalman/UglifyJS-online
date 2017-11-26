#!/usr/bin/env node

var fs = require('fs');

var root = __dirname + '/../';

var opts = get_all_opts();

var html = fs.readFileSync(root + 'index.html', 'utf-8');

html = html.replace(
	/(<textarea id="options"[^>]*>)([^<\{]*)[^<]+/,
	(_, textarea, preamble) => textarea + preamble + opts + '\n'
);

fs.writeFileSync(root + 'index.html', html, 'utf-8');


function get_all_opts() {
	// Need the utils for the defaults() function
	var utils_script = fs.readFileSync(root + 'uglify/lib/utils.js', 'utf-8');


	var parse = get_opts(
		'parse',
		root + 'uglify/lib/parse.js',
		utils_script + 'var options = undefined;',
		/function parse\([^)]+\) \{\s+options = (defaults\(options, \{[^}]+\}, true\));/
	);

	var compress = get_opts(
		'compress',
		root + 'uglify/lib/compress.js',
		utils_script + 'var options = undefined, false_by_default = false;',
		/function Compressor\([^)]+\) \{[\s\S]{0,500}?this\.options = (defaults\(options, \{([^{}]|\{\})+\}, true\));/
	);

	var mangle = get_opts(
		'mangle',
		root + 'uglify/lib/minify.js',
		utils_script + 'var options = {};',
		/function minify\([^)]+\) \{[\s\S]{0,5000}?options\.mangle = (defaults\(options\.mangle, \{([^{}]|\{\})+\}, true\));/
	);

	var output = get_opts(
		'output',
		root + 'uglify/lib/output.js',
		utils_script + 'var options = undefined;',
		/function OutputStream\([^)]+\) \{\s+options = (defaults\(options, \{[^}]+\}, true\));/
	);

	output.comments = '$COMMENTS$';

	var opts = {
		parse: parse,
		compress: compress,
		mangle: mangle,
		output: output,
		wrap: false,
	};

	opts = JSON.stringify(opts, null, '  ');

	opts = opts.replace('"$COMMENTS$"', '/@license|@preserve|^!/');

	opts = opts.replace(/(\n {2})"([a-zA-Z_][0-9a-zA-Z_]*)":/g, '$1$2:');

	opts = opts.replace(/(\n {4})"([a-zA-Z_][0-9a-zA-Z_]*)":/g, (_, indent, key) => {
		var alignment_spaces = new Array(Math.max(18 - key.length, 0)).join(' ');

		return indent + key + alignment_spaces + ':';
	});

	return opts;
}

function get_opts(opt_group, filename, preparation, regexp) {
	var script = fs.readFileSync(filename, 'utf-8');
	var match = regexp.exec(script);
	var opts;

	if (match) {
		opts = Function('', preparation + 'return (' + match[1] + ');')();
	}

	if (!opts) {
		throw new Error('Cannot find ' + opt_group + ' options');
	}

	return opts;
}
