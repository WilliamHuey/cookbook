
/**
 * Module dependencies.
 */

var Recipe = require('tower-recipe')
  , fs = require('tower-fs');

/**
 * Cookbook lookup paths.
 */

exports.lookupDirectories = [
    fs.join(process.cwd(), 'cookbooks')
  , fs.join(process.cwd(), 'lib/cookbooks')
  , fs.join(process.env.HOME, '.tower/node_modules')
  , fs.join(__dirname, 'examples')
];

/**
 * Lookup a single cookbook.
 *
 * This is resolved from the command line.
 */

exports.find = function(name, directories){
  var parts = name.split(':')
    , key = parts.shift()
    , paths
    , cookbook;

  directories || (directories = exports.lookupDirectories);

  // XXX: should cache this in ~/.tower/config/packages.json or something.
  directories.forEach(function(directory){
    fs.directoryPathsSync(directory).forEach(function(path){
      var pkg = fs.join(path, 'package.json');
      pkg = fs.existsSync(pkg) && require(pkg);

      if (pkg && key === pkg.cookbook) {
        cookbook = require(path);
        // namespace
        cookbook.ns = pkg.cookbook;
        // XXX: where templates are.
        cookbook.sourcePath = fs.join(path, 'templates');
      }

      return !cookbook;
    });

    return !cookbook; // exit if one was found.
  });

  if (!cookbook) {
    console.log('Cookbook [' + name + '] not found.')
    process.exit();
  }

  // nested cookbook.
  if (parts.length) {
    name = parts.join(':');
    if (cookbook.aliases) {
      while (cookbook.aliases[name])
        name = cookbook.aliases[name];
    }
    // XXX: cache these paths, for faster lookup later.
    cookbook = require(cookbook(name));
  }

  return cookbook;
}

/**
 * Execute `action` on recipe `name`.
 *
 * @param {String} name Name of the recipe.
 * @param {String} action Action (verb) the recipe implements.
 * @param {Array} args Arguments passed in from the command line (process.argv).
 * @param {Function} [fn] callback.
 * @api public
 */

exports.exec = function(name, action, args, fn){
  var cookbook = exports.find(name)
    , method = cookbook[action];

  if (!method) {
    console.log('Cookbook [' + name + '] action [' + action + '] is not defined.');
    process.exit();
  }
  
  // XXX: handle source path again.
  var recipe = new Recipe(cookbook.sourcePath);

  // XXX: for nested methods, handle callback.
  if (3 === method.length)
    method.call(recipe, recipe, args, fn || noop);
  else
    method.call(recipe, recipe, args);
}