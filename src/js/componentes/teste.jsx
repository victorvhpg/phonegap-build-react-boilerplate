/**
 * @victorvhpg
 * https://github.com/victorvhpg/phonegap-build-react-boilerplate
 *
 */
"use strict";

var React = require("react");


var Teste = React.createClass({

    getInitialState: function() {
        return {
            msg: "Olá"
        };
    },

    render: function() {
        return (
            <div>
                <h2> {this.state.msg}, {this.props.nome} </h2>
            </div>
        );
    }

});

module.exports = Teste;
