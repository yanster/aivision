import React, { useState, useRef, useEffect, Component } from 'react';
import Webcam from "react-webcam";
import "./App.css";

//const SERVER_URL = "http://localhost:8000/v1/chat/completion"
const SERVER_URL = "https://whoisyan.com/llm"

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
        const response = await fetch(SERVER_URL + "/v1/models", {
          method: 'GET',
          mode:'cors'
        });

        console.log(response)

        if (response.ok) {
          const data = await response.json();
          console.log("Response: ", data)
          this.setState({ checkingConnection: false, available: true, description: "Just point the camera at what you want to be described." });
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

      const payload = {
          messages: [
              { role: "system", content: "You are an assistant blind people experience the world. Be precise, brief and concise. Do not editorialize. Only say what you are sure about." },
              {
                  role: "user",
                  content: [
                      {
                          type: "image_url",
                          image_url: {
                              url: snapshot
                          }
                      },
                      {
                        "type": "text",
                        "text": "Describe what you see in the image"
                      }
                  ]
              }
          ],
          temperature: 0.1,
          max_tokens: -1,
          stream: false
      }

      let body = JSON.stringify(payload)
      console.log(body)

      try {

        const response = await fetch(SERVER_URL + "/v1/chat/completions", {
          method: 'POST',
          mode:'cors',
          headers: {
            'Content-Type': 'application/json',
          },
          body: body,
        });

  
        if (response.ok) {
          const data = await response.json();
          console.log("Response: ", data.choices[0].message)
          return data.choices[0].message.content;
      
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

      const { description, loading, available } = this.state;
      const videoConstraints = {
        width: 320,
        height: 320,
        facingMode: "environment"
      };

      const WebcamCapture = () => {
        const webcamRef = React.useRef(null);
        const capture = React.useCallback(
          async () => {
            let imageSrc = await webcamRef.current.getScreenshot();

            console.log(imageSrc)

            if (!imageSrc) {
              this.setState((prevState) => {return { description: "Please Allow Camera access." }});
              this.speak("Please Allow Camera access.")
              return
            }

            this.setState({description:  'AI vision analyzing image...', loading: true});

            let description = await this.handleSend(imageSrc)

            if (description == "rate_limited") {
              description = "Exceeded allowed usage. Please try again later."
            } 
            
            this.speak(description)

            this.setState({description:  description, loading: false});
          },
          [webcamRef]
        );
        return (
          <>
            <Webcam
              audio={false}
              height={320}
              ref={webcamRef}
              screenshotFormat="image/png"
              width={320}
              videoConstraints={videoConstraints}
              onClick={capture}
            />
            { (available && !loading) &&
            <div className='wrapper'>
              <button onClick={capture}>Describe What You See</button>
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
        <div className='wrapper'>
          <WebcamCapture />
          { description &&
          <div className='wrapper'>
            <div className='description'>{ description }</div>
          </div>
          }
          <br />
        </div>
      );
    }
  }
  export default Video;