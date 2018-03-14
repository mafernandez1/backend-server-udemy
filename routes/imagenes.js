/*jshint esversion: 6 */
var express = require('express');
var fs = require('fs');
var app = express();

app.get('/:tipo/:img', (req, res, next) => {
    var tipo = req.params.tipo;
    var img = req.params.img;

    var path = `./uploads/${tipo}/${img}`;
    fs.exists(path, existe => {
        if (!existe) {
            path = './assests/no-img.jpg';
        }

        res.sendFile(path);
    });

});

module.exports = app;