import {
    HandLandmarker,
    FilesetResolver,
    DrawingUtils,
  } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

class VideoGestures {
    private window: Window;
    private document: Document;
    private video: HTMLVideoElement;
    private canvasElement: HTMLCanvasElement;
    private canvasCtx: CanvasRenderingContext2D;
    private enableWebcamButton: HTMLButtonElement;
    private webcamRunning: boolean;
    private lastVideoTime: number;
    private results: any; // Replace with the correct type for `results` if available
    private runningMode: string;
    private handLandmarker: any; // Replace with the correct type for `handLandmarker` if available
  
    constructor(window: Window, document: Document) {
      this.window = window;
      this.document = document;
  
      // Element references
      this.video = this.document.getElementById("webcam") as HTMLVideoElement;
      this.canvasElement = this.document.getElementById(
        "gesture-canvas"
      ) as HTMLCanvasElement;
      this.canvasCtx = this.canvasElement.getContext(
        "2d"
      ) as CanvasRenderingContext2D;
      this.enableWebcamButton = this.document.getElementById(
        "enable-webcam-button"
      ) as HTMLButtonElement;
      this.audioSelect = document.querySelector('select#audioSource') as HTMLSelectElement;
      this.videoSelect = document.querySelector('select#videoSource') as HTMLSelectElement;
      this.audioSelect.onchange = () => this.getStream();
      this.videoSelect.onchange = () => this.getStream();

      // State variables
      this.webcamRunning = false;
      this.lastVideoTime = -1;
      this.results = undefined;
      this.runningMode = "VIDEO"; // Default running mode

      this.drawingUtils = new DrawingUtils(this.canvasCtx);

      this.enabled = false;
      this.aim = {x: 0, y: 0};
      this.setup();
    }

    resize(width, height) {
      this.canvasElement.style.width = `${width}px`;
      this.canvasElement.style.height = `${height}px`;
      this.canvasElement.width = width;
      this.canvasElement.height = height;
    }

