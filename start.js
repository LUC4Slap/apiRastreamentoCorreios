const express = require("express");
const app = express();
const rastrojs = require('rastrojs');


const server = require("http").Server(app);
const cors = require("cors");
const { default: axios } = require("axios");

app.use(cors());

app.get("/", (req, res) => {
  res.json({ info: "Utilizar o /rastreio/:codigo para pesquisar ou /ml/prod para pesquisar produtos no Mercado Livre" });
});

app.get("/rastreio/:codigo", async (req, res) => {
  let codigoRastreio = req.params.codigo;
  const tracks = await rastrojs.track(codigoRastreio, 'NOT-CODE');
  res.json(tracks)
});

// consultar produto ML
app.get('/ml/:prod', async (req, res) => {
  //curl "https://api.mercadolibre.com/sites/MLB/search?q=Motorola"
  let prodPesq = req.params.prod
  let { data } = await axios.get(`https://api.mercadolibre.com/sites/MLB/search?q=${prodPesq}`)
  res.json({results: data.results})
})

server.listen(process.env.PORT || 8080, () => console.log("Server ON."));
