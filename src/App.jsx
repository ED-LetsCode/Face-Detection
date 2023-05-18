import { useEffect, useRef, useState } from "react";
import "./App.css";
import * as faceapi from "face-api.js";

export default function App() {
  const videoHeight = 480;
  const videoWidth = 640;
  const canvasRef = useRef();
  const videoRef = useRef();

  const detectFace = async () => {
    canvasRef.current.innerHtml = faceapi.createCanvasFromMedia(
      videoRef.current
    );

    const displaySize = {
      width: videoWidth,
      height: videoHeight,
    };

    faceapi.matchDimensions(canvasRef.current, displaySize);

    const detections = await faceapi
      .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions();

    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    canvasRef.current.getContext("2d").clearRect(0, 0, videoWidth, videoHeight);

    faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
    faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);
    faceapi.draw.drawFaceExpressions(canvasRef.current, resizedDetections);
  };

  const handleVideoOnPlay = () => {
    setInterval(async () => {
      await detectFace();
    }, 100);
  };

  const startVideo = async () => {
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });

      const video = videoRef.current;
      video.srcObject = videoStream;
      video.play();
    } catch (error) {
      console.error(error);
    }
  };

  const loadModels = async () => {
    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
      await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
      await faceapi.nets.faceExpressionNet.loadFromUri("/models");
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    startVideo();
    loadModels();
  });

  return (
    <div className="h-screen w-screen flex justify-center items-center gap-y-10 flex-col bg-black/80">
      <h1 className="text-5xl text-white">Face Detection 😃</h1>
      <div className="flex justify-center items-center">
        <video
          className="absolute z-10 rounded-md shadow-md"
          ref={videoRef}
          onPlay={handleVideoOnPlay}
          width={videoWidth}
          height={videoHeight}
        />
        <canvas className="z-50" ref={canvasRef} />
      </div>
    </div>
  );
}
