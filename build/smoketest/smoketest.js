var fs = require('fs')

var root = __dirname + '/../../';

var html = fs.readFileSync(root + 'index.html', 'utf-8');

var files = [];
html.replace(
	/<script src="([^"]+)"/g,
	(_, file) => files.push(file)
);

var optionsText = /<textarea id="options"[^>]*>([^<]+)/.exec(html)[1];

var combinedScripts = files
	.map(file => fs.readFileSync(root + file))
	.join('\n\n');


var script = `
	var document = {
		body: {},
		getElementById: () => ({}),
	};

	${combinedScripts}

	default_options = ${optionsText};

	var result = uglify('alert(1+2+3);', default_options);

	if (result !== 'alert(6);') {
		throw new Error('Expected "alert(6);", but got "' + result + '"');
	}

	console.log('Smoketest OK');
`;

eval(script);
