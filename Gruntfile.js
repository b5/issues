module.exports = function (grunt) {

	grunt.initConfig({
		stylus : {
			options : { pretty : true, compress : false },
			site : {
				files : {
					'public/css/site.css' : 'site/src/style/site.styl'
				}
			},
			webapp : {
				files : {
					'public/css/app.css' : 'webapp/src/style/app.styl',
				}
			}
		},

    shell: {
      'build-webapp-jsx': {
        command: 'jsx --no-cache-dir -x jsx webapp/src/jsx/ webapp/src/js/app/views/',
        stdout: true,
        failOnError: true
      }
    },

		browserify : {
			webapp : {
				files : {
					'webapp/app.js' : ['webapp/src/js/**/*.js']
				}
			}
		},

		concat : {
			options : { process : false },
			webapp : {
				files : { 'public/js/app.develop.js' : 'webapp/app.js' }
			}
		},

		uglify : {
			options : {},
			app : {
				files : { 'public/js/app.min.js' : 'webapp/app.js' }
			}
		},

		watch : {
			options : { nospawn : false, event: 'all', interrupt : false, interval : 200, debounceDelay: 200 },
			"webapp-js" : { files : ['webapp/src/js/**/*.js'], tasks : ['browserify:webapp', 'concat:webapp']},
			"webapp-jsx" : { files : ['webapp/src/jsx/**/*.jsx'], tasks : ['shell:build-webapp-jsx', 'browserify:webapp', 'concat:webapp'] },
			"webapp-style" : { files : ['webapp/src/style/**/*.styl'], tasks : ['stylus:webapp'] },

			"site-style" : { files : ['site/src/style/**/*.styl'], tasks : ['stylus:site'] },
		},

		mocha : {
			site: {
		    src: ['webapp/test/client/**/*.html'],
		    options: {
		      run: true,
		    },
		  },
		},

	  // mochaTest for testing js files that don't require a browser
    mochaTest: {
      "webapp-server": {
        options: {
          reporter: 'dot',
          quiet: false, // Optionally suppress output to standard out (defaults to false)
          clearRequireCache: true, // Optionally clear the require cache before running tests (defaults to false)

          // Require blanket wrapper here to instrument other required
          // files on the fly. 
          //
          // NB. We cannot require blanket directly as it
          // detects that we are not running mocha cli and loads differently.
          //
          // NNB. As mocha is 'clever' enough to only run the tests once for
          // each file the following coverage task does not actually run any
          // tests which is why the coverage instrumentation has to be done here
          require: 'webapp/test/blanket'
        },
        src: ['webapp/test/server/**/*_test.js']
      },
      "webapp-coverage" : {
        options: {
          reporter: 'html-cov',
          // use the quiet flag to suppress the mocha console output
          quiet: true,
          // specify a destination file to capture the mocha
          // output (the quiet option does not suppress this)
          captureFile: 'webapp/test/coverage.html'
        },
        src: ['webapp/test/server/**/*_test.js']
      },
    }
	});

	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-stylus');
	grunt.loadNpmTasks('grunt-browserify');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-mocha-test');
	grunt.loadNpmTasks('grunt-mocha');
	grunt.loadNpmTasks('grunt-shell');

	grunt.registerTask('build', 'build tasks', function (env) {
		switch (env) {
			case "webapp":
				grunt.task.run(['stylus:webapp', 'shell:build-webapp-jsx', 'browserify:webapp', 'concat:webapp', 'uglify']);
				break;
			default:
				grunt.task.run(['stylus','shell','browserify','concat']);
				break;
		}
	});

	grunt.registerTask('test','run tests', function(env){
		switch (env) {
			case "webapp":
				grunt.task.run(['mochaTest:webapp-server','mochaTest:webapp-coverage']);
				break;
			default:
				grunt.task.run(['mochaTest']);
				break;
		}
	});

	grunt.registerTask('develop', ['build','watch']);
	grunt.registerTask('publish', ['build','uglify']);
}