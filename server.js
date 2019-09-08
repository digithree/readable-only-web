'use strict';

// endpoint parameter options:
//    imgs= 1 for On, -1 for off
//    embeds= 1 for On, -1 for off
//    iframes= 1 for On, -1 for off
//    othertags= 1 for On, -1 for off
//    q= search term or URL
var REAL_SERVICE_HOST_ADDR = 'localhost:5000' //default

// use Duck Duck Go with options (kd=-1) redirect off, (k1=-1) ads off, (ko=-2) header totally off,
//    (kp=-2) Safe search off, (kz=-1) instant answers off, (kc=-1) auto-load images off,
//    (kav=-1) auto-load results off, (kaf=1) full URLS, (kac=-1) auto-suggest off,
//    (kam) OpenStreetMap for directions
const SEARCH_API_ADDR = 'https://duckduckgo.com/html/?kd=-1&k1=-1&ko=-2&kp=-2&kz=-1&kc=-1&kav=-1&kaf=1&kac=-1&kam=osm&q='

const DDG_SEARCH_ADDR = 'https://duckduckgo.com/html/?q='
const GOOGLE_SEARCH_ADDR = 'https://google.com/search?q='

const TITLE_APPEND_SIG = ' [via ROW]'

const TAGS_WHITELIST = [
  'html', 'head', 'body', 'title', 'link', 'div', 'article', 'section', 'meta', 'main', 'header',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'a', 'span', 'br', 'nobr', 'hr',
  'b', 'i', 'u', 'strike', 'sup', 'sub', 'small', 'tt', 'pre', 'blockquote', 'em', 'del', 'code', 'strong',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'table', 'tr', 'th', 'td', 'caption',
  'form', 'input', 'button'
]

const HTML_SEARCH_BAR = `
    <h4>Search</h4>
    <form method="get" action="/search">
      <input type="text" name="q" size="40">
      <button type="submit">Search</button>
    </form>
    `

const HTML_URL_BAR = `
    <h4>Go to URL</h4>
    <form method="get" action="/url">
      <input type="text" name="q" size="40">
      <button type="submit">Go</button>
    </form>
    `

const PAGE_LINK_HEADER_ANY = [
  '/main.css'
]

const PAGE_LINK_HEADER_MAIN = [
  '/main.css',
  {
    'href': 'opensearch.xml',
    props: [
      'rel="search"',
      'type="application/opensearchdescription+xml"',
      'title="ROW Search"'
    ]
  }
]

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const nodeUrl = require('url')
const JSDOM = require('jsdom').JSDOM
const createDOMPurify = require('dompurify')
const htmlBuilder = require('node-html-builder')
const Readability = require('moz-readability-node').Readability
const S = require('string')
const cheerio = require('cheerio')
const showdown = require('showdown')
const fs = require("fs")

var app = express()
app.set('port', process.env.PORT || 5000)
app.use(express.static(__dirname + '/public'))
app.use(bodyParser.json())


app.get('/', function (req, res) {
  updateServiceHostname(req)
  if (req.query.q !== undefined && req.query.q != null) {
    // treat as search request if has query param, redirect
    doSearch(req.query.q, res, getOptionsFromQueryObj(req.query))
    return
  }
  fs.readFile('./README.md', 'utf8', function (err, data) {
    if (err) {
      htmlResult(constructSearchlErrorPage('Couldnt read index file'), res)
      return
    }
    var converter = new showdown.Converter();
    converter.setOption('noHeaderId', 'true');
    var html = htmlBuilder({
      title: 'Readble Only Web',
      favicon: '/icon/favicon-16x16.png',
      links: PAGE_LINK_HEADER_MAIN,
      content: HTML_SEARCH_BAR + HTML_URL_BAR + '<hr/>' + converter.makeHtml(data)
    })
    res.send(html);
  })
})

app.get('/search', function (req, res) {
  updateServiceHostname(req)
  if (!req.query.q) {
    htmlResult(constructSearchlErrorPage('NONE GIVEN, invalid search term'), res)
    return
  }
  var options = getOptionsFromQueryObj(req.query)
  var searchTerm = req.query.q
  doSearch(searchTerm, res, options)
})

