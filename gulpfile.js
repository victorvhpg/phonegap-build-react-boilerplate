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
var imagemin = require("gulp-imagemin");
var pngquant = require("imagemin-pngquant");
var eslintConfig = JSON.parse(require("fs").readFileSync("./.eslintrc").toString());
var dependenciasNPM = Object.keys(packageJSON.dependencies);
var fs = require("fs");
var _parametros = require("minimist")(process.argv.slice(2), {
    boolean: true
});
var _idConfig = "phonegap-build-react-boilerplate";

//==============================================================================
var _PRODUCAO = (_parametros._.indexOf("build-android") >= 0 ||
    _parametros._.indexOf("build-wp") >= 0 ||
    _parametros._.indexOf("build-ios") >= 0);

if(!Object.hasOwnProperty.call(_parametros, "debug")) {
    _parametros.debug = !_PRODUCAO;
}
if(!Object.hasOwnProperty.call(_parametros, "min")) {
    _parametros.min = _PRODUCAO;
}
if(!Object.hasOwnProperty.call(_parametros, "ads")) {
    _parametros.ads = _PRODUCAO;
}
if(!Object.hasOwnProperty.call(_parametros, "onError")) {
    _parametros.onError = !_PRODUCAO;
}

/**
versionamento   A.B.C   MAJOR.MINOR.PATCH
build-android
--release=android???
--debug=true
--min=false
--onerror=true
--ads=false
--versao= // MAJOR.MINOR.PATCH

*/

//MAJOR.MINOR.PATCH
function incVersao(tipo, verAtual) {
    tipo = tipo.toUpperCase();
    var ver = {
        MAJOR: 0,
        MINOR: 1,
        PATCH: 2
    };
    if(!Object.hasOwnProperty.call(ver, tipo)) {
        throw new Error("tipo  versao invalido");
    }
    var tempVer = verAtual.split(".");
    return tempVer.map(function(v, indice) {
        return(ver[tipo] === indice) ? ((+v) + 1).toString() : v;
    }).join(".");
}

function atualizarVersao() {
    var v = incVersao(_parametros.versao, packageJSON.version);
    packageJSON.version = v;
    packageJSON[_idConfig]["versao-code"]++;
    console.log(v);
    fs.writeFileSync("./package.json", JSON.stringify(packageJSON, null, 4));
}


if(_parametros.versao) {
    atualizarVersao();
}

//da reload nos  browsers
function reload(task) {
    console.log("RELOAD (" + task + ")....");
    setTimeout(function() {
        browserSync.reload();
    }, 100);
}

// nome das tasks de  codigo fonte sem js
var _tasksCodigoFonte = ["html", "css", "imagens"];

//destino
var PATH_WWW = "www/";
//caminho para cada task
var PATH = {
    js: {
        main: "./src/js/**/main-*.{js,jsx}",
        origem: "./src/js/**/*.{js,jsx}",
        destino: PATH_WWW + "js/",
        polyfill: "./src/js/libs/polyfill/**/*"
    },
    html: {
        origem: "./src/index.html",
        destino: PATH_WWW
    },
    css: {
        origem: "./src/css/**/*.css",
        destino: PATH_WWW + "css/"
    },
    imagens: {
        origem: "./src/images/**/*.*",
        destino: PATH_WWW + "images/"
    }
};

function zipar(plataforma) {
    console.log("#ZIPAR: " + plataforma);
    return gulp.src([PATH_WWW + "**"])
        .pipe(zip("www_" + plataforma + ".zip"))
        .pipe(gulp.dest("./"));
}

function otimizaImg(origem, destino) {
    return new Promise(function(resolve, reject) {
        gulp.src(origem)
            .pipe(imagemin({
                progressive: true,
                svgoPlugins: [{
                    removeViewBox: false
                }],
                use: [pngquant({
                    quality: "65-90",
                    speed: 5
                })]
            }))
            .pipe(gulp.dest(destino))
            .on("end", resolve)
            .on("error", reject);
    });
}

//========build-codigo-fonte====================================================
gulp.task("build-codigo-fonte", _tasksCodigoFonte.concat(["gera-config", "js-com-libs"]),
    function(done) {
        console.log("TASK: build-codigo-fonte");
        done();
    });

