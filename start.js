const express = require("express");
const app = express();
const puppetter = require("puppeteer");
const cheerio = require("cheerio");
const axios = require("axios");
const fs = require("fs");

let url = "https://www.linkcorreios.com.br";

const server = require("http").Server(app);
const cors = require("cors");

app.use(cors());
app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.json({ info: "Utilizar o /:codigoEmpcomenda para pesquisar" });
});

app.get("/rastreio/:codigo", async (req, res) => {
  let codigoRastreio = req.params.codigo;
  let { data } = await axios.get(`${url}/${codigoRastreio}`);
  const $ = cheerio.load(data);
  let historico = [];
  $('div[class="singlepost"]').each(async (i, e) => {
    let texto = $(e).children().text()
    let teste = texto.split('<ul>')
    teste.forEach(val => {
      let resp = val.split('li')
      resp.forEach(t => {
        let filtrado = t.replaceAll(/<[^>]*(>|$)|&nbsp;|&zwnj;|&raquo;|&laquo;|&gt;/g, '').replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '').toString()
        // let emArray = filtrado.split('Status')
        String(filtrado).split('\n').forEach(este => {
          este.split('Status ').forEach(outroTeste => {
            outroTeste.split('\t').forEach(async v => {
              if(v !== '') {
                let obj = {};
                if(v.includes('Objeto')) {
                  obj.status = v
                  if(v.includes('Unidade')) {
                    obj.local = v
                  }
                  historico.push(obj);
                }
              }
            })
          })
        })
      })
    })
  })
  res.json(historico)
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

server.listen(process.env.PORT || 8080, () => console.log("Server ON."));
