const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fs = require("fs");
const request = require("request");

function downloadMemories(url, date) {
  const parts = url.split("?");

  const baseURL = parts[0];

  const params = parts[1];
  const form = JSON.parse(
    '{"' +
      decodeURI(params)
        .replace(/"/g, '\\"')
        .replace(/&/g, '","')
        .replace(/=/g, '":"') +
      '"}'
  );

  const options = {
    uri: baseURL,
    method: "POST",
    headers: {},
    form: form,
  };

  request.post(options, function (err, res, success) {
    if (!success) {
      console.log(err);
      return;
    }
    var fetch = request(success);
    fetch.on("response", function (res) {
      const queryIndex = success.indexOf("?");
      const slashIndex = success.lastIndexOf("/", queryIndex);
      const name = success.substring(slashIndex, queryIndex);
      const file = fs.createWriteStream("./output/" + name);
      const stream = res.pipe(file);
      stream.on("finish", () =>
        fs.utimes("./output/" + name, date, date, (err) => {
          if (err)
            console.log(err);
        })
      );
    });
  });
}

const domProm = JSDOM.fromFile("memories_history.html", {
  resources: "usable",
  runScripts: "dangerously",
});
domProm.then((dom) => {
  const tags = dom.window.document.getElementsByTagName("tr");

  const tableRows = [];
  for (let i = 0; i < tags.length; i++) {
    const row = tags[i];
    if (row.getElementsByTagName("a").length > 0)
        tableRows.push(row);
  }

  const memories = [];
  tableRows.forEach((row) => {
    const cols = row.getElementsByTagName("td");

    // as much as I'd love to use a const and .reduce here, this isn't an array
    let date = new Date();
    for (let i = 0; i < cols.length; i++) { 
      const col = cols[i];
      if (col.innerHTML.indexOf("UTC") >= 0)
        date = new Date(col.innerHTML);
    }

    const links = row.getElementsByTagName("a");
    const url = links[0].href;

    memories.push({ url, date });
  });

  for (let i = 0; i < memories.length; i++) {
    const memory = memories[i];
    const url = memory.url
      .replace("javascript:downloadMemories('", "")
      .replace("');", "");
    
    setTimeout(() => downloadMemories(url, memory.date), i * 10);
  }
});
