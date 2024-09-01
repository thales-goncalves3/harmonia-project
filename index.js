const express = require('express');
const cors = require('cors');
const session = require('express-session');
const SpotifyWebApi = require('spotify-web-api-node');
const querystring = require('querystring');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');

const app = express();
const port = 8888;

const client_id = 'b8b33e8a96de4d04942cc239c88de7a6';
const client_secret = 'e4a4965062e640b19351d9f6f9e3bcc9';
const redirect_uri = 'http://54.233.243.220:8888/callback';

// Configuração CORS


app.use(cors());
app.use(cookieParser());

// Configuração da sessão
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true
}));

function generateRandomString(length) {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}

app.get('/login', function(req, res) {
  const state = generateRandomString(16);
  const scope = 'user-read-private user-read-email';

  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', function(req, res) {
  const code = req.query.code || null;

  const spotifyApi = new SpotifyWebApi({
    clientId: client_id,
    clientSecret: client_secret,
    redirectUri: redirect_uri
  });

  spotifyApi.authorizationCodeGrant(code).then(data => {
    const access_token = data.body['access_token'];
    const refresh_token = data.body['refresh_token'];

    // Salvar tokens nos cookies
    res.cookie('access_token', access_token, { httpOnly: true, secure: true });
    res.cookie('refresh_token', refresh_token, { httpOnly: true, secure: true });

    // Use o token de acesso para obter informações do usuário
    spotifyApi.setAccessToken(access_token);
    return spotifyApi.getMe();
  }).then(userData => {
    // Salvar informações do usuário nos cookies
    res.cookie('user', JSON.stringify(userData.body), { httpOnly: true, secure: true });

    // Responder com HTML que inclui um botão para fechar a aba
    res.send(`
      <html>
        <head>
          <title>Autenticado</title>
        </head>
        <body>
          <h1>Autenticado com sucesso!</h1>
          <button onclick="window.close()">Fechar</button>
        </body>
      </html>
    `);
  }).catch(err => {
    console.error('Erro ao obter tokens ou informações do usuário:', err);
    res.status(500).json({ error: 'Erro ao obter tokens ou informações do usuário.' });
  });
});

app.get('/get-tokens', function(req, res) {
  const accessToken = req.cookies['access_token'];
  const refreshToken = req.cookies['refresh_token'];
  res.json({
    access_token: accessToken,
    refresh_token: refreshToken
  });
});



app.get('/me', function(req, res) {
  if (!req.session.access_token) {
    return res.status(401).send('Não autorizado.');
  }

  const spotifyApi = new SpotifyWebApi({
    accessToken: req.session.access_token
  });

  spotifyApi.getMe().then(data => {
    res.json(data.body);
  }).catch(err => {
    console.error('Erro ao obter usuário:', err);
    res.status(500).send('Erro ao obter usuário.');
  });
});

app.listen(port, () => {
  console.log(`App ouvindo na porta ${port}`);
});
