"use strict";

// function that parses JSON response from server
const parseJSON = (xhr, feedback, lyrics, GET) => {
  // parse response 
  const obj = JSON.parse(xhr.response);
  
  // display server feedback
  if(obj.msg){
    const p = document.createElement('p');
    p.innerHTML = `Message: ${obj.msg}`;
    feedback.appendChild(p);
  }
  
  // add song and artist to client-side playlist
  if(obj.track){
    const playlist = document.querySelector('#playlist');
    
    // create remove button for each <div> song
    const removeButton = document.createElement('img');
    removeButton.setAttribute('class', 'removeBtn');
    removeButton.src = '../images/remove.png';
    removeButton.alt = "remove icon";
    
    const div = document.createElement('div');
    
    div.innerHTML = `${obj.track.artist} - ${obj.track.song}`;
    
    // set attributes to allow <div> clicks to GET lyrics
    div.setAttribute('class', 'track');
    div.setAttribute('song', obj.track.song);
    div.setAttribute('artist', obj.track.artist);
    
    div.appendChild(removeButton);  
    playlist.appendChild(div);
  }
  
  // GET lyrics
  if(GET && xhr.status === 200){
    const lyricsContent = document.querySelector('#lyricsContent');
    lyricsContent.innerHTML = "";
    
    let div = document.createElement('div');
    
    let strSplit = obj.split("\n");
    
    for(let i = 0; i < strSplit.length; i++)
      div.innerHTML += '<p>' + strSplit[i] + '</p>';
    
    lyricsContent.appendChild(div);
  }
};

// function that handles response from server
// depending on status code returned, display proper feedback to user
const handleResponse = (xhr, parseResponse) => {
  const lyrics = document.querySelector('#lyrics');
  const feedback = document.querySelector('#feedback');
  
  // check status code
  switch(xhr.status){
    case 200:
      feedback.innerHTML = '<b>Success</b>';
      if(parseResponse) parseJSON(xhr, feedback, lyrics, parseResponse);
      break;
    case 201:
      feedback.innerHTML = '<b>Created</b>';
      parseJSON(xhr, feedback, lyrics, parseResponse);
      break;
    case 204:
      feedback.innerHTML = '<b>Updated (No Content)</b>';
      // do NOT parse JSON response
      break;
    case 304:
      feedback.innerHTML = '<b>Success (304)</b>';
      // do NOT parse JSON response
      break;
    case 400:
      feedback.innerHTML = '<b>Bad Request</b>';
      parseJSON(xhr, feedback, lyrics, parseResponse);
      break;
    default: // handles 404 error messages as default
      feedback.innerHTML = '<b>Resource Not Found</b>';
      if(parseResponse) parseJSON(xhr, feedback, lyrics, parseResponse);
      break;
  }
};

// function to send POST requests to server
const sendPost = (e, form) => {
  // grab the forms action (url to go to)
  // and method (HTTP method - POST)
  const action = form.getAttribute('action');
  
  const method = form.getAttribute('method');
  
  // grab the form's name and age fields so we can check user input
  const songField = form.querySelector('#songField');
  const artistField = form.querySelector('#artistField');
   
  songField.value = songField.value.trim();
  artistField.value = artistField.value.trim();
  
  const xhr = new XMLHttpRequest();
  // set the method (POST) and url (action from the form)
  xhr.open(method, action);
  
  // set our request type to x-www-form-urlencoded
  xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
  // set our requested response type for JSON response
  xhr.setRequestHeader('Accept', 'application/json');
  
  // set our function to handle the response
  xhr.onload = () => handleResponse(xhr, false);
  
  // build our x-www-form-urlencoded format
  const formData = `song=${songField.value}&artist=${artistField.value}`;
  
  // send our request with the data
  xhr.send(formData);
  
  // prevent browser's default to send the form and try to change pages on us
  e.preventDefault();
  return false;
};

// function that sends GET/HEAD requests to server
const sendGet = (e, form) => {
  const url = form.getAttribute('action');
  
  const method = form.querySelector('#methodSelect').value;
  
  let songName = form.querySelector('#getSong').value;
  let artistName = form.querySelector('#getArtist').value;
  
  songName = songName.trim();
  artistName = artistName.trim();
  
  let params = `song=${songName}&artist=${artistName}`;
  
  const xhr = new XMLHttpRequest();
  
  xhr.open(method, url+"?"+params);
  
  xhr.setRequestHeader('Accept', 'application/json');
  
  xhr.onload = () => handleResponse(xhr, (method === 'get'));
  
  xhr.send();
  
  // prevent browser's default to send the form and try to change pages on us
  e.preventDefault();
  return false;
};

const init = () => {
  const postForm = document.querySelector('#postForm');
  const addSong = (e) => sendPost(e, postForm);
  postForm.addEventListener('submit', addSong);
  
  const getForm = document.querySelector('#getForm');
  const getSong = (e) => sendGet(e, getForm);
  getForm.addEventListener('submit', getSong);
  
  // source: https://stackoverflow.com/questions/203198/event-binding-on-dynamically-created-elements
  // allows user to click on song <div> to perform GET requests for lyrics
  $(document).on('click', '.track', (e) => {
      let songName = e.target.getAttribute('song');
      let artistName = e.target.getAttribute('artist');
      
      let params = `song=${songName}&artist=${artistName}`;
    
      const method = form.querySelector('#methodSelect').value;
      
      const xhr = new XMLHttpRequest();
  
      xhr.open(method, "/getSong?"+params);
      
      xhr.setRequestHeader('Accept', 'application/json');
      
      xhr.onload = () => handleResponse(xhr, (method === 'get'));
      
      xhr.send();
    
      // prevent browser's default to send the form and try to change pages on us
      e.preventDefault();
      return false;
  });
  
  // allows user to remove songs from their playlist with remove button
  $(document).on('click', '.removeBtn', (e) => {
    e.stopPropagation();
    
    const songField = e.target.parentNode.getAttribute('song');
    const artistField = e.target.parentNode.getAttribute('artist');
    
    e.target.parentNode.parentNode.removeChild(e.target.parentNode);
    
    const xhr = new XMLHttpRequest();
    // set the method (POST) and url (action from the form)
    xhr.open('POST', '/modify');
    
    // set our request type to x-www-form-urlencoded
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    // set our requested response type for JSON response
    xhr.setRequestHeader('Accept', 'application/json');
    
    // set our function to handle the response
    xhr.onload = () => handleResponse(xhr, false);
    
    // build our x-www-form-urlencoded format
    const formData = `song=${songField}&artist=${artistField}`;
    
    // send our request with the data
    xhr.send(formData);
    
    // prevent browser's default to send the form and try to change pages on us
    e.preventDefault();
    return false;
  });
};

window.onload = init;