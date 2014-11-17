/*
 * grunt-bagel-pattern-lib
 * https://github.com/goodtwin/grunt-bagel-pattern-lib
 *
 * Copyright (c) 2014 GoodTwin Design Inc.
 * Licensed under the MIT license.
 */


/*
 * Some source taken from
 * DSS
 * https://github.com/darcyclarke/DSS
 *
 * Copyright (c) 2013 darcyclarke
 * Licensed under the MIT license.
 */

// Include dependancies
var util = require('util');
var handlebars = require('handlebars');
var dss = require('dss');
var _ = require('underscore');

// Expose
module.exports = function(grunt){

  // Register DSS
  grunt.registerMultiTask('bagel_pattern_lib', 'Parse DSS comment blocks', function(){

    // Setup async promise
    var promise = this.async();

    // Merge task-specific and/or target-specific options with defaults
    var options = this.options({
      template: __dirname + '/../template/',
      template_index: 'index.handlebars',
      output_index: 'index.html',
      include_empty_files: true,
      css_include: 'dist/style/style.css',
      doc_root: 'dist/docs'
    });

    // Output options if --verbose cl option is passed
    grunt.verbose.writeflags(options, 'Options');

    // Describe custom parsers
    var gt_parsers = {
      // Finds @param in comment blocks
      param: function(i, line, block, file){
        var param = line.split(' - ');
        return {
          name: param[0],
          description: param[1],
          default: param[2]
        };
      },
      // Finds @type in comment blocks
      type: function(i, line, block, file){
        return line;
      },
      // Finds @example in comment blocks
      example: function(i, line, block, file){
        return {
          example: line
        };
      },
      // Finds @section in comment blocks
      section: function(i, line, block, file){
        var section = line.replace(/\./g,'/');

        return {
          path: section.substr(0, section.lastIndexOf('/')),
          id: section.substr(section.lastIndexOf('/') + 1, section.length)
        };
      }
    };
    for(key in gt_parsers){
      dss.parser(key, gt_parsers[key]);
    }
    // Custom parsers from Gruntfile
    for(key in options.parsers){
      dss.parser(key, options.parsers[key]);
    }

    // Build Documentation
    var styleguide = {'blocks':[]};

    this.files.forEach(function(f){

      // Filter files based on their existence
      var src = f.src.filter(function(filepath) {

        // Warn on and remove invalid source files (if nonull was set).
        if(!grunt.file.exists(filepath)){
          grunt.log.warn('Source file "' + filepath + '" not found.');
          return false;
        } else {
          return true;
        }
      });

      // Setup
      var files = src,
          template_dir = options.template,
          output_dir = f.dest,
          length = files.length;

      // Parse files
      files.map(function(filename){

        // Report file
        grunt.verbose.writeln('• ' + grunt.log.wordlist([filename], {color: 'cyan'}));

        // Parse
        dss.parse(grunt.file.read(filename), { file: filename }, function(parsed) {

          // Continue only if file contains DSS annotation
          if (options.include_empty_files || parsed.blocks.length) {

            // Add comment block to styleguide
            styleguide.blocks = _.union(styleguide.blocks, parsed.blocks);
          }

          // Dedupe
          styleguide.blocks = _.uniq(styleguide.blocks, function(item){
            grunt.log.writeln(JSON.stringify(item));
            return JSON.stringify(item);
          });
          // Sort Alphabetically
          var sorted = _.sortBy(styleguide.blocks, function(block){
           return block.section.id;
          });
          // Put index first
          sorted = _.sortBy(sorted, function(block){
           return block.section.id !== 'index';
          });
          // Group by @section hierarchy
          var grouped = _.groupBy(sorted, function(block){
            return block.section.path;
          });

          // Check if we're done
          if (length > 1) {
            length--;
          }
          else {
            // Set output template and file
            var template_filepath = template_dir + options.template_index;
                //output_filepath = output_dir + options.output_index;

            if (!grunt.file.exists(template_filepath)) {
              grunt.fail.fatal('Cannot read the template file');
            }

            // copy template assets (except index.handlebars)
            grunt.file.expandMapping([
              '**/*',
              '!' + options.template_index
            ], output_dir, { cwd: template_dir }).forEach(function(filePair) {
              filePair.src.forEach(function(src) {
                if (grunt.file.isDir(src)) {
                  grunt.verbose.writeln('Creating ' + filePair.dest.cyan);
                  grunt.file.mkdir(filePair.dest);
                } else {
                  grunt.verbose.writeln('Copying ' + src.cyan + ' -> ' + filePair.dest.cyan);
                  grunt.file.copy(src, filePair.dest);
                }
              });
            });

            // Register helper for compiling markup with modifier class
            handlebars.registerHelper('compilePartial', function (data, escaped) {
              data = data || {};
              data.modifier = escaped;
              var template;
              if(data.markup){
                template = handlebars.compile(data.markup.example);
              }

              return new handlebars.SafeString(template(data));
            });

            // Register TOC helper
            handlebars.registerHelper('tree', function (data) {
              data = data || {};
              function json_tree(data) {
                var json = '<ul>';

                _.each(data, function(value, key, list){
                  if(_.isObject(value) || key !== 'index') {
                    json = json + '<li>';
                    if(_.isObject(value)) {
                        json = json + key;
                        json = json + json_tree(value);
                    }
                    else{
                      json = json + '<a href="'+options.doc_root+'/'+value+'#'+key+'">' + key;
                      json = json + '</a>';
                    }
                    json = json + '</li>';
                  }
                });
                return json + '</ul>';
              }
              return json_tree(data);
            });

            var createNestedObject = function( base, names ) {
              for( var i = 0; i < names.length; i++ ) {
                base = base[ names[i] ] = base[ names[i] ] || {};
              }
            };

            var setNestedObject = function( obj, str, val ) {
              str = str.split(".");
              while (str.length > 1) {
                obj = obj[str.shift()];
              }
              return obj[str.shift()] = val;
            };
            // Create Table of Contents
            var toc = {};
            _.each(grouped, function(value, key, list){
              var array = key.split('/');
              createNestedObject( toc, array, value );
              _.each(value, function(value, key, list){
                var str = value.section.path.replace(/\//g,'.') + '.' + value.section.id,
                  id = value.section.path;
                setNestedObject(toc, str, id);
              });
            });

            _.each(grouped, function(value, key, list){
              styleguide.blocks = value;
              var html = handlebars.compile(grunt.file.read(template_filepath))({
                project: grunt.file.readJSON('package.json'),
                css_include: options.css_include,
                doc_root: options.doc_root,
                title: key,
                files: styleguide,
                toc: toc
              });

              var output_filepath = output_dir + key + '/index.html';
              var output_type = 'created', output = null;
              if (grunt.file.exists(output_filepath)) {
                output_type = 'overwritten';
                output = grunt.file.read(output_filepath);
              }
              // avoid write if there is no change
              if (output !== html) {
                // Render file
                grunt.file.write(output_filepath, html);

                // Report build
                grunt.log.writeln('✓ Styleguide ' + output_type + ' at: ' + grunt.log.wordlist([output_dir], {color: 'cyan'}));
              }
              else {
                // no change
                grunt.log.writeln('‣ Styleguide unchanged');
              }
            });

            // Return promise
            promise();

          }
        });

      });

    });

  });

};
