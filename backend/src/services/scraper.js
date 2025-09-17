const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/env');
const logger = require('../utils/logger');

const DEFAULT_SOURCES = [
  'https://feeds.bbci.co.uk/news/rss.xml',
  'https://www.theguardian.com/world/rss',
  'https://rss.cnn.com/rss/edition.rss',
  'https://www.aljazeera.com/xml/rss/all.xml',
  'https://feeds.bbci.co.uk/news/rss.xml',
  'https://feeds.reuters.com/reuters/worldNews'
];

const DEFAULT_TIMEOUT = config.REQUEST_TIMEOUT_MS || 15000;

/**
 * fetchUrl - simple GET with timeout & UA
 */
async function fetchUrl(url, timeout = DEFAULT_TIMEOUT) {
  try {
    const res = await axios.get(url, {
      timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsScraper/1.0; +https://example.com)',
        Accept: 'application/rss+xml, application/xml, text/xml, text/html, */*;q=0.1'
      }
    });
    return res.data;
  } catch (err) {
    logger.warn(`fetchUrl failed for ${url}: ${err.message}`);
    return null;
  }
}

/**
 * parseRss - parse RSS XML and return array of article objects
 */
function parseRss(xml, sourceUrl) {
  const $ = cheerio.load(xml, { xmlMode: true });
  const items = [];
  $('item').each((i, el) => {
    const title = $(el).find('title').text();
    const description = $(el).find('description').text() || $(el).find('summary').text();
    const link = $(el).find('link').text();
    const pubDate = $(el).find('pubDate').text();
    if (title && (description || link)) {
      items.push({
        id: uuidv4(),
        title: title.trim(),
        content: (description || '').trim(),
        url: (link || '').trim(),
        publishDate: pubDate ? pubDate.trim() : new Date().toISOString(),
        source: sourceUrl
      });
    }
  });
  return items;
}

/**
 * htmlFallback - given an article URL, try to extract a title + snippet
 */
async function htmlFallback(url) {
  const html = await fetchUrl(url);
  if (!html) return null;
  const $ = cheerio.load(html);
  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('meta[name="twitter:title"]').attr('content') ||
    $('title').text() ||
    '';
  const desc =
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="description"]').attr('content') ||
    $('meta[name="twitter:description"]').attr('content') ||
    $('article').text().slice(0, 400) ||
    '';
  return {
    id: uuidv4(),
    title: title.trim() || 'Untitled',
    content: (desc || '').trim(),
    url,
    publishDate: new Date().toISOString(),
    source: url
  };
}

/**
 * scrapeNewsArticles - main exported function
 * - sources: array of feed URLs (defaults to DEFAULT_SOURCES)
 * - limit: max number of articles to return
 */
async function scrapeNewsArticles(sources = DEFAULT_SOURCES, limit = 50) {
  const articles = [];
  const seenUrls = new Set();

  for (const source of sources) {
    // try RSS/atom first
    const xml = await fetchUrl(source);
    if (xml) {
      try {
        const parsed = parseRss(xml, source);
        for (const a of parsed) {
          if (a.url && !seenUrls.has(a.url)) {
            seenUrls.add(a.url);
            articles.push(a);
            if (articles.length >= limit) return articles.slice(0, limit);
          }
        }
      } catch (err) {
        logger.warn(`Failed to parse RSS from ${source}: ${err.message}`);
      }
    }

    // If RSS didn't produce items, try crawling the page for links and fetch a few
    if (articles.length < limit) {
      try {
        const html = await fetchUrl(source);
        if (html) {
          const $ = cheerio.load(html);
          // collect candidate links (heuristic)
          const links = $('a[href]')
            .map((i, el) => $(el).attr('href'))
            .get()
            .filter(Boolean)
            // make absolute if needed
            .map((href) => {
              try {
                return new URL(href, source).toString();
              } catch {
                return null;
              }
            })
            .filter(Boolean);

          // keep only unique links
          const uniqueLinks = [...new Set(links)].slice(0, 20);
          for (const l of uniqueLinks) {
            if (seenUrls.has(l)) continue;
            const art = await htmlFallback(l);
            if (art && !seenUrls.has(art.url)) {
              seenUrls.add(art.url);
              articles.push(art);
              if (articles.length >= limit) return articles.slice(0, limit);
            }
          }
        }
      } catch (err) {
        logger.warn(`Fallback crawling failed for ${source}: ${err.message}`);
      }
    }
  }

  return articles.slice(0, limit);
}

module.exports = {
  scrapeNewsArticles,
  DEFAULT_SOURCES
};
