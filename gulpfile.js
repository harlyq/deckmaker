var gutil = require('gulp-util');
var gulp = require('gulp');
var tsc = require('gulp-typescript-compiler');
var uglify = require('gulp-uglify');
var less = require('gulp-less');
var concat = require('gulp-concat');
var run = require('gulp-run');
//var tap = require('gulp-tap');

gulp.task('less', function() {
    return gulp
        .src('src/*.less')
        .pipe(less());
});

gulp.task('typescript', function() {
    run('tsc.cmd --target ES5 --out src/deckmaker.js src/deckmaker.ts').exec().on('error', gutil.log);

    // This should work, but actually generates a non --out file in layouteditor.js
    // return gulp
    //     .src('src/layouteditor.ts')
    //     .pipe(tsc({
    //         out: 'blah.js'
    //     }))
    //     .pipe(gulp.dest('dist'));
});

gulp.task('watch', function() {
    gulp.watch('src/*.ts', ['typescript']);
    gulp.watch('src/*.less', ['less']);
});

gulp.task('default', ['typescript', 'less', 'watch']);
