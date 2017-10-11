const http = require('http');
const htmlHandler = require('./htmlResponses.js');
const responseHandler = require('./responses.js');

const url = require('url');

const query = require('querystring');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

const handlePOST = (request, response, parsedUrl) => {
  if (parsedUrl.pathname === '/addSong') {
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

      responseHandler.addSong(request, response, bodyParams);
    });
  }
};

const handleGET = (request, response, parsedUrl, params) => {
  switch (request.method) {
    case 'GET':
      if (parsedUrl.pathname === '/') {
        htmlHandler.getIndex(request, response);
      } else if (parsedUrl.pathname === '/style.css') {
        htmlHandler.getCSS(request, response);
      } else if (parsedUrl.pathname === '/getSong') {
        responseHandler.getSong(request, response, params);
      } else {
        responseHandler.notFound(request, response);
      }
      break;
    case 'HEAD':
      if (parsedUrl.pathname === '/getSong') {
        responseHandler.getSong(request, response, params);
      }
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
