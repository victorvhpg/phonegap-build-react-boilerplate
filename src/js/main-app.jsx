/**
 * @victorvhpg
 * https://github.com/victorvhpg/phonegap-build-react-boilerplate
 *
 */
"use strict";

var React = require("react");
var ReactDOM = require("react-dom");
var Teste = require("./componentes/teste");

var App = React.createClass({

    render: function() {
        return (
            <div>
                <Teste nome="Victor"/>
            </div>
        );
    }

});

var ready = (window.cordova ? "deviceready": "DOMContentLoaded");
document.addEventListener(ready, function() {
    ReactDOM.render(
        <App/>,
        document.querySelector("#app")
    );
}, false);
