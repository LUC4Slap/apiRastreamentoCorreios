const express = require("express");
const app = express();
const rastrojs = require('rastrojs');


const server = require("http").Server(app);
const cors = require("cors");

app.use(cors());

app.get("/", (req, res) => {
  res.json({ info: "Utilizar o /rastreio/:codigo para pesquisar" });
});

app.get("/rastreio/:codigo", async (req, res) => {
  let codigoRastreio = req.params.codigo;
  const tracks = await rastrojs.track(codigoRastreio, 'NOT-CODE');
  res.json(tracks)
});

server.listen(process.env.PORT || 8080, () => console.log("Server ON."));
