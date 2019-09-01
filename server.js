'use strict';

// TODO : change this to server address
const REAL_SERVICE_HOST_ADDR = 'http://row.fr.openode.io'
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
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());


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
  var title = article.title + ' [ROW]'
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
    title: 'Error accessing URL [ROW]',
    content: '<h2>Error accessing URL [ROW]</h2>' +
        '<p>Could not extract article format for URL: ' + url
  })
}

function constructSearchlErrorPage(searchTerm) {
  return htmlBuilder({
    title: 'Error performing search [ROW]',
    content: '<h2>Error performing search [ROW]</h2>' +
        '<p>Could not perform search for term: ' + searchTerm
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
