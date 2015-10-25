/**
 * @victorvhpg
 * https://github.com/victorvhpg/phonegap-build-react-boilerplate
 *
 */
"use strict";

var gulp = require("gulp");
var browserify = require("browserify");
var babelify = require("babelify");
var uglify = require("gulp-uglify");
var source = require("vinyl-source-stream");
var streamify = require("gulp-streamify");
var glob = require("glob");
var replace = require("gulp-replace");
var packageJSON = require("./package");
var browserSync = require("browser-sync").create();
var zip = require("gulp-zip");
var minifyCss = require("gulp-minify-css");
var concat = require("gulp-concat");
var sourcemaps = require("gulp-sourcemaps");
var eslint = require("gulp-eslint");
var del = require("del");
var eslintConfig = JSON.parse(require("fs").readFileSync("./.eslintrc").toString());
//==============================================================================

var _PRODUCAO = process.argv[3] !== "--dev";

//da reload nos  browsers
function reload(task) {
    console.log("RELOAD (" + task + ")....");
    setTimeout(function() {
        browserSync.reload();
    }, 100);
}

// nome das tasks de  codigo fonte
var _tasksCodigoFonte = ["js", "html", "css"];

//destino
var PATH_WWW = "./www/";
//caminho para cada task
var PATH = {
    js: {
        main: "./src/js/**/main-*.{js,jsx}",
        origem: "./src/js/**/*.{js,jsx}",
        destino: PATH_WWW + "js/"
    },
    html: {
        origem: "./src/index.html",
        destino: PATH_WWW
    },
    css: {
        origem: "./src/css/*.css",
        destino: PATH_WWW + "css/"
    }
};

function zipar(plataforma) {
    console.log("#ZIPAR: " + plataforma);
    return gulp.src([PATH_WWW + "**"])
        .pipe(zip("www_" + plataforma + ".zip"))
        .pipe(gulp.dest("./"));
}

//========build-codigo-fonte====================================================
gulp.task("build-codigo-fonte", _tasksCodigoFonte.concat("gera-config"),
    function(done) {
        console.log("TASK: build-codigo-fonte");
        done();
    });

//========gera tasks build-das-plataformas======================================
["android", "ios", "wp"].forEach(function(plataforma) {
    gulp.task("build-" + plataforma, ["build-codigo-fonte"], function(done) {
        console.log("TASK: build-" + plataforma);
        var imagens = "images/";
        var locales = "locales/";

        del([PATH_WWW + "res/**/*",
            PATH_WWW + imagens + "**/*",
            PATH_WWW + locales + "**/*"
        ]).then(function() {
            //imagens dos icones
            var p1 = new Promise(function(resolve, reject) {
                gulp.src("./src/res/icon/" + plataforma + "/**/*")
                    .pipe(gulp.dest(PATH_WWW + "res/icon/" + plataforma + "/"))
                    .on("end", resolve)
                    .on("error", reject);
            });
            //imagens de splash
            var p2 = new Promise(function(resolve, reject) {
                gulp.src("./src/res/screen/" + plataforma + "/**/*")
                    .pipe(gulp.dest(PATH_WWW + "res/screen/" + plataforma + "/"))
                    .on("end", resolve)
                    .on("error", reject);
            });
            //imagens
            var p3 = new Promise(function(resolve, reject) {
                gulp.src("./src/" + imagens + "**/*", {
                        base: "./src/" + imagens
                    })
                    .pipe(gulp.dest(PATH_WWW + imagens))
                    .on("end", resolve)
                    .on("error", reject);
            });
            //locales
            var p4 = new Promise(function(resolve, reject) {
                gulp.src("./src/" + locales + "**/*", {
                        base: "./src/" + locales
                    })
                    .pipe(gulp.dest(PATH_WWW + locales))
                    .on("end", resolve)
                    .on("error", reject);
            });
            Promise.all([p1, p2, p3, p4]).then(function() {
                zipar(plataforma).on("end", function() {
                    console.log("##OK##");
                    done();
                });
            }).catch(function(e) {
                console.log(Array(10).join("##ERRO##"));
                console.log(e);
                done();
            });
        });
    });
});

