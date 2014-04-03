// Create a simple wrapper around UglifyJS

var default_options = {};
function uglify(code, options) {
	if (!options) {
		options = {};
	}
	var parse_options = defaults(options.parse, default_options.parse, true);
	var compress_options = defaults(options.compress, default_options.compress, true);
	var output_options = defaults(options.output, default_options.output, true);

	// 1. Parse
	var toplevel_ast = parse(code);
	toplevel_ast.figure_out_scope();

	// 2. Compress
	var compressor = Compressor(compress_options);
	var compressed_ast = toplevel_ast.transform(compressor);

	// 3. Mangle
	compressed_ast.figure_out_scope();
	compressed_ast.compute_char_frequency();
	compressed_ast.mangle_names();

	// 4. Generate output
	code = compressed_ast.print_to_string(output_options);

	return code;
}


// Handle the UI

var uglify_options;
var $options_btn = $('options-btn');
var $go = $('go');
var $options = $('options');
var $out = $('out');
var $in = $('in');
var $info = $('info');
var $out_container = $('out-container');
var $saved = $('saved');

function $(id) {
	return document.getElementById(id);
}

var console = window.console || { log: function () {}, error: function () {} };

set_options_initial();

$options_btn.onclick = toggle_options;
$go.onclick = go;

function toggle_options() {
	if ($options.className === 'hidden') {
		$options.className = '';
		$options_btn.className = 'active';
		$in.className = 'hidden';
		$go.className = 'hidden';
		$options.focus();
	} else {
		if (set_options()) {
			$options.className = 'hidden';
			$options_btn.className = '';
			$in.className = '';
			$go.className = '';
			$in.focus();
		}
	}
}

function get_options(value) {
	return Function('return (' + (value || $options.value) + ');')();
}

function set_options() {
	var old_options = uglify_options;
	try {
		uglify_options = get_options();
		go();
		return true;
	} catch (e) {
		uglify_options = old_options;

		var message;
		if (e instanceof SyntaxError) {
			message = 'Syntax error: ' + e.message;
		} else if (e instanceof DefaultsError) {
			message = e.msg;
		} else {
			message = 'Unknown error: ' + e;
		}

		console.log(e);
		alert(message);
		return false;
	}
}

function set_options_initial() {
	var default_options_text = $options.textContent || $options.innerText;
	default_options = get_options(default_options_text);
	try {
		uglify_options = get_options();
	} catch (e) {
		// if it didn't work, reset the textarea
		$options.value = default_options_text;
		uglify_options = default_options;
	}
}

function go() {
	var input = $in.value;
	var res = uglify(input, uglify_options) || '/* no output! */';

	$info.className = 'hidden';
	$out_container.className = '';

	if ($out.textContent !== undefined) {
		$out.textContent = res;
	} else {
		$out.innerText = res;
	}
	$saved.innerHTML = (input.length - res.length) + ' bytes, ' + ((1 - res.length / input.length) * 100).toFixed(2);

	return false;
}
