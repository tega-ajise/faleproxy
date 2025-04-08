const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware to parse request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Route to serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Function to replace Yale with Fale in text content
function replaceYaleWithFale(text) {
  if (!text) return text;
  
  // Replace Yale with Fale, then yale with fale
  const newText = text.replace(/Yale/g, 'Fale').replace(/yale/g, 'fale');
  
  // Only return modified text if changes were made
  return newText === text ? text : newText;
}

// API endpoint to fetch and modify content
app.post('/fetch', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Fetch the content from the provided URL
    let response;
    try {
      response = await axios.get(url);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch content' });
    }

    const html = response.data;

    // Use cheerio to parse HTML and selectively replace text content, not URLs
    const $ = cheerio.load(html);
    
    // Process text nodes in the body
    $('body *').contents().filter(function() {
      return this.nodeType === 3; // Text nodes only
    }).each(function() {
      const text = $(this).text();
      const newText = replaceYaleWithFale(text);
      if (text !== newText) {
        $(this).replaceWith(newText);
      }
    });
    
    // Process title separately
    const title = $('title').text();
    const newTitle = replaceYaleWithFale(title);
    $('title').text(newTitle);
    
    return res.json({ 
      success: true, 
      content: $.html(),
      title: newTitle,
      originalUrl: url
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to process content' });
  }
});

// Only start the server if not being required as a module (for testing)
if (!module.parent) {
  app.listen(PORT, () => {
    console.log(`Faleproxy server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
