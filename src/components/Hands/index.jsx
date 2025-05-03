import { useEffect, useRef, useState } from "react";
import { Hands, VERSION } from "@mediapipe/hands";

import "./index.scss";

const HandsContainer = () => {
  const [inputVideoReady, setInputVideoReady] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const inputVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const contextRef = useRef(null);

  useEffect(() => {
    if (!inputVideoReady) {
      return;
    }
    if (inputVideoRef.current && canvasRef.current) {
      console.log("rendering");
      contextRef.current = canvasRef.current.getContext("2d");

      // Set up video constraints for the user's camera
      const constraints = {
        video: { width: { min: 1280 }, height: { min: 720 } },
      };

      // Access the camera and set the video source
      navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
        if (inputVideoRef.current) {
          inputVideoRef.current.srcObject = stream;
        }
        sendToMediaPipe();
      });

      // Initialize MediaPipe Hands
      const hands = new Hands({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${VERSION}/${file}`,
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7, // change this according to your preferred size
        minTrackingConfidence: 0.7, // change this according to your preferred size
      });

      hands.onResults(onResults);

      // Function to send video frames to MediaPipe
      const sendToMediaPipe = async () => {
        if (inputVideoRef.current) {
          if (!inputVideoRef.current.videoWidth) {
            requestAnimationFrame(sendToMediaPipe);
          } else {
            await hands.send({ image: inputVideoRef.current });
            requestAnimationFrame(sendToMediaPipe);
          }
        }
      };
    }
  }, [inputVideoReady]);

  // Initialize the image and set the src
  const ringImage = new Image();
  ringImage.src = "ringImage.png";

  // Set a flag to indicate whether the image has loaded
  let isRingImageLoaded = false;
  ringImage.onload = () => {
    isRingImageLoaded = true;
  };

  // Modified onResults function
  const onResults = (results) => {
    if (canvasRef.current && contextRef.current) {
      setLoaded(true);

      contextRef.current.save();
      contextRef.current.clearRect(
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );
      contextRef.current.drawImage(
        results.image,
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );

      if (results.multiHandLandmarks && results.multiHandedness) {
        for (
          let index = 0;
          index < results.multiHandLandmarks.length;
          index++
        ) {
          const landmarks = results.multiHandLandmarks[index];

          // Only select landmarks for the ring finger (MCP and PIP joints)
          const ringFingerLandmarks = [
            landmarks[13], // MCP joint
            landmarks[14], // PIP joint
          ];

          // Check if ring image is loaded before drawing
          if (isRingImageLoaded) {
            // Calculate the center of the ring position
            const ringCenterX =
              ((ringFingerLandmarks[0].x + ringFingerLandmarks[1].x) *
                canvasRef.current.width) /
              2;
            const ringCenterY =
              ((ringFingerLandmarks[0].y + ringFingerLandmarks[1].y) *
                canvasRef.current.height) /
              2;

            // Calculate ring size based on distance between MCP and PIP
            const distance = Math.hypot(
              (ringFingerLandmarks[1].x - ringFingerLandmarks[0].x) *
                canvasRef.current.width,
              (ringFingerLandmarks[1].y - ringFingerLandmarks[0].y) *
                canvasRef.current.height
            );

            const ringWidth = distance * 1.2;
            const ringHeight = ringWidth * 0.5; // Adjust for the ring shape

            // Calculate the angle between MCP and PIP joints for ring orientation
            let angle = Math.atan2(
              ringFingerLandmarks[1].y - ringFingerLandmarks[0].y,
              ringFingerLandmarks[1].x - ringFingerLandmarks[0].x
            );

            // Rotate 90 degrees to the left
            angle -= Math.PI / 2;

            // Rotate image to align with the finger angle in 2D space
            contextRef.current.save();
            contextRef.current.translate(ringCenterX, ringCenterY);
            contextRef.current.rotate(angle);

            // Adjust the scaling factor based on depth to keep it parallel
            const depthScale = 1;

            contextRef.current.drawImage(
              ringImage,
              -ringWidth / 2,
              -ringHeight / 2,
              ringWidth * depthScale,
              ringHeight * depthScale
            );

            contextRef.current.restore();
          } else {
            console.warn("Ring image not loaded yet, skipping ring placement");
          }
        }
      }

      contextRef.current.restore();
    }
  };

  return (
    <div className="hands-container">
      <video
        autoPlay
        ref={(el) => {
          inputVideoRef.current = el;
          setInputVideoReady(!!el);
        }}
        style={{ display: "none" }} // Hide video element
      />
      <canvas ref={canvasRef} width={1280} height={720} />
      {!loaded && (
        <div className="loading">
          <div className="spinner"></div>
          <div className="message">Loading</div>
        </div>
      )}
    </div>
  );
};

export default HandsContainer;