function doSearch(searchTerm, res, options) {
  if (searchTerm.startsWith('!')) {
    let parts = searchTerm.split(' ')
    if (parts.length > 1) {
      if (parts[0].localeCompare('!ddg') === 0) {
        res.redirect(DDG_SEARCH_ADDR + encodeURI(searchTerm.substring(parts[0].length + 1)))
        return
      } else if (parts[0].localeCompare('!google') === 0) {
        res.redirect(GOOGLE_SEARCH_ADDR + encodeURI(searchTerm.substring(parts[0].length + 1)))
        return
      } else if (parts[0].localeCompare('!url') === 0) {
        res.redirect('/url?q=' + encodeURI(searchTerm.substring(parts[0].length + 1)))
        return
      }
    }
  }
  var url = SEARCH_API_ADDR + encodeURI(searchTerm)
  request.get({
    url: url,
    headers: {'User-Agent': 'request'}
  }, (err, res2, data) => {
    if (err) {
      htmlResult(constructSearchlErrorPage(searchTerm), res)
      return
    }
    // apply DOMPurify to clean HTML before constructing virtual DOM to articlize
    const window = (new JSDOM('')).window;
    const DOMPurify = createDOMPurify(window);
    let cleanHtmlText = DOMPurify.sanitize(data);

    // fix DDG issues
    const $ = cheerio.load(cleanHtmlText)
    $('div.zci-wrapper').remove() // fix for zero click results getting through for DDG search, remove via known div and class
    $('div.msg').remove()
    $('div.msg--spelling').remove() // fix misspelling / did you mean UI obstructing articlization of search results page
    var preProcessHtml = $.html()

    // process DOM and articlize
    var dom = new JSDOM(preProcessHtml, {url: url});
    let reader = new Readability(dom.window.document);
    let article = reader.parse();

    // construct HTML to return to browser
    let htmlText = constructSearchPage(searchTerm, article, url)
    htmlResult(processCleanHtmlOptions(htmlText, url, options), res)
  })
}

app.get('/url', function (req, res) {
  updateServiceHostname(req)
  if (!req.query.q) {
    htmlResult(constructUrlErrorPage("NONE GIVEN, invalid query"), res)
    return
  }
  var options = getOptionsFromQueryObj(req.query)
  if (req.query.noclean) {
    clean = false
  }
  var url = req.query.q
  processUrl(url, res, options)
})

function processUrl(url, res, options) {
  var uri = nodeUrl.parse(url)
  switch (uri.hostname) {
    // TODO : add exceptional cases based on hostname for click through to article, or additional fetch required, etc.
    default:
      processUrlDefault(url, res, options)
  }
}

function processUrlDefault(url, res, options) {
  request.get({
    url: url,
    headers: {'User-Agent': 'request'}
  }, (err, res2, data) => {
    if (err) {
      htmlResult(constructUrlErrorPage(url), res)
      return
    }
    // apply DOMPurify to clean HTML before constructing virtual DOM to articlize
    const window = (new JSDOM('')).window;
    const DOMPurify = createDOMPurify(window);
    let cleanHtmlText = DOMPurify.sanitize(data);

    // process DOM and articlize
    var dom = new JSDOM(cleanHtmlText, {url: url});
    let reader = new Readability(dom.window.document);
    let article = reader.parse();
    
    // construct HTML to return to browser
    let htmlText = constructArticlePage(article, url)
    htmlResult(processCleanHtmlOptions(htmlText, url, options), res)
  })
}

function constructSearchPage(searchTerm, article, url) {
  if (article === undefined || article == null) {
    return constructUrlErrorPage(url)
  }
  var title = ''
  if (article.title !== undefined &&
      article.title != null &&
      article.title != '') {
    title = article.title + TITLE_APPEND_SIG
  } else {
    title = 'Search results for "' + searchTerm + '"' + TITLE_APPEND_SIG
  }
  var updatedContentHtml = S(article.content)
      .replaceAll(
        'href="http',
        'href="' + REAL_SERVICE_HOST_ADDR + '/url?q=http'
      ).toString()
  return htmlBuilder({
    title: title,
    links: PAGE_LINK_HEADER_ANY,
    content: HTML_SEARCH_BAR + '<hr/><h1>' + title + '</h1>' + updatedContentHtml
  })
}

function constructArticlePage(article, url) {
  if (article === undefined || article == null) {
    return constructUrlErrorPage(url)
  }
  var title = article.title + TITLE_APPEND_SIG
  var updatedContentHtml = S(article.content)
      .replaceAll(
        'href="http',
        'href="' + REAL_SERVICE_HOST_ADDR + '/url?q=http'
      ).toString()
  return htmlBuilder({
    title: title,
    links: PAGE_LINK_HEADER_ANY,
    content: '<h1>' + title + '</h1>' + updatedContentHtml
  })
}

function constructUrlErrorPage(url) {
  return htmlBuilder({
    title: 'Error accessing URL' + TITLE_APPEND_SIG,
    favicon: '/icon/favicon-16x16.png',
    links: PAGE_LINK_HEADER_ANY,
    content: '<h2>Error accessing URL</h2>' +
        '<p>Could not extract article format for URL: ' + url
  })
}

