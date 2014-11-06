/*
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
  grunt.registerMultiTask('dss', 'Parse DSS comment blocks', function(){

    // Setup async promise
    var promise = this.async();

    // Merge task-specific and/or target-specific options with defaults
    var options = this.options({
      template: __dirname + '/../template/',
      template_index: 'index.handlebars',
      output_index: 'index.html',
      include_empty_files: true,
      css_include: '../dist/style/style.css'
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
        var section = line.split('.');
        return {
          category: section[0],
          component: section[1],
          chrome: section[2]
        };
      }
    };
    for(key in gt_parsers){
      dss.parser(key, options.parsers[key]);
    }
    // Custom parsers from Gruntfile
    for(key in options.parsers){
      dss.parser(key, options.parsers[key]);
    }

    // Build Documentation
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
          length = files.length,
          styleguide = [];

      // Parse files
      files.map(function(filename){

        // Report file
        grunt.verbose.writeln('• ' + grunt.log.wordlist([filename], {color: 'cyan'}));

        // Parse
        dss.parse(grunt.file.read(filename), { file: filename }, function(parsed) {

          // Continue only if file contains DSS annotation
          if (options.include_empty_files || parsed.blocks.length) {
            // Add filename
            parsed['file'] = filename;

            // Add comment block to styleguide
            styleguide.push(parsed);
          }
          var grouped = _.groupBy(styleguide[0].blocks, function(block){
            return block.section.category;
          });
          // _.each(grouped, function(value, key, list){
          //   var component = _.groupBy(value, function(block){
          //     return block.section.component;
          //   });
          //   console.log(util.inspect(component, false, null));
          // });
          //console.log(util.inspect(styleguide, false, null));

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
              //console.log(util.inspect(data, false, null));
              var template;
              if(data.markup){
                template = handlebars.compile(data.markup.example);
              }

              return new handlebars.SafeString(template(data));
            });

            // Create HTML ouput
            _.each(grouped, function(value, key, list){
              styleguide[0].blocks = value;
              var html = handlebars.compile(grunt.file.read(template_filepath))({
                project: grunt.file.readJSON('package.json'),
                css_include: options.css_include,
                files: styleguide
              });

              var output_filepath = output_dir + key + '.html';
              var output_type = 'created', output = null;
              if (grunt.file.exists(output_filepath)) {
                output_type = 'overwrited';
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
