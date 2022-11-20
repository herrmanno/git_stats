# Git change stats by file and author

Extract change (insertion + deletion) stats per file and author from git.

## Usage
Requirement: `cwd` is a valid git repository.

### Arrange by author
```sh
node git_stats.js --by-author > stats.csv
```

### Arrange by file
```sh
node git_stats.js --by-file > stats.csv
```

### Customize git log used to extract stats

```sh
node git_stats.js --by-file|--by-author -- [extra-git-args]> stats.csv
```

Where `extra-git-args` gets concatenated to the underlying `git log` command verbatimly.