    async enable() {
      if (this.enabled) {
        return;
      }
      this.enabled = true;
      const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
      },
      runningMode: this.runningMode,
      numHands: 2
      });
  
      await this.getStream().then(() => this.getDevices()).then((deviceInfos) => this.gotDevices(deviceInfos));
    }


    private getDevices() {
        // AFAICT in Safari this only gets default devices until gUM is called :/
        return navigator.mediaDevices.enumerateDevices();
    }

    private gotDevices(deviceInfos) {
        this.window.deviceInfos = deviceInfos; // make available to console
        console.log('Available input and output devices:', deviceInfos);
        for (const deviceInfo of deviceInfos) {
            const option = document.createElement('option');
            option.value = deviceInfo.deviceId;
            if (deviceInfo.kind === 'audioinput') {
              option.text = deviceInfo.label || `Microphone ${this.audioSelect.length + 1}`;
              this.audioSelect.appendChild(option);
            } else if (deviceInfo.kind === 'videoinput') {
              option.text = deviceInfo.label || `Camera ${this.videoSelect.length + 1}`;
              this.videoSelect.appendChild(option);
            }
        }
    }

    private getStream() {
        if (this.window.stream) {
            this.window.stream.getTracks().forEach(track => {
            track.stop();
            });
        }
        const audioSource = this.audioSelect.value;
        const videoSource = this.videoSelect.value;
        const constraints = {
            audio: {deviceId: audioSource ? {exact: audioSource} : undefined},
            video: {deviceId: videoSource ? {exact: videoSource} : undefined}
        };

        return navigator.mediaDevices.getUserMedia(constraints).
            then((stream) => {
              this.gotStream(stream);
              if (this.webcamRunning) {
                this.predictWebcam();
              }
            }).catch((error) => this.handleError(error));
    }

    private gotStream(stream) {
        this.window.stream = stream; // make stream available to console
        this.audioSelect.selectedIndex = [...this.audioSelect.options].
            findIndex(option => option.text === stream.getAudioTracks()[0].label);
        this.videoSelect.selectedIndex = [...this.videoSelect.options].
            findIndex(option => option.text === stream.getVideoTracks()[0].label);
        this.video.srcObject = stream;
    }

    private handleError(error) {
        console.error('Error: ', error);
    }

  
    private setup() {
      // Check if webcam access is supported
      const hasGetUserMedia = () =>
        !!this.window.navigator.mediaDevices?.getUserMedia;
  
      if (hasGetUserMedia()) {
        this.enableWebcamButton.addEventListener("click", (e) => {
          this.enableCam(e);
        });
      } else {
        console.warn("getUserMedia() is not supported by your browser");
      }
    }
  
    private async enableCam(e:Event) {
      if (!this.handLandmarker) {
        console.log("Wait! handLandmarker not loaded yet.");
        this.enable();
        return;
      }
  
      this.webcamRunning = !this.webcamRunning;
      this.enableWebcamButton.innerText = this.webcamRunning
        ? "DISABLE PREDICTIONS"
        : "ENABLE PREDICTIONS";
  
      if (this.webcamRunning) {
        this.predictWebcam();
      }
    }
  
    private async predictWebcam() {

      // Switch running mode to VIDEO if necessary
      if (this.runningMode === "IMAGE") {
        this.runningMode = "VIDEO";
        await this.handLandmarker.setOptions({ runningMode: "VIDEO" });
      }
  
      const startTimeMs = this.window.performance.now();
  
      // Detect landmarks
      if (this.lastVideoTime !== this.video.currentTime) {
        this.lastVideoTime = this.video.currentTime;
        this.results = this.handLandmarker.detectForVideo(
          this.video,
          startTimeMs
        );
      }
  
      // Draw results on canvas
      this.canvasCtx.save();
      this.canvasCtx.clearRect(
        0,
        0,
        this.canvasElement.width,
        this.canvasElement.height
      );
  
      if (this.results?.landmarks) {
        for (const landmarks of this.results.landmarks) {
          const flipped = this.flipLandmarks(landmarks)
          this.drawingUtils.drawConnectors(flipped, HandLandmarker.HAND_CONNECTIONS, {
            color: "#00FF00",
            lineWidth: 5
          });
          this.drawingUtils.drawLandmarks(flipped, { color: "#FF0000", lineWidth: 2 });
        }
        if (this.results.landmarks.length) {

          let landmarks = this.results.landmarks[0];
          if (this.results.landmarks.length > 1) {
            for (const handedness of this.results.handednesses) {
              const hand = handedness[0];
              if (hand.categoryName == "Right") {
                landmarks = this.results.landmarks[hand.index];
              }
            }
          }
          let flipped = this.flipLandmarks(this.results.landmarks[0]);
          this.dispatchAim(flipped);
        }
      } else {
        this.aiming = false;
        this.firing = false;
      }
  
      this.canvasCtx.restore();
  
      // Continue predicting if webcam is running
      if (this.webcamRunning) {
        this.window.requestAnimationFrame(() => this.predictWebcam());
      }
    }

    dispatchAim(landmarks) {
      this.aim = this.detectAimFromPointer(landmarks);
      this.aiming = true;
      this.firing = this.detectFiringFromPointer(landmarks, this.aim);
      this.restart = this.detectFiringFromPointer(landmarks, this.aim).length >= 2;
    }

    detectAimFromPointer(landmarks) {
      const wrist = landmarks[0];
      const index_finger_ip = landmarks[6];

      const x = index_finger_ip.x - wrist.x;
      const y = index_finger_ip.y - wrist.y;

      let length = Math.sqrt(x * x + y * y);
      if (length == 0) {
        return {x: 0, y: 0}
      }
      
      return {x: x/length, y: y/length, length: length};
    }

    detectFiringFromPointer(landmarks, aim) {
      const wrist = landmarks[0];
      const index_finger_mcp = landmarks[5];
      const index_finger_ip = landmarks[6];
      const index_finger_tip = landmarks[8];

      const vec1 = {
        x: index_finger_ip.x - wrist.x,
        y: index_finger_ip.y - wrist.y
      }
      const vec2 = {
        x: index_finger_tip.x - index_finger_ip.x,
        y: index_finger_tip.y - index_finger_ip.y
      }

      const dot = vec1.x * vec2.x + vec1.y * vec2.y;

      return dot < 0;
    }

    flipLandmarks(landmarks: any[]): any[] {
      return landmarks.map((point) => ({
        ...point,
        x: 1 - point.x,
      }));
    }
  
    // Example method: Drawing a squiggle based on hand landmarks
    private drawOutline(landmarks: any[]) {
      this.canvasCtx.beginPath();
      landmarks.forEach((point, index) => {
        let px = 1 - point.x;
        if (index === 0) {
          this.canvasCtx.moveTo(
            px * this.canvasElement.width,
            point.y * this.canvasElement.height
          );
        } else {
          this.canvasCtx.lineTo(
            px * this.canvasElement.width,
            point.y * this.canvasElement.height
          );
        }
      });
      this.canvasCtx.stroke();
    }
  
    // Example method: Detecting color selection
    private selectColor(x: number, y: number): string {
      const pixel = this.canvasCtx.getImageData(x, y, 1, 1).data;
      return `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
    }
  
    // Example method: Handling space-time gesture
    private handleSpaceTimeGesture(landmarks: any[], timeDelta: number) {
      const movement = this.calculateHandMovement(landmarks);
      const scale = movement.y * timeDelta;
      const rotation = movement.x * timeDelta;
  
      // Apply transformations to the object
      this.transformObject(scale, rotation);
    }
  
    // Placeholder method: Calculate hand movement
    private calculateHandMovement(landmarks: any[]): { x: number; y: number } {
      // Example implementation (replace with actual logic)
      return { x: 0, y: 0 };
    }
  
    // Placeholder method: Transform object
    private transformObject(scale: number, rotation: number) {
      // Example implementation (replace with actual logic)
      console.log(`Transforming object with scale: ${scale}, rotation: ${rotation}`);
    }
  }
  
  export default VideoGestures;
  