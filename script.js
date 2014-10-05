/*global defaults:false, parse:false, Compressor:false, JS_Parse_Error:false, DefaultsError:false */
/*jshint globalstrict:true */

'use strict';

// Create a simple wrapper around UglifyJS

var default_options = {};
function uglify(code, options) {
	// Create copies of the options
	var parse_options = defaults({}, options.parse);
	var compress_options = defaults({}, options.compress);
	var output_options = defaults({}, options.output);

	parse_options = defaults(parse_options, default_options.parse, true);
	compress_options = defaults(compress_options, default_options.compress, true);
	output_options = defaults(output_options, default_options.output, true);

	// 1. Parse
	var toplevel_ast = parse(code, parse_options);
	toplevel_ast.figure_out_scope();

	// 2. Compress
	var compressor = new Compressor(compress_options);
	var compressed_ast = toplevel_ast.transform(compressor);

	// 3. Mangle
	compressed_ast.figure_out_scope();
	compressed_ast.compute_char_frequency();
	compressed_ast.mangle_names();

	// 4. Generate output
	code = compressed_ast.print_to_string(output_options);

	return code;
}

function $(id) {
	return document.getElementById(id);
}

window.console = window.console || { log: function () {}, error: function () {} };


// Handle the UI

var uglify_options;
var $options = $('options');
var $out = $('out');
var $in = $('in');
var $error = $('error');
var $stats = $('stats');
var $body = document.body;
var $btn_options = $('btn-options');
var $cb_as_i_type = $('cb-as-i-type');


$('header-link').onclick = go_to_start;
$('btn-go').onclick = go;
$btn_options.onclick = toggle_options;
$('btn-options-save').onclick = toggle_options;
$('btn-options-reset').onclick = reset_options;
$in.oninput = $in.onkeyup = $in.onblur = $in.onfocus = go_ait;
$cb_as_i_type.onclick = set_options_ait;
$out.onfocus = select_text;

var default_options_text;
set_options_initial();


function is_visible(class_name) {
	return (' ' + $body.className + ' ').indexOf(' ' + class_name + ' ') >= 0;
}

function hide(class_name) {
	var names = class_name.split(' ');
	var cur = ' ' + $body.className + ' ';
	for (var i = 0; i < names.length; i++) {
		while (cur.indexOf(' ' + names[i] + ' ') >= 0) {
			cur = cur.replace(' ' + names[i] + ' ', ' ');
		}
	}

	$body.className = cur.replace(/^\s+|\s+$/g, '');
}

function show(class_name) {
	$body.className += ' ' + class_name;
}

function toggle(class_name) {
	var names = class_name.split(' ');
	for (var i = 0; i < names.length; i++) {
		if (is_visible(names[i])) {
			hide(names[i]);
		} else {
			show(names[i]);
		}
	}
}

function toggle_options() {
	var shouldToggle = true;
	if (is_visible('s-options')) {
		// Only toggle if we succeed in setting the options.
		shouldToggle = set_options();
	}

	if (shouldToggle) {
		toggle('s-input s-options');
	}
}

function get_options(value) {
	/*jshint evil:true */
	return new Function('return (' + (value || $options.value) + ');')();
}

function set_options() {
	var old_options = uglify_options;
	try {
		uglify_options = get_options();

		// The options could be parsed. Try to update localStorage.
		try {
			if (default_options_text === $options.value)
				localStorage.removeItem('uglify-options');
			else
				localStorage.setItem('uglify-options', $options.value);
		} catch (e) {}

		// Run Uglify with the new options.
		go(true);
		return true;
	} catch (e) {
		if (e instanceof JS_Parse_Error) {
			// the options are actually okay, just the code that's bad
			show_error(e, $in.value);
			return true;
		} else {
			uglify_options = old_options;
			show_error(e);
			return false;
		}
	}
}

function reset_options() {
	$options.value = default_options_text;
	$btn_options.focus();
}

function set_options_ait() {
	try {
		if ($cb_as_i_type.checked)
			localStorage.removeItem('uglify-options-disable-ait');
		else
			localStorage.setItem('uglify-options-disable-ait', 1);
	} catch (e) {}
}

function set_options_initial() {
	default_options_text = $options.textContent || $options.innerText;
	default_options = get_options(default_options_text);

	// If there are options saved with localStorage, load them now.
	try {
		var options_text = localStorage.getItem('uglify-options');
		if (options_text) {
			$options.value = options_text;
		}
		$cb_as_i_type.checked = !localStorage.getItem('uglify-options-disable-ait');
	} catch (e) {}

	try {
		uglify_options = get_options();
	} catch (e) {
		// if it didn't work, reset the textarea
		$options.value = default_options_text;
		uglify_options = default_options;
	}
}

function encodeHTML(str) {
	return (str + '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/"/g, '&quot;');
}

var last_input;
function go(throw_on_error) {
	var input = $in.value;
	last_input = input;

	if (throw_on_error === true) {
		main();
	} else {
		try {
			main();
		} catch (e) {
			show_error(e, input);
		}
	}

	function main() {
		var res = uglify(input, uglify_options);
		hide('s-info s-error');
		show('s-output');

		$out.value = res || '/* no output! */';
		$stats.innerHTML = res.length + ' bytes, saved ' + ((1 - res.length / input.length) * 100 || 0).toFixed(2) + '%';
	}
}

// As I type (AIT) functionality. Spend at least half of the time idle.
var ait_timeout;
var ait_last_duration = 50;
function go_ait() {
	if (!$cb_as_i_type.checked)
		return;

	var input = $in.value;
	if (input === last_input)
		return;

	last_input = input;
	clearTimeout(ait_timeout);
	ait_timeout = setTimeout(function () {
		var start = new Date();
		go();
		ait_last_duration = new Date() - start;
	}, ait_last_duration);
}

function show_error(e, param) {
	console.error('Error', e);
	hide('s-info s-output');
	show('s-error');

	if (e instanceof JS_Parse_Error) {
		var input = param;
		var lines = input.split('\n');
		var line = lines[e.line - 1];
		e = 'Parse error: <strong>' + encodeHTML(e.message) + '</strong>\n' +
			'<small>Line ' + e.line + ', column ' + (e.col + 1) + '</small>\n\n' +
			(lines[e.line-2] ? (e.line - 1) + ': ' + encodeHTML(lines[e.line-2]) + '\n' : '') +
			e.line + ': ' +
				encodeHTML(line.substr(0, e.col)) +
				'<mark>' + encodeHTML(line.substr(e.col, 1) || ' ') + '</mark>' +
				encodeHTML(line.substr(e.col + 1)) + '\n' +
			(lines[e.line] ? (e.line + 1) + ': ' + encodeHTML(lines[e.line]) : '');
	} else if (e instanceof DefaultsError) {
		e = '<strong>' + encodeHTML(e.msg) + '</strong>';
	} else if (e instanceof Error) {
		e = e.name + ': <strong>' + encodeHTML(e.message) + '</strong>';
	} else {
		e = '<strong>' + encodeHTML(e) + '</strong>';
	}

	$error.innerHTML = e;
}

function go_to_start() {
	clearTimeout(ait_timeout);
	hide('s-options s-error s-output');
	show('s-input s-info');
	return false;
}

function select_text() {
	/*jshint validthis:true */
	var self = this;
	self.select();

	self.onmouseup = self.onkeyup = function() {
		// Prevent further mouseup intervention
		self.onmouseup = self.onkeyup = null;
		self.scrollTop = 0;
		return false;
	};
	return false;
}
