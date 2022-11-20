const path = require("path");
const exec = require("child_process").exec

function create_stats(input) {
	const lines = input.split('\n');
	let state = 0;
	let author = null;
	const files = new Set();
	const aliases = {};
	const authors = new Set();

	const by_author_and_file = {};
	const by_file_and_author = {};

	for (const line of lines) {
		if (line.startsWith("commit")) {
			state = 0;
			const parts = line.split(' ');
			author = parts[2];
			authors.add(author);
		}
		if (line.length == 0) {
			state = 1;
		}
		if (state == 1 && line.length > 0) {
			state = 2;
		}
		if (state == 2) {
			by_author_and_file[author] = by_author_and_file[author] || {};

			const parts = line.split('\t');
			const insertions = +parts[0];
			const deletions = +parts[1];

			const file = (() => {
				const oldName = parts[2].replace(/{([^}]+)}/g, (_, inner) => {
					return inner.split(" => ")[0];
				});

				const newName = parts[2].replace(/{([^}]+)}/g, (_, inner) => {
					return inner.split(" => ")[1];
				});

				if (newName !== oldName) {
					aliases[oldName] = newName;
				}

				return aliases[newName] || newName;
			})();

			files.add(file);

			if (Number.isNaN(insertions) || Number.isNaN(insertions) || !file) {
				console.error(`Could not read stat: ${line}`);
				continue;
			}

			by_file_and_author[file] = by_file_and_author[file] || {};

			by_author_and_file[author][file] = by_author_and_file[author][file] || [0,0];
			by_author_and_file[author][file][0] += insertions;
			by_author_and_file[author][file][1] += deletions;

			by_file_and_author[file][author] = by_file_and_author[file][author] || [0,0];
			by_file_and_author[file][author][0] += insertions;
			by_file_and_author[file][author][1] += deletions;
		}
	}
	
	return { files, authors, by_author_and_file, by_file_and_author };
}

function print_stats_by_author({ files, authors, by_author_and_file, by_file_and_author }) {
	const authorNames = (() => {
		const authorNames = [...authors];
		authorNames.sort();
		return authorNames;
	})();
	const fileNames = (() => {
		const fileNames = [...files];
		fileNames.sort();
		return fileNames.map(name => {
			const shortName = name.split('/').map((part, index, arr) => {
				if (index < arr.length - 1) {
					return part[0];
				} else {
					return part;
				}
			}).join('/')
			return [shortName, name];
		});
	})();

	console.log(`author,${fileNames.map(names => names[0]).join(',')}`);
	for (const author of authorNames) {
		let line = `${author}`;
		for ([_, fileName] of fileNames) {
			const [insertions, deletions] = (by_author_and_file[author] || {})[fileName]  || [0,0];
			line += `,${insertions + deletions}`;
		}
		console.log(line);
	}
}

function print_stats_by_file({ files, authors, by_author_and_file, by_file_and_author }) {
	const authorNames = (() => {
		const authorNames = [...authors];
		authorNames.sort();
		return authorNames;
	})();
	const fileNames = (() => {
		const fileNames = [...files];
		fileNames.sort();
		return fileNames.map(name => {
			const shortName = name.split('/').map((part, index, arr) => {
				if (index < arr.length - 1) {
					return part[0];
				} else {
					return part;
				}
			}).join('/')
			return [shortName, name];
		});
	})();

	console.log(`filename,${authorNames.join(',')}`);
	for (const [shortFileName, fileName] of fileNames) {
		let line = `${shortFileName}`;
		for (const authorName of authorNames) {
			const [insertions, deletions] = (by_file_and_author[fileName] || {})[authorName]  || [0,0];
			line += `,${insertions + deletions}`;
		}
		console.log(line);
	}
}

function printUsage() {
	const scriptName = path.basename(process.argv[1]);
	console.log("####################");
	console.log("# Git change stats #");
	console.log("####################");
	console.log();
	console.log("Show accumulated changes for all files and authors.");
	console.log("Print stats in CSV format to stdout.");
	console.log();
	console.log("USAGE");
	console.log(`\tnode ${scriptName} --by-author|--by-file [-- additional git args]`);
	console.log();
	console.log("Example");
	console.log(`\tnode ${scriptName} --by-file -- --since=01.01.2022 > by_file.csv`);
}

const extraGitArgs = (() => {
	const index = process.argv.indexOf("--");
	if (index !== -1) {
		return process.argv.slice(index + 1).join(' ');
	} else {
		return "";
	}
})();

exec(`git log --numstat --format="commit %H %an" ${extraGitArgs}`, (err, stdout, stderr) => {
	if (!err) {
		let mode = null;

		if (new Set(process.argv).has("--by-author")) {
			mode = "by-author";
		} else if (new Set(process.argv).has("--by-file")) {
			mode = "by-file";
		} else {
			printUsage();
			process.exit(0);
		}

		const output = stdout.toString();
		const stats = create_stats(output);

		if (mode == "by-author") {
			print_stats_by_author(stats);
		} else if (mode == "by-file") {
			print_stats_by_file(stats);
		}
	} else {
		console.log(`ERR: ${err}`);
		console.log(stderr.toString());
	}
})
