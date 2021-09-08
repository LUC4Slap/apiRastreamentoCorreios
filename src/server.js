const express = require("express");
const app = express();
const puppetter = require("puppeteer");
const fs = require("fs");

const pdf = require("html-pdf");
const ejs = require("ejs");

let url = "https://www.linkcorreios.com.br";
let path = require("path");

const server = require("http").Server(app);
const cors = require("cors");

const convert = require("xml-js");

app.use(cors());
app.set("view engine", "ejs");
app.use(express.static('public'))
var dir = path.join(__dirname, 'public/processadas');
app.use(express.static(dir))

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

app.get("/template", async (req, res) => {
  let itens = await require('./pordutos.json')
  let imagens = await fs.readdirSync('./public/processadas')
  let newProd = []
  for(let i = 0; i <= itens.length; i++) {
    for(let j = 0; j <= imagens.length; j++) {
      if(!itens[i]) break;
      if(itens[i].image === imagens[j]) {
        let imageBuffer = await fs.readFileSync(`./public/processadas/${imagens[j]}`)
        let img64 = `data:image/jpg;base64,${imageBuffer.toString('base64')}`
        // let {data} = await axios(`http://localhost:3000/image/${imagens[j]}`)
        // console.log(data);
        itens[i].image = img64
        let obj = {
          ...itens[i]
        }
        newProd.push(obj);
      }
      else {
        continue;
      }
    }
  }
  res.render("teste", { newProd });
});

app.get("/pdf", async (req, res) => {
  await criarPDFHtml();
  let existe = await fs.existsSync("src/catalogos/catalogo.pdf");
  if (existe) {
    console.log(resp);
    res.json({ message: 'PDF CRIADO' });
    // res.download('../catalogo.html')
  } else {
    res.json({ message: `Erro para gerar o catalogo` });
  }

});

app.get('/image/:name', async (req, res) => {
  let images = await fs.readdirSync('./public/processadas')
  for(let i = 0; i <= images.length; i++) {
    if(req.params.name === images[i]) {
      let img64 = await returnBase64Image('./public/processadas',images[i])
      res.json({base64: img64})
    }
  }
})

// gerar pdf com buffer
app.post('/generate-pdf', async (req, res) => {
  let htmlP;
  let itens = await require('./pordutos.json')
  let imagens = await fs.readdirSync('./public/processadas')
  let newProd = []
  for(let i = 0; i <= itens.length; i++) {
    for(let j = 0; j <= imagens.length; j++) {
      if(!itens[i]) break;
      if(itens[i].image === imagens[j]) {
        let image64 = await returnBase64Image('./public/processadas',imagens[j])
        itens[i].image = image64
        let tamanhosOrdenados = itens[i].size.sort()
        itens[i].size = tamanhosOrdenados
        let obj = {
          ...itens[i]
        }
        newProd.push(obj);
      } else {
        continue;
      }
    }
  }

  let agrupados = []
  for (let i = 0; i <= itens.length; i++) {
    if(itens[i+1] === undefined) break;
    if(itens[i].sku == itens[i+1].sku) {
      let obj = {
        sku: itens[i].sku,
        name: itens[i].name,
        image: itens[i].image,
        color: itens[i].color,
        size: [itens[i].size, itens[i+1].size],
      }
      if(itens[i-1] == undefined) {
        continue;
      }
      if(itens[i].sku == itens[i-1].sku) {
        obj.size.push(itens[i-1].size)
      }
      agrupados.push(obj);
      // console.log('======> linha 16 '+JSON.stringify(agrupados,null, 2)); process.exit();
    }
  }

  for(let i = 0; i <= agrupados.length; i++) {
    if(!agrupados[i-1]) continue;
    if(!agrupados[i+1]) break;
    if(agrupados[i].sku == agrupados[i+1].sku || agrupados[i].sku == agrupados[i-1].sku) {
      agrupados.splice(agrupados.indexOf(agrupados[i+1]), 1)
    }
  }

  for(let i = 0; i <= agrupados.length; i++) {
    if(!agrupados[i-1]) continue;
    if(!agrupados[i+1]) break;
    if(agrupados[i].color == agrupados[i+1].color && agrupados[i].name == agrupados[i+1].name){
      agrupados[i].size.push(agrupados[i+1].size)
      agrupados.splice(agrupados.indexOf(agrupados[i+1]), 1)
    }
  }

  agrupados.forEach(t => {
    let tamanhos = []
    t.size.forEach(k => {
      k.forEach(j => {
        if(Array.isArray(j)) {
          j.forEach(l => tamanhos.push(l))
        } else {
          tamanhos.push(j)
        }
      })
    })
    tamanhos = tamanhos.filter((este, i) => tamanhos.indexOf(este) === i).sort();
    t.size = tamanhos
  })

  agrupados = agrupados.filter((este, i) => {
    let filtrado = []
    if(!agrupados[i+1]) return;
    if(agrupados[i].sku != agrupados[i+1].sku) {
      filtrado.push(agrupados[i])
    }
    return filtrado
  })

  // for(let i = 0; i <= agrupados.length; i++) {
  //   if(!agrupados[i-1]) continue;
  //   if(!agrupados[i+1]) break;
  //   for(let j = 0; j <= agrupados[i].size.length; j++) {
  //     if(!agrupados[i].size[j-1]) continue;
  //     if(!agrupados[i].size[j+1]) break;
  //     if(agrupados[i].size[i] == agrupados[i].size[i+1] || agrupados[i].size[i] == agrupados[i].size[i-1]) {
  //       agrupados[i].size.pop(agrupados[i].size[i])
  //     }
  //   }
  // }

  htmlP = await gerarHtml(agrupados)
  let teste = await pdf.create(htmlP, {
    type: 'pdf',
    format: 'A4',
    orientation: 'portrait',
    timeout: '320000',
  }).toFile("./src/catalogos/catalogo.pdf", (err, resp) => {
    if (err) {
      res.send(err)
    }
    console.log(resp);
    res.download('./src/catalogos/catalogo.pdf')
  })
  // .toBuffer((err, buffer) => {
  //   if(err) throw err
  //   res.send(buffer)
  // })
  // console.log('======> linha 206 '+JSON.stringify(teste,null, 2)); process.exit();
  // .toFile("./src/catalogos/catalogo.pdf", (err, resp) => {
  //   if (err) {
  //     res.send(err)
  //   }
  //   console.log(resp);
  //   res.download('./src/catalogos/catalogo.pdf')
  // })
})

