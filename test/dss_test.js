'use strict';

var grunt = require('grunt');
var fs = require('fs');

exports.DSS = {
  docs: function(test) {
    test.expect(11);

    var expects = {
        docs: grunt.file.isDir('docs'),
        css: grunt.file.isDir('docs/assets/css'),
        styles: grunt.file.exists('docs/assets/css/styles.css'),
        js: grunt.file.isDir('docs/assets/js'),
        // we assume that if the styles.css have been correctly copied, prettify files will be also here
        // we don't want to check all files because it's useless ?
        js_prettify: grunt.file.isDir('docs/assets/js/prettify'),
        styleguide_index: grunt.file.exists('docs/foo/index.html'),
        styleguide_less: grunt.file.exists('docs/foo/less/index.html'),
        styleguide_sass: grunt.file.exists('docs/foo/sass/index.html'),
        styleguide_scss: grunt.file.exists('docs/foo/scss/index.html'),
        styleguide_styl: grunt.file.exists('docs/foo/styl/index.html'),
        template: grunt.file.exists('docs/index.mustache'),
    };

    test.equal(expects.docs, true, 'should create the docs directory');
    test.equal(expects.css, true, 'should create the css directory');
    test.equal(expects.styles, true, 'should create the styles.css file');
    test.equal(expects.js, true, 'should create the js directory');
    test.equal(expects.js_prettify, true, 'should create the js directory prettify file');
    test.equal(expects.styleguide_index, true, 'should create the docs/foo/index.html file');
    test.equal(expects.styleguide_less, true, 'should create the docs/foo/less/index.html file');
    test.equal(expects.styleguide_sass, true, 'should create the docs/foo/sass/index.html file');
    test.equal(expects.styleguide_scss, true, 'should create the docs/foo/scss/index.html file');
    test.equal(expects.styleguide_styl, true, 'should create the docs/foo/styl/index.html file');
    test.equal(expects.template, false, 'should not create the index.mustache file');

    test.done();
  },

};
