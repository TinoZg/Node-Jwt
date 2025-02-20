require('dotenv').config();
const express = require('express');
const app = express();
const bcrypt = require('bcrypt');

const jwt = require('jsonwebtoken');

app.use(express.json());

let refreshTokens = [];

const users = [];

app.get('/users', (req, res) => {
  res.json(users);
});

app.post('/users', async (req, res) => {
  try {
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(req.body.password, salt);
    console.log(salt);
    console.log(hashedPassword);
    const user = {
      username: req.body.username,
      password: hashedPassword,
    };
    users.push(user);
    res.sendStatus(201);
  } catch {
    res.sendStatus(500);
  }
});

app.post('/token', (req, res) => {
  const refreshToken = req.body.token;
  if (refreshToken == null) {
    return res.sendStatus(401);
  }
  if (!refreshTokens.includes(refreshToken)) {
    return res.sendStatus(403);
  }

  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) {
      return res.sendStatus(403);
    }
    const accessToken = generateAccessToken({ name: user.name });
    res.json({ accessToken: accessToken });
  });
});

app.delete('/logout', (req, res) => {
  refreshTokens = refreshTokens.filter((token) => token !== req.body.token);
  console.log(refreshTokens);
  res.sendStatus(204);
});

app.post('/login', async (req, res) => {
  // Authenticate User
  const user = users.find((user) => user.username === req.body.username);
  if (user == null) {
    return res.status(400).send('Cannot find user');
  }

  try {
    if (!(await bcrypt.compare(req.body.password, user.password))) {
      res.send('Not allowed');
    }
  } catch {
    res.sendStatus(500);
  }

  // Jwt
  // const username = req.body.username;
  // const user = {
  //   name: username,
  // };

  const accessToken = generateAccessToken(user);
  const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET);
  refreshTokens.push(refreshToken);
  res.json({ accessToken: accessToken, refreshToken: refreshToken });
  console.log(refreshTokens);
});

function generateAccessToken(user) {
  return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '100s' });
}

app.listen(4000);
