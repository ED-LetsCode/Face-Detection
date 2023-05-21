import { useEffect, useRef } from "react";
import "./App.css";
import * as faceapi from "face-api.js";

const faces = [
  {
    name: "Edward Snowden",
    linkToImage: "EdwardSnowden.jpg",
  },
];

export default function App() {
  const videoHeight = 480;
  const videoWidth = 640;
  const canvasRef = useRef();
  const videoRef = useRef();
  const speechMessage = new SpeechSynthesisUtterance();
  let detectedFaces = 0;
  const loadFacesFromImages = async () => {
    return Promise.all(
      faces.map(async (face) => {
        const descriptions = [];

        const img = await faceapi.fetchImage(
          `src/assets/Images/${face.linkToImage}`
        );

        const detection = await faceapi
          .detectSingleFace(img)
          .withFaceLandmarks()
          .withFaceDescriptor();
        descriptions.push(detection.descriptor);

        return new faceapi.LabeledFaceDescriptors(face.name, descriptions);
      })
    );
  };

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
      .withFaceDescriptors()
      .withFaceExpressions()
      .withAgeAndGender();

    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    canvasRef.current.getContext("2d").clearRect(0, 0, videoWidth, videoHeight);

    const labeledFaceDescriptors = await loadFacesFromImages();
    const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);
    const matchedFaces = resizedDetections.map((detection) =>
      faceMatcher.findBestMatch(detection.descriptor)
    );

    resizedDetections.forEach((detection) => {
      matchedFaces.forEach((name) => {
        if (!name.toString().includes("unknown")) {
          if (detectedFaces % 15 === 0) {
            speechMessage.text = "Hallo " + name.label;
            speechSynthesis.speak(speechMessage);
          }
          detectedFaces++;
        }

        const box = detection.detection.box;
        const drawBox = new faceapi.draw.DrawBox(box, {
          label: `${name} Age: ${Math.round(detection.age)} ${
            detection.gender
          }`,
          boxColor: "red",
        });
        drawBox.draw(canvasRef.current);
      });
    });

    faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);
    faceapi.draw.drawFaceExpressions(canvasRef.current, resizedDetections);
  };

  const handleVideoOnPlay = () => {
    setInterval(async () => {
      await detectFace();
    }, 500);
  };

  const startVideoStream = async () => {
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
      await faceapi.nets.ageGenderNet.loadFromUri("/models");
      await faceapi.nets.ssdMobilenetv1.loadFromUri("/models");
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    startVideoStream();
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