//========css===================================================================
gulp.task("css-clean", function() {
    console.log("TASK: css-clean");
    return del(PATH.css.destino);
});
gulp.task("css", ["css-clean"], function() {
    console.log("TASK: css");
    return gulp.src(PATH.css.origem)
        .pipe(sourcemaps.init())
        .pipe(minifyCss())
        .pipe(concat("estilos.bundle.css"))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(PATH.css.destino));
});

//========html==================================================================
gulp.task("html-clean", function() {
    console.log("TASK: html-clean");
    return del(PATH_WWW + "index.html");
});
gulp.task("html", ["html-clean"], function() {
    console.log("TASK: html");
    return gulp.src(PATH.html.origem)
        .pipe(replace("{@APP_NOME}", packageJSON["phonegap-build-react-boilerplate"]["app-nome"]))
        .pipe(gulp.dest(PATH.html.destino));
});

//========valida javascript=====================================================
gulp.task("valida-js", function() {
    console.log("TASK: js");
    return gulp.src(PATH.js.origem)
        .pipe(eslint(eslintConfig))
        .pipe(eslint.format());
    //.pipe(eslint.failOnError())
});

//========Javascript============================================================
gulp.task("js-clean", function() {
    console.log("TASK: js-clean");
    return del(PATH.js.destino);
});
gulp.task("js", ["valida-js", "js-clean"], function(done) {
    console.log("TASK: js");
    glob(PATH.js.main, function(err, files) {
        if(err) {
            throw err;
        }
        var total = 0;
        files.forEach(function(file) {
            var temp = file.split("/");
            var arquivoNome = temp[temp.length - 1];
            arquivoNome = arquivoNome.split(".")[0];
            console.log(file);
            var b = browserify({
                entries: file,
                extensions: [".jsx", "js"],
                debug: true
            });
            var stream = b.transform(babelify)
                .bundle()
                .on("error", function(err) {
                    console.log(Array(10).join("##ERRO##"));
                    console.log(err.toString());
                    console.log(Array(10).join("##ERRO##"));
                    this.emit("end");
                })
                .pipe(source(arquivoNome + ".bundle.js"));
            if(_PRODUCAO) {
                stream.pipe(streamify(uglify()));
            }
            stream.pipe(gulp.dest(PATH.js.destino))
                .on("end", function() {
                    total++;
                    if(total === files.length) {
                        done();
                    }
                });
        });
    });
});

//========config.xml============================================================
gulp.task("gera-config", function() {
    console.log("TASK: gera-config");
    var config = packageJSON["phonegap-build-react-boilerplate"];
    return gulp.src("./src/config.xml")
        .pipe(replace("{@VERSAO}", packageJSON.version))
        .pipe(replace("{@ID}", config["id"]))
        .pipe(replace("{@VERSAO_CODE}", config["versao-code"]))
        .pipe(replace("{@APP_NOME}", config["app-nome"]))
        .pipe(replace("{@APP_DESCRICAO}", config["app-descricao"]))
        .pipe(replace("{@AUTOR}", packageJSON.author))
        .pipe(replace("{@AUTOR_EMAIL}", config["autor-email"]))
        .pipe(replace("{@AUTOR_SITE}", config["autor-site"]))
        .pipe(gulp.dest(PATH_WWW));
});


//==============================================================================
//==============================================================================
//==============================================================================
gulp.task("default", _tasksCodigoFonte, function() {
    //inicia o  servidor browserSync
    browserSync.init({
        server: {
            baseDir: PATH_WWW
        }
    });

    //cria  as tasks  de  watch para cada  _tasksCodigoFonte
    _tasksCodigoFonte.forEach(function(task) {
        gulp.task("reload-" + task, [task], function() {
            reload(task);
        });
        gulp.watch(PATH[task].origem, ["reload-" + task]);
    });
});
