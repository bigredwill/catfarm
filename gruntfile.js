
module.exports = function(grunt) {

  // project configuration 
  grunt.initConfig({

    watch: {
      scripts: {
        files: ['src/scene.js', 'src/collision.js'],
        tasks: [],
        options: {
          livereload: true,
          atBegin: true,
          spawn: true
        },
      },
    },


    connect: {
      server: {
        options: {
          port: 8000,
          keepalive: false,
          livereload: true,
          base: {
            path: '.',
            options: {
              index: 'index.html',
              maxAge: 300000
            }
          }
        }
      }
    }

  });


  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-connect');


  grunt.registerTask('default', ['connect', 'watch']);

}

