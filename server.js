'use strict';

// endpoint parameter options:
//    imgs= 1 for remote images on, 2 for base64 in-line encoded images, -1 for off
//    embeds= 1 for On, -1 for off
//    iframes= 1 for On, -1 for off
//    othertags= 1 for On, -1 for off
//    theme= 1 for light (default), 2 for dark, otherwise ignored and default used
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

const IMG_MAX_NUM = 1
// three  kinds of limits:
// 1. min dims per image, in combined w*h
// 2. max dims per image, in combined w*h
// 3. max base64 string encoded size per image in String.length
const IMG_INLINE_DIM_MIN = 200 * 200
const IMG_INLINE_DIM_MAX = 800 * 800
const IMG_INLINE_BASE64_STR_LEN_MAX = 50000

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
      %s
      <input type="text" name="q" size="40">
      <button type="submit">Search</button>
    </form>
    `

const HTML_URL_BAR = `
    <h4>Go to URL</h4>
    <form method="get" action="/url">
      %s
      <input type="text" name="q" size="40">
      <button type="submit">Go</button>
    </form>
    `

const PAGE_LINK_CSS_FORMAT = '/css/%s.css'

const PAGE_LINK_HEADER_ANY = [
  // nothing additional, css added in code
]

const PAGE_LINK_HEADER_MAIN = [
  {
    'href': '/opensearch.xml',
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
var base64Image = require('node-base64-image')
const wait = require('wait.for')
var probeImageSize = require('probe-image-size')
const moment = require('moment')
const searchEngine = require('search-engine-nodejs').default

const metascraper = require('metascraper')([
  require('metascraper-author')(),
  require('metascraper-date')(),
  //require('metascraper-description')(),
  //require('metascraper-image')(),
  //require('metascraper-logo')(),
  //require('metascraper-clearbit')(),
  require('metascraper-publisher')(),
  require('metascraper-title')()
  //require('metascraper-url')()
])

var app = express()
app.set('port', process.env.PORT || 5000)
app.use(express.static(__dirname + '/public'))
app.use(bodyParser.json())


// --- endpoints

app.get('/', function (req, res) {
  updateServiceHostname(req)
  var options = getOptionsFromQueryObj(req.query)
  if (req.query.q !== undefined && req.query.q != null) {
    // treat as search request if has query param, redirect
    doSearch(req.query.q, res, options)
    return
  }
  // else show homepage
  var html = htmlBuilder({
    title: 'Readble Only Web',
    favicon: '/icon/favicon-16x16.png',
    links: createHeaderLink(options, PAGE_LINK_HEADER_MAIN),
    content: wrapHtmlContentForStyling('<h1>ROW: Readble Only Web</h1><br/>' + createSearchBar(options) + createUrlBar(options) +
        '<br/><br/><hr/><p><a href="/md/README">About this service</a> | ' +
        '<a href="https://github.com/digithree/readable-only-web">Project on GitHub</a></p>')
  })
  res.send(html)
})

app.get('/md/*', function (req, res) {
  updateServiceHostname(req)
  var options = getOptionsFromQueryObj(req.query)
  try {
    var parts = req.path.split('/')
    if (parts !== undefined &&
        parts != null &&
        parts.length > 0) {
      var mdFileName = parts[parts.length - 1]
      fs.readFile('./' + mdFileName + '.md', 'utf8', function (err, data) {
        if (err) {
          htmlResult(constructUrlErrorPage('No markdown resource available at ' + mdFileName, options), res)
          return
        }
        var converter = new showdown.Converter();
        converter.setOption('noHeaderId', 'true');
        var html = htmlBuilder({
          title: 'ROW: ' + mdFileName,
          favicon: '/icon/favicon-16x16.png',
          links: createHeaderLink(options, PAGE_LINK_HEADER_ANY),
          content: wrapHtmlContentForStyling(converter.makeHtml(data))
        })
        res.send(html);
      })
    }
  } catch (err) {
    htmlResult(constructUrlErrorPage('Error accessing resource', options), res)
  }
})

app.get('/search', function (req, res) {
  updateServiceHostname(req)
  var options = getOptionsFromQueryObj(req.query)
  if (!req.query.q) {
    htmlResult(constructSearchErrorPage('NONE GIVEN, invalid search term', options), res)
    return
  }
  var searchTerm = req.query.q
  doSearch(searchTerm, res, options)
})

app.get('/url', function (req, res) {
  updateServiceHostname(req)
  var options = getOptionsFromQueryObj(req.query)
  if (!req.query.q) {
    htmlResult(constructUrlErrorPage('NONE GIVEN, invalid query', options), res)
    return
  }
  var url = req.query.q
  processUrl(url, res, options)
})

app.get('/c/:permlink', function (req, res) {
  updateServiceHostname(req)
  // TODO : should options also be compressed?
  var options = getOptionsFromQueryObj(req.query)
  if (!req.params.permlink) {
    htmlResult(constructUrlErrorPage('No compressed permlink given, invalid query', options), res)
    return
  }
  try {
    var url = decodeUrl(req.params.permlink)
    processUrl(url, res, options)
  } catch (e) {
    console.error(e)
    htmlResult(constructUrlErrorPage('Error processing permlink, invalid query', options), res)
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
  //searchDuckDuckGoDirectly(searchTerm, res, options)
  searchVariousDirectly(searchTerm, res, options)
}

function searchDuckDuckGoDirectly(searchTerm, res, options) {
  var url = SEARCH_API_ADDR + encodeURI(searchTerm)
  request.get({
    url: url,
    headers: {'User-Agent': 'request'}
  }, (err, res2, data) => {
    if (err) {
      htmlResult(constructSearchErrorPage(searchTerm, options), res)
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
    let htmlText = constructSearchPage(searchTerm, article, url, options)
    processCleanHtmlOptions(htmlText, url, options, function(htmlRes) {
      htmlResult(htmlRes, res)
    })
  })
}

function searchVariousDirectly(searchTerm, res, options) {
  const searchOptions = {
    qs: {
        q: searchTerm
    }
  }
  searchEngine.Yahoo(searchOptions)
    .then(results => {
      let htmlText = buildSearchResultsPage(searchTerm, results, options)
      processCleanHtmlOptions(htmlText, SEARCH_API_ADDR + encodeURI(searchTerm), options, function(htmlRes) {
        htmlResult(htmlRes, res)
      })
    })
    .catch(err => {
      console.error(err)
      var html = constructUrlErrorPage(' Search for "' + searchTerm + '" could not be performed', options)
      processCleanHtmlOptions(html, SEARCH_API_ADDR + encodeURI(searchTerm), options, function(htmlRes) {
        htmlResult(htmlRes, res)
      })
    })
}

function buildSearchResultsPage(searchTerm, results, options) {
  if (results === undefined || results == null || results.length == 0) {
    return constructUrlErrorPage(url + ' (article is undefined for search)', options)
  }
  var html = '<html>\n\t<body>'
  for (var key in results) {
    var replaceLinkPart = REAL_SERVICE_HOST_ADDR + '/url?'
    var replaceLinkParams = constructQueryParamsForOptions(options)
    if (replaceLinkParams.length > 0) {
      replaceLinkPart += replaceLinkParams + '&q='
    } else {
      replaceLinkPart += 'q='
    }
    html += '\t<div>'
    html += '\t\t<h3><a href="' + replaceLinkPart + results[key].url + '">' + results[key].title + '</a></h3>'
    html += '\t\t<p><a href="' + results[key].url + '">' + results[key].url + '</a></p>'
    html += '\t\t<p>' + results[key].description + '</p>'
    html += '\t</div>'
  }
  html += '\t</body>\n</html>'
  html = createSearchBar(options) + '<hr/>' + wrapHtmlContentForStyling('<h1>Search results for "' + searchTerm + '"' + '</h1>' + html)
  return htmlBuilder({
    title: 'Search "' + searchTerm + '"',
    links: createHeaderLink(options, PAGE_LINK_HEADER_ANY),
    content: html
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
      htmlResult(constructUrlErrorPage(url + ' (GET error, ' + res2.err + ')', options), res)
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

    // get better metadata from Metascraper than we can get from Readability
    metascraper({ url: url, html: data })
      .then(metadata => {
        console.log(metadata)
        // construct HTML to return to browser
        let htmlText = constructArticlePage(article, metadata, url, options)
        processCleanHtmlOptions(htmlText, url, options, function(htmlRes) {
          htmlResult(htmlRes, res)
        })
      })
      .catch(err => {
        console.error(err)
        htmlResult(constructUrlErrorPage(url + ' (metascraper error, ' + err + ')', options), res)
      })
  })
}

function constructSearchPage(searchTerm, article, url, options) {
  if (article === undefined || article == null) {
    return constructUrlErrorPage(url + ' (article is undefined for search)', options)
  }
  var title = ''
  if (article.title !== undefined &&
      article.title != null &&
      article.title != '') {
    title = article.title + TITLE_APPEND_SIG
  } else {
    title = 'Search results for "' + searchTerm + '"' + TITLE_APPEND_SIG
  }
  var replaceLinkPart = 'href="' + REAL_SERVICE_HOST_ADDR + '/url?'
  var replaceLinkParams = constructQueryParamsForOptions(options)
  if (replaceLinkParams.length > 0) {
    replaceLinkPart += replaceLinkParams + '&q=http'
  } else {
    replaceLinkPart += 'q=http'
  }
  var htmlText = S(article.content)
      .replaceAll(
        'href="http',
        replaceLinkPart
      ).toString()
  htmlText = createSearchBar(options) + '<hr/>' + wrapHtmlContentForStyling('<h1>' + title + '</h1>' + htmlText)
  return htmlBuilder({
    title: title,
    links: createHeaderLink(options, PAGE_LINK_HEADER_ANY),
    content: htmlText
  })
}

function constructArticlePage(article, metadata, url, options) {
  if (article === undefined || article == null) {
    return constructUrlErrorPage(url + ' (article is undefined for readable view)', options)
  }
  var title = ''
  if (metadata !== undefined &&
      metadata != null &&
      metadata.title !== undefined &&
      metadata.title != null &&
      metadata.title != '') {
    title = metadata.title
  } else if (article.title !== undefined &&
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
  var publisher = null
  if (metadata !== undefined &&
      metadata != null) {
    if (metadata.author !== undefined &&
        metadata.author != null &&
        metadata.author != '') {
      author = '<strong>' + metadata.author + '</strong>'
      if (metadata.date !== undefined &&
          metadata.date != null &&
          metadata.date != '') {
        author += ' on ' + moment(metadata.date).format('MMMM Do YYYY')
      }
    }
    if (metadata.publisher !== undefined &&
        metadata.publisher != null &&
        metadata.publisher != '' &&
        metadata.publisher.localeCompare('Media Bias/Fact Check') != 0) {
      publisher = metadata.publisher
      if (author == null) {
        author = metadata.publisher
      }
    }
  }
  // fall back to Readability byline for attribution
  if (author == null &&
      article.byline !== undefined &&
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
    (author != null ? ('<p class="light"><i> Attibution:</i> ' + author + '</p>') : '') +
    (publisher != null ? ('<p class="light"><i>Search the Media Bias/Fact Check for <a href="' +
        constructInternalUrl('url', encodeURIComponent('https://mediabiasfactcheck.com/?s=' + encodeURIComponent(publisher)), options)
        + '">' + publisher + '</a></i></p>')
      : '') +
    htmlText
  return htmlBuilder({
    title: title,
    links: createHeaderLink(options, PAGE_LINK_HEADER_ANY),
    content: wrapHtmlContentForStyling(htmlText)
  })
}

function constructUrlErrorPage(url, options) {
  return htmlBuilder({
    title: 'Error accessing URL' + TITLE_APPEND_SIG,
    favicon: '/icon/favicon-16x16.png',
    links: createHeaderLink(options, PAGE_LINK_HEADER_ANY),
    content: '<h2>Error accessing URL</h2>' +
        '<p>Could not extract article format for URL: ' + url
  })
}

function constructSearchErrorPage(searchTerm, options) {
  return htmlBuilder({
    title: 'Error performing search' + TITLE_APPEND_SIG,
    favicon: '/icon/favicon-16x16.png',
    links: createHeaderLink(options, PAGE_LINK_HEADER_ANY),
    content: '<h2>Error performing search</h2>' +
        '<p>Could not perform search for term: ' + searchTerm
  })
}

function htmlResult(htmlText, res) {
  res.set('Content-Type', 'text/html')
  res.send(htmlText)
}

function processCleanHtmlOptions(htmlText, url, options, callback) {
  // start wait.for fiber, allows serial execution of callbacks
  // this is used for base64 image encode
  wait.launchFiber(function () {
    const $ = cheerio.load(htmlText)
    // remove non-whitelisted tags
    var tagsToRemove = $('*')
        .get()
        .map(el => el.name)
        .filter(el => !TAGS_WHITELIST.includes(el))
        .filter(tag => {
          if (options.imgs == -1 && tag.localeCompare('img') === 0) {
            return true
          }
          if (options.embeds == -1 && tag.localeCompare('embed') === 0) {
            return true
          }
          if (options.iframes == -1 && tag.localeCompare('iframe') === 0) {
            return true
          }
          if (options.othertags == -1 &&
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
    // if images enabled and remote images disabled, base64 encode images if possible
    if (options.imgs == 2) {
      var imgTags = $('img').get()
      var numImagesRendered = 0
      var removeAllRemaining = false
      for (var idx in imgTags) {
        var elem = imgTags[idx]
        if (removeAllRemaining) {
          $(elem).remove()
          continue
        }
        var imgSrc = ''
        try {
          imgSrc = $(elem).attr('src')
        } catch (err1) {
          console.error(err1)
          $(elem).remove()
          continue
        }
        // screen for query parameters, if exist then do not query, may be a tracking pixel
        if (imgSrc.indexOf('?') >= 0) {
          $(elem).remove()
          continue
        }
        // check image file size before attempting (both too small and too large), should impose some limit
        var imageDetails = {}
        try {
          imageDetails = wait.for(probeWrapper, imgSrc)
          if (imageDetails === undefined || imageDetails == null) {
            $(elem).remove()
            continue  
          }
        } catch (err2) {
          console.error(err2)
          $(elem).remove()
          continue
        }
        // check image size is within reasonable bounds
        if ((imageDetails.width * imageDetails.height) < IMG_INLINE_DIM_MIN ||
            (imageDetails.width * imageDetails.height) > IMG_INLINE_DIM_MAX) {
          $(elem).remove()
          continue
        }
        // note, in a wait.for fiber err case is handled by throwing exception, must be caught
        var imgBase64Str = ''
        try {
          imgBase64Str = wait.for(base64Image.encode, imgSrc, {string: true})
        } catch (err3) {
          console.error(err3)
          $(elem).remove()
          continue
        }
        // check if base64 string is too large
        if (imgBase64Str.length > IMG_INLINE_BASE64_STR_LEN_MAX) {
          $(elem).remove()
          continue
        }
        // finally, set image in base64 encoding
        $(elem).attr('src', 'data:' + imageDetails.mime + ';base64,' + imgBase64Str)
        // check if reached num images limit
        numImagesRendered += 1
        if (numImagesRendered >= IMG_MAX_NUM) {
          removeAllRemaining = true
          continue
        }
      }
    }
    // add footer
    $('body')
        .append(createStandardFooter(url, options))
    // render html and call callback
    callback($.html())
  })
}

function probeWrapper(url, callback) {
  probeImageSize(url, function (err, result) {
    if (err) {
      callback(err, null)
    } else {
      callback(null, result)
    }
  });
}

function createStandardFooter(url, options) {
  var encodedUrl = encodeURIComponent(url)
  let footerHtml = '<hr/><p>Viewing: '
  if (options.imgs == 2) {
    footerHtml += '<a href="' + constructInternalUrl('url', encodedUrl, options, {imgs: -1}) + '">[x]</a> with single in-line image'
  } else {
    footerHtml += '<a href="' + constructInternalUrl('url', encodedUrl, options, {imgs: 2}) + '">[_]</a> with single in-line image'
  }
  if (options.imgs == 1) {
    footerHtml += ' | <a href="' + constructInternalUrl('url', encodedUrl, options, {imgs: -1}) + '">[x]</a> with remote images'
  } else {
    footerHtml += ' | <a href="' + constructInternalUrl('url', encodedUrl, options, {imgs: 1}) + '">[_]</a> with remote images'
  }
  if (options.embeds == 1) {
    footerHtml += ' | <a href="' + constructInternalUrl('url', encodedUrl, options, {embeds: -1}) + '">[x]</a> with embeds'
  } else {
    footerHtml += ' | <a href="' + constructInternalUrl('url', encodedUrl, options, {embeds: 1}) + '">[_]</a> with embeds'
  }
  if (options.iframes == 1) {
    footerHtml += ' | <a href="' + constructInternalUrl('url', encodedUrl, options, {iframes: -1}) + '">[x]</a> with iframes'
  } else {
    footerHtml += ' | <a href="' + constructInternalUrl('url', encodedUrl, options, {iframes: 1}) + '">[_]</a> with iframes'
  }
  if (options.othertags == 1) {
    footerHtml += ' | <a href="' + constructInternalUrl('url', encodedUrl, options, {othertags: -1}) + '">[x]</a> with other blacklisted tags'
  } else {
    footerHtml += ' | <a href="' + constructInternalUrl('url', encodedUrl, options, {othertags: 1}) + '">[_]</a> with other blacklisted tags'
  }
  var disallowAllActive = options.imgs != -1 &&
      options.embeds != -1 &&
      options.iframes != -1 &&
      options.othertags != -1
  footerHtml += '</p><p>Actions: <a href="/">Home</a>' +
      (disallowAllActive ?
        ('| <a href="' + constructInternalUrl('url', encodedUrl, options, {imgs: -1, embeds: -1, iframes: -1, othertags: -1}) + '">Disallow all</a>') :
        ('| <a href="' + constructInternalUrl('url', encodedUrl, options, {imgs: 1, embeds: 1, iframes: 1, othertags: 1}) + '">Allow all</a>')) +
      (options.theme == 1 ?
        ('| <a href="' + constructInternalUrl('url', encodedUrl, options, {theme: 2}) + '">Dark</a> theme') :
        ('| <a href="' + constructInternalUrl('url', encodedUrl, options, {theme: 1}) + '">Light</a> theme')) +
      ' | <a href="https://github.com/digithree/readable-only-web/issues/new">Report issue</a>' +
      ' | Switch to <a href="' + constructCompressedUrl(url, options) + '">compressed link</a>' +
      ' | <a href="' + url + '">Exit ROW</a> (redirect to original content)'
  return footerHtml
}

function constructInternalUrl(endpoint, query, options, overrideOptions) {
  let internalUrl = REAL_SERVICE_HOST_ADDR + '/' + endpoint + '?'
  var params = constructQueryParamsForOptions(options, overrideOptions)
  if (query !== undefined && query != null) {
    if (params.length > 0) {
      params += '&'
    }
    params += 'q=' + query
  }
  internalUrl += params
  return internalUrl
}

function constructQueryParamsForOptions(options, overrideOptions) {
  if (options === undefined || options == null) {
    return ''
  }
  var params = ''
  var addedAtLeastOne = false
  Object.keys(options).forEach(function(key, index) {
    let value = options[key]
    if (overrideOptions !== undefined &&
        overrideOptions != null &&
        Object.prototype.hasOwnProperty.call(overrideOptions, key)) {
      value = overrideOptions[key]
    }
    if (addedAtLeastOne) {
      params += '&'
    }
    params += key + '=' + value
    addedAtLeastOne = true
  })
  return params
}

function constructCompressedUrl(url, options) {
  let internalUrl = REAL_SERVICE_HOST_ADDR + '/c/' + encodeUrl(url)
  // TODO : add options
  return internalUrl
}

function getOptionsFromQueryObj(queryParams) {
  let options = {
    imgs: -1,
    embeds: -1,
    iframes: -1,
    othertags: -1,
    theme: 1
  }
  if (queryParams === undefined || queryParams == null) {
    return options
  }
  Object.keys(options).forEach(function(key, index) {
    if (Object.prototype.hasOwnProperty.call(queryParams, key)) {
      options[key] = Number(queryParams[key])
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

function createHeaderLink(options, additionalLinksArray) {
  var links = []
  // first add theme
  var theme = 1
  if (options !== undefined &&
      options != null &&
      options.theme !== undefined) {
    theme = options.theme
  }
  var cssLinkS = S(PAGE_LINK_CSS_FORMAT)
  switch (theme) {
    case 1:
      cssLinkS = cssLinkS.replaceAll('%s', 'light')
      break
    case 2:
      cssLinkS = cssLinkS.replaceAll('%s', 'dark')
      break
    default:
      cssLinkS = cssLinkS.replaceAll('%s', 'light')
  }
  links.push(cssLinkS.toString())
  // add any additional items
  if (additionalLinksArray !== undefined &&
      additionalLinksArray != null &&
      additionalLinksArray.length > 0) {
    links.push(...additionalLinksArray)
  }
  return links
}

function createSearchBar(options) {
  var htmlHiddenItems = ''
  if (options !== undefined && options != null) {
    for (var key in options) {
      htmlHiddenItems += S('<input type="hidden" name="%s$1" value="%s$2" />')
        .replaceAll('%s$1', key)
        .replaceAll('%s$2', options[key])
        .toString()
    }
  }
  return S(HTML_SEARCH_BAR)
      .replaceAll('%s', htmlHiddenItems)
      .toString()
}

function createUrlBar(options) {
  var htmlHiddenItems = ''
  if (options !== undefined && options != null) {
    for (var key in options) {
      htmlHiddenItems += S('<input type="hidden" name="%s$1" value="%s$2" />')
        .replaceAll('%s$1', key)
        .replaceAll('%s$2', options[key])
        .toString()
    }
  }
  return S(HTML_URL_BAR)
      .replaceAll('%s', htmlHiddenItems)
      .toString()
}

// Start server
app.listen(app.get('port'), function () {
  console.log('Node app is running on port', app.get('port'));
});

module.exports = app;
