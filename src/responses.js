const requestPlugin = require('request');

const MUSIXMATCH_URL = 'http://api.musixmatch.com/ws/1.1/';
const API_KEY = 'apikey=e37fc1ba995412b8a0176f2f53587f57';

const playlist = {};

const crypto = require('crypto');

let etag = crypto.createHash('sha1').update(JSON.stringify(playlist));
let digest = etag.digest('hex');

const respondJSON = (request, response, status, obj) => {
  const headers = {
    'Content-Type': 'application/json',
    etag: digest,
  };

  response.writeHead(status, headers);
  response.write(JSON.stringify(obj));
  response.end();
};

const respondJSONMeta = (request, response, status) => {
  const headers = {
    'Content-Type': 'application/json',
    etag: digest,
  };

  response.writeHead(status, headers);
  response.end();
};

const addSong = (request, response, bodyParams) => {
  const responseJSON = {
    msg: 'Missing required song name and/or artist parameters',
  };

  if (!bodyParams.song || !bodyParams.artist) {
    responseJSON.id = 'Bad Request';
    return respondJSON(request, response, 400, responseJSON);
  }

  let addNewSong;

  // if user is adding a new song, create a new object slot
  // else if artist exists, check to see if user is adding the same song 
  // or a new song by the same artist
  // else don't add a new song
  if (!playlist[bodyParams.artist]) {
    playlist[bodyParams.artist] = {};
    addNewSong = true;
  } else if (playlist[bodyParams.artist].artist === bodyParams.artist) {
    if (playlist[bodyParams.artist].song !== bodyParams.song) {
      addNewSong = true;
    } else {
      addNewSong = false;
    }
  } else {
    addNewSong = false;
  }

  etag = crypto.createHash('sha1').update(JSON.stringify(playlist));
  digest = etag.digest('hex');

  if (addNewSong) {
    playlist[bodyParams.artist].song = bodyParams.song;
    playlist[bodyParams.artist].artist = bodyParams.artist;
    responseJSON.msg = 'Added to playlist';
    responseJSON.track = {
      song: playlist[bodyParams.artist].song,
      artist: playlist[bodyParams.artist].artist,
    };
    return respondJSON(request, response, 201, responseJSON);
  }
  return respondJSONMeta(request, response, 204);
};

const getSong = (request, response, params) => {
  const songname = params.song;
  const artistname = params.artist;

  const responseJSON = {
    id: 'Bad Request',
    msg: 'That song and artist cannot be found in playlist',
  };

  // if missing query params, bail out
  if (songname === '' || artistname === '' || !playlist[artistname] || songname !== playlist[artistname].song) {
    if (request.method === 'GET') { respondJSON(request, response, 400, responseJSON); } 
    else { respondJSONMeta(request, response, 400); }
    return;
  }

  if (request.method === 'GET') {
    if (playlist[artistname].song === songname && playlist[artistname].artist === artistname) {
      let url = MUSIXMATCH_URL;
      url += 'matcher.lyrics.get?';
      url += `q_track=${songname}`;
      url += `&q_artist=${artistname}`;
      url += `&${API_KEY}`;

      requestPlugin(url, (err, resp, body) => {
        // console.log('error: ' + err);
        // console.log('response: ' + resp);
        // console.log('body: ' + body);

        const obj = JSON.parse(body);

        // console.log('lyrics: ' + obj.message.body.lyrics.lyrics_body);
        if (obj.message.body.lyrics.lyrics_body) {
          const lyrics = obj.message.body.lyrics.lyrics_body;

          if (request.headers['if-none-match'] === digest) {
            respondJSONMeta(request, response, 304);
            return;
          }

          respondJSON(request, response, 200, lyrics);
        }
        // else if song is not in musixmatch API return a 500 status code
        /* return respondJSON(request, response, 500, {
            id: 'Internal',
            msg: 'Something went wrong on the server',
          }); */
      });
    }
  } else { // assume it's a HEAD
    if (request.headers['if-none-match'] === digest) {
      respondJSONMeta(request, response, 304);
      return;
    }
    respondJSONMeta(request, response, 200);
  }
};

const notFound = (request, response) => {
  const responseJSON = {
    id: 'not found',
    msg: 'The page you are looking for was not found.',
  };

  return respondJSON(request, response, 404, responseJSON);
};

module.exports = {
  addSong,
  getSong,
  notFound,
};
