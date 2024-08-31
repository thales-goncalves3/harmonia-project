const express = require('express');
const session = require('express-session');
const SpotifyWebApi = require('spotify-web-api-node');
const querystring = require('querystring');
const crypto = require('crypto');

const app = express();
const port = 8888;

const client_id = 'b8b33e8a96de4d04942cc239c88de7a6'; // Seu Client ID
const client_secret = 'e4a4965062e640b19351d9f6f9e3bcc9'; // Seu Client Secret
const redirect_uri = 'http://localhost:8888/callback'; // Seu Redirect URI

// Configuração da sessão
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true
}));

// Função para gerar um estado aleatório
function generateRandomString(length) {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}

// Rota de login
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

// Rota de callback
app.get('/callback', function(req, res) {
  const code = req.query.code || null;
  const state = req.query.state || null;

  // Verifique o estado se desejar

  const spotifyApi = new SpotifyWebApi({
    clientId: client_id,
    clientSecret: client_secret,
    redirectUri: redirect_uri
  });

  spotifyApi.authorizationCodeGrant(code).then(data => {
    const access_token = data.body['access_token'];
    const refresh_token = data.body['refresh_token'];

    // Armazenar tokens na sessão
    req.session.access_token = access_token;
    req.session.refresh_token = refresh_token;

    res.send('Autorização concluída! Tokens armazenados na sessão.');
  }).catch(err => {
    console.error('Erro ao obter tokens:', err);
    res.status(500).send('Erro ao obter tokens.');
  });
});

// Rota de teste para verificar o token
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
