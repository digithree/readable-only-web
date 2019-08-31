'use strict';

// TODO : change this to server address
const REAL_SERVICE_HOST_ADDR = 'http://row-alone.fr.openode.io'
// use Duck Duck Go with options (kd) redirect off, (k1) ads off, (ko) header totally off, (kam) OpenStreetMap for directions
const SEARCH_API_ADDR = 'https://duckduckgo.com/html/?kd=-1&k1=-1&ko=-2&kam=osm&q='

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const nodeUrl = require('url')
const JSDOM = require('jsdom').JSDOM
const createDOMPurify = require('dompurify')
const htmlBuilder = require('node-html-builder')
const Readability = require('moz-readability-node').Readability
const S = require('string')

var app = express();
app.set('port', process.env.PORT || 5000);
//app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());


app.get('/', function (req, res) {
  htmlResult(constructHomePage(), res)
})

app.get('/search', function (req, res) {
  if (!req.query.q) {
    htmlResult(constructSearchlErrorPage('NONE GIVEN, invalid search term'), res)
    return
  }
  // TODO : add actual query here
  //htmlResult(constructSearchlErrorPage('PLACEHOLDER, search is not yet implemented'), res)
  var searchTerm = req.query.q
  var url = SEARCH_API_ADDR + encodeURI(searchTerm)
  request.get({
    url: url,
    headers: {'User-Agent': 'request'}
  }, (err, res2, data) => {
    if (err) {
      htmlResult(constructSearchlErrorPage(searchTerm), res)
      return
    }
    // TODO : add in DOMPurify usage!
    /*
    var dirtyDom = new JSDOM(data, {url: url});
    var DOMPurify = createDOMPurify(dirtyDom.window);
    let cleanHtmlText = DOMPurify.sanitize(dirtyDom);
    console.log('cleanHtmlText:')
    var output = '';
    for (var property in cleanHtmlText) {
      output += property + ': ' + cleanHtmlText[property]+'; ';
    }
    console.log(output);
    //console.log(JSON.stringify(cleanHtmlText, null, 4))
    var cleanDom = new JSDOM(cleanHtmlText, {url: url});
    let reader = new Readability(cleanDom.window.document);
    */
    var dom = new JSDOM(data, {url: url});
    let reader = new Readability(dom.window.document);
    let article = reader.parse();
    htmlResult(constructArticlePage(article, url), res)
  })
})

app.get('/url', function (req, res) {
  if (!req.query.q) {
    htmlResult(constructUrlErrorPage("NONE GIVEN, invalid query"), res)
    return
  }
  var url = req.query.q
  var uri = nodeUrl.parse(req.query.q)
  switch (uri.hostname) {
    // TODO : add exceptional cases based on hostname for click through to article, or additional fetch required, etc.
    default:
      processUrlDefault(url, res)
  }
})

function processUrlDefault(url, res) {
  request.get({
    url: url,
    headers: {'User-Agent': 'request'}
  }, (err, res2, data) => {
    if (err) {
      htmlResult(constructUrlErrorPage(url), res)
      return
    }
    // TODO : add in DOMPurify usage!
    /*
    var dirtyDom = new JSDOM(data, {url: url});
    var DOMPurify = createDOMPurify(dirtyDom.window);
    let cleanHtmlText = DOMPurify.sanitize(dirtyDom);
    console.log('cleanHtmlText:')
    var output = '';
    for (var property in cleanHtmlText) {
      output += property + ': ' + cleanHtmlText[property]+'; ';
    }
    console.log(output);
    //console.log(JSON.stringify(cleanHtmlText, null, 4))
    var cleanDom = new JSDOM(cleanHtmlText, {url: url});
    let reader = new Readability(cleanDom.window.document);
    */
    var dom = new JSDOM(data, {url: url});
    let reader = new Readability(dom.window.document);
    let article = reader.parse();
    htmlResult(constructArticlePage(article, url), res)
  })
}

function constructArticlePage(article, url) {
  if (article === undefined || article == null) {
    return constructUrlErrorPage(url)
  }
  var title = article.title + ' [ROW Alone]'
  var updatedContentHtml = S(article.content)
      .replaceAll(
        'href="http',
        'href="' + REAL_SERVICE_HOST_ADDR + '/url?q=http'
      ).toString()
  return htmlBuilder({
    title: title,
    content: '<h1>' + title + '</h1>' + updatedContentHtml
  })
}

function constructUrlErrorPage(url) {
  return htmlBuilder({
    title: 'Error accessing URL [ROW Alone]',
    content: '<h2>Error accessing URL [ROW Alone]</h2>' +
        '<p>Could not extract article format for URL: ' + url
  })
}

function constructSearchlErrorPage(searchTerm) {
  return htmlBuilder({
    title: 'Error performing search [ROW Alone]',
    content: '<h2>Error performing search [ROW Alone]</h2>' +
        '<p>Could not perform search for term: ' + searchTerm
  })
}

function constructHomePage() {
  return htmlBuilder({
    title: 'Getting Started [ROW Alone]',
    content: '<h2>Getting Started [ROW Alone]</h2>' +
        '<p>Readable filter for the web. Put distance between your hardware and trackers.</p>' +
        '<h3>ROW Alone = Readable Only Web Alone</h3>' +
        '<blockquote><i>Row, row, row your browser' +
        '<br>Gently up the stream.' +
        '<br>Merrily, merrily merrily, merrily,' +
        '<br>Now your page is clean.</i></blockquote>' +
        '<p>This service applies Mozillas "Readability" standalone code (along with other processors) to attempt to extract ' +
        'article text from any give web resource. Will only work for standard articles without access-walls in the current version.</p>' +
        '<h2>Usage</h2>' +
        '<p>Add your website in the query parameter "q" for our URL and "url" endpoint, e.g. ' + REAL_SERVICE_HOST_ADDR + '/url?q=http://website.com/some-article' + '</p>' +
        '<h3>Notes</h3>' +
        '<ol><li><p>Will show images, which might have tracking built in. Optional removal (with click to reveal) coming in future version.</p></li>' +
        '<li><p>All links will also route through this service, giving you seemless usage. However links may have referral codes, removal in future version.</p></li>' +
        '<li><p>Script injection is still possible, full cleaner coming in future version. Should be more or less okay for now.</p></li></ol>' +
        '<h2>Enjoy!</h2>' +
        '<p>Written by Simon Kenny to prove a point. You can get a lot out of just text. Enjoy the simple life yo.</p>'
  })
}

function htmlResult(htmlText, res) {
  res.set('Content-Type', 'text/html')
  res.send(htmlText)
}

// Start server
app.listen(app.get('port'), function () {
  console.log('Node app is running on port', app.get('port'));
});

module.exports = app;
