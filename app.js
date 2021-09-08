const express = require("express");
const app = express();
const puppetter = require("puppeteer");
const fs = require("fs");

let url = "https://www.linkcorreios.com.br";
let path = require("path");

const server = require("http").Server(app);
const cors = require("cors");


app.use(cors());
app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.json({ info: "Utilizar o /:codigoEmpcomenda para pesquisar" });
});

app.get("/codigo/:codigo", async (req, res) => {
  let codigoRastreio = req.params.codigo;
  let historico = [];
  const browser = await puppetter.launch({
    headless: true,
  });
  const page = await browser.newPage();
  await page.goto(`${url}/${codigoRastreio}`);
  let rastreio = await page.evaluate((val) => {
    let ul = document.querySelectorAll(".linha_status");
    let hist = [];
    let obj = {};
    console.log(ul);
    for (let i = 0; i < ul.length; i++) {
      let li = ul[i].querySelectorAll("li");
      for (let j = 0; j < li.length; j++) {
        console.log(li[j]);
        obj = {
          status: li[0].innerText,
          data: li[1].innerText,
          local: li[2].innerText,
        };
      }
      hist.push(obj);
    }
    return hist;
  });
  historico.push(rastreio);

  await browser.close();
  res.json({ historico });
});

server.listen(3000, () => console.log("Server ON."));