app.get("/lerxml", async (req, res) => {
  let data = await fs.readFileSync("./nota.xml");
  var result1 = convert.xml2json(data, { compact: true, spaces: 4 });
  // var result2 = convert.xml2json(data, { compact: false, spaces: 4 });
  let jx = JSON.parse(result1);
  let infos = {
    series: jx.dados.nfe.nfeProc.NFe.infNFe.ide.serie._text,
    number: jx.dados.nfe.nfeProc.NFe.infNFe.ide.nNF._text,
    date: jx.dados.nfe.nfeProc.NFe.infNFe.ide.dhEmi._text,
    key: jx.dados.nfe.nfeProc.NFe.infNFe._attributes.Id.split("NFe")[1],
    total_value: jx.dados.nfe.nfeProc.NFe.infNFe.pag.detPag.vPag._text,
    products_value: jx.dados.nfe.nfeProc.NFe.infNFe.cobr.dup[0].vDup._text,
    // "total_itens_product": jx.dados.nfe.nfeProc.NFe.infNFe.cobr.dup.length
  };
  let nomeCliente = jx.dados.nfe.nfeProc.NFe.infNFe.dest.xNome._text;
  await criarPDFInfos(infos, nomeCliente);
  res.render("infos", { items: [infos], nomeCliente });
});

async function generatePDF(res){
  let htmlP;
  // let itens = require('./pordutos.json')

  let itens = await require('./pordutos.json')
  let imagens = await fs.readdirSync('./public/processadas')
  let newProd = []
  for(let i = 0; i <= itens.length; i++) {
    for(let j = 0; j <= imagens.length; j++) {
      if(!itens[i]) break;
      if(itens[i].image === imagens[j]) {
        // itens[i].image = path.resolve(`src/processadas/${imagens[j]}`)
        // console.log(path.resolve(`public/processadas/${imagens[j]}`));
        let obj = {
          ...itens[i]
        }
        newProd.push(obj);
      }
      else {
        continue;
      }
    }
  }


  htmlP = await gerarHtml(newProd)

  // const html = await fs.readFileSync('../catalogo.html').toString();
      
  // const options = {
  //     type: 'pdf',
  //     format: 'A4',
  //     orientation: 'portrait'
  // }

  pdf.create(htmlP, {
    type: 'pdf',
    format: 'A4',
    orientation: 'portrait'
}).toBuffer((err, buffer) => {
      if(err) return res.status(500).json(err)
      res.end(buffer)               
  })
}

