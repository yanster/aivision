import React, { useState, useRef, useEffect, Component } from 'react';
import Webcam from "react-webcam";
import {Buffer} from 'buffer';
import "./App.css";

//const SERVER_URL = "http://localhost:8000/v1/chat/completion"
//const SERVER_URL = "https://whoisyan.com/llm"
//const SERVER_URL = "http://localhost:5000"
const SERVER_URL = "https://whoisyan.com/vision/api"

function base64ToFile(base64String, filename, mimeType) {
    const binaryString = window.atob(base64String.split(',')[1]); // Splitting for cases where base64 string contains data URL
    const len = binaryString.length;
    const bytes = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: mimeType });
    const file = new File([blob], filename, { type: mimeType });

    return file;
}


class Video extends Component {
    constructor() {
        super();
        this.state = {
            description: "Checking connection...",
            loading: false,
            available: false,
            checkingConnection: false
        }
    }

    async componentDidMount() {
      const fetchData = async () => {
        await this.checkConnection()
      }
      if (!this.state.available && !this.state.checkingConnection) {
        fetchData();
      }
    }

    checkConnection = async () => {

      if (this.state.available || this.state.checkingConnection) {
        console.log("Already checking")
        return;
      }

      this.setState({ checkingConnection: true })

      console.log("Checking connection state...")

      try {
        const response = await fetch(SERVER_URL + "/", {
          method: 'GET',
          mode:'cors'
        });

        console.log(response)

        if (response.ok) {
          const data = await response.json();
          console.log("Response: ", data)
          this.setState({ checkingConnection: false, available: true, description: "Just point the camera and tap the image to hear a description of what's in front." });
        } else {
          this.setState({ checkingConnection: false, available: false, description: "Server not available. Try again later." });
        }
      } catch (ex) {
        this.setState({ checkingConnection: false, available: false, description: "Server not available. Try again later." });
      }

    }

    handleSend = async (snapshot) => {

      console.log("handleSend")

      this.speak("")

      console.log("%c Image", "background-image: url(" + snapshot + "); background-size: 64px 64px; line-height: 1px; font-size: 1px; padding: 32px;");
      
      let file_data = base64ToFile(snapshot, "image.jpg", "image/jpeg")

      const formData = new FormData();
      formData.append('file', file_data);
      
      try {

        const response = await fetch(SERVER_URL + "/upload", {
          method: 'POST',
          mode:'cors',
          body: formData,
        });
  
        if (response.ok) {
          const data = await response.json();
          console.log("Response: ", data)
          return data;
      
        } else {
          console.error('Failed to send image');
          // Handle error response
        }
      } catch (error) {
        console.error('Error sending image:', error);
        // Handle network errors
      }
    };

    speak(text) {
      let speechSynth = window.speechSynthesis

      const utterance = new window.SpeechSynthesisUtterance()
      utterance.text = text
    
      speechSynth.cancel() // cancel current speak, if any is running
      speechSynth.speak(utterance)      
    }

  
    render() {

      const { description, loading, available, api } = this.state;
      const videoConstraints = {
        width: 720,
        height: 720,
        facingMode: "environment"
      };

      const WebcamCapture = () => {
        const webcamRef = React.useRef(null);
        const capture = React.useCallback(
          async () => {
            let imageSrc = await webcamRef.current.getScreenshot();

            if (!imageSrc) {
              this.setState((prevState) => {return { description: "Please Allow Camera access." }});
              this.speak("Please Allow Camera access.")
              return
            }

            this.setState({description:  'Analyzing image...', loading: true});

            let data = await this.handleSend(imageSrc)

            console.log("API: ", data.api)
            
            this.speak(data.result)

            this.setState({description: data.result, api: data.api, loading: false});
          },
          [webcamRef]
        );
        return (
          <>
            <Webcam

              audio={false}
              height={350}
              ref={webcamRef}
              screenshotFormat="image/png"
              width={350}
              videoConstraints={videoConstraints}
              onClick={capture}
            />
            { (available && !loading) &&
            <div className='wrapper'>
              <button onClick={capture}>Describe the Scene</button>
            </div>
            }
            { (loading) &&
            <div className='wrapper'>
              <div className='loading'>
              </div>
            </div>
            }
          </>
        );
      };

      return (
        <div>
            <WebcamCapture />
            { description &&
            <div className='wrapper'>
                <div className='description'>{ description } </div>
            </div>
            }
        </div>
      );
    }
  }
  export default Video;