//========gera tasks build-das-plataformas======================================
["android", "ios", "wp"].forEach(function(plataforma) {
    gulp.task("build-" + plataforma, ["build-codigo-fonte"], function(done) {
        console.log("TASK: build-" + plataforma);

        var locales = "locales/";

        del([PATH_WWW + "icon.png",
            PATH_WWW + "splash.png",
            PATH_WWW + "res/**/*",
            PATH_WWW + locales + "**/*"
        ]).then(function() {
            var p1 = otimizaImg("./src/res/icon/" + plataforma + "/**/*",
                PATH_WWW + "res/icon/" + plataforma + "/");
            var p2 = otimizaImg("./src/res/screen/" + plataforma + "/**/*",
                PATH_WWW + "res/screen/" + plataforma + "/");
            var p3 = otimizaImg("./src/icon.png", PATH_WWW);
            var p4 = otimizaImg("./src/splash.png", PATH_WWW);
            var p5 = new Promise(function(resolve, reject) {
                gulp.src("./src/" + locales + "**/*", {
                        base: "./src/" + locales
                    })
                    .pipe(gulp.dest(PATH_WWW + locales))
                    .on("end", resolve)
                    .on("error", reject);
            });

            Promise.all([p1, p2, p3, p4, p5]).then(function() {
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


//========imagens===============================================================
gulp.task("imagens-clean", function() {
    console.log("TASK: imagens-clean");
    return del(PATH.imagens.destino);
});
gulp.task("imagens", function() {
    console.log("TASK: imagens");
    return gulp.src(PATH.imagens.origem)
        .pipe(imagemin({
            progressive: true,
            svgoPlugins: [{
                removeViewBox: false
            }],
            use: [pngquant({
                quality: "65-90",
                speed: 5
            })]
        }))
        .pipe(gulp.dest(PATH.imagens.destino));
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
    var SCRIPT_CONFIG = {
        dataBuild: Date.now(),
        versao: packageJSON.version,
        ads: _parametros.ads,
        onError: _parametros.onError
    };

    var script = "window.SCRIPT_CONFIG = " + JSON.stringify(SCRIPT_CONFIG, null, 2) + ";";

    return gulp.src(PATH.html.origem)
        .pipe(replace("{@APP_NOME}", packageJSON[_idConfig]["app-nome"]))
        .pipe(replace("//{@SCRIPT_CONFIG}", script))
        .pipe(gulp.dest(PATH.html.destino));
});

//========valida javascript=====================================================
gulp.task("valida-js", function() {
    console.log("TASK: js");
    return gulp.src([PATH.js.origem, "!./js/libs/**/*"])
        .pipe(eslint(eslintConfig))
        .pipe(eslint.format());
    //.pipe(eslint.failOnError())
});

//========Javascript============================================================
function polyfill() {
    return new Promise(function(resolve, reject) {
        gulp.src(PATH.js.polyfill)
            .pipe(concat("polyfill.bundle.js"))
            .pipe(uglify())
            .pipe(gulp.dest(PATH.js.destino))
            .on("end", resolve)
            .on("error", reject);
    });
}

function libsTerceiros() {
    return new Promise(function(resolve, reject) {
        polyfill().then(function() {
            var b = browserify({
                debug: _parametros.debug
            });
            dependenciasNPM.forEach(function(id) {
                console.log(require.resolve(id));
                b.require(require.resolve(id), {
                    expose: id
                });
            });
            var stream = b.bundle()
                .on("error", function(err) {
                    console.log(Array(10).join("#libsTerceiros#ERRO##"));
                    console.log(err.message);
                    console.log(Array(10).join("#libsTerceiros#ERRO##"));
                    reject(err);
                    this.emit("end");
                }).pipe(source("libs.bundle.js"));
            stream.pipe(streamify(uglify()));
            stream.pipe(gulp.dest(PATH.js.destino + "libs/"));
            stream.on("end", resolve);
        }).catch(reject);
    });
}

function buildJS() {
    return new Promise(function(resolve, reject) {
        console.log("buildJS: buildJS");
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
                    debug: _parametros.debug
                });
                dependenciasNPM.forEach(function(id) {
                    b.external(id);
                });
                var stream = b.transform(babelify)
                    .bundle()
                    .on("error", function(err) {
                        console.log(Array(10).join("#buildJS#ERRO##"));
                        console.log(err.toString());
                        console.log(Array(10).join("#buildJS#ERRO##"));
                        reject(err);
                        this.emit("end");
                    })
                    .pipe(source(arquivoNome + ".bundle.js"));
                if(_parametros.min) {
                    stream.pipe(streamify(uglify()));
                }
                stream.pipe(gulp.dest(PATH.js.destino))
                    .on("end", function() {
                        total++;
                        if(total === files.length) {
                            resolve();
                        }
                    });
            });
        });
    });
}

gulp.task("js-clean", function() {
    console.log("TASK: js-clean");
    return del([PATH.js.destino + "*", "!" + PATH.js.destino + "libs"])
        .then(function(paths) {
            console.log("excluiu:\n", paths.join("\n"));
        });
});

gulp.task("js-clean-libs", function() {
    console.log("TASK: js-clean-libs");
    return del([PATH.js.destino + "libs/*"])
        .then(function(paths) {
            console.log("excluiu:\n", paths.join("\n"));
        });
});

gulp.task("js-libs", ["js-clean-libs"], function() {
    console.log("TASK: js-libs");
    return libsTerceiros();
});

gulp.task("js", ["valida-js", "js-clean"], function() {
    return buildJS();
});

gulp.task("js-com-libs", ["valida-js", "js-clean", "js-libs"], function() {
    return buildJS();
});
//========config.xml============================================================
gulp.task("gera-config", function() {
    console.log("TASK: gera-config");
    var config = packageJSON[_idConfig];
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
gulp.task("default", ["build-codigo-fonte"], function() {
    //inicia o  servidor browserSync
    browserSync.init({
        server: {
            baseDir: PATH_WWW
        }
    });

    //cria  as tasks  de  watch para cada  _tasksCodigoFonte
    _tasksCodigoFonte.concat("js").forEach(function(task) {
        gulp.task("reload-" + task, [task], function() {
            reload(task);
        });
        gulp.watch(PATH[task].origem, ["reload-" + task]);
    });
});