function criarPDF() {
  let doc = new pdfKit();
  // const stream = doc.pipe(blobStream());
  // Pipe its output somewhere, like to a file or HTTP response
  // See below for browser usage
  doc.pipe(fs.createWriteStream("src/output.pdf"));

  // Embed a font, set the font size, and render some text
  doc.fontSize(25).text("Some text with an embedded font!", 100, 100);

  // Add another page
  doc.addPage().fontSize(25).text("Here is some vector graphics...", 100, 100);

  // Draw a triangle
  doc.save().moveTo(100, 150).lineTo(100, 250).lineTo(200, 250).fill("#FF3300");

  // Apply some transforms and render an SVG path with the 'even-odd' fill rule
  doc
    .scale(0.6)
    .translate(470, -380)
    .path("M 250,75 L 323,301 131,161 369,161 177,301 z")
    .fill("red", "even-odd")
    .restore();

  // Add some text with annotations
  doc
    .addPage()
    .fillColor("blue")
    .text("Here is a link!", 100, 100)
    .underline(100, 100, 160, 27, { color: "#0000FF" })
    .link(100, 100, 160, 27, "http://google.com/");

  // Finalize PDF file
  doc.end();

  // var file = fs.createReadStream("../output.pdf");
  // var stat = fs.statSync("../");
  // res.setHeader("Content-Length", stat.size);
  // res.setHeader("Content-Type", "application/pdf");
  // res.setHeader("Content-Disposition", "attachment; filename=catalogo.pdf");
  // file.pipe(res);
}

async function criarPDFInfos(infos, nomeCliente) {
  let htmlP;
  let items = [infos];
  ejs.renderFile("src/infos.ejs", { items, nomeCliente }, (err, html) => {
    if (err) {
      console.log(err);
    }
    // fs.writeFile("./info.html", html, (err) => {
    //   if (err) console.log("erro");
    //   console.log("criado");
    // });
    htmlP = html;

    const options = {
      format: "A4",
      height: "10.5in",
      width: "13.8in",
      // border: {
      //   right: 8,
      // },
    };
    pdf
      .create(htmlP, options)
      .toFile("./src/catalogos/infos.pdf", (err, response) => {
        if (err) {
          return err;
        } else {
          return response;
        }
      });
  });
  console.log(htmlP);
}

async function gerarHtml(newProd) {
  let html = await ejs.renderFile("src/catalogo.ejs", { newProd });
  await fs.writeFileSync('catalogo.html', html);
  return html
}

async function returnBase64Image(caminha, nomeImage) {
  // ./public/processadas/${imagens[j]}
  let imageBuffer = await fs.readFileSync(`${caminha}/${nomeImage}`)
  let img64 = await `data:image/jpg;base64,${imageBuffer.toString('base64')}`
  return img64;
}

async function criarPDFHtml() {
  let htmlP;
  // let itens = require('./pordutos.json')

  let itens = await require('./pordutos.json')
  let imagens = await fs.readdirSync('./public/processadas')
  let newProd = []
  for(let i = 0; i <= itens.length; i++) {
    for(let j = 0; j <= imagens.length; j++) {
      if(!itens[i]) break;
      if(itens[i].image === imagens[j]) {
        // itens[i].image = path.resolve(`src/processadas/${imagens[j]}`)
        // console.log(path.resolve(`public/processadas/${imagens[j]}`));
        let imageBuffer = await fs.readFileSync(`./public/processadas/${imagens[j]}`)
        let img64 = `data:image/jpg;base64,${imageBuffer.toString('base64')}`
        itens[i].image = await img64
        let tamanhosOrdenados = itens[i].size.sort()
        console.log('======> linha 374 '+JSON.stringify(tamanhosOrdenados,null, 2)); process.exit();
        let obj = {
          ...itens[i]
        }
        newProd.push(obj);
      }
      else {
        continue;
      }
    }
  }


  htmlP = await gerarHtml(newProd)


  let options = {
    type: 'pdf',
    format: 'A4',
    orientation: 'portrait',
    timeout: '320000',
  };
  let file = { content: htmlP }
  // let resp = await html_to_pdf.generatePdf(file, options)
  // .then(pdfBuffer => {
  //   console.log("PDF Buffer:-", pdfBuffer);
  //   return pdfBuffer;
  // });

  pdf.create(htmlP, options).toFile("./src/catalogos/catalogo.pdf", (err, res) => {
    if (err) {
      return err;
    }
    return res
  });

  // const options2 = {
  //   type: 'pdf',
  //   format: 'A4',
  //   orientation: 'portrait'
  // }

  // pdf.create(htmlP, options2).toBuffer((err, buffer) => {
  //   if(err) throw err;
  //   return buffer
  // })
}

function revoveSujeita(descricao) {
  let regex = /(<([^>]+)>)/gi;
  let result = descricao.replace(regex, "");
  return result;
}

server.listen(3000, () => console.log("Server ON."));
