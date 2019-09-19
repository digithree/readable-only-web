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

const MAX_TITLE_LENGTH = 100
const TITLE_APPEND_SIG = ' [via ROW]'

// should force lowercase to comparing
const QUERY_PARAM_BLACKLIST_EXACT = [
  // Facebook
  'ad_id', 'adset_id', 'campaign_id', 'ad_name', 'adset_name', 'campaign_name', 'placement', 'site_source_name',
  // Hubspot
  '_hsenc', '_hsenc',
  // MailChimp
  'mc_cid', 'mc_eid',
  // Simple Reach
  'sr_share',
  // Vero
  'vero_conv', 'vero_id',
  // Misc and unknown but suggested by Neat URL
  '_openstat', '_trkparms', '77campaign', 'action_type_', 'adid', 'adserverid',
  'adserveroptimizerid', 'adtype', 'adurl', 'aff_platform', 'aff_trace_key',
  'campaignid', 'clickid', 'clkulrenc', 'fb_', 'fbclid', 'feeditemid', 'first_visit', 'forward',
  'fromemail', 'gclid', 'goaltype', 'gws_rd', 'impressionguid', 'mailid', 'midtoken',
  'nr_email_referer', 'ncid', 'origin', 'piggiebackcookie', 'pk_campaign', 'pk_kwd',
  'pubclick', 'pubid', 'recipientid', 'refsrc', 'ref', 'siteid', 'spjobid', 'spmailingid', 'spreportid', 'spuserid',
  'terminal_id', 'trackid', 'tracking', 'transabtest', 'trk', 'trkemail', 'ws_ab_test', 'yclid'
]

// apply wildcard to end of these query params
const QUERY_PARAM_BLACKLIST_WILDCARD = [
  // Google
  'utm_',
  // Markto
  'mkt_',
  // Misc and unknown but suggested by Neat URL
  'action_object_', 'action_ref_', 'adset_', 'affiliate', 'campaign_', 'ga_', 'gs_', 'loc_', 'pd_rd_', 'pf_rd_', 'tt_'
]


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
  '/css/main.css'
]

