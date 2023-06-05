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

  const loadModels = async () => {
    const modelPromises = [
      faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
      faceapi.nets.faceExpressionNet.loadFromUri("/models"),
      faceapi.nets.ageGenderNet.loadFromUri("/models"),
      faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
    ];

    try {
      await Promise.all(modelPromises);
    } catch (error) {
      console.error(error);
    }
  };

  const loadFacesFromImages = async () => {
    const labeledFaceDescriptors = await Promise.all(
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

    return labeledFaceDescriptors;
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

    resizedDetections.forEach((detection, i) => {
      const { box } = detection.detection;
      const { age, gender } = detection;
      const { label } = matchedFaces[i];
      const drawBox = new faceapi.draw.DrawBox(box, {
        label: `${label} Age: ${Math.round(age)} ${gender}`,
        boxColor: "red",
      });
      drawBox.draw(canvasRef.current);
    });

    faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);
    faceapi.draw.drawFaceExpressions(canvasRef.current, resizedDetections);
  };

  const handleVideoOnPlay = () => {
    setInterval(detectFace, 500);
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

  useEffect(() => {
    startVideoStream();
    loadModels();
  }, []);

  return (
    <div className="mobileVersion h-screen w-screen flex flex-col justify-center items-center bg-site bg-no-repeat bg-cover">
      <div className="max-w-xl px-4">
        <h1 className="text-5xl text-white text-center mb-8">
          Face Detection 😃
        </h1>
        <p className="text-justify text-white mb-8">
          This application does not collect any data and is not for Mobile
          Devices! I know the face recognition is a bit buggy. But it is
          currently being redeveloped and extended using Python and machine
          learning. The goal is to recognize, identify and classify any physical
          gesture in performant real time.
        </p>
      </div>
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