function constructSearchlErrorPage(searchTerm) {
  return htmlBuilder({
    title: 'Error performing search' + TITLE_APPEND_SIG,
    favicon: '/icon/favicon-16x16.png',
    links: PAGE_LINK_HEADER_ANY,
    content: '<h2>Error performing search</h2>' +
        '<p>Could not perform search for term: ' + searchTerm
  })
}

function htmlResult(htmlText, res) {
  res.set('Content-Type', 'text/html')
  res.send(htmlText)
}

function processCleanHtmlOptions(htmlText, url, options) {
  const $ = cheerio.load(htmlText)
  // remove non-whitelisted tags
  var tagsToRemove = $('*')
      .get()
      .map(el => el.name)
      .filter(el => !TAGS_WHITELIST.includes(el))
      .filter(tag => {
        if (!options.imgs && tag.localeCompare('img') === 0) {
          return true
        }
        if (!options.embeds && tag.localeCompare('embed') === 0) {
          return true
        }
        if (!options.iframes && tag.localeCompare('iframe') === 0) {
          return true
        }
        if (!options.othertags &&
            tag.localeCompare('img') !== 0 &&
            tag.localeCompare('embed') !== 0 &&
            tag.localeCompare('iframe') !== 0) {
          return true
        }
        return false
      })
  for (let idx in tagsToRemove) {
    $(tagsToRemove[idx])
        .remove()
  }
  $('body')
      .append(createStandardFooter(url, options))
  return $.html()
}

function createStandardFooter(url, options) {
  var encodedUrl = encodeURIComponent(url)
  let footerHtml = '<hr/><p>Viewing: '
  if (options.imgs) {
    footerHtml += '<a href="' + constructInternalUrl('url', encodedUrl, options, {imgs: false}) + '">[x]</a> with images'
  } else {
    footerHtml += '<a href="' + constructInternalUrl('url', encodedUrl, options, {imgs: true}) + '">[ ]</a> with images'
  }
  if (options.embeds) {
    footerHtml += ' | <a href="' + constructInternalUrl('url', encodedUrl, options, {embeds: false}) + '">[x]</a> with embeds'
  } else {
    footerHtml += ' | <a href="' + constructInternalUrl('url', encodedUrl, options, {embeds: true}) + '">[ ]</a> with embeds'
  }
  if (options.iframes) {
    footerHtml += ' | <a href="' + constructInternalUrl('url', encodedUrl, options, {iframes: false}) + '">[x]</a> with iframes'
  } else {
    footerHtml += ' | <a href="' + constructInternalUrl('url', encodedUrl, options, {iframes: true}) + '">[ ]</a> with iframes'
  }
  if (options.othertags) {
    footerHtml += ' | <a href="' + constructInternalUrl('url', encodedUrl, options, {othertags: false}) + '">[x]</a> with other blacklisted tags'
  } else {
    footerHtml += ' | <a href="' + constructInternalUrl('url', encodedUrl, options, {othertags: true}) + '">[ ]</a> with other blacklisted tags'
  }
  footerHtml += '</p><p>Actions: <a href="' + constructInternalUrl('url', encodedUrl, {imgs: true, embeds: true, iframes: true, othertags: true}) +
      '">Allow all</a> | <a href="https://github.com/digithree/readable-only-web/issues/new">Report issue</a>' +
      ' | <a href="' + url + '">Exit ROW</a> (redirect to original content)'
  return footerHtml
}

function constructInternalUrl(endpoint, query, options, overrideOptions) {
  let internalUrl = REAL_SERVICE_HOST_ADDR + '/' + endpoint + '?'
  let addedAtLeastOne = false
  Object.keys(options).forEach(function(key, index) {
    let value = options[key]    
    if (overrideOptions !== undefined &&
        overrideOptions != null &&
        Object.prototype.hasOwnProperty.call(overrideOptions, key)) {
      value = overrideOptions[key]
    }
    if (addedAtLeastOne) {
      internalUrl += '&'
    }
    internalUrl += key + '=' + (value ? '1' : '-1')
    addedAtLeastOne = true
  });
  if (addedAtLeastOne) {
    internalUrl += '&'
  }
  internalUrl += 'q=' + query
  return internalUrl
}

function getOptionsFromQueryObj(queryParams) {
  let options = {
    imgs: false,
    embeds: false,
    iframes: false,
    othertags: false
  }
  if (queryParams === undefined || queryParams == null) {
    return options
  }
  Object.keys(options).forEach(function(key, index) {
    if (Object.prototype.hasOwnProperty.call(queryParams, key)) {
      options[key] = queryParams[key] == 1
    }
  })
  return options
}

function updateServiceHostname(req) {
  // note, explicit protocol use is not required here, just use // and let browser figure it out
  REAL_SERVICE_HOST_ADDR = '//' + req.get('host')
}

// Start server
app.listen(app.get('port'), function () {
  console.log('Node app is running on port', app.get('port'));
});

module.exports = app;