const PAGE_LINK_HEADER_MAIN = [
  '/css/main.css',
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
//const Base64 = require("./base64.js").Base64
const UrlCompress = require("./url-compress.js").UrlCompress

var app = express()
app.set('port', process.env.PORT || 5000)
app.use(express.static(__dirname + '/public'))
app.use(bodyParser.json())


// --- endpoints

app.get('/', function (req, res) {
  updateServiceHostname(req)
  if (req.query.q !== undefined && req.query.q != null) {
    // treat as search request if has query param, redirect
    doSearch(req.query.q, res, getOptionsFromQueryObj(req.query))
    return
  }
  // else show homepage
  var html = htmlBuilder({
    title: 'Readble Only Web',
    favicon: '/icon/favicon-16x16.png',
    links: PAGE_LINK_HEADER_MAIN,
    content: wrapHtmlContentForStyling('<h1>ROW: Readble Only Web</h1><br/>' + HTML_SEARCH_BAR + HTML_URL_BAR +
        '<br/><br/><hr/><p><a href="/md/README">About this service</a> | ' +
        '<a href="https://github.com/digithree/readable-only-web">Project on GitHub</a></p>')
  })
  res.send(html)
})

app.get('/md/*', function (req, res) {
  updateServiceHostname(req)
  try {
    var parts = req.path.split('/')
    if (parts !== undefined &&
        parts != null &&
        parts.length > 0) {
      var mdFileName = parts[parts.length - 1]
      fs.readFile('./' + mdFileName + '.md', 'utf8', function (err, data) {
        if (err) {
          htmlResult(constructUrlErrorPage('No markdown resource available at ' + mdFileName), res)
          return
        }
        var converter = new showdown.Converter();
        converter.setOption('noHeaderId', 'true');
        var html = htmlBuilder({
          title: 'ROW: ' + mdFileName,
          favicon: '/icon/favicon-16x16.png',
          links: PAGE_LINK_HEADER_ANY,
          content: wrapHtmlContentForStyling(converter.makeHtml(data))
        })
        res.send(html);
      })
    }
  } catch (err) {
    htmlResult(constructUrlErrorPage('Error accessing resource'), res)
  }
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

app.get('/url', function (req, res) {
  updateServiceHostname(req)
  if (!req.query.q) {
    htmlResult(constructUrlErrorPage("NONE GIVEN, invalid query"), res)
    return
  }
  var options = getOptionsFromQueryObj(req.query)
  var url = req.query.q
  processUrl(url, res, options)
})

app.get('/c/:permlink', function (req, res) {
  updateServiceHostname(req)
  if (!req.params.permlink) {
    htmlResult(constructUrlErrorPage("No compressed permlink given, invalid query"), res)
    return
  }
  // TODO : should options also be compressed?
  var options = getOptionsFromQueryObj(req.query)
  try {
    var url = decodeUrl(req.params.permlink)
    processUrl(url, res, options)
  } catch (e) {
    console.error(e)
    htmlResult(constructUrlErrorPage("Error processing permlink, invalid query"), res)
  }
})


// --- main functions

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

function processUrl(url, res, options) {
  var uri = nodeUrl.parse(url)
  // remove any blacklisted params
  var toRemove = []
  var searchParams = new URLSearchParams(uri.search)
  searchParams.forEach((value, name, searchParams) => {
    if (QUERY_PARAM_BLACKLIST_EXACT.includes(name)) {
      toRemove.push(name)
    }
    for (var wildcardParam in QUERY_PARAM_BLACKLIST_WILDCARD) {
      if (name.startsWith(QUERY_PARAM_BLACKLIST_WILDCARD[wildcardParam])) {
        toRemove.push(name)
        break
      }
    }
  })
  for (var param in toRemove) {
    searchParams.delete(toRemove[param])
  }
  var searchParamsStr = ''
  if (searchParams.toString().length > 0) {
    searchParamsStr = '?' + searchParams.toString()
  }
  uri = nodeUrl.parse(S(url).replaceAll(uri.search, searchParamsStr).toString())
  // condition on hostname to apply any specific adapter before processing content
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
  var htmlText = S(article.content)
      .replaceAll(
        'href="http',
        'href="' + REAL_SERVICE_HOST_ADDR + '/url?q=http'
      ).toString()
  htmlText = HTML_SEARCH_BAR + '<hr/>' + wrapHtmlContentForStyling('<h1>' + title + '</h1>' + htmlText)
  return htmlBuilder({
    title: title,
    links: PAGE_LINK_HEADER_ANY,
    content: htmlText
  })
}

function constructArticlePage(article, url) {
  if (article === undefined || article == null) {
    return constructUrlErrorPage(url)
  }
  var title = ''
  if (article.title !== undefined &&
      article.title != null &&
      article.title != '') {
    title = article.title
  } else if (article.excerpt !== undefined &&
      article.excerpt != null &&
      article.excerpt != '') {
    title = article.excerpt
  } else {
    const $ = cheerio.load(article.content)
    if ($('h1').get().length > 0) {
      title = $('h1').text()
    } else if ($('p').get().length > 0) {
      title = $('p').text()
    } else {
      // fall back in worst case to use URL
      title = 'Page at ' + url
    }
  }
  if (title.length > MAX_TITLE_LENGTH) {
    title = title.substring(0, MAX_TITLE_LENGTH) + '…'
  }
  title = title + TITLE_APPEND_SIG

  var author = null
  if (article.byline !== undefined &&
      article.byline != null &&
      article.byline != '') {
    author = article.byline
  }

  var htmlText = S(article.content)
      .replaceAll(
        'href="http',
        'href="' + REAL_SERVICE_HOST_ADDR + '/url?q=http'
      ).toString()
  htmlText = '<h1>' + title + '</h1><p class="light"><i>' + decodeURIComponent(url) + '</i></p>' + 
    (author != null ? ('<p class="light"><i> Attibution: ' + author + '</i></p>') : '') +
    htmlText
  return htmlBuilder({
    title: title,
    links: PAGE_LINK_HEADER_ANY,
    content: wrapHtmlContentForStyling(htmlText)
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
  footerHtml += '</p><p>Actions: <a href="/">Home</a> | <a href="' + constructInternalUrl('url', encodedUrl, {imgs: true, embeds: true, iframes: true, othertags: true}) +
      '">Allow all</a> | <a href="https://github.com/digithree/readable-only-web/issues/new">Report issue</a>' +
      ' | Switch to <a href="' + constructCompressedUrl(url, options) + '">compressed link</a>' +
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

function constructCompressedUrl(url, options) {
  let internalUrl = REAL_SERVICE_HOST_ADDR + '/c/' + encodeUrl(url)
  // TODO : add options
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

function wrapHtmlContentForStyling(htmlText) {
  return '<div class="row-content">' + htmlText + '</div>'
}

function decodeUrl(encodedUrl) {
  return UrlCompress.decode(encodedUrl)
}

function encodeUrl(url) {
  return UrlCompress.encode(decodeURIComponent(url))
}

// Start server
app.listen(app.get('port'), function () {
  console.log('Node app is running on port', app.get('port'));
});

module.exports = app;
