import React, { useEffect, useRef } from "react";

import logo from './logo.svg';
import './App.css';

import Video from './Video'

function stopSpeaking() {
  let speechSynth = window.speechSynthesis
  speechSynth.cancel() 
}

function App() {
  return (
    <div className="App">
      <div className="header">
        <div>
        <h2>AIVision</h2>
        <span>whoisyan.com</span>
        </div>
        <div className="menu">
          <button onClick={ stopSpeaking }>Mute</button>
        </div>
      </div>
      <div className="container">
        <Video/>
      </div>
      <div className="navbar">
        <a href="http://whoisyan.com/seeing-with-ai-and-voice/">About</a>
      </div>
    </div>
  );
}

export default App;
