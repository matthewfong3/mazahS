const requestPlugin = require('request');
const crypto = require('crypto');

const MUSIXMATCH_URL = 'http://api.musixmatch.com/ws/1.1/';
const API_KEY = 'apikey=e37fc1ba995412b8a0176f2f53587f57';

const playlist = {};

let etag = crypto.createHash('sha1').update(JSON.stringify(playlist));
let digest = etag.digest('hex');

// function that responds with JSON body
const respondJSON = (request, response, status, obj) => {
  const headers = {
    'Content-Type': 'application/json',
    etag: digest,
  };

  response.writeHead(status, headers);
  response.write(JSON.stringify(obj));
  response.end();
};

// function that responds with headers only
const respondJSONMeta = (request, response, status) => {
  const headers = {
    'Content-Type': 'application/json',
    etag: digest,
  };

  response.writeHead(status, headers);
  response.end();
};

// function that adds song to server-side playlist
// handles POST requests
const addSong = (request, response, bodyParams) => {
  const responseJSON = {
    msg: 'Missing required song name and/or artist parameters',
  };

  // check if user is missing body parameters
  if (!bodyParams.song || !bodyParams.artist) {
    responseJSON.id = 'Bad Request';
    respondJSON(request, response, 400, responseJSON);
    return;
  }

  let addNewSong;

  // if      user is adding a new song, create a new object slot (keyed by artist name)
  // else if artist exists, check to see if user is adding the same song 
  //         or a new song by the same artist
  // else    don't add a new song
  if (!playlist[bodyParams.artist]) {
    playlist[bodyParams.artist] = {};
    playlist[bodyParams.artist].songs = [];
    addNewSong = true;
  } else if (playlist[bodyParams.artist].artist === bodyParams.artist) {
    // loop through songs for a specific artist to see if it exists already
    for (let i = 0; i < playlist[bodyParams.artist].songs.length; i++) {
      if (playlist[bodyParams.artist].songs[i] === bodyParams.song) {
        addNewSong = false;
        break;
      }
      addNewSong = true;
    }
  } else {
    addNewSong = false;
  }

  if (addNewSong) {
    etag = crypto.createHash('sha1').update(JSON.stringify(playlist));
    digest = etag.digest('hex');

    playlist[bodyParams.artist].songs.push(bodyParams.song);
    playlist[bodyParams.artist].artist = bodyParams.artist;

    responseJSON.msg = 'Added to playlist';
    responseJSON.track = {
      song: bodyParams.song,
      artist: bodyParams.artist,
    };

    respondJSON(request, response, 201, responseJSON);
  } else {
    respondJSONMeta(request, response, 204);
  }
};

// function that removes a song from the server-side playlist
// handles POST requests
const modify = (request, response, bodyParams) => {
  const responseJSON = {
    msg: 'Successfully removed from playlist',
  };

  // if it's the only song in the artist array, delete the key
  // else just remove the song from the array
  if (playlist[bodyParams.artist].songs.length === 1) {
    delete playlist[bodyParams.artist];
  } else {
    const index = playlist[bodyParams.artist].songs.indexOf(bodyParams.song);
    playlist[bodyParams.artist].songs.splice(index, 1);
  }

  respondJSON(request, response, 200, responseJSON);
};

// Helper function that searches musixmatch API for lyrics to specified song
const searchMusixMatch = (songname, artistname, request, response) => {
  let url = MUSIXMATCH_URL;
  url += 'matcher.lyrics.get?';
  url += `q_track=${songname}`;
  url += `&q_artist=${artistname}`;
  url += `&${API_KEY}`;

  // using request plugin
  requestPlugin(url, (err, resp, body) => {
    const obj = JSON.parse(body);

    // if song exists in musixmatch API database return the lyrics
    if (obj.message.header.status_code !== 404) {
      if (obj.message.body.lyrics.lyrics_body) {
        const lyrics = obj.message.body.lyrics.lyrics_body;

        if (request.headers['if-none-match'] === digest) {
          respondJSONMeta(request, response, 304);
          return;
        }
        respondJSON(request, response, 200, lyrics);
      }
    } else { // if song is not in musixmatch API return 404 status code
      respondJSON(request, response, 404, { id: 'not found', msg: 'That song/artist cannot be found on our server' });
    }
  });
};

// function that returns lyrics to client
// handles GET/HEAD requests
const getSong = (request, response, params) => {
  const songname = params.song;
  const artistname = params.artist;

  const responseJSON = {
    id: 'Bad Request',
    msg: 'That song and artist cannot be found in playlist',
  };

  // if missing query params, bail out
  if (songname === '' || artistname === '' || !playlist[artistname]) {
    if (request.method === 'GET') respondJSON(request, response, 400, responseJSON);
    else respondJSONMeta(request, response, 400);
    return;
  }

  let searchSong = false;
  if (playlist[artistname].artist === artistname) {
    // loop through songs to check if query parameter's song exists
    // if it does, search musixmatch's API database
    // else, return with 400 'bad request' response
    for (let i = 0; i < playlist[artistname].songs.length; i++) {
      if (playlist[artistname].songs[i] === songname) {
        searchSong = true;
        break;
      }
    }
  }

  if (request.method === 'GET') {
    if (searchSong) searchMusixMatch(songname, artistname, request, response);
    else respondJSON(request, response, 400, responseJSON);
  } else { // assume it's a HEAD
    if (!searchSong) {
      respondJSONMeta(request, response, 400);
      return;
    }

    if (request.headers['if-none-match'] === digest) {
      respondJSONMeta(request, response, 304);
      return;
    }
    respondJSONMeta(request, response, 200);
  }
};

// function that returns 404 'not found' response if user tries to go to invalid link
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
  modify,
};
