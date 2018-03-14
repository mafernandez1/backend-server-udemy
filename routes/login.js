/*jshint esversion: 6 */
var express = require('express');
var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
var SEED = require('../config/config').SEED;

var app = express();
var Usuario = require('../models/usuario');

var CLIENT_ID = require('../config/config').GOOGLE_ID_CLIENT;
var SECRET = require('../config/config').GOOGLE_SECRET;

const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(CLIENT_ID);

// ====================================
// Autenticación Google
// ====================================
async function verify(token, res) {
    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: CLIENT_ID, // Specify the CLIENT_ID of the app that accesses the backend
        // Or, if multiple clients access the backend:
        //[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3]
    });
    const payload = ticket.getPayload();
    const userid = payload.sub;
    // If request specified a G Suite domain:
    //const domain = payload['hd'];

    Usuario.findOne({ email: payload.email }, (err, usuario) => {
        if (err) {
            return res.status(500).json({
                ok: false,
                mensaje: 'Error al buscar usuario',
                errors: err
            });
        }

        if (usuario) {
            if (!usuario.google) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'De usar su utenticación normal',
                    errors: err
                });
            } else {
                // Crear un token
                usuario.password = ':)';
                var tokenDB = jwt.sign({ usuario: usuario }, SEED, { expiresIn: 14400 }); // 4 horas

                res.status(200).json({
                    ok: true,
                    token: tokenDB,
                    usuario: usuario,
                    id: usuario.id
                });
            }
        } else {
            var usuarioNuevo = new Usuario();
            usuarioNuevo.nombre = payload.name;
            usuarioNuevo.email = payload.email;
            usuarioNuevo.password = ':)';
            usuarioNuevo.img = payload.picture;
            usuarioNuevo.google = true;

            usuarioNuevo.save((err, usuarioGuardado) => {
                if (err) {
                    return res.status(400).json({
                        ok: false,
                        mensaje: 'Error al crear el usuario',
                        errors: err
                    });
                }

                // Crear un token
                var tokenDB = jwt.sign({ usuario: usuarioGuardado }, SEED, { expiresIn: 14400 }); // 4 horas

                res.status(200).json({
                    ok: true,
                    token: tokenDB,
                    usuario: usuarioGuardado,
                    id: usuarioGuardado.id
                });
            });
        }
    });
}

app.post('/google', (req, res) => {
    var token = req.body.token || 'MMM';

    verify(token, res).catch(function(e) {
        return res.status(400).json({
            ok: false,
            mensaje: 'Token inválido',
            errors: e
        });
    });
});

// ====================================
// Autenticación normal
// ====================================
app.post('/', (req, res) => {
    var body = req.body;

    Usuario.findOne({ email: body.email }, (err, usuarioDB) => {
        if (err) {
            return res.status(500).json({
                ok: false,
                mensaje: 'Error al buscar usuario',
                errors: err
            });
        }

        if (!usuarioDB) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Credenciales incorrectas - email',
                errors: err
            });
        }

        if (!bcrypt.compareSync(body.password, usuarioDB.password)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Credenciales incorrectas - password',
                errors: err
            });
        }

        // Crear un token
        usuarioDB.password = ':)';
        var token = jwt.sign({ usuario: usuarioDB }, SEED, { expiresIn: 14400 }); // 4 horas

        res.status(200).json({
            ok: true,
            token: token,
            usuario: usuarioDB,
            id: usuarioDB.id
        });
    });

});

module.exports = app;