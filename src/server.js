const http = require('http');
const url = require('url');
const query = require('querystring');
const htmlHandler = require('./htmlResponses.js');
const responseHandler = require('./responses.js');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

// function that handles POST requests from client 
// and parses body params for proper POST request action
const handlePOST = (request, response, parsedUrl) => {
  const body = [];

  request.on('error', (err) => {
    console.dir(err);
    response.statusCode = 400;
    response.end();
  });

  request.on('data', (chunk) => {
    body.push(chunk);
  });

  request.on('end', () => {
    const bodyString = Buffer.concat(body).toString();
    const bodyParams = query.parse(bodyString);

    if (parsedUrl.pathname === '/addSong') responseHandler.addSong(request, response, bodyParams);
    else if (parsedUrl.pathname === '/modify') responseHandler.modify(request, response, bodyParams);
  });
};

// function that handles GET requests from client
// and callbacks depending on GET request action
const handleGET = (request, response, parsedUrl, params) => {
  switch (request.method) {
    case 'GET':
      switch (parsedUrl.pathname) {
        case '/':
          htmlHandler.getIndex(request, response);
          break;
        case '/style.css':
          htmlHandler.getCSS(request, response);
          break;
        case '/js/client.js':
          htmlHandler.getJS(request, response);
          break;
        case '/images/remove.png':
          htmlHandler.getImage(request, response);
          break;
        case '/images/bg.jpg':
          htmlHandler.getBGImage(request, response);
          break;
        case '/getSong':
          responseHandler.getSong(request, response, params);
          break;
        default:
          responseHandler.notFound(request, response);
          break;
      }
      break;
    case 'HEAD':
      if (parsedUrl.pathname === '/getSong') responseHandler.getSong(request, response, params);
      break;
    default:
      responseHandler.notFound(request, response);
      break;
  }
};

const onRequest = (request, response) => {
  console.log(request.url);

  const parsedUrl = url.parse(request.url);
  const params = query.parse(parsedUrl.query);

  if (request.method === 'POST') handlePOST(request, response, parsedUrl);
  else handleGET(request, response, parsedUrl, params);
};

http.createServer(onRequest).listen(port);

console.log(`listening on 127.0.0.1: ${port}`);